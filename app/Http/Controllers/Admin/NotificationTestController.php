<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\AlertTriggeredMail;
use App\Models\Client;
use App\Models\NotificationSetting;
use App\Services\AlertMessageFormatter;
use App\Services\TelegramNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class NotificationTestController extends Controller
{
    public function telegram(Client $client, TelegramNotifier $telegram): JsonResponse
    {
        if (! $client->telegram_chat_id) {
            return response()->json(['error' => 'Este cliente no tiene un Chat ID de Telegram configurado.'], 422);
        }

        $settings = NotificationSetting::current();

        if (! $settings->isTelegramConfigured()) {
            return response()->json(['error' => 'Aún no se ha configurado el bot de Telegram en Configuraciones.'], 422);
        }

        $alert = AlertMessageFormatter::sampleAlert($client->name);
        $sent = $telegram->send($client->telegram_chat_id, AlertMessageFormatter::telegramText($alert));

        if (! $sent) {
            return response()->json(['error' => 'Telegram rechazó el mensaje de prueba. Verifica el Chat ID y el token del bot.'], 422);
        }

        return response()->json(['message' => 'Mensaje de prueba enviado por Telegram.']);
    }

    public function email(Client $client): JsonResponse
    {
        if (! $client->notification_email) {
            return response()->json(['error' => 'Este cliente no tiene un correo de notificación configurado.'], 422);
        }

        $settings = NotificationSetting::current();

        if (! $settings->isEmailConfigured()) {
            return response()->json(['error' => 'Aún no se ha configurado el servidor SMTP en Configuraciones.'], 422);
        }

        $settings->applyMailConfig();
        $alert = AlertMessageFormatter::sampleAlert($client->name);

        try {
            Mail::to($client->notification_email)->sendNow(new AlertTriggeredMail($alert));
        } catch (\Throwable $exception) {
            return response()->json(['error' => 'No fue posible enviar el correo: '.$exception->getMessage()], 422);
        }

        return response()->json(['message' => 'Correo de prueba enviado.']);
    }
}
