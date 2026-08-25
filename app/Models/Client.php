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
        'timezone',
        'legacy_user_id',
        'portaone_environment',
        'portaone_username',
        'portaone_token',
        'telegram_chat_id',
        'notification_email',
        'use_custom_telegram_bot',
        'telegram_bot_token',
        'xdr_synced_until',
    ];

    protected function casts(): array
    {
        return [
            'portaone_token' => 'encrypted',
            'telegram_bot_token' => 'encrypted',
            'use_custom_telegram_bot' => 'boolean',
            'xdr_synced_until' => 'datetime',
        ];
    }

    /**
     * Token del bot de Telegram a usar para las notificaciones de este
     * cliente: el propio si tiene el interruptor activado y uno guardado,
     * o null para que el llamador use el bot global.
     */
    public function effectiveTelegramBotToken(): ?string
    {
        if ($this->use_custom_telegram_bot && filled($this->telegram_bot_token)) {
            return $this->telegram_bot_token;
        }

        return null;
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function portaoneProducts(): HasMany
    {
        return $this->hasMany(PortaoneProduct::class);
    }

    public function portaoneCustomers(): HasMany
    {
        return $this->hasMany(PortaoneCustomer::class);
    }

    public function portaoneAccounts(): HasMany
    {
        return $this->hasMany(PortaoneAccount::class);
    }

    public function callRecords(): HasMany
    {
        return $this->hasMany(CallRecord::class);
    }
}
