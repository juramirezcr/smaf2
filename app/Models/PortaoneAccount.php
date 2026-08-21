<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortaoneAccount extends Model
{
    protected $fillable = [
        'client_id',
        'i_account',
        'i_customer',
        'account_id',
        'i_product',
        'product_name',
        'bill_status',
        'blocked',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'synced_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
