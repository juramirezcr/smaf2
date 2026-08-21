<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReleaseNote extends Model
{
    protected $fillable = [
        'version',
        'notes',
    ];
}
