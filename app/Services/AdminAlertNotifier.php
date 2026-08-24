<?php

namespace App\Services;

use App\Models\NotificationSetting;
use Illuminate\Support\Facades\Cache;

class AdminAlertNotifier
{
    public function __construct(private readonly TelegramNotifier $telegram)
    {
    }

    /**
     * Envía una notificación de administración (fallas de PortaOne, jobs, etc.)
     * al Chat ID de Telegram configurado para el equipo de administración.
     *
     * Cuando se pasa $throttleKey, solo se envía un mensaje por cada
     * $throttleSeconds para esa clave, para no saturar el chat con el mismo
     * problema repitiéndose en cada corrida de un job periódico.
     */
    public function notify(string $message, ?string $throttleKey = null, int $throttleSeconds = 900): bool
    {
        $settings = NotificationSetting::current();

        if (! $settings->isTelegramConfigured() || ! $settings->isAdminTelegramConfigured()) {
            return false;
        }

        if ($throttleKey !== null && ! Cache::add("admin-alert:{$throttleKey}", true, $throttleSeconds)) {
            return false;
        }

        return $this->telegram->send(
            $settings->admin_telegram_chat_id,
            "⚠️ <b>Alerta de administración</b>\n\n{$message}",
        );
    }
}
