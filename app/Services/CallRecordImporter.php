<?php

namespace App\Services;

use App\Models\CallRecord;
use App\Models\ImportBatch;
use App\Support\CallPrefix;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class CallRecordImporter
{
    public function import(ImportBatch $batch): array
    {
        $stream = Storage::readStream($batch->storage_path);

        if ($stream === false) {
            throw new RuntimeException('No se pudo abrir el archivo de importación.');
        }

        $total = 0;
        $processed = 0;
        $rejected = 0;

        try {
            while (($row = fgetcsv($stream)) !== false) {
                $total++;

                if (count($row) < 9) {
                    $rejected++;

                    continue;
                }

                [$externalId, $account, $origin, $destination, $connectedAt, $duration, $userId, $customer] = $row;

                if ((int) $userId !== $batch->user_id || ! ctype_digit(trim($externalId)) || trim($destination) === '') {
                    $rejected++;

                    continue;
                }

                try {
                    $timestamp = Carbon::createFromFormat('Y-m-d H:i:s', trim($connectedAt), config('app.timezone'));
                } catch (\Throwable) {
                    $rejected++;

                    continue;
                }

                CallRecord::updateOrCreate(
                    ['client_id' => $batch->client_id, 'external_id' => trim($externalId)],
                    [
                        'user_id' => $batch->user_id,
                        'client_id' => $batch->client_id,
                        'import_batch_id' => $batch->id,
                        'account' => trim($account),
                        'customer' => trim($customer) ?: null,
                        'origin' => trim($origin) ?: null,
                        'destination' => trim($destination),
                        'prefix' => CallPrefix::forDestination(trim($destination)),
                        'duration_seconds' => max(0, (int) $duration),
                        'connected_at' => $timestamp,
                    ],
                );

                $processed++;
            }
        } finally {
            fclose($stream);
        }

        return compact('total', 'processed', 'rejected');
    }
}
