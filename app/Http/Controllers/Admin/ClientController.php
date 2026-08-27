<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SyncPortaOneCalls;
use App\Models\PortaoneAccount;
use App\Jobs\SyncPortaOneData;
use App\Models\Client;
use App\Models\ProcessRun;
use App\Models\User;
use App\Services\PortaOneClient;
use App\Support\Timezones;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ClientController extends Controller
{
    public function index(): Response
    {
        $latestSyncRuns = ProcessRun::query()
            ->where('type', 'portaone_sync')
            ->whereIn('id', function ($query) {
                $query->selectRaw('max(id)')
                    ->from('process_runs')
                    ->where('type', 'portaone_sync')
                    ->groupBy('client_id');
            })
            ->get()
            ->keyBy('client_id');

        return Inertia::render('Admin/Clients', [
            'clients' => Client::withCount([
                    'users',
                    'portaoneProducts as products_count',
                    'portaoneCustomers as customers_count' => fn ($query) => $query->whereNull('archived_at'),
                    'portaoneAccounts as accounts_count' => fn ($query) => $query->whereNull('archived_at'),
                    'callRecords as calls_count',
                ])
                ->with(['users' => fn ($query) => $query->orderBy('name')->select('id', 'client_id', 'name', 'username', 'email', 'role')])
                ->latest()
                ->get()
                ->map(function (Client $client) use ($latestSyncRuns): array {
                    $run = $latestSyncRuns->get($client->id);

                    return [
                        'id' => $client->id,
                        'name' => $client->name,
                        'timezone' => $client->timezone,
                        'portaoneEnvironment' => $client->portaone_environment,
                        'portaoneUsername' => $client->portaone_username,
                        'telegramChatId' => $client->telegram_chat_id,
                        'notificationEmail' => $client->notification_email,
                        'useCustomTelegramBot' => $client->use_custom_telegram_bot,
                        'hasCustomTelegramBotToken' => filled($client->telegram_bot_token),
                        'usersCount' => $client->users_count,
                        'users' => $client->users->map(fn (User $user) => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'username' => $user->username,
                            'email' => $user->email,
                            'role' => $user->role,
                        ]),
                        'productsCount' => $client->products_count,
                        'customersCount' => $client->customers_count,
                        'accountsCount' => $client->accounts_count,
                        'callsCount' => $client->calls_count,
                        'createdAt' => $client->created_at,
                        'syncRun' => $run ? [
                            'status' => $run->status,
                            'context' => $run->context,
                            'message' => $run->message,
                            'startedAt' => $run->started_at,
                            'finishedAt' => $run->finished_at,
                        ] : null,
                    ];
                }),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'timezone' => ['nullable', 'string', Rule::in(Timezones::values())],
            'portaone_environment' => ['required', 'string', 'max:255'],
            'portaone_username' => ['required', 'string', 'max:255'],
            'portaone_token' => ['required', 'string'],
            'telegram_chat_id' => ['nullable', 'string', 'max:255'],
            'notification_email' => ['nullable', 'string', 'email', 'max:255'],
            'use_custom_telegram_bot' => ['boolean'],
            'telegram_bot_token' => ['nullable', 'string'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_username' => ['required', 'string', 'max:255', 'unique:'.User::class.',username'],
            'admin_email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'admin_password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        DB::transaction(function () use ($validated) {
            $client = Client::create([
                'name' => $validated['name'],
                'timezone' => $validated['timezone'] ?: null,
                'portaone_environment' => $validated['portaone_environment'],
                'portaone_username' => $validated['portaone_username'],
                'portaone_token' => $validated['portaone_token'],
                'telegram_chat_id' => $validated['telegram_chat_id'] ?: null,
                'notification_email' => $validated['notification_email'] ?: null,
                'use_custom_telegram_bot' => $validated['use_custom_telegram_bot'] ?? false,
                'telegram_bot_token' => $validated['telegram_bot_token'] ?: null,
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
            'timezone' => ['nullable', 'string', Rule::in(Timezones::values())],
            'portaone_environment' => ['required', 'string', 'max:255'],
            'portaone_username' => ['required', 'string', 'max:255'],
            'portaone_token' => ['nullable', 'string'],
            'telegram_chat_id' => ['nullable', 'string', 'max:255'],
            'notification_email' => ['nullable', 'string', 'email', 'max:255'],
            'use_custom_telegram_bot' => ['boolean'],
            'telegram_bot_token' => ['nullable', 'string'],
        ]);

        $client->update([
            'name' => $validated['name'],
            'timezone' => $validated['timezone'] ?: null,
            'portaone_environment' => $validated['portaone_environment'],
            'portaone_username' => $validated['portaone_username'],
            'telegram_chat_id' => $validated['telegram_chat_id'] ?: null,
            'notification_email' => $validated['notification_email'] ?: null,
            'use_custom_telegram_bot' => $validated['use_custom_telegram_bot'] ?? false,
            ...($validated['portaone_token'] ? ['portaone_token' => $validated['portaone_token']] : []),
            ...($validated['telegram_bot_token'] ? ['telegram_bot_token' => $validated['telegram_bot_token']] : []),
        ]);

        return to_route('admin.clients.index');
    }

    public function storeUser(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:'.User::class.',username'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->where('client_id', $client->id)],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', 'in:client_admin,client_user'],
        ]);

        $client->users()->create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return to_route('admin.clients.index')->with('success', 'El usuario fue creado.');
    }

    public function updateUser(Request $request, Client $client, User $user): RedirectResponse
    {
        abort_unless($user->client_id === $client->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username,'.$user->id],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->where('client_id', $client->id)->ignore($user->id)],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', 'in:client_admin,client_user'],
        ]);

        if ($user->role === 'client_admin'
            && $validated['role'] === 'client_user'
            && $client->users()->where('role', 'client_admin')->count() === 1) {
            throw ValidationException::withMessages([
                'role' => 'El cliente debe conservar al menos un administrador.',
            ]);
        }

        $user->update([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            ...($validated['password'] ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        return to_route('admin.clients.index')->with('success', 'El usuario fue actualizado.');
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

    public function sync(Client $client): RedirectResponse
    {
        SyncPortaOneData::dispatch($client->id);

        PortaoneAccount::query()
            ->where('client_id', $client->id)
            ->active()
            ->pluck('i_account')
            ->filter()
            ->chunk(150)
            ->each(fn ($chunk) => SyncPortaOneCalls::dispatch($client->id, $chunk->values()->all()));

        return back();
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
