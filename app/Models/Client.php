<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'portaone_environment',
        'portaone_username',
        'portaone_token',
    ];

    protected function casts(): array
    {
        return ['portaone_token' => 'encrypted'];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
