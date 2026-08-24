<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\MonitoringRule;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpandGlobalPrefixRules extends Command
{
    protected $signature = 'smaf:expand-global-prefix-rules {--apply : Persist changes; without it the command is a dry run}';

    protected $description = 'Elimina las reglas de prefijo globales (client_id null), creando una copia específica para cada cliente que no tenga ya un override para ese mismo prefijo.';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $clients = Client::query()->get(['id', 'name']);

        if ($clients->isEmpty()) {
            $this->error('No hay clientes registrados.');

            return self::FAILURE;
        }

        $firstUserByClient = User::query()
            ->whereIn('client_id', $clients->pluck('id'))
            ->orderBy('id')
            ->get(['id', 'client_id'])
            ->groupBy('client_id')
            ->map(fn ($users) => $users->first()->id);

        $globalRules = MonitoringRule::query()
            ->where('scope', 'prefix')
            ->whereNull('client_id')
            ->get();

        if ($globalRules->isEmpty()) {
            $this->info('No hay reglas globales de prefijo.');

            return self::SUCCESS;
        }

        $created = 0;
        $skippedOverride = 0;
        $skippedNoUser = 0;
        $processed = 0;

        foreach ($globalRules as $rule) {
            $existingClientIds = MonitoringRule::query()
                ->where('scope', 'prefix')
                ->whereNotNull('client_id')
                ->where('match_value', $rule->match_value)
                ->where('account', $rule->account)
                ->where('customer', $rule->customer)
                ->pluck('client_id')
                ->all();

            foreach ($clients as $client) {
                if (in_array($client->id, $existingClientIds, true)) {
                    $skippedOverride++;

                    continue;
                }

                $userId = $firstUserByClient->get($client->id);

                if ($userId === null) {
                    $this->warn(sprintf('Cliente "%s" no tiene usuarios; se omite el prefijo %s.', $client->name, $rule->match_value));
                    $skippedNoUser++;

                    continue;
                }

                $this->line(sprintf('Prefijo %s -> crear para cliente "%s".', $rule->match_value, $client->name));

                if ($apply) {
                    MonitoringRule::create([
                        'scope' => 'prefix',
                        'client_id' => $client->id,
                        'user_id' => $userId,
                        'match_value' => $rule->match_value,
                        'account' => $rule->account,
                        'customer' => $rule->customer,
                        'country' => $rule->country,
                        'description' => $rule->description,
                        'call_limit' => $rule->call_limit,
                        'duration_limit_seconds' => $rule->duration_limit_seconds,
                        'action' => $rule->action,
                        'enabled' => $rule->enabled,
                    ]);
                }

                $created++;
            }

            if ($apply) {
                DB::transaction(fn () => $rule->delete());
            }

            $processed++;
        }

        $mode = $apply ? 'aplicado' : 'dry run';
        $this->info(sprintf(
            'Expansión de reglas globales (%s): reglas globales procesadas=%d, copias creadas=%d, ya tenían override=%d, clientes sin usuarios=%d.',
            $mode,
            $processed,
            $created,
            $skippedOverride,
            $skippedNoUser,
        ));

        return self::SUCCESS;
    }
}
