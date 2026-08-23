<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\MonitoringRule;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CollapseGlobalPrefixRules extends Command
{
    protected $signature = 'smaf:collapse-global-prefix-rules {--apply : Persist changes; without it the command is a dry run}';

    protected $description = 'Colapsa reglas de prefijo idénticas repetidas en todos los clientes en una sola regla global (client_id null).';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $clientIds = Client::query()->pluck('id')->sort()->values();

        if ($clientIds->isEmpty()) {
            $this->error('No hay clientes registrados.');

            return self::FAILURE;
        }

        $rules = MonitoringRule::query()
            ->where('scope', 'prefix')
            ->whereNotNull('client_id')
            ->get();

        $groups = $rules->groupBy(fn (MonitoringRule $rule) => implode('|', [
            $rule->match_value,
            $rule->account ?? '',
            $rule->customer ?? '',
        ]));

        $collapsible = 0;
        $deleted = 0;
        $skippedDifferent = 0;
        $skippedIncomplete = 0;

        foreach ($groups as $group) {
            $groupClientIds = $group->pluck('client_id')->sort()->values();

            if ($groupClientIds->count() !== $clientIds->count() || $groupClientIds->toArray() !== $clientIds->toArray()) {
                $skippedIncomplete++;

                continue;
            }

            $signature = $group->map(fn (MonitoringRule $rule) => implode('|', [
                $rule->call_limit ?? '',
                $rule->duration_limit_seconds ?? '',
                $rule->action,
                $rule->enabled ? '1' : '0',
                $rule->country ?? '',
            ]))->unique();

            if ($signature->count() !== 1) {
                $skippedDifferent++;

                continue;
            }

            $collapsible++;
            $keep = $group->sortBy('id')->first();
            $toDelete = $group->reject(fn (MonitoringRule $rule) => $rule->id === $keep->id);

            $this->line(sprintf(
                'Prefijo %s: conservar #%d (client_id %s -> null), eliminar %s',
                $keep->match_value,
                $keep->id,
                $keep->client_id,
                $toDelete->pluck('id')->implode(', '),
            ));

            if ($apply) {
                DB::transaction(function () use ($keep, $toDelete, &$deleted) {
                    $keep->update(['client_id' => null]);
                    MonitoringRule::query()->whereIn('id', $toDelete->pluck('id'))->delete();
                    $deleted += $toDelete->count();
                });
            } else {
                $deleted += $toDelete->count();
            }
        }

        $mode = $apply ? 'aplicado' : 'dry run';
        $this->info(sprintf(
            'Colapso de reglas globales (%s): grupos colapsables=%d, filas eliminadas=%d, grupos con valores distintos entre clientes=%d, grupos incompletos (no cubren todos los clientes)=%d.',
            $mode,
            $collapsible,
            $deleted,
            $skippedDifferent,
            $skippedIncomplete,
        ));

        return self::SUCCESS;
    }
}
