<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\MonitoringRule;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportLegacyDestinosCsv extends Command
{
    protected $signature = 'smaf:import-legacy-destinos-csv
                            {csv : Path to the destinos_conf CSV export}
                            {--apply : Persist changes; without it the command is a dry run}';

    protected $description = 'Import legacy destinos_conf prefix rules from a CSV export, mapping each usuario_id to its Client via legacy_user_id.';

    private const EXPECTED_HEADER = [
        'id', 'usuario_id', 'prefijo', 'pais', 'flag', 'descripcion', 'llamadas',
        'segundos', 'llamadas_cuenta', 'segundos_cuenta', 'llamadas_actual',
        'segundos_actual', 't1', 't2', 't3', 't4', 'estado', 'accion',
    ];

    /**
     * @var array<string, int>
     */
    private array $summary = [
        'seen' => 0,
        'created' => 0,
        'updated' => 0,
        'unchanged' => 0,
        'skipped_no_client' => 0,
        'skipped_no_user' => 0,
        'skipped_invalid' => 0,
    ];

    public function handle(): int
    {
        $path = (string) $this->argument('csv');

        if (! is_file($path) || ! is_readable($path)) {
            $this->error('The CSV path must be a readable regular file.');

            return self::FAILURE;
        }

        $handle = fopen($path, 'r');

        if ($handle === false) {
            $this->error('Unable to open the CSV file.');

            return self::FAILURE;
        }

        $header = fgetcsv($handle, 0, ';');

        if ($header !== self::EXPECTED_HEADER) {
            fclose($handle);
            $this->error('Unexpected CSV columns; expected the destinos_conf layout.');

            return self::FAILURE;
        }

        $apply = (bool) $this->option('apply');
        $clientCache = [];
        $userCache = [];

        $import = function () use ($handle, $header, $apply, &$clientCache, &$userCache) {
            while (($values = fgetcsv($handle, 0, ';')) !== false) {
                if (count($values) !== count($header)) {
                    continue;
                }

                $this->importRow(array_combine($header, $values), $apply, $clientCache, $userCache);
            }
        };

        if ($apply) {
            DB::transaction($import);
        } else {
            $import();
        }

        fclose($handle);

        $mode = $apply ? 'applied' : 'dry run';
        $this->info(sprintf(
            'Legacy destinos_conf CSV import %s: seen=%d created=%d updated=%d unchanged=%d skipped_no_client=%d skipped_no_user=%d skipped_invalid=%d.',
            $mode,
            $this->summary['seen'],
            $this->summary['created'],
            $this->summary['updated'],
            $this->summary['unchanged'],
            $this->summary['skipped_no_client'],
            $this->summary['skipped_no_user'],
            $this->summary['skipped_invalid'],
        ));

        return self::SUCCESS;
    }

    /**
     * @param  array<string, string|null>  $row
     * @param  array<string, Client|null>  $clientCache
     * @param  array<int, User|null>  $userCache
     */
    private function importRow(array $row, bool $apply, array &$clientCache, array &$userCache): void
    {
        $this->summary['seen']++;

        $legacyUserId = trim((string) ($row['usuario_id'] ?? ''));

        if (! array_key_exists($legacyUserId, $clientCache)) {
            $clientCache[$legacyUserId] = Client::query()->where('legacy_user_id', $legacyUserId)->first();
        }

        $client = $clientCache[$legacyUserId];

        if ($client === null) {
            $this->summary['skipped_no_client']++;

            return;
        }

        if (! array_key_exists($client->id, $userCache)) {
            $userCache[$client->id] = User::query()->where('client_id', $client->id)->orderBy('id')->first();
        }

        $user = $userCache[$client->id];

        if ($user === null) {
            $this->summary['skipped_no_user']++;

            return;
        }

        $attributes = $this->ruleAttributes($row);

        if ($attributes === null) {
            $this->summary['skipped_invalid']++;

            return;
        }

        $rule = MonitoringRule::query()->firstOrNew([
            'client_id' => $client->id,
            'scope' => 'prefix',
            'match_value' => $attributes['match_value'],
        ]);

        $exists = $rule->exists;
        $rule->fill(['user_id' => $user->id, ...$attributes]);

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
    private function ruleAttributes(array $row): ?array
    {
        $prefix = trim((string) ($row['prefijo'] ?? ''));

        if (! preg_match('/^\d{1,16}$/', $prefix)) {
            return null;
        }

        $callLimit = $this->nullableLimit($row['llamadas'] ?? null, 1);
        $duration = $this->nullableLimit($row['segundos'] ?? null, 1);

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

    private function nullableLimit(?string $value, int $minimum): int|false|null
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
