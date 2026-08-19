<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonitoringRule extends Model
{
    protected $fillable = [
        'user_id',
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

    public function recordAction(string $status, array $context = []): MonitoringRuleEvent
    {
        return $this->auditEvents()->create([
            'user_id' => $this->user_id,
            'action' => $this->action,
            'status' => $status,
            'context' => $context ?: null,
            'occurred_at' => now(),
        ]);
    }
}
