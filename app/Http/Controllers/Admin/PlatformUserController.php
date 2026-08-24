<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class PlatformUserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/PlatformUsers', [
            'users' => User::query()
                ->whereNull('client_id')
                ->latest()
                ->get(['id', 'name', 'username', 'email', 'read_only', 'created_at'])
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'readOnly' => $user->read_only,
                    'createdAt' => $user->created_at,
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:'.User::class.',username'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'read_only' => ['boolean'],
        ]);

        User::create([
            ...$validated,
            'client_id' => null,
            'password' => Hash::make($validated['password']),
            'read_only' => $validated['read_only'] ?? false,
        ]);

        return to_route('admin.platform-users.index');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->client_id !== null, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username,'.$user->id],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'read_only' => ['boolean'],
        ]);

        $user->update([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'read_only' => $validated['read_only'] ?? false,
            ...($validated['password'] ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        return to_route('admin.platform-users.index');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->client_id !== null, 404);

        if ($user->id === $request->user()->id) {
            return back()->withErrors(['user' => 'No puedes eliminar tu propio usuario.']);
        }

        $user->delete();

        return to_route('admin.platform-users.index');
    }
}
