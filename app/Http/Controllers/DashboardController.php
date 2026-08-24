<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use Illuminate\Http\Request;
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

        return Inertia::render('Dashboard', [
            'period' => $period,
            'isAdmin' => $isAdmin,
            'prefixCustomerStats' => $isAdmin
                ? []
                : (clone $baseQuery)
                    ->select('prefix', 'customer')
                    ->selectRaw('count(*) as calls')
                    ->groupBy('prefix', 'customer')
                    ->orderByDesc('calls')
                    ->get()
                    ->groupBy('prefix')
                    ->map(fn ($rows) => $rows->take(5)->map(fn ($row) => [
                        'customer' => $row->customer,
                        'calls' => (int) $row->calls,
                    ])->values()),
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
                perGroupLimit: 5,
                alertedKeys: $alertedAccountKeys,
            ),
            'alertCounts' => MonitoringRuleEvent::query()
                ->when(!$isAdmin, fn ($q) => $q->where('client_id', $clientId))
                ->where('occurred_at', '>=', now()->subDay())
                ->select('action')
                ->selectRaw('count(*) as total')
                ->groupBy('action')
                ->pluck('total', 'action'),
        ]);
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
                'client_id' => $row->client_id,
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
            $byClient[$item['client_id']][] = $item;
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
                $byCustomer[$item['customer'] ?? '']['items'][] = $item;
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
            $byClient[$item['client_id']][] = $item;
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
     * Admin: agrupa cuentas por Cliente interno (cada item conserva el
     * customer al que pertenece, ya que un cliente tiene varios).
     * Cliente (no admin): agrupa por Customer (el item solo necesita la
     * cuenta, el customer ya es el encabezado del grupo).
     */
    private function groupedAccounts($rows, int $bucketCount, $clientNames, bool $isAdmin, int $perGroupLimit, array $alertedKeys = []): array
    {
        $accounts = [];

        foreach ($rows as $row) {
            $accountKey = $row->client_id.'|'.$row->customer.'|'.$row->account;

            $accounts[$accountKey] ??= [
                'client_id' => $row->client_id,
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

        $groupsByKey = [];

        foreach ($accounts as $item) {
            $key = $isAdmin ? $item['client_id'] : ($item['customer'] ?? '');

            $groupsByKey[$key]['label'] ??= $isAdmin
                ? $clientNames?->get($item['client_id'])
                : ($item['customer'] ?: 'Sin customer');

            $groupsByKey[$key]['items'][] = [
                'client_id' => $item['client_id'],
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
            usort($group['items'], fn ($a, $b) => $b['calls'] <=> $a['calls']);

            $groups[] = [
                'clientName' => $group['label'],
                'items' => array_slice($group['items'], 0, $perGroupLimit),
            ];
        }

        usort($groups, fn ($a, $b) => ($b['items'][0]['calls'] ?? 0) <=> ($a['items'][0]['calls'] ?? 0));

        return $groups;
    }
}
