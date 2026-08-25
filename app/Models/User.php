<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['client_id', 'legacy_sub_user_id', 'name', 'username', 'email', 'password', 'role', 'read_only', 'dashboard_widgets'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'read_only' => 'boolean',
            'dashboard_widgets' => 'array',
        ];
    }

    public function isSystemAdmin(): bool
    {
        return $this->client_id === null;
    }

    public function monitoringRules(): HasMany
    {
        return $this->hasMany(MonitoringRule::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function isClientAdmin(): bool
    {
        return $this->role === 'client_admin';
    }

    public function getEmailForPasswordReset(): string
    {
        return $this->username;
    }
}
