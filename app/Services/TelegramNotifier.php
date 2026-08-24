<?php

namespace App\Services;

use App\Models\NotificationSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramNotifier
{
    /**
     * @return bool true si Telegram confirmó el envío.
     */
    public function send(string $chatId, string $text): bool
    {
        $settings = NotificationSetting::current();

        if (! $settings->isTelegramConfigured()) {
            return false;
        }

        $response = Http::post("https://api.telegram.org/bot{$settings->telegram_bot_token}/sendMessage", [
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
