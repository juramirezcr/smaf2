<?php

namespace App\Console\Commands;

use App\Models\CallRecord;
use App\Models\PortaoneActiveSession;
use App\Models\ProcessRun;
use Illuminate\Console\Command;

class PruneOldData extends Command
{
    protected $signature = 'smaf:prune-old-data {--days=7 : Antigüedad máxima (días) de los datos que se conservan}';

    protected $description = 'Borra llamadas, sesiones activas y corridas de proceso con más de N días (7 por defecto) para que el disco no se llene.';

    private const CHUNK = 20000;

    public function handle(): int
    {
        $cutoff = now()->subDays(max(1, (int) $this->option('days')));

        $targets = [
            'call_records' => CallRecord::query()->where('connected_at', '<', $cutoff),
            'portaone_active_sessions' => PortaoneActiveSession::query()->where('last_seen_at', '<', $cutoff),
            'process_runs' => ProcessRun::query()->where('created_at', '<', $cutoff),
        ];

        foreach ($targets as $table => $query) {
            $total = 0;

            // En lotes para no generar transacciones/binlog gigantes ni bloquear la tabla.
            do {
                $deleted = (clone $query)->limit(self::CHUNK)->delete();
                $total += $deleted;
            } while ($deleted === self::CHUNK);

            $this->info("{$table}: {$total} filas borradas (anteriores a {$cutoff->toDateTimeString()}).");
        }

        return self::SUCCESS;
    }
}
