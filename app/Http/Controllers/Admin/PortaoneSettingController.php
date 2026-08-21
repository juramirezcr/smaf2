<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PortaoneSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortaoneSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('Admin/Portaone', [
            'baseUrl' => PortaoneSetting::current()->base_url,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'base_url' => ['required', 'string', 'max:255', 'url'],
        ]);

        PortaoneSetting::current()->update($validated);

        return to_route('admin.portaone.edit');
    }
}
