<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessImportBatch;
use App\Models\ImportBatch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ImportBatchController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Imports/Index', [
            'batches' => ImportBatch::query()
                ->where('client_id', auth()->user()->client_id)
                ->latest()
                ->paginate(20)
                ->through(fn (ImportBatch $batch) => [
                    'id' => $batch->id,
                    'filename' => $batch->original_filename,
                    'source' => $batch->source,
                    'status' => $batch->status,
                    'totalRows' => $batch->total_rows,
                    'processedRows' => $batch->processed_rows,
                    'rejectedRows' => $batch->rejected_rows,
                    'failureReason' => $batch->failure_reason,
                    'createdAt' => $batch->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimetypes:text/plain,text/csv,application/csv', 'max:51200'],
            'source' => ['required', 'string', 'max:50'],
        ]);

        $file = $validated['file'];
        $path = $file->store('imports');

        $batch = ImportBatch::create([
            'user_id' => $request->user()->id,
            'client_id' => $request->user()->client_id,
            'source' => $validated['source'],
            'original_filename' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'checksum' => hash_file('sha256', Storage::path($path)),
        ]);

        ProcessImportBatch::dispatch($batch->id);

        return to_route('imports.index')->with('success', 'Archivo encolado para procesamiento.');
    }
}
