<?php

namespace App\Console\Commands;

use App\Models\MonitoringRule;
use App\Models\User;
use App\Services\LegacyPrefixSqlReader;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class ImportLegacyPrefixes extends Command
{
    protected $signature = 'smaf:import-legacy-prefixes
                            {dump : Path to the legacy MySQL dump}
                            {--user= : Target SMAF 2 user ID (required)}
                            {--legacy-user= : Legacy usuario_id (defaults to --user)}
                            {--apply : Persist changes; without it the command is a dry run}';

    protected $description = 'Import only selected legacy prefix configuration into SMAF 2.';

    /**
     * @var array<string, int>
     */
    private array $summary = [
        'seen' => 0,
        'created' => 0,
        'updated' => 0,
        'unchanged' => 0,
        'skipped' => 0,
    ];

    public function handle(LegacyPrefixSqlReader $reader): int
    {
        $path = (string) $this->argument('dump');
        $userId = $this->option('user');
        $legacyUserId = $this->option('legacy-user') ?? $userId;

        if (! is_string($userId) && ! is_int($userId)) {
            $this->error('The --user option is required.');

            return self::INVALID;
        }

        if (! is_file($path) || ! is_readable($path)) {
            $this->error('The dump path must be a readable regular file.');

            return self::FAILURE;
        }

        $user = User::query()->find($userId);

        if ($user === null) {
            $this->error('The selected SMAF 2 user does not exist.');

            return self::FAILURE;
        }

        $apply = (bool) $this->option('apply');
        $legacyUserId = (string) $legacyUserId;

        try {
            $import = function () use ($reader, $path, $user, $legacyUserId, $apply): void {
                // User-specific destinos_conf rows take precedence over catalog defaults.
                foreach (['destinos_conf', 'prefijos'] as $table) {
                    foreach ($reader->rows($path, $table) as $row) {
                        $this->importRow($row, $table, $user, $legacyUserId, $apply);
                    }
                }
            };

            if ($apply) {
                DB::transaction($import);
            } else {
                $import();
            }
        } catch (Throwable $exception) {
            report($exception);
            $this->error('Import stopped because the dump is not a supported legacy prefix dump.');

            return self::FAILURE;
        }

        if ($this->summary['seen'] === 0) {
            $this->error('No supported legacy prefix rows were found in the dump.');

            return self::FAILURE;
        }

        $mode = $apply ? 'applied' : 'dry run';
        $this->info(sprintf(
            'Legacy prefix import %s: seen=%d created=%d updated=%d unchanged=%d skipped=%d.',
            $mode,
            $this->summary['seen'],
            $this->summary['created'],
            $this->summary['updated'],
            $this->summary['unchanged'],
            $this->summary['skipped'],
        ));

        return self::SUCCESS;
    }

    /**
     * @param  array<string, string|null>  $row
     */
    private function importRow(array $row, string $table, User $user, string $legacyUserId, bool $apply): void
    {
        $this->summary['seen']++;

        if ((string) ($row['usuario_id'] ?? '') !== $legacyUserId) {
            $this->summary['skipped']++;

            return;
        }

        $attributes = $this->ruleAttributes($row, $table);

        if ($attributes === null) {
            $this->summary['skipped']++;

            return;
        }

        $rule = MonitoringRule::query()->firstOrNew([
            'user_id' => $user->id,
            'scope' => 'prefix',
            'match_value' => $attributes['match_value'],
        ]);

        if ($table === 'prefijos' && $rule->exists) {
            $this->summary['unchanged']++;

            return;
        }

        $exists = $rule->exists;
        $rule->fill($attributes);

        if (! $rule->isDirty()) {
            $this->summary['unchanged']++;

            return;
        }

        if ($apply) {
            $rule->save();
        }

        $this->summary[$exists ? 'updated' : 'created']++;
    }

    /**
     * @param  array<string, string|null>  $row
     * @return array<string, bool|int|string|null>|null
     */
    private function ruleAttributes(array $row, string $table): ?array
    {
        $prefix = trim((string) ($row['prefijo'] ?? ''));

        if (! preg_match('/^\d{1,16}$/', $prefix)) {
            return null;
        }

        $callLimit = $this->nullableLimit($row['llamadas'] ?? null, 1);
        $duration = $this->nullableLimit(
            $table === 'prefijos'
                ? $this->minutesToSeconds($row['minutos'] ?? null)
                : ($row['segundos'] ?? null),
            1,
        );

        if ($callLimit === false || $duration === false) {
            return null;
        }

        return [
            'match_value' => $prefix,
            'country' => $this->nullableText($row['pais'] ?? null, 80),
            'description' => $this->nullableText($row['descripcion'] ?? null, 500),
            'call_limit' => $callLimit,
            'duration_limit_seconds' => $duration,
            'action' => $this->action($row['accion'] ?? null),
            'enabled' => $this->enabled($row['estado'] ?? null),
        ];
    }

    private function minutesToSeconds(?string $minutes): string|false|null
    {
        if ($minutes === null || trim($minutes) === '' || trim($minutes) === '0') {
            return null;
        }

        if (! ctype_digit(trim($minutes)) || (int) $minutes > intdiv(4_294_967_295, 60)) {
            return false;
        }

        return (string) ((int) $minutes * 60);
    }

    private function nullableLimit(string|false|null $value, int $minimum): int|false|null
    {
        if ($value === null || trim($value) === '' || trim($value) === '0') {
            return null;
        }

        $value = trim($value);

        if (! ctype_digit($value) || (int) $value < $minimum || (int) $value > 4_294_967_295) {
            return false;
        }

        return (int) $value;
    }

    private function nullableText(?string $value, int $limit): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : Str::limit($value, $limit, '');
    }

    private function action(?string $action): string
    {
        return match (strtoupper(trim((string) $action))) {
            'B', 'BLOCK', 'BLOQUEAR' => 'block',
            'I', 'IGNORE', 'IGNORAR' => 'ignore',
            default => 'notify',
        };
    }

    private function enabled(?string $state): bool
    {
        return in_array(strtoupper(trim((string) $state)), ['A', 'ACTIVE', 'ACTIVO', '1', 'Y', 'YES'], true);
    }
}
