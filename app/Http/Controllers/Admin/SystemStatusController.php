<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemMetric;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemStatusController extends Controller
{
    private const PERIODS = [
        '1h' => 1,
        '6h' => 6,
        '24h' => 24,
        '7d' => 24 * 7,
        '30d' => 24 * 30,
    ];

    public function index(Request $request): Response
    {
        $period = $request->string('period')->value();

        if (! array_key_exists($period, self::PERIODS)) {
            $period = '24h';
        }

        $since = now()->subHours(self::PERIODS[$period]);

        $metrics = SystemMetric::query()
            ->where('recorded_at', '>=', $since)
            ->orderBy('recorded_at')
            ->get();

        $latest = $metrics->last();

        return Inertia::render('Admin/SystemStatus', [
            'period' => $period,
            'latest' => $latest ? $this->formatSnapshot($latest) : null,
            'history' => $metrics->map(function (SystemMetric $metric) {
                $cpuPct = ($metric->cpu_load_1m !== null && $metric->cpu_cores)
                    ? round(min(100, $metric->cpu_load_1m / $metric->cpu_cores * 100), 1)
                    : null;
                $memPct = ($metric->mem_used_mb !== null && $metric->mem_total_mb)
                    ? round($metric->mem_used_mb / $metric->mem_total_mb * 100, 1)
                    : null;
                $diskPct = ($metric->disk_used_gb !== null && $metric->disk_total_gb)
                    ? round($metric->disk_used_gb / $metric->disk_total_gb * 100, 1)
                    : null;

                return [
                    'recordedAt' => $metric->recorded_at->toIso8601String(),
                    'cpuPct' => $cpuPct,
                    'memPct' => $memPct,
                    'diskPct' => $diskPct,
                ];
            }),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatSnapshot(SystemMetric $metric): array
    {
        return [
            'recordedAt' => $metric->recorded_at->toIso8601String(),
            'cpuCores' => $metric->cpu_cores,
            'cpuLoad1m' => $metric->cpu_load_1m,
            'cpuLoad5m' => $metric->cpu_load_5m,
            'cpuLoad15m' => $metric->cpu_load_15m,
            'memTotalMb' => $metric->mem_total_mb,
            'memUsedMb' => $metric->mem_used_mb,
            'diskTotalGb' => $metric->disk_total_gb,
            'diskUsedGb' => $metric->disk_used_gb,
        ];
    }
}
