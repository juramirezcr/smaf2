<?php

namespace App\Jobs;

use App\Mail\AlertTriggeredMail;
use App\Models\AlertNotification;
use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use App\Models\NotificationSetting;
use App\Services\AlertMessageFormatter;
use App\Services\TelegramNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

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
            $error = null;

            try {
                $sent = $telegram->send(
                    $client->telegram_chat_id,
                    AlertMessageFormatter::telegramText($alert),
                    $client->effectiveTelegramBotToken(),
                );
            } catch (Throwable $exception) {
                $sent = false;
                $error = $exception->getMessage();
            }

            $this->logNotification($event, 'telegram', $client->telegram_chat_id, $sent, $error);
        }

        if ($client->notification_email) {
            $settings = NotificationSetting::current();

            if ($settings->isEmailConfigured()) {
                $error = null;

                try {
                    $settings->applyMailConfig();
                    Mail::to($client->notification_email)->send(new AlertTriggeredMail($alert));
                    $sent = true;
                } catch (Throwable $exception) {
                    $sent = false;
                    $error = $exception->getMessage();
                }

                $this->logNotification($event, 'email', $client->notification_email, $sent, $error);
            }
        }
    }

    private function logNotification(MonitoringRuleEvent $event, string $channel, string $recipient, bool $sent, ?string $error): void
    {
        AlertNotification::create([
            'monitoring_rule_event_id' => $event->id,
            'channel' => $channel,
            'recipient' => $recipient,
            'status' => $sent ? 'sent' : 'failed',
            'error' => $error,
            'sent_at' => now(),
        ]);
    }
}
