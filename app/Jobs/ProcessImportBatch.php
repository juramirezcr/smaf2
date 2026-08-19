<?php

namespace App\Jobs;

use App\Models\ImportBatch;
use App\Models\ProcessRun;
use App\Services\CallRecordImporter;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessImportBatch implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $batchId) {}

    public function handle(CallRecordImporter $importer): void
    {
        $batch = ImportBatch::findOrFail($this->batchId);
        $run = ProcessRun::create([
            'user_id' => $batch->user_id,
            'import_batch_id' => $batch->id,
            'type' => 'import',
            'status' => 'started',
            'started_at' => now(),
        ]);

        $batch->update(['status' => 'processing', 'started_at' => now()]);

        try {
            $summary = $importer->import($batch);

            $batch->update([
                'status' => 'completed',
                'total_rows' => $summary['total'],
                'processed_rows' => $summary['processed'],
                'rejected_rows' => $summary['rejected'],
                'finished_at' => now(),
            ]);
            $run->update([
                'status' => 'completed',
                'context' => $summary,
                'finished_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            report($exception);
            $batch->update([
                'status' => 'failed',
                'failure_reason' => $exception->getMessage(),
                'finished_at' => now(),
            ]);
            $run->update([
                'status' => 'failed',
                'message' => $exception->getMessage(),
                'finished_at' => now(),
            ]);

            throw $exception;
        }
    }
}
