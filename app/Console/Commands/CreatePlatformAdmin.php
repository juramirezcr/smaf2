<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreatePlatformAdmin extends Command
{
    protected $signature = 'smaf:make-admin
                            {--name= : Full name}
                            {--username= : Login username}
                            {--email= : Email address}
                            {--password= : Password (omit to be prompted securely instead of leaving it in shell history)}';

    protected $description = 'Create a platform administrator user with no client attached.';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Nombre completo');
        $username = $this->option('username') ?: $this->ask('Usuario de acceso');
        $email = $this->option('email') ?: $this->ask('Correo electrónico');
        $password = $this->option('password') ?: $this->secret('Contraseña');

        $validator = Validator::make(
            compact('name', 'username', 'email', 'password'),
            [
                'name' => ['required', 'string', 'max:255'],
                'username' => ['required', 'string', 'max:255', 'unique:'.User::class.',username'],
                'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
                'password' => ['required', 'string', 'min:8'],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        $validated = $validator->validated();

        User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'client_user',
            'client_id' => null,
        ]);

        $this->info("Administrador '{$validated['username']}' creado correctamente, sin cliente asociado.");

        return self::SUCCESS;
    }
}
