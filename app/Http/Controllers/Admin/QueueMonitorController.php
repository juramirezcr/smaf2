<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class QueueMonitorController extends Controller
{
    private const RUNNING_LIST_LIMIT = 50;

    private const FAILED_LIST_LIMIT = 50;

    public function index(Request $request): Response
    {
        $rawJobs = DB::table('jobs')->get();

        $decorated = $rawJobs->map(function ($job) {
            $payload = json_decode($job->payload, true);

            return [
                'id' => $job->id,
                'queue' => $job->queue,
                'job' => $payload['displayName'] ?? 'Desconocido',
                'attempts' => $job->attempts,
                'isRunning' => $job->reserved_at !== null,
                'reservedAt' => $job->reserved_at,
                'createdAt' => $job->created_at,
            ];
        });

        $summary = [
            'pending' => $decorated->where('isRunning', false)->count(),
            'running' => $decorated->where('isRunning', true)->count(),
            'failed' => DB::table('failed_jobs')->count(),
        ];

        $byQueue = $decorated
            ->groupBy('queue')
            ->map(fn ($group) => [
                'pending' => $group->where('isRunning', false)->count(),
                'running' => $group->where('isRunning', true)->count(),
                'oldestPendingAt' => $group->where('isRunning', false)->min('createdAt'),
            ])
            ->map(fn ($stats, $queue) => ['queue' => $queue, ...$stats])
            ->values();

        $byJobType = $decorated
            ->groupBy('job')
            ->map(fn ($group) => [
                'job' => $group->first()['job'],
                'total' => $group->count(),
                'running' => $group->where('isRunning', true)->count(),
                'maxAttempts' => $group->max('attempts'),
                'oldestCreatedAt' => $group->min('createdAt'),
            ])
            ->sortByDesc('total')
            ->values();

        $now = now()->timestamp;

        $runningJobs = $decorated
            ->where('isRunning', true)
            ->sortBy('reservedAt')
            ->take(self::RUNNING_LIST_LIMIT)
            ->map(fn ($job) => [
                ...$job,
                'runningSeconds' => $now - $job['reservedAt'],
                'createdAtIso' => Carbon::createFromTimestamp($job['createdAt'])->toIso8601String(),
            ])
            ->values();

        $failedJobs = DB::table('failed_jobs')
            ->orderByDesc('failed_at')
            ->limit(self::FAILED_LIST_LIMIT)
            ->get()
            ->map(function ($job) {
                $payload = json_decode($job->payload, true);

                return [
                    'id' => $job->id,
                    'uuid' => $job->uuid,
                    'queue' => $job->queue,
                    'job' => $payload['displayName'] ?? 'Desconocido',
                    'message' => strtok($job->exception, "\n") ?: null,
                    'failedAt' => $job->failed_at,
                ];
            });

        return Inertia::render('Admin/QueueMonitor', [
            'summary' => $summary,
            'byQueue' => $byQueue,
            'byJobType' => $byJobType,
            'runningJobs' => $runningJobs,
            'failedJobs' => $failedJobs,
            'runningListLimit' => self::RUNNING_LIST_LIMIT,
            'failedListLimit' => self::FAILED_LIST_LIMIT,
        ]);
    }

    public function retryFailed(string $uuid): RedirectResponse
    {
        Artisan::call('queue:retry', ['id' => [$uuid]]);

        return back()->with('success', 'El job se reencoló para un nuevo intento.');
    }

    public function forgetFailed(string $uuid): RedirectResponse
    {
        Artisan::call('queue:forget', ['id' => $uuid]);

        return back()->with('success', 'El job fallido fue eliminado.');
    }
}
