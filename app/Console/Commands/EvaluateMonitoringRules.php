<?php

namespace App\Console\Commands;

use App\Models\CallRecord;
use App\Models\MonitoringRule;
use App\Models\MonitoringRuleEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

class EvaluateMonitoringRules extends Command
{
    protected $signature = 'smaf:evaluate-monitoring-rules';

    protected $description = 'Evalúa las reglas de prefijo contra las llamadas de la última hora y genera alertas cuando una cuenta supera los límites configurados.';

    public function handle(): int
    {
        $rules = MonitoringRule::query()
            ->where('scope', 'prefix')
            ->where('enabled', true)
            ->whereNotNull('client_id')
            ->where(function ($query) {
                $query->whereNotNull('call_limit')->orWhereNotNull('duration_limit_seconds');
            })
            ->get();

        if ($rules->isEmpty()) {
            $this->info('No hay reglas de prefijo activas con límites configurados.');

            return self::SUCCESS;
        }

        // Una sola consulta para todos los clientes en vez de una por regla:
        // con ~1400 reglas importadas, hacer un query por regla escaneaba la
        // tabla de llamadas 1400 veces (el LIKE de destino no usa índice).
        $recentCalls = CallRecord::query()
            ->where('connected_at', '>=', now()->subHour())
            ->whereIn('client_id', $rules->pluck('client_id')->unique())
            ->get(['client_id', 'prefix', 'destination', 'account', 'customer', 'duration_seconds']);

        $callsByClient = $recentCalls->groupBy('client_id');

        $existingAlertsByRule = MonitoringRuleEvent::query()
            ->whereIn('monitoring_rule_id', $rules->pluck('id'))
            ->where('occurred_at', '>=', now()->startOfHour())
            ->get(['monitoring_rule_id', 'context'])
            ->groupBy('monitoring_rule_id')
            ->map(fn (Collection $events) => $events
                ->map(fn (MonitoringRuleEvent $event) => (string) ($event->context['account'] ?? ''))
                ->all());

        $created = 0;
        $ruleIds = [];

        foreach ($rules as $rule) {
            $clientCalls = $callsByClient->get($rule->client_id, collect());
            $alreadyAlerted = $existingAlertsByRule->get($rule->id, []);

            $created += $this->evaluateRule($rule, $clientCalls, $alreadyAlerted);
            $ruleIds[] = $rule->id;
        }

        MonitoringRule::query()->whereIn('id', $ruleIds)->update(['last_evaluated_at' => now()]);

        $this->info("Reglas evaluadas: {$rules->count()}. Alertas creadas: {$created}.");

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, CallRecord>  $clientCalls
     * @param  array<int, string>  $alreadyAlerted
     */
    private function evaluateRule(MonitoringRule $rule, Collection $clientCalls, array $alreadyAlerted): int
    {
        $matching = $clientCalls->filter(function (CallRecord $call) use ($rule) {
            if ($rule->account !== null && $call->account !== $rule->account) {
                return false;
            }

            if ($rule->customer !== null && $call->customer !== $rule->customer) {
                return false;
            }

            return $call->prefix === $rule->match_value
                || str_starts_with((string) $call->destination, $rule->match_value);
        });

        if ($matching->isEmpty()) {
            return 0;
        }

        $groups = $matching->groupBy(fn (CallRecord $call) => ($call->account ?? '').'|'.($call->customer ?? ''));

        $created = 0;

        foreach ($groups as $group) {
            $calls = $group->count();
            $seconds = (int) $group->sum('duration_seconds');

            $callBreach = $rule->call_limit !== null && $calls > $rule->call_limit;
            $durationBreach = $rule->duration_limit_seconds !== null && $seconds > $rule->duration_limit_seconds;

            if (! $callBreach && ! $durationBreach) {
                continue;
            }

            $first = $group->first();
            $accountKey = $first->account ?? '';

            if (in_array($accountKey, $alreadyAlerted, true)) {
                continue;
            }

            $rule->recordAction('triggered', [
                'account' => $first->account,
                'customer' => $first->customer,
                'calls' => $calls,
                'seconds' => $seconds,
                'call_limit' => $rule->call_limit,
                'duration_limit_seconds' => $rule->duration_limit_seconds,
                'reason' => $callBreach && $durationBreach ? 'calls_and_duration' : ($callBreach ? 'calls' : 'duration'),
            ]);

            $created++;
        }

        return $created;
    }
}
