<?php

namespace Tests\Feature;

use App\Models\MonitoringRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportLegacyPrefixesCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $dumpPath;

    protected function setUp(): void
    {
        parent::setUp();

        $directory = storage_path('framework/testing');
        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        $this->dumpPath = $directory.'/legacy-prefixes-'.uniqid('', true).'.sql';
        file_put_contents($this->dumpPath, <<<'SQL'
INSERT INTO `calls` (`id`, `token`) VALUES (1, 'must not be imported');
INSERT INTO `prefijos` (`id`, `usuario_id`, `prefijo`, `pais`, `descripcion`, `llamadas`, `minutos`, `llamadas_cuenta`, `minutos_cuenta`, `llamadas_actual`, `minutos_actual`, `t1`, `t2`, `t3`, `t4`, `estado`, `accion`) VALUES
(1, 7, '506', 'Costa Rica', 'Catalog default', 10, 2, 0, 0, 0, 0, 0, 0, 0, 0, 'A', 'N');
INSERT INTO `destinos_conf` (`id`, `usuario_id`, `prefijo`, `pais`, `flag`, `descripcion`, `llamadas`, `segundos`, `llamadas_cuenta`, `segundos_cuenta`, `llamadas_actual`, `segundos_actual`, `t1`, `t2`, `t3`, `t4`, `estado`, `accion`) VALUES
(1, 7, '506', 'Costa Rica', 'CR', 'Config O\'Brien, preferred', 20, 300, 0, 0, 0, 0, 0, 0, 0, 0, 'A', 'B'),
(2, 99, '999', 'Elsewhere', 'XX', 'Other user', 3, 60, 0, 0, 0, 0, 0, 0, 0, 0, 'A', 'N');
SQL);
    }

    protected function tearDown(): void
    {
        @unlink($this->dumpPath);

        parent::tearDown();
    }

    public function test_it_is_a_dry_run_unless_apply_is_supplied(): void
    {
        $user = User::factory()->create();

        $this->artisan('smaf:import-legacy-prefixes', [
            'dump' => $this->dumpPath,
            '--user' => $user->id,
        ])->assertExitCode(0);

        $this->assertDatabaseCount('monitoring_rules', 0);
    }

    public function test_it_imports_only_the_selected_legacy_user_and_is_idempotent(): void
    {
        $user = User::factory()->create();

        $this->artisan('smaf:import-legacy-prefixes', [
            'dump' => $this->dumpPath,
            '--user' => $user->id,
            '--legacy-user' => 7,
            '--apply' => true,
        ])->assertExitCode(0);

        $this->assertDatabaseCount('monitoring_rules', 1);
        $this->assertDatabaseHas('monitoring_rules', [
            'user_id' => $user->id,
            'scope' => 'prefix',
            'match_value' => '506',
            'country' => 'Costa Rica',
            'description' => "Config O'Brien, preferred",
            'call_limit' => 20,
            'duration_limit_seconds' => 300,
            'action' => 'block',
            'enabled' => true,
        ]);

        $this->artisan('smaf:import-legacy-prefixes', [
            'dump' => $this->dumpPath,
            '--user' => $user->id,
            '--legacy-user' => 7,
            '--apply' => true,
        ])->assertExitCode(0);

        $this->assertDatabaseCount('monitoring_rules', 1);
        $this->assertSame('506', MonitoringRule::sole()->match_value);
    }
}
