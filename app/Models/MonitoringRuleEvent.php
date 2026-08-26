<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonitoringRuleEvent extends Model
{
    protected $fillable = [
        'monitoring_rule_id',
        'user_id',
        'client_id',
        'action',
        'status',
        'context',
        'occurred_at',
        'review_status',
        'feedback_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'occurred_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(MonitoringRule::class, 'monitoring_rule_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(AlertNotification::class, 'monitoring_rule_event_id');
    }
}
