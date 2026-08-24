<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TelegramSettingController extends Controller
{
    public function edit(): Response
    {
        $settings = NotificationSetting::current();

        return Inertia::render('Admin/TelegramSettings', [
            'hasToken' => filled($settings->telegram_bot_token),
            'adminTelegramChatId' => $settings->admin_telegram_chat_id,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'telegram_bot_token' => ['nullable', 'string', 'max:255'],
            'admin_telegram_chat_id' => ['nullable', 'string', 'max:255'],
        ]);

        $settings = NotificationSetting::current();

        $settings->update(['admin_telegram_chat_id' => $validated['admin_telegram_chat_id'] ?: null]);

        if ($validated['telegram_bot_token']) {
            $settings->update(['telegram_bot_token' => $validated['telegram_bot_token']]);
        }

        return to_route('admin.telegram.edit')->with('success', 'La configuración de Telegram fue actualizada.');
    }
}
