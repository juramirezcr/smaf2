<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\User;
use App\Services\LegacyPrefixSqlReader;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

class ImportLegacyClients extends Command
{
    protected $signature = 'smaf:import-legacy-clients
                            {dump : Path to the legacy MySQL dump}
                            {--apply : Persist changes; without it the command is a dry run}';

    protected $description = 'Import legacy clients and their sub-users into SMAF 2.';

    /**
     * @var array<string, int>
     */
    private array $summary = [
        'clients_seen' => 0,
        'clients_created' => 0,
        'clients_updated' => 0,
        'users_seen' => 0,
        'users_created' => 0,
        'users_updated' => 0,
        'users_skipped' => 0,
    ];

    /**
     * @var array<string, Client>
     */
    private array $clients = [];

    public function handle(LegacyPrefixSqlReader $reader): int
    {
        $path = (string) $this->argument('dump');

        if (! is_file($path) || ! is_readable($path)) {
            $this->error('The dump path must be a readable regular file.');

            return self::FAILURE;
        }

        $apply = (bool) $this->option('apply');

        try {
            $import = function () use ($reader, $path, $apply): void {
                foreach ($reader->rows($path, 'usuarios') as $row) {
                    $this->importClient($row, $apply);
                }

                foreach ($reader->rows($path, 'sub_usuarios') as $row) {
                    $this->importUser($row, $apply);
                }
            };

            if ($apply) {
                DB::transaction($import);
            } else {
                $import();
            }
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Import stopped because the dump has unsupported client data or conflicting usernames.');

            return self::FAILURE;
        }

        if ($this->summary['clients_seen'] === 0) {
            $this->error('No supported legacy client rows were found in the dump.');

            return self::FAILURE;
        }

        $mode = $apply ? 'applied' : 'dry run';
        $this->info(sprintf(
            'Legacy client import %s: clients seen=%d created=%d updated=%d; users seen=%d created=%d updated=%d skipped=%d.',
            $mode,
            $this->summary['clients_seen'],
            $this->summary['clients_created'],
            $this->summary['clients_updated'],
            $this->summary['users_seen'],
            $this->summary['users_created'],
            $this->summary['users_updated'],
            $this->summary['users_skipped'],
        ));

        return self::SUCCESS;
    }

    /**
     * @param  array<string, string|null>  $row
     */
    private function importClient(array $row, bool $apply): void
    {
        $this->summary['clients_seen']++;
        $legacyId = $this->legacyId($row['id'] ?? null);

        if ($legacyId === null) {
            throw new \UnexpectedValueException('A legacy client row has an invalid ID.');
        }

        $attributes = [
            'name' => $this->requiredText($row['nombre'] ?? null, 'client name'),
            'portaone_environment' => $this->requiredText($row['particion'] ?? null, 'environment'),
            'portaone_username' => $this->requiredText($row['api_usuario'] ?? null, 'API username'),
            'portaone_token' => $this->requiredText($row['api_clave'] ?? null, 'API token'),
        ];

        $client = Client::query()->firstOrNew(['legacy_user_id' => $legacyId]);
        $exists = $client->exists;
        $client->fill($attributes);

        if ($client->isDirty() && $apply) {
            $client->save();
        }

        $this->clients[$legacyId] = $client;
        $this->summary[$exists ? 'clients_updated' : 'clients_created']++;
    }

    /**
     * @param  array<string, string|null>  $row
     */
    private function importUser(array $row, bool $apply): void
    {
        $this->summary['users_seen']++;
        $legacyId = $this->legacyId($row['id'] ?? null);
        $legacyClientId = $this->legacyId($row['usuario_id'] ?? null);

        if ($legacyId === null || $legacyClientId === null || ! isset($this->clients[$legacyClientId])) {
            $this->summary['users_skipped']++;

            return;
        }

        $username = $this->requiredText($row['usuario'] ?? null, 'username');
        $password = $this->requiredText($row['password'] ?? null, 'password');
        $client = $this->clients[$legacyClientId];

        $user = User::query()->firstOrNew(['legacy_sub_user_id' => $legacyId]);

        if ($user->exists && $user->client_id !== $client->id) {
            throw new \UnexpectedValueException('A legacy sub-user ID belongs to another client.');
        }

        $usernameOwner = User::query()->where('username', $username)->first();
        if ($usernameOwner !== null && (string) $usernameOwner->legacy_sub_user_id !== $legacyId) {
            throw new \UnexpectedValueException('A legacy username conflicts with an existing SMAF 2 user.');
        }

        $exists = $user->exists;
        $attributes = [
            'client_id' => $client->id,
            'name' => $this->requiredText($row['nombre'] ?? null, 'sub-user name'),
            'username' => $username,
            'email' => $this->email($row['email'] ?? null, $legacyId),
            'role' => strtoupper(trim((string) ($row['acceso'] ?? ''))) === 'ADMIN'
                ? 'client_admin'
                : 'client_user',
        ];

        if (! $user->exists || ! Hash::check($password, $user->password)) {
            $attributes['password'] = Hash::make($password);
        }

        $user->fill($attributes);

        if ($apply) {
            $user->save();
        }

        $this->summary[$exists ? 'users_updated' : 'users_created']++;
    }

    private function legacyId(?string $value): ?string
    {
        $value = trim((string) $value);

        return ctype_digit($value) && (int) $value > 0 ? $value : null;
    }

    private function requiredText(?string $value, string $field): string
    {
        $value = trim((string) $value);

        if ($value === '') {
            throw new \UnexpectedValueException("A legacy row has no {$field}.");
        }

        return Str::limit($value, 255, '');
    }

    private function email(?string $value, string $legacyId): string
    {
        $value = trim((string) $value);

        return filter_var($value, FILTER_VALIDATE_EMAIL)
            ? Str::lower($value)
            : "legacy-sub-user-{$legacyId}@invalid.local";
    }
}
