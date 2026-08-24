<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailSettingController extends Controller
{
    public function edit(): Response
    {
        $settings = NotificationSetting::current();

        return Inertia::render('Admin/EmailSettings', [
            'smtpHost' => $settings->smtp_host,
            'smtpPort' => $settings->smtp_port,
            'smtpUsername' => $settings->smtp_username,
            'smtpEncryption' => $settings->smtp_encryption,
            'smtpFromAddress' => $settings->smtp_from_address,
            'smtpFromName' => $settings->smtp_from_name,
            'hasPassword' => filled($settings->smtp_password),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'smtp_host' => ['nullable', 'string', 'max:255'],
            'smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string', 'max:255'],
            'smtp_encryption' => ['nullable', 'in:tls,ssl'],
            'smtp_from_address' => ['nullable', 'string', 'email', 'max:255'],
            'smtp_from_name' => ['nullable', 'string', 'max:255'],
        ]);

        $settings = NotificationSetting::current();

        $settings->update([
            'smtp_host' => $validated['smtp_host'] ?? null,
            'smtp_port' => $validated['smtp_port'] ?? null,
            'smtp_username' => $validated['smtp_username'] ?? null,
            'smtp_encryption' => $validated['smtp_encryption'] ?? null,
            'smtp_from_address' => $validated['smtp_from_address'] ?? null,
            'smtp_from_name' => $validated['smtp_from_name'] ?? null,
            ...($validated['smtp_password'] ? ['smtp_password' => $validated['smtp_password']] : []),
        ]);

        return to_route('admin.email.edit')->with('success', 'La configuración de correo fue actualizada.');
    }
}
