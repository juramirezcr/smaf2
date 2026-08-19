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
        $userId = auth()->id();

        return Inertia::render('Dashboard', [
            'metrics' => [
                'callsToday' => CallRecord::query()
                    ->where('user_id', $userId)
                    ->whereDate('connected_at', today())
                    ->count(),
                'activeRules' => MonitoringRule::query()
                    ->where('user_id', $userId)
                    ->where('enabled', true)
                    ->count(),
                'processingBatches' => ImportBatch::query()
                    ->where('user_id', $userId)
                    ->whereIn('status', ['queued', 'processing'])
                    ->count(),
            ],
            'recentRuns' => ProcessRun::query()
                ->where('user_id', $userId)
                ->latest()
                ->limit(8)
                ->get(['id', 'type', 'status', 'message', 'started_at', 'finished_at']),
        ]);
    }
}
