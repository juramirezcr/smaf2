<?php

namespace App\Console\Commands;

use App\Jobs\SendAlertNotification;
use App\Models\CallRecord;
use App\Models\Client;
use App\Models\MonitoringRule;
use App\Models\MonitoringRuleEvent;
use App\Models\PortaoneActiveSession;
use App\Services\AdminAlertNotifier;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Throwable;

class EvaluateMonitoringRules extends Command
{
    protected $signature = 'smaf:evaluate-monitoring-rules';

    protected $description = 'Evalúa las reglas de prefijo y destino (globales y por cliente) contra las llamadas de la última hora más las llamadas activas en curso, y genera alertas cuando una cuenta supera los límites configurados.';

    public function handle(AdminAlertNotifier $adminAlerts): int
    {
        try {
            return $this->evaluateRules();
        } catch (Throwable $exception) {
            report($exception);

            $adminAlerts->notify(
                sprintf(
                    "El comando <b>smaf:evaluate-monitoring-rules</b> falló.\n\n%s",
                    $exception->getMessage(),
                ),
                throttleKey: 'evaluate-monitoring-rules',
            );

            throw $exception;
        }
    }

    private function evaluateRules(): int
    {
        $rules = MonitoringRule::query()
            ->whereIn('scope', ['prefix', 'destination'])
            ->where('enabled', true)
            ->where(function ($query) {
                $query->whereNotNull('call_limit')->orWhereNotNull('duration_limit_seconds');
            })
            ->get();

        if ($rules->isEmpty()) {
            $this->info('No hay reglas de prefijo ni destino activas con límites configurados.');

            return self::SUCCESS;
        }

        $clientRules = $rules->whereNotNull('client_id');
        $globalRules = $rules->whereNull('client_id');

        // Un cliente con su propia regla para un scope+match_value anula la
        // regla global equivalente; la global solo aplica a clientes sin
        // override (el scope entra en la clave para no confundir un prefijo
        // y un destino que compartan el mismo valor).
        $overriddenMatchValuesByClient = $clientRules
            ->groupBy('client_id')
            ->map(fn (Collection $group) => $group->map(fn (MonitoringRule $rule) => $rule->scope.'|'.$rule->match_value)->all());

        $allClientIds = Client::query()->pluck('id');

        /** @var array<int, array{0: MonitoringRule, 1: int}> $pairs */
        $pairs = [];

        foreach ($clientRules as $rule) {
            $pairs[] = [$rule, $rule->client_id];
        }

        foreach ($globalRules as $rule) {
            foreach ($allClientIds as $clientId) {
                $overrides = $overriddenMatchValuesByClient->get($clientId, []);

                if (in_array($rule->scope.'|'.$rule->match_value, $overrides, true)) {
                    continue;
                }

                $pairs[] = [$rule, $clientId];
            }
        }

        $involvedClientIds = collect($pairs)->pluck(1)->unique();

        // Una sola consulta para todos los clientes en vez de una por regla:
        // con miles de reglas, un query por regla escanea la tabla de
        // llamadas una vez por cada una (el LIKE de destino no usa índice).
        $recentCalls = CallRecord::query()
            ->where('connected_at', '>=', now()->subHour())
            ->whereIn('client_id', $involvedClientIds)
            ->get(['client_id', 'prefix', 'origin', 'destination', 'account', 'customer', 'duration_seconds']);

        // Las llamadas que siguen en curso no aparecen todavía en call_records
        // (eso solo pasa cuando terminan y se sincroniza el CDR); sin sumarlas
        // aquí, una ráfaga de fraude en progreso no se detecta hasta que esas
        // llamadas cuelguen. Se homologan al mismo shape que CallRecord para
        // que evaluateRule() las procese sin distinguir el origen.
        $activeCalls = PortaoneActiveSession::query()
            ->active()
            ->whereIn('client_id', $involvedClientIds)
            ->get(['client_id', 'account_id', 'customer_name', 'cli', 'cld', 'duration_seconds'])
            ->map(fn (PortaoneActiveSession $session) => (object) [
                'client_id' => $session->client_id,
                'account' => $session->account_id,
                'customer' => $session->customer_name,
                'prefix' => $this->prefixFor((string) $session->cld),
                'origin' => $session->cli,
                'destination' => $session->cld,
                'duration_seconds' => (int) ($session->duration_seconds ?? 0),
            ]);

        $callsByClient = $recentCalls->concat($activeCalls)->groupBy('client_id');

        $existingAlerts = MonitoringRuleEvent::query()
            ->whereIn('monitoring_rule_id', $rules->pluck('id'))
            ->where('occurred_at', '>=', now()->startOfHour())
            ->get(['monitoring_rule_id', 'client_id', 'context'])
            ->groupBy(fn (MonitoringRuleEvent $event) => $event->monitoring_rule_id.'|'.$event->client_id)
            ->map(fn (Collection $events) => $events
                ->map(fn (MonitoringRuleEvent $event) => (string) ($event->context['account'] ?? ''))
                ->all());

        $created = 0;

        foreach ($pairs as [$rule, $effectiveClientId]) {
            $clientCalls = $callsByClient->get($effectiveClientId, collect());
            $alreadyAlerted = $existingAlerts->get($rule->id.'|'.$effectiveClientId, []);

            $created += $this->evaluateRule($rule, $effectiveClientId, $clientCalls, $alreadyAlerted);
        }

        MonitoringRule::query()->whereIn('id', $rules->pluck('id'))->update(['last_evaluated_at' => now()]);

        $this->info(sprintf(
            'Reglas evaluadas: %d (%d combinaciones cliente x regla, %d globales, %d por cliente). Alertas creadas: %d.',
            $rules->count(),
            count($pairs),
            $globalRules->count(),
            $clientRules->count(),
            $created,
        ));

        return self::SUCCESS;
    }

    /**
     * Mismo criterio que SyncPortaOneCalls/CallRecordImporter usan para
     * poblar call_records.prefix, para que una llamada activa "cuente"
     * exactamente para el mismo prefijo que contaría una vez completada.
     */
    private function prefixFor(string $destination): ?string
    {
        $normalized = preg_replace('/\D/', '', $destination);

        if ($normalized === '') {
            return null;
        }

        if (str_starts_with($normalized, '011')) {
            $normalized = substr($normalized, 3);
        }

        return str_starts_with($normalized, '1')
            ? substr($normalized, 0, 4)
            : substr($normalized, 0, 3);
    }

    /**
     * $clientCalls mezcla filas de CallRecord (llamadas completadas) con
     * objetos genéricos equivalentes construidos a partir de
     * PortaoneActiveSession (llamadas en curso); por eso el parámetro de los
     * closures de abajo no se tipa a CallRecord.
     *
     * @param  Collection<int, object>  $clientCalls
     * @param  array<int, string>  $alreadyAlerted
     */
    private function evaluateRule(MonitoringRule $rule, int $effectiveClientId, Collection $clientCalls, array $alreadyAlerted): int
    {
        $matching = $clientCalls->filter(function (object $call) use ($rule) {
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

        $groups = $matching->groupBy(fn (object $call) => ($call->account ?? '').'|'.($call->customer ?? ''));

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

            // No hay una sola llamada "la que disparó" la alerta (es un conteo
            // sobre una ventana), así que se muestra la última del grupo como
            // muestra representativa de origen/destino.
            $last = $group->last();

            $event = $rule->recordAction('triggered', [
                'account' => $first->account,
                'customer' => $first->customer,
                'calls' => $calls,
                'seconds' => $seconds,
                'call_limit' => $rule->call_limit,
                'duration_limit_seconds' => $rule->duration_limit_seconds,
                'reason' => $callBreach && $durationBreach ? 'calls_and_duration' : ($callBreach ? 'calls' : 'duration'),
                'origin' => $last->origin ?? null,
                'destination' => $last->destination ?? null,
            ], clientId: $effectiveClientId);

            // Cola dedicada de alta prioridad: si esto cae en 'default' junto a los
            // cientos de jobs de SyncPortaOneCalls, una notificación puede quedar
            // esperando horas detrás del backlog aunque tarde milisegundos en correr.
            SendAlertNotification::dispatch($event->id)->onQueue('notifications');

            $created++;
        }

        return $created;
    }
}
