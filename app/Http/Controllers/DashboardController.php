<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\ImportBatch;
use App\Models\MonitoringRule;
use App\Models\ProcessRun;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $clientId = auth()->user()->client_id;

        return Inertia::render('Dashboard', [
            'metrics' => [
                'callsToday' => CallRecord::query()
                    ->where('client_id', $clientId)
                    ->whereDate('connected_at', today())
                    ->count(),
                'activeRules' => MonitoringRule::query()
                    ->where('client_id', $clientId)
                    ->where('enabled', true)
                    ->count(),
                'processingBatches' => ImportBatch::query()
                    ->where('client_id', $clientId)
                    ->whereIn('status', ['queued', 'processing'])
                    ->count(),
            ],
            'recentRuns' => ProcessRun::query()
                ->where('client_id', $clientId)
                ->latest()
                ->limit(8)
                ->get(['id', 'type', 'status', 'message', 'started_at', 'finished_at']),
        ]);
    }
}
