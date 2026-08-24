<?php

namespace App\Services;

use App\Models\NotificationSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramNotifier
{
    /**
     * @param  string|null  $botToken  Token a usar en vez del bot global (p. ej. el bot propio de un cliente).
     * @return bool true si Telegram confirmó el envío.
     */
    public function send(string $chatId, string $text, ?string $botToken = null): bool
    {
        if ($botToken === null) {
            $settings = NotificationSetting::current();

            if (! $settings->isTelegramConfigured()) {
                return false;
            }

            $botToken = $settings->telegram_bot_token;
        }

        $response = Http::post("https://api.telegram.org/bot{$botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
        ]);

        if (! $response->successful()) {
            Log::warning('Telegram rechazó la notificación.', [
                'chat_id' => $chatId,
                'response' => $response->body(),
            ]);
        }

        return $response->successful();
    }
}
