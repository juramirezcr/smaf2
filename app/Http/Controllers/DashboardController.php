<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use App\Models\MonitoringRule;
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
        $baseQuery = CallRecord::query();

        if (!$isAdmin) {
            $baseQuery->where('client_id', $clientId);
        }

        match ($period) {
            '1h' => $baseQuery->where('connected_at', '>=', now()->subHour()),
            '6h' => $baseQuery->where('connected_at', '>=', now()->subHours(6)),
            '24h' => $baseQuery->where('connected_at', '>=', now()->subDay()),
            '7d' => $baseQuery->where('connected_at', '>=', now()->subDays(7)),
            '30d' => $baseQuery->where('connected_at', '>=', now()->subDays(30)),
            default => $baseQuery->where('connected_at', '>=', now()->subDay()),
        };

        $clientNames = $isAdmin ? Client::query()->pluck('name', 'id') : null;

        return Inertia::render('Dashboard', [
            'period' => $period,
            'prefixStats' => (clone $baseQuery)
                ->select('client_id', 'country_code', 'prefix')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('client_id', 'country_code', 'prefix')
                ->orderByDesc('calls')
                ->limit(8)
                ->get()
                ->map(fn ($row) => [
                    'client_name' => $isAdmin ? $clientNames->get($row->client_id) : null,
                    'country_code' => $row->country_code,
                    'prefix' => $row->prefix,
                    'calls' => $row->calls,
                    'seconds' => $row->seconds,
                ]),
            'destinationStats' => (clone $baseQuery)
                ->select('customer', 'country_code', 'prefix', 'destination')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'country_code', 'prefix', 'destination')
                ->orderByDesc('calls')
                ->limit(8)
                ->get(),
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
}
