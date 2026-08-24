<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationSetting extends Model
{
    protected $fillable = [
        'telegram_bot_token',
        'admin_telegram_chat_id',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'smtp_from_address',
        'smtp_from_name',
    ];

    protected function casts(): array
    {
        return [
            'telegram_bot_token' => 'encrypted',
            'smtp_password' => 'encrypted',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }

    /**
     * Aplica la configuración SMTP guardada al mailer por defecto de
     * Laravel para esta petición/job, en vez de depender de variables de
     * entorno estáticas.
     */
    public function applyMailConfig(): void
    {
        config([
            'mail.mailers.smtp.host' => $this->smtp_host,
            'mail.mailers.smtp.port' => $this->smtp_port,
            'mail.mailers.smtp.username' => $this->smtp_username,
            'mail.mailers.smtp.password' => $this->smtp_password,
            'mail.mailers.smtp.encryption' => $this->smtp_encryption ?: null,
            'mail.from.address' => $this->smtp_from_address ?: 'noreply@smaf2.local',
            'mail.from.name' => $this->smtp_from_name ?: 'SMAF 2',
        ]);
    }

    public function isEmailConfigured(): bool
    {
        return filled($this->smtp_host) && filled($this->smtp_from_address);
    }

    public function isTelegramConfigured(): bool
    {
        return filled($this->telegram_bot_token);
    }

    public function isAdminTelegramConfigured(): bool
    {
        return filled($this->admin_telegram_chat_id);
    }
}
