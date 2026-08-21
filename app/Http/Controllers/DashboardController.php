<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\ImportBatch;
use App\Models\MonitoringRule;
use App\Models\MonitoringRuleEvent;
use App\Models\ProcessRun;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $clientId = auth()->user()->client_id;

        $callsToday = CallRecord::query()->where('client_id', $clientId)->whereDate('connected_at', today());

        return Inertia::render('Dashboard', [
            'metrics' => [
                'callsToday' => (clone $callsToday)->count(),
                'activeRules' => MonitoringRule::query()
                    ->where('client_id', $clientId)
                    ->where('enabled', true)
                    ->count(),
                'processingBatches' => ImportBatch::query()
                    ->where('client_id', $clientId)
                    ->whereIn('status', ['queued', 'processing'])
                    ->count(),
            ],
            'prefixStats' => (clone $callsToday)
                ->select('country_code', 'prefix')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('country_code', 'prefix')
                ->orderByDesc('calls')
                ->limit(8)
                ->get(),
            'destinationStats' => (clone $callsToday)
                ->select('customer', 'country_code', 'prefix', 'destination')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'country_code', 'prefix', 'destination')
                ->orderByDesc('calls')
                ->limit(8)
                ->get(),
            'accountStats' => (clone $callsToday)
                ->select('customer', 'account')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'account')
                ->orderByDesc('calls')
                ->limit(8)
                ->get(),
            'alertCounts' => MonitoringRuleEvent::query()
                ->where('client_id', $clientId)
                ->whereDate('occurred_at', today())
                ->select('action')
                ->selectRaw('count(*) as total')
                ->groupBy('action')
                ->pluck('total', 'action'),
            'recentRuns' => ProcessRun::query()
                ->where('client_id', $clientId)
                ->latest()
                ->limit(8)
                ->get(['id', 'type', 'status', 'message', 'started_at', 'finished_at']),
        ]);
    }
}
