<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use App\Models\PortaoneAccount;
use App\Services\PortaOneClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Bloquea (o desbloquea) en PortaOne la cuenta que rompió el límite de una
 * regla con acción "block". Corre en la cola 'notifications' para que no
 * espere detrás del backlog de sincronización.
 */
class ApplyAccountBlock implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public readonly int $monitoringRuleEventId,
        public readonly bool $block = true,
    ) {
    }

    public function backoff(): array
    {
        return [30, 120];
    }

    public function handle(): void
    {
        $event = MonitoringRuleEvent::query()->find($this->monitoringRuleEventId);

        if ($event === null || $event->client_id === null) {
            return;
        }

        $client = Client::find($event->client_id);
        $accountId = $event->context['account'] ?? null;

        if ($client === null || $accountId === null || $accountId === '') {
            $this->markFailed($event, 'El evento no tiene una cuenta identificable para bloquear.');

            return;
        }

        $account = PortaoneAccount::query()
            ->where('client_id', $client->id)
            ->where('account_id', $accountId)
            ->first();

        if ($account === null) {
            $this->markFailed($event, "No se encontró la cuenta {$accountId} en el catálogo sincronizado.");

            return;
        }

        try {
            app()->make(PortaOneClient::class, ['client' => $client])->setAccountBlocked((int) $account->i_account, $this->block);
        } catch (Throwable $exception) {
            // Reintenta con backoff; solo se marca fallo definitivo al agotar intentos.
            if ($this->attempts() < $this->tries) {
                throw $exception;
            }

            $this->markFailed($event, $exception->getMessage());

            return;
        }

        $account->update(['blocked' => $this->block ? 'Y' : 'N']);

        $event->update([
            'block_status' => $this->block ? 'blocked' : 'unblocked',
            'block_error' => null,
            'blocked_at' => $this->block ? now() : $event->blocked_at,
        ]);
    }

    private function markFailed(MonitoringRuleEvent $event, string $error): void
    {
        $event->update([
            'block_status' => $this->block ? 'failed' : 'unblock_failed',
            'block_error' => $error,
        ]);
    }
}
