<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonitoringRule extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'scope',
        'match_value',
        'account',
        'customer',
        'country',
        'description',
        'call_limit',
        'duration_limit_seconds',
        'action',
        'enabled',
        'last_evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'last_evaluated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditEvents(): HasMany
    {
        return $this->hasMany(MonitoringRuleEvent::class);
    }

    /**
     * $clientId permite registrar el evento contra el cliente realmente
     * afectado cuando la regla es global (client_id null aplica a todos).
     */
    public function recordAction(string $status, array $context = [], ?int $clientId = null): MonitoringRuleEvent
    {
        return $this->auditEvents()->create([
            'user_id' => $this->user_id,
            'client_id' => $clientId ?? $this->client_id,
            'action' => $this->action,
            'status' => $status,
            'context' => $context ?: null,
            'occurred_at' => now(),
        ]);
    }
}
