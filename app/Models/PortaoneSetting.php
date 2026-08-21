<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PortaoneSetting extends Model
{
    protected $fillable = [
        'base_url',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }
}
