<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallRecord extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'import_batch_id',
        'external_id',
        'account',
        'customer',
        'origin',
        'destination',
        'prefix',
        'country_code',
        'duration_seconds',
        'connected_at',
    ];

    protected function casts(): array
    {
        return ['connected_at' => 'datetime'];
    }

    public function importBatch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class);
    }
}
