<?php

namespace App\Jobs;

use App\Mail\AlertTriggeredMail;
use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use App\Models\NotificationSetting;
use App\Services\TelegramNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendAlertNotification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $monitoringRuleEventId)
    {
    }

    public function handle(TelegramNotifier $telegram): void
    {
        $event = MonitoringRuleEvent::query()->with('rule')->find($this->monitoringRuleEventId);

        if ($event === null || $event->client_id === null) {
            return;
        }

        $client = Client::find($event->client_id);

        if ($client === null) {
            return;
        }

        $context = $event->context ?? [];
        $callLimit = $context['call_limit'] ?? null;
        $durationLimit = $context['duration_limit_seconds'] ?? null;
        $calls = (int) ($context['calls'] ?? 0);
        $seconds = (int) ($context['seconds'] ?? 0);

        $alert = [
            'clientName' => $client->name,
            'account' => $context['account'] ?? null,
            'customer' => $context['customer'] ?? null,
            'prefix' => $event->rule?->match_value,
            'calls' => $calls,
            'callLimit' => $callLimit,
            'callBreach' => $callLimit !== null && $calls > $callLimit,
            'seconds' => $seconds,
            'durationLimitSeconds' => $durationLimit,
            'durationBreach' => $durationLimit !== null && $seconds > $durationLimit,
            'action' => $event->action,
            'occurredAt' => $event->occurred_at->format('Y-m-d H:i'),
        ];

        if ($client->telegram_chat_id) {
            $telegram->send($client->telegram_chat_id, $this->telegramText($alert));
        }

        if ($client->notification_email) {
            $settings = NotificationSetting::current();

            if ($settings->isEmailConfigured()) {
                $settings->applyMailConfig();
                Mail::to($client->notification_email)->send(new AlertTriggeredMail($alert));
            }
        }
    }

    /**
     * @param  array<string, mixed>  $alert
     */
    private function telegramText(array $alert): string
    {
        $lines = [
            '🚨 <b>Alerta de tráfico</b>',
            '',
            "Cliente: <b>{$alert['clientName']}</b>",
            'Cuenta: '.($alert['account'] ?? '—'),
            'Customer: '.($alert['customer'] ?? '—'),
            'Prefijo: +'.$alert['prefix'],
            '',
            'Llamadas: '.$alert['calls'].($alert['callLimit'] !== null ? ' / límite '.$alert['callLimit'] : ''),
            'Segundos: '.$alert['seconds'].($alert['durationLimitSeconds'] !== null ? ' / límite '.$alert['durationLimitSeconds'] : ''),
            '',
            'Acción: '.($alert['action'] === 'block' ? 'Bloquear' : 'Notificar'),
            'Hora: '.$alert['occurredAt'],
        ];

        return implode("\n", $lines);
    }
}
