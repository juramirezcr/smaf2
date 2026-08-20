<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportLegacyClientsCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $dumpPath;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.key' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']);
        $directory = storage_path('framework/testing');
        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        $this->dumpPath = $directory.'/legacy-clients-'.uniqid('', true).'.sql';
        file_put_contents($this->dumpPath, <<<'SQL'
INSERT INTO `usuarios` (`id`, `particion`, `api_usuario`, `api_clave`, `usuario`, `password`, `nombre`, `email`, `correo_cc`, `telefono1`, `telefono2`, `cliente`, `titulo`, `notificacion`, `alerta_titulo`, `alerta`, `acceso`, `activar_sms`, `limite_prefijos`) VALUES
(7, 2, 'portaone-api', 'portaone-token', 'root-user', 'unused', 'Cliente legado', 'client@example.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ADMIN', 0, 0);
INSERT INTO `sub_usuarios` (`id`, `usuario_id`, `nombre`, `email`, `usuario`, `password`, `notificar`, `telegram`, `telegram_chat_id`, `telegram_token`, `telefono1`, `telefono2`, `acceso`) VALUES
(32, 7, 'Operador legado', 'operator@example.com', 'legacy-operator', 'legacy-password', 'SI', 'NO', NULL, NULL, NULL, NULL, 'CLIENTE');
SQL);
    }

    protected function tearDown(): void
    {
        @unlink($this->dumpPath);

        parent::tearDown();
    }

    public function test_it_is_a_dry_run_unless_apply_is_supplied(): void
    {
        $this->artisan('smaf:import-legacy-clients', ['dump' => $this->dumpPath])
            ->assertExitCode(0);

        $this->assertDatabaseCount('clients', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_it_imports_clients_and_their_sub_users_idempotently(): void
    {
        $this->artisan('smaf:import-legacy-clients', [
            'dump' => $this->dumpPath,
            '--apply' => true,
        ])->assertExitCode(0);

        $client = Client::sole();
        $this->assertSame(7, $client->legacy_user_id);
        $this->assertSame('2', $client->portaone_environment);
        $this->assertSame('portaone-api', $client->portaone_username);
        $this->assertSame('portaone-token', $client->portaone_token);

        $user = User::sole();
        $this->assertSame($client->id, $user->client_id);
        $this->assertSame(32, $user->legacy_sub_user_id);
        $this->assertSame('legacy-operator', $user->username);
        $this->assertTrue($user->isClientAdmin() === false);

        $this->artisan('smaf:import-legacy-clients', [
            'dump' => $this->dumpPath,
            '--apply' => true,
        ])->assertExitCode(0);

        $this->assertDatabaseCount('clients', 1);
        $this->assertDatabaseCount('users', 1);
    }
}
