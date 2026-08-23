<?php

namespace App\Console\Commands;

use App\Models\CallRecord;
use App\Models\MonitoringRule;
use App\Models\MonitoringRuleEvent;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

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
            ->get();

        $created = 0;

        foreach ($rules as $rule) {
            $created += $this->evaluateRule($rule);
            $rule->update(['last_evaluated_at' => now()]);
        }

        $this->info("Reglas evaluadas: {$rules->count()}. Alertas creadas: {$created}.");

        return self::SUCCESS;
    }

    private function evaluateRule(MonitoringRule $rule): int
    {
        if ($rule->call_limit === null && $rule->duration_limit_seconds === null) {
            return 0;
        }

        $groups = CallRecord::query()
            ->where('client_id', $rule->client_id)
            ->where('connected_at', '>=', now()->subHour())
            ->where(function (Builder $query) use ($rule) {
                $query->where('prefix', $rule->match_value)
                    ->orWhere('destination', 'like', $rule->match_value.'%');
            })
            ->when($rule->account, fn (Builder $query, string $account) => $query->where('account', $account))
            ->when($rule->customer, fn (Builder $query, string $customer) => $query->where('customer', $customer))
            ->select('account', 'customer')
            ->selectRaw('COUNT(*) as calls, COALESCE(SUM(duration_seconds), 0) as seconds')
            ->groupBy('account', 'customer')
            ->get();

        if ($groups->isEmpty()) {
            return 0;
        }

        $alreadyAlertedAccounts = $this->accountsAlertedThisHour($rule);
        $created = 0;

        foreach ($groups as $group) {
            $calls = (int) $group->calls;
            $seconds = (int) $group->seconds;

            $callBreach = $rule->call_limit !== null && $calls > $rule->call_limit;
            $durationBreach = $rule->duration_limit_seconds !== null && $seconds > $rule->duration_limit_seconds;

            if (! $callBreach && ! $durationBreach) {
                continue;
            }

            $accountKey = $group->account ?? '';

            if (in_array($accountKey, $alreadyAlertedAccounts, true)) {
                continue;
            }

            $rule->recordAction('triggered', [
                'account' => $group->account,
                'customer' => $group->customer,
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

    /**
     * @return array<int, string>
     */
    private function accountsAlertedThisHour(MonitoringRule $rule): array
    {
        return MonitoringRuleEvent::query()
            ->where('monitoring_rule_id', $rule->id)
            ->where('occurred_at', '>=', now()->startOfHour())
            ->get()
            ->map(fn (MonitoringRuleEvent $event) => (string) ($event->context['account'] ?? ''))
            ->all();
    }
}
