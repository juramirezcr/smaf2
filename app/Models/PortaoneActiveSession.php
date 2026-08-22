<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortaoneActiveSession extends Model
{
    protected $fillable = [
        'client_id',
        'call_id',
        'i_account',
        'i_customer',
        'account_id',
        'customer_name',
        'cli',
        'cld',
        'country',
        'connect_time',
        'duration_seconds',
        'last_seen_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'connect_time' => 'datetime',
            'last_seen_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('ended_at');
    }
}
