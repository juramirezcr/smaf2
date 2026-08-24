<?php

namespace App\Console\Commands;

use App\Models\SystemMetric;
use Illuminate\Console\Command;

class RecordSystemMetrics extends Command
{
    protected $signature = 'smaf:record-system-metrics';

    protected $description = 'Registra una muestra del uso de CPU, RAM y disco del servidor, para la pantalla de Estado.';

    public function handle(): int
    {
        $cores = $this->cpuCores();
        $load = function_exists('sys_getloadavg') ? sys_getloadavg() : false;
        [$memTotalKb, $memAvailableKb] = $this->memoryInfoKb();
        $diskTotal = @disk_total_space(storage_path());
        $diskFree = @disk_free_space(storage_path());

        SystemMetric::create([
            'recorded_at' => now(),
            'cpu_cores' => $cores,
            'cpu_load_1m' => $load !== false ? $load[0] : null,
            'cpu_load_5m' => $load !== false ? $load[1] : null,
            'cpu_load_15m' => $load !== false ? $load[2] : null,
            'mem_total_mb' => $memTotalKb !== null ? (int) round($memTotalKb / 1024) : null,
            'mem_used_mb' => ($memTotalKb !== null && $memAvailableKb !== null)
                ? (int) round(($memTotalKb - $memAvailableKb) / 1024)
                : null,
            'disk_total_gb' => $diskTotal !== false ? round($diskTotal / 1024 ** 3, 2) : null,
            'disk_used_gb' => ($diskTotal !== false && $diskFree !== false)
                ? round(($diskTotal - $diskFree) / 1024 ** 3, 2)
                : null,
        ]);

        // Conserva solo los últimos 30 días de muestras para no crecer sin límite.
        SystemMetric::query()->where('recorded_at', '<', now()->subDays(30))->delete();

        return self::SUCCESS;
    }

    private function cpuCores(): ?int
    {
        if (! is_readable('/proc/cpuinfo')) {
            return null;
        }

        $count = 0;

        foreach (file('/proc/cpuinfo') as $line) {
            if (str_starts_with($line, 'processor')) {
                $count++;
            }
        }

        return $count > 0 ? $count : null;
    }

    /**
     * @return array{0: int|null, 1: int|null} Total y disponible, en KB.
     */
    private function memoryInfoKb(): array
    {
        if (! is_readable('/proc/meminfo')) {
            return [null, null];
        }

        $data = [];

        foreach (file('/proc/meminfo') as $line) {
            if (preg_match('/^(\w+):\s+(\d+)/', $line, $matches)) {
                $data[$matches[1]] = (int) $matches[2];
            }
        }

        $total = $data['MemTotal'] ?? null;
        $available = $data['MemAvailable'] ?? ($data['MemFree'] ?? null);

        return [$total, $available];
    }
}
