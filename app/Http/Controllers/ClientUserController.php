<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ClientUserController extends Controller
{
    public function index(Request $request): Response
    {
        $this->ensureClientAdmin($request);

        return Inertia::render('Users/Index', [
            'users' => $request->user()->client->users()
                ->latest()
                ->get(['id', 'name', 'email', 'role', 'created_at'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                    'createdAt' => $user->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->ensureClientAdmin($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:'.User::class],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->where('client_id', $request->user()->client_id)],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', 'in:client_admin,client_user'],
        ]);

        $request->user()->client->users()->create([
            ...$validated,
            'password' => Hash::make($validated['password']),
        ]);

        return to_route('users.index')->with('success', 'El usuario fue creado.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $this->ensureClientAdmin($request);

        $user = $request->user()->client->users()->findOrFail($user->id);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username,'.$user->id],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique(User::class)->where('client_id', $user->client_id)->ignore($user->id)],
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', 'in:client_admin,client_user'],
        ]);

        if ($user->isClientAdmin()
            && $validated['role'] === 'client_user'
            && $request->user()->client->users()->where('role', 'client_admin')->count() === 1) {
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

        return to_route('users.index')->with('success', 'El usuario fue actualizado.');
    }

    private function ensureClientAdmin(Request $request): void
    {
        abort_unless($request->user()->isClientAdmin(), 403);
    }
}
