<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use App\Services\PortaOneClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ClientController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Clients', [
            'clients' => Client::withCount('users')
                ->latest()
                ->get()
                ->map(fn (Client $client): array => [
                    'id' => $client->id,
                    'name' => $client->name,
                    'portaoneEnvironment' => $client->portaone_environment,
                    'portaoneUsername' => $client->portaone_username,
                    'usersCount' => $client->users_count,
                    'createdAt' => $client->created_at,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'portaone_environment' => ['required', 'string', 'max:255'],
            'portaone_username' => ['required', 'string', 'max:255'],
            'portaone_token' => ['required', 'string'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_username' => ['required', 'string', 'max:255', 'unique:'.User::class.',username'],
            'admin_email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'admin_password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        DB::transaction(function () use ($validated) {
            $client = Client::create([
                'name' => $validated['name'],
                'portaone_environment' => $validated['portaone_environment'],
                'portaone_username' => $validated['portaone_username'],
                'portaone_token' => $validated['portaone_token'],
            ]);

            $client->users()->create([
                'name' => $validated['admin_name'],
                'username' => $validated['admin_username'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'role' => 'client_admin',
            ]);
        });

        return to_route('admin.clients.index');
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'portaone_environment' => ['required', 'string', 'max:255'],
            'portaone_username' => ['required', 'string', 'max:255'],
            'portaone_token' => ['nullable', 'string'],
        ]);

        $client->update([
            'name' => $validated['name'],
            'portaone_environment' => $validated['portaone_environment'],
            'portaone_username' => $validated['portaone_username'],
            ...($validated['portaone_token'] ? ['portaone_token' => $validated['portaone_token']] : []),
        ]);

        return to_route('admin.clients.index');
    }

    public function destroy(Request $request, Client $client): RedirectResponse
    {
        if ($client->users()->where('id', $request->user()->id)->exists()) {
            return back()->withErrors(['client' => 'No puedes eliminar el cliente al que pertenece tu propia sesión.']);
        }

        DB::transaction(function () use ($client) {
            $client->users()->delete();
            $client->delete();
        });

        return to_route('admin.clients.index');
    }

    public function testConnection(Client $client): JsonResponse
    {
        try {
            $result = (new PortaOneClient($client))->testConnection();
        } catch (RuntimeException $exception) {
            return response()->json(['error' => $exception->getMessage()], 422);
        }

        return response()->json($result);
    }
}
