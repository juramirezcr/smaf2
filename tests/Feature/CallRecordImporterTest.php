<?php

namespace Tests\Feature;

use App\Models\CallRecord;
use App\Models\ImportBatch;
use App\Models\User;
use App\Services\CallRecordImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CallRecordImporterTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_valid_rows_and_rejects_malformed_rows(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $path = 'imports/calls.log';
        Storage::put($path, implode("\n", [
            "1001,40101234,50620000000,01112025550123,2026-08-19 10:00:00,42,{$user->id},10,2",
            'broken,row',
        ]));

        $batch = ImportBatch::create([
            'user_id' => $user->id,
            'source' => 'test',
            'original_filename' => 'calls.log',
            'storage_path' => $path,
            'checksum' => hash('sha256', Storage::get($path)),
        ]);

        $summary = app(CallRecordImporter::class)->import($batch);

        $this->assertSame(['total' => 2, 'processed' => 1, 'rejected' => 1], $summary);
        $this->assertDatabaseHas('call_records', [
            'user_id' => $user->id,
            'external_id' => '1001',
            'prefix' => '1202',
            'duration_seconds' => 42,
        ]);
        $this->assertSame(1, CallRecord::count());
    }
}
