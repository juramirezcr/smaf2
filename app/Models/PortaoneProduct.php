<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortaoneProduct extends Model
{
    protected $fillable = [
        'client_id',
        'i_product',
        'name',
        'end_user_name',
        'is_telephony',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'is_telephony' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
