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
        'i_xdr',
        'i_customer',
        'i_account',
        'account',
        'customer',
        'origin',
        'destination',
        'prefix',
        'country_code',
        'duration_seconds',
        'charged_amount',
        'connected_at',
    ];

    protected function casts(): array
    {
        return [
            'connected_at' => 'datetime',
            'charged_amount' => 'decimal:4',
        ];
    }

    public function importBatch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class);
    }
}
