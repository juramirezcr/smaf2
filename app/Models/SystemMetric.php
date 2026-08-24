<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemMetric extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'recorded_at',
        'cpu_cores',
        'cpu_load_1m',
        'cpu_load_5m',
        'cpu_load_15m',
        'mem_total_mb',
        'mem_used_mb',
        'disk_total_gb',
        'disk_used_gb',
    ];

    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
        ];
    }
}
