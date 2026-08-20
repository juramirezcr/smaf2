<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
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
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => ['required', 'in:client_admin,client_user'],
        ]);

        $request->user()->client->users()->create([
            ...$validated,
            'password' => Hash::make($validated['password']),
        ]);

        return to_route('users.index')->with('success', 'El usuario fue creado.');
    }

    private function ensureClientAdmin(Request $request): void
    {
        abort_unless($request->user()->isClientAdmin(), 403);
    }
}
