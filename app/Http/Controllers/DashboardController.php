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

        $period = $request->input('period', '24h');

        [$since, $bucketUnitSeconds, $bucketCount] = $this->periodBuckets($period);
        $sinceTimestamp = $since->timestamp;

        $baseQuery = CallRecord::query()->where('connected_at', '>=', $since);

        if (!$isAdmin) {
            $baseQuery->where('client_id', $clientId);
        }

        $clientNames = $isAdmin ? Client::query()->pluck('name', 'id') : null;

        $bucketExpression = "FLOOR((UNIX_TIMESTAMP(connected_at) - {$sinceTimestamp}) / {$bucketUnitSeconds})";

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
            ),
            'destinationStats' => $this->topDestinations(
                (clone $baseQuery)
                    ->selectRaw("client_id, prefix, destination, {$bucketExpression} as bucket")
                    ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                    ->groupBy('client_id', 'prefix', 'destination', 'bucket')
                    ->get(),
                bucketCount: $bucketCount,
                clientNames: $clientNames,
                limit: 10,
            ),
            'accountStats' => (clone $baseQuery)
                ->select('customer', 'account')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'account')
                ->orderByDesc('calls')
                ->limit(8)
                ->get(),
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

    private function groupedByClient($rows, string $labelField, int $bucketCount, $clientNames, int $perClientLimit): array
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

    private function topDestinations($rows, int $bucketCount, $clientNames, int $limit): array
    {
        $aggregated = [];

        foreach ($rows as $row) {
            $key = $row->client_id.'|'.$row->prefix.'|'.$row->destination;

            $aggregated[$key] ??= [
                'client_id' => $row->client_id,
                'prefix' => $row->prefix,
                'destination' => $row->destination,
                'calls' => 0,
                'seconds' => 0,
                'history' => array_fill(0, $bucketCount, 0),
            ];

            $aggregated[$key]['calls'] += (int) $row->calls;
            $aggregated[$key]['seconds'] += (int) $row->seconds;

            $bucketIndex = (int) $row->bucket;
            if ($bucketIndex >= 0 && $bucketIndex < $bucketCount) {
                $aggregated[$key]['history'][$bucketIndex] += (int) $row->calls;
            }
        }

        $top = array_values($aggregated);
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
}
