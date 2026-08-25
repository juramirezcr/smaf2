<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use App\Support\DashboardWidgets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = auth()->user();
        $clientId = $user->client_id;
        $isAdmin = $clientId === null;

        $period = $request->input('period', '1h');

        [$since, $bucketUnitSeconds, $bucketCount] = $this->periodBuckets($period);
        $sinceTimestamp = $since->timestamp;

        $baseQuery = CallRecord::query()->where('connected_at', '>=', $since);

        if (!$isAdmin) {
            $baseQuery->where('client_id', $clientId);
        }

        $clientNames = $isAdmin ? Client::query()->pluck('name', 'id') : null;

        $bucketExpression = "FLOOR((UNIX_TIMESTAMP(connected_at) - {$sinceTimestamp}) / {$bucketUnitSeconds})";

        [$alertedPrefixKeys, $alertedAccountKeys] = $this->alertedKeys($isAdmin, $clientId);

        $alertCounts = MonitoringRuleEvent::query()
            ->when(!$isAdmin, fn ($q) => $q->where('client_id', $clientId))
            ->where('occurred_at', '>=', now()->subDay())
            ->select('action')
            ->selectRaw('count(*) as total')
            ->groupBy('action')
            ->pluck('total', 'action');

        return Inertia::render('Dashboard', [
            'period' => $period,
            'isAdmin' => $isAdmin,
            'prefixStats' => $this->groupedByClient(
                (clone $baseQuery)
                    ->selectRaw("client_id, prefix, {$bucketExpression} as bucket")
                    ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                    ->groupBy('client_id', 'prefix', 'bucket')
                    ->get(),
                labelField: 'prefix',
                bucketCount: $bucketCount,
                clientNames: $clientNames,
                perClientLimit: 5,
                alertedKeys: $alertedPrefixKeys,
            ),
            'destinationStats' => $this->topDestinations(
                (clone $baseQuery)
                    ->selectRaw("client_id, customer, prefix, destination, {$bucketExpression} as bucket")
                    ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                    ->groupBy('client_id', 'customer', 'prefix', 'destination', 'bucket')
                    ->get(),
                bucketCount: $bucketCount,
                clientNames: $clientNames,
                isAdmin: $isAdmin,
                limit: 10,
            ),
            'accountStats' => $this->groupedAccounts(
                (clone $baseQuery)
                    ->selectRaw("client_id, customer, account, {$bucketExpression} as bucket")
                    ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                    ->groupBy('client_id', 'customer', 'account', 'bucket')
                    ->get(),
                bucketCount: $bucketCount,
                clientNames: $clientNames,
                isAdmin: $isAdmin,
                limit: 10,
                alertedKeys: $alertedAccountKeys,
            ),
            'alertCounts' => $alertCounts,
            'kpis' => [
                'activeCalls' => (clone $baseQuery)->count(),
                'accountsInReview' => $this->accountsInReviewCount($isAdmin, $clientId),
                'prefixesMonitored' => (clone $baseQuery)->whereNotNull('prefix')->distinct('prefix')->count('prefix'),
            ],
            'availableWidgets' => array_values(array_filter(
                DashboardWidgets::catalog(),
                fn (array $widget) => $isAdmin || ! $widget['adminOnly'],
            )),
            'activeWidgets' => DashboardWidgets::resolveActive($user->dashboard_widgets, $isAdmin),
            'clientsActive' => $isAdmin
                ? (clone $baseQuery)
                    ->selectRaw('client_id')
                    ->selectRaw('count(*) as calls')
                    ->groupBy('client_id')
                    ->orderByDesc('calls')
                    ->get()
                    ->map(fn ($row) => [
                        'clientId' => $row->client_id,
                        'clientName' => $clientNames?->get($row->client_id),
                        'calls' => (int) $row->calls,
                    ])
                : [],
            'trafficSeries' => $this->trafficSeries(
                (clone $baseQuery)
                    ->selectRaw("{$bucketExpression} as bucket")
                    ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                    ->groupBy('bucket')
                    ->get(),
                since: $since,
                bucketUnitSeconds: $bucketUnitSeconds,
                bucketCount: $bucketCount,
            ),
            'heatmap' => $this->weeklyHeatmap($isAdmin, $clientId, $user->effectiveTimezone()),
            'queueSummary' => $isAdmin ? $this->queueSummary() : null,
            'alertsRecent' => MonitoringRuleEvent::query()
                ->when(!$isAdmin, fn ($q) => $q->where('client_id', $clientId))
                ->with(['rule:id,match_value,description', 'reviewer:id,name'])
                ->latest('occurred_at')
                ->limit(8)
                ->get()
                ->map(fn (MonitoringRuleEvent $event) => [
                    'id' => $event->id,
                    'occurredAt' => $event->occurred_at->toIso8601String(),
                    'clientName' => $isAdmin ? $clientNames?->get($event->client_id) : null,
                    'account' => $event->context['account'] ?? null,
                    'customer' => $event->context['customer'] ?? null,
                    'calls' => $event->context['calls'] ?? null,
                    'seconds' => $event->context['seconds'] ?? null,
                    'callLimit' => $event->context['call_limit'] ?? null,
                    'durationLimitSeconds' => $event->context['duration_limit_seconds'] ?? null,
                    'action' => $event->action,
                    'prefix' => $event->rule?->match_value,
                    'ruleLabel' => $event->rule?->description ?: $event->rule?->match_value,
                    'reviewStatus' => $event->review_status,
                    'feedbackNotes' => $event->feedback_notes,
                    'reviewedByName' => $event->reviewer?->name,
                    'canReview' => $event->action === 'block'
                        && ($isAdmin || ($user->client_id === $event->client_id && $user->isClientAdmin())),
                ]),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function trafficSeries($rows, \Illuminate\Support\Carbon $since, int $bucketUnitSeconds, int $bucketCount): array
    {
        $byBucket = $rows->keyBy(fn ($row) => (int) $row->bucket);
        $series = [];

        for ($i = 0; $i < $bucketCount; $i++) {
            $row = $byBucket->get($i);

            $series[] = [
                'at' => $since->copy()->addSeconds($i * $bucketUnitSeconds)->toIso8601String(),
                'calls' => $row ? (int) $row->calls : 0,
                'seconds' => $row ? (int) $row->seconds : 0,
            ];
        }

        return $series;
    }

    /**
     * Matriz día(0=lun..6=dom) x hora(0-23) de llamadas en los últimos 7
     * días, para el mapa de calor de intensidad de tráfico. connected_at
     * se guarda en UTC (así lo entrega PortaOne); DAYOFWEEK/HOUR de MySQL
     * calculan sobre esa hora UTC, así que la matriz se rota después según
     * la zona horaria del usuario para que el día/hora coincida con lo que
     * ve en pantalla.
     *
     * @return array<int, array<int, int>>
     */
    private function weeklyHeatmap(bool $isAdmin, ?int $clientId, string $timezone): array
    {
        $rows = CallRecord::query()
            ->when(!$isAdmin, fn ($q) => $q->where('client_id', $clientId))
            ->where('connected_at', '>=', now()->subDays(7))
            ->selectRaw('DAYOFWEEK(connected_at) as dow, HOUR(connected_at) as hr')
            ->selectRaw('count(*) as calls')
            ->groupBy('dow', 'hr')
            ->get();

        $matrix = array_fill(0, 7, array_fill(0, 24, 0));

        foreach ($rows as $row) {
            $dayIndex = ((int) $row->dow + 5) % 7; // DAYOFWEEK: 1=dom..7=sáb -> 0=lun..6=dom
            $matrix[$dayIndex][(int) $row->hr] = (int) $row->calls;
        }

        return $this->rotateHeatmapToTimezone($matrix, $timezone);
    }

    /**
     * Todas las zonas horarias que ofrecemos en App\Support\Timezones
     * tienen desfase de horas completas respecto a UTC (incluso con
     * horario de verano), así que rotar la semana aplanada (168 horas) es
     * exacto y evita tener que traer cada llamada individual a PHP solo
     * para reclasificarla.
     *
     * @param  array<int, array<int, int>>  $matrix
     * @return array<int, array<int, int>>
     */
    private function rotateHeatmapToTimezone(array $matrix, string $timezone): array
    {
        $offsetHours = (int) round(
            (new \DateTimeZone($timezone))->getOffset(new \DateTimeImmutable('now', new \DateTimeZone('UTC'))) / 3600
        );

        if ($offsetHours === 0) {
            return $matrix;
        }

        $flat = [];
        foreach ($matrix as $day => $hours) {
            foreach ($hours as $hour => $calls) {
                $flat[$day * 24 + $hour] = $calls;
            }
        }

        $rotated = array_fill(0, 168, 0);
        foreach ($flat as $utcIndex => $calls) {
            $rotated[($utcIndex + $offsetHours + 168) % 168] = $calls;
        }

        $result = array_fill(0, 7, array_fill(0, 24, 0));
        foreach ($rotated as $index => $calls) {
            $result[intdiv($index, 24)][$index % 24] = $calls;
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function queueSummary(): array
    {
        $jobs = DB::table('jobs')->get(['reserved_at', 'created_at']);
        $pending = $jobs->whereNull('reserved_at');

        return [
            'pending' => $pending->count(),
            'running' => $jobs->count() - $pending->count(),
            'failedRecent' => DB::table('failed_jobs')->where('failed_at', '>=', now()->subDay())->count(),
            'oldestPendingSeconds' => $pending->isEmpty() ? null : now()->timestamp - $pending->min('created_at'),
        ];
    }

    /**
     * Cuenta cuentas distintas con al menos un bloqueo pendiente de revisión
     * (no acotado al período seleccionado: es una cola de trabajo, no una
     * métrica de tráfico).
     */
    private function accountsInReviewCount(bool $isAdmin, ?int $clientId): int
    {
        $events = MonitoringRuleEvent::query()
            ->when(!$isAdmin, fn ($q) => $q->where('client_id', $clientId))
            ->where('action', 'block')
            ->where('review_status', 'pending')
            ->get(['client_id', 'context']);

        $accountKeys = [];

        foreach ($events as $event) {
            $account = $event->context['account'] ?? null;

            if ($account !== null) {
                $accountKeys[$event->client_id.'|'.$account] = true;
            }
        }

        return count($accountKeys);
    }

    /**
     * Construye los conjuntos de claves "client_id|prefijo" y
     * "client_id|customer|account" que tuvieron una alerta en la última hora,
     * para resaltar esas filas en las tablas del dashboard.
     *
     * @return array{0: array<string, bool>, 1: array<string, bool>}
     */
    private function alertedKeys(bool $isAdmin, ?int $clientId): array
    {
        $events = MonitoringRuleEvent::query()
            ->with('rule:id,match_value')
            ->when(!$isAdmin, fn ($q) => $q->where('client_id', $clientId))
            ->where('occurred_at', '>=', now()->subHour())
            ->get(['id', 'client_id', 'monitoring_rule_id', 'context']);

        $prefixKeys = [];
        $accountKeys = [];

        foreach ($events as $event) {
            $prefix = $event->rule?->match_value;

            if ($prefix !== null) {
                $prefixKeys[$event->client_id.'|'.$prefix] = true;
            }

            $account = $event->context['account'] ?? null;
            $customer = $event->context['customer'] ?? null;

            if ($account !== null) {
                $accountKeys[$event->client_id.'|'.$customer.'|'.$account] = true;
            }
        }

        return [$prefixKeys, $accountKeys];
    }

    /**
     * @return array{0: \Illuminate\Support\Carbon, 1: int, 2: int}
     */
    private function periodBuckets(string $period): array
    {
        return match ($period) {
            '1h' => [now()->subHour(), 300, 12],
            '6h' => [now()->subHours(6), 1800, 12],
            '24h' => [now()->subDay(), 3600, 24],
            '7d' => [now()->subDays(7), 86400, 7],
            '30d' => [now()->subDays(30), 86400, 30],
            default => [now()->subDay(), 3600, 24],
        };
    }

    private function groupedByClient($rows, string $labelField, int $bucketCount, $clientNames, int $perClientLimit, array $alertedKeys = []): array
    {
        $aggregated = [];

        foreach ($rows as $row) {
            $key = $row->client_id.'|'.$row->$labelField;

            $aggregated[$key] ??= [
                'clientId' => $row->client_id,
                'label' => $row->$labelField,
                'calls' => 0,
                'seconds' => 0,
                'history' => array_fill(0, $bucketCount, 0),
                'alerted' => isset($alertedKeys[$key]),
            ];

            $aggregated[$key]['calls'] += (int) $row->calls;
            $aggregated[$key]['seconds'] += (int) $row->seconds;

            $bucketIndex = (int) $row->bucket;
            if ($bucketIndex >= 0 && $bucketIndex < $bucketCount) {
                $aggregated[$key]['history'][$bucketIndex] += (int) $row->calls;
            }
        }

        $byClient = [];
        foreach ($aggregated as $item) {
            $byClient[$item['clientId']][] = $item;
        }

        $groups = [];
        foreach ($byClient as $clientIdKey => $items) {
            usort($items, fn ($a, $b) => $b['calls'] <=> $a['calls']);

            $groups[] = [
                'clientName' => $clientNames?->get($clientIdKey),
                'items' => array_slice($items, 0, $perClientLimit),
            ];
        }

        usort($groups, fn ($a, $b) => ($b['items'][0]['calls'] ?? 0) <=> ($a['items'][0]['calls'] ?? 0));

        return $groups;
    }

    /**
     * Admin: rango top 10 por destino combinando todos los customers de cada
     * cliente, agrupado por Cliente interno (visión de fraude a nivel tenant).
     * Cliente (no admin): rango top 10 por combinación customer+destino
     * dentro de su propio tráfico, agrupado por Customer.
     */
    private function topDestinations($rows, int $bucketCount, $clientNames, bool $isAdmin, int $limit): array
    {
        $perCustomer = [];

        foreach ($rows as $row) {
            $key = $row->client_id.'|'.$row->customer.'|'.$row->prefix.'|'.$row->destination;

            $perCustomer[$key] ??= [
                'client_id' => $row->client_id,
                'customer' => $row->customer,
                'prefix' => $row->prefix,
                'destination' => $row->destination,
                'calls' => 0,
                'seconds' => 0,
                'history' => array_fill(0, $bucketCount, 0),
            ];

            $perCustomer[$key]['calls'] += (int) $row->calls;
            $perCustomer[$key]['seconds'] += (int) $row->seconds;

            $bucketIndex = (int) $row->bucket;
            if ($bucketIndex >= 0 && $bucketIndex < $bucketCount) {
                $perCustomer[$key]['history'][$bucketIndex] += (int) $row->calls;
            }
        }

        if (! $isAdmin) {
            $top = array_values($perCustomer);
            usort($top, fn ($a, $b) => $b['calls'] <=> $a['calls']);
            $top = array_slice($top, 0, $limit);

            $byCustomer = [];
            foreach ($top as $item) {
                $byCustomer[$item['customer'] ?? '']['label'] = $item['customer'] ?: 'Sin customer';
                $byCustomer[$item['customer'] ?? '']['items'][] = [
                    'clientId' => $item['client_id'],
                    'prefix' => $item['prefix'],
                    'destination' => $item['destination'],
                    'calls' => $item['calls'],
                    'seconds' => $item['seconds'],
                    'history' => $item['history'],
                ];
            }

            $groups = array_values($byCustomer);
            usort($groups, fn ($a, $b) => ($b['items'][0]['calls'] ?? 0) <=> ($a['items'][0]['calls'] ?? 0));

            return array_map(fn ($g) => ['clientName' => $g['label'], 'items' => $g['items']], $groups);
        }

        // Admin: combinar todos los customers de un mismo cliente+destino
        // para rankear y mostrar el total, sin desglosar por customer.
        $combined = [];
        foreach ($perCustomer as $item) {
            $key = $item['client_id'].'|'.$item['prefix'].'|'.$item['destination'];

            $combined[$key] ??= [
                'client_id' => $item['client_id'],
                'prefix' => $item['prefix'],
                'destination' => $item['destination'],
                'calls' => 0,
                'seconds' => 0,
                'history' => array_fill(0, $bucketCount, 0),
            ];

            $combined[$key]['calls'] += $item['calls'];
            $combined[$key]['seconds'] += $item['seconds'];

            foreach ($item['history'] as $index => $value) {
                $combined[$key]['history'][$index] += $value;
            }
        }

        $top = array_values($combined);
        usort($top, fn ($a, $b) => $b['calls'] <=> $a['calls']);
        $top = array_slice($top, 0, $limit);

        $byClient = [];
        foreach ($top as $item) {
            $byClient[$item['client_id']][] = [
                'clientId' => $item['client_id'],
                'prefix' => $item['prefix'],
                'destination' => $item['destination'],
                'calls' => $item['calls'],
                'seconds' => $item['seconds'],
                'history' => $item['history'],
            ];
        }

        $groups = [];
        foreach ($byClient as $clientIdKey => $items) {
            $groups[] = [
                'clientName' => $clientNames?->get($clientIdKey),
                'items' => $items,
            ];
        }

        usort($groups, fn ($a, $b) => ($b['items'][0]['calls'] ?? 0) <=> ($a['items'][0]['calls'] ?? 0));

        return $groups;
    }

    /**
     * Rango top N por cuenta (como topDestinations): se limita el total
     * antes de agrupar, no por grupo, para que el widget no crezca sin
     * control cuando hay muchos customers/clientes con tráfico.
     *
     * Admin: agrupa por Cliente interno (cada item conserva el customer al
     * que pertenece, ya que un cliente tiene varios).
     * Cliente (no admin): agrupa por Customer (el item solo necesita la
     * cuenta, el customer ya es el encabezado del grupo).
     */
    private function groupedAccounts($rows, int $bucketCount, $clientNames, bool $isAdmin, int $limit, array $alertedKeys = []): array
    {
        $accounts = [];

        foreach ($rows as $row) {
            $accountKey = $row->client_id.'|'.$row->customer.'|'.$row->account;

            $accounts[$accountKey] ??= [
                'clientId' => $row->client_id,
                'customer' => $row->customer,
                'account' => $row->account,
                'calls' => 0,
                'seconds' => 0,
                'history' => array_fill(0, $bucketCount, 0),
                'alerted' => isset($alertedKeys[$accountKey]),
            ];

            $accounts[$accountKey]['calls'] += (int) $row->calls;
            $accounts[$accountKey]['seconds'] += (int) $row->seconds;

            $bucketIndex = (int) $row->bucket;
            if ($bucketIndex >= 0 && $bucketIndex < $bucketCount) {
                $accounts[$accountKey]['history'][$bucketIndex] += (int) $row->calls;
            }
        }

        $top = array_values($accounts);
        usort($top, fn ($a, $b) => $b['calls'] <=> $a['calls']);
        $top = array_slice($top, 0, $limit);

        $groupsByKey = [];

        foreach ($top as $item) {
            $key = $isAdmin ? $item['clientId'] : ($item['customer'] ?? '');

            $groupsByKey[$key]['label'] ??= $isAdmin
                ? $clientNames?->get($item['clientId'])
                : ($item['customer'] ?: 'Sin customer');

            $groupsByKey[$key]['items'][] = [
                'clientId' => $item['clientId'],
                'customer' => $item['customer'],
                'account' => $item['account'],
                'calls' => $item['calls'],
                'seconds' => $item['seconds'],
                'history' => $item['history'],
                'alerted' => $item['alerted'],
            ];
        }

        $groups = [];
        foreach ($groupsByKey as $group) {
            $groups[] = [
                'clientName' => $group['label'],
                'items' => $group['items'],
            ];
        }

        usort($groups, fn ($a, $b) => ($b['items'][0]['calls'] ?? 0) <=> ($a['items'][0]['calls'] ?? 0));

        return $groups;
    }
}
