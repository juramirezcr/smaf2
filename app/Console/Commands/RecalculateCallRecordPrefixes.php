<?php

namespace App\Console\Commands;

use App\Models\CallRecord;
use App\Support\CallPrefix;
use Illuminate\Console\Command;

class RecalculateCallRecordPrefixes extends Command
{
    protected $signature = 'smaf:recalculate-call-prefixes';

    protected $description = 'Recalcula call_records.prefix con la lógica vigente de CallPrefix (ej. para aplicar retroactivamente el filtro de extensiones internas de menos de 5 dígitos)';

    public function handle(): int
    {
        $updated = 0;

        CallRecord::query()
            ->select('id', 'destination', 'prefix')
            ->orderBy('id')
            ->chunkById(1000, function ($records) use (&$updated) {
                foreach ($records as $record) {
                    $prefix = CallPrefix::forDestination((string) ($record->destination ?? ''));

                    if ($prefix !== $record->prefix) {
                        $record->update(['prefix' => $prefix]);
                        $updated++;
                    }
                }
            });

        $this->info("Registros actualizados: {$updated}");

        return self::SUCCESS;
    }
}
