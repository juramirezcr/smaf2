<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\PortaoneActiveSession;
use App\Services\PortaOneClient;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class PollPortaOneActiveSessions implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    /**
     * Se dispara cada minuto; si la corrida anterior de este cliente aún no
     * termina, se omite el disparo actual en vez de apilar otro job detrás.
     */
    public int $uniqueFor = 120;

    public function __construct(public readonly int $clientId)
    {
    }

    public function uniqueId(): string
    {
        return (string) $this->clientId;
    }

    public function handle(): void
    {
        $client = Client::findOrFail($this->clientId);

        try {
            $sessions = (new PortaOneClient($client))->fetchActiveSessions();
        } catch (Throwable $exception) {
            report($exception);

            return;
        }

        $now = now();
        $seenCallIds = [];

        foreach ($sessions as $session) {
            $callId = $session['call_id'] ?? null;

            if ($callId === null || $callId === '') {
                continue;
            }

            $seenCallIds[] = $callId;

            PortaoneActiveSession::updateOrCreate(
                ['client_id' => $client->id, 'call_id' => $callId],
                [
                    'i_account' => isset($session['i_account']) ? (int) $session['i_account'] : null,
                    'i_customer' => isset($session['i_customer']) ? (int) $session['i_customer'] : null,
                    'account_id' => $session['account_id'] ?? null,
                    'customer_name' => $session['customer_name'] ?? null,
                    'cli' => $session['cli'] ?? null,
                    'cld' => $session['cld'] ?? null,
                    'country' => $session['country'] ?? null,
                    'connect_time' => $session['connect_time'] ?? null,
                    'duration_seconds' => isset($session['duration']) ? max(0, (int) $session['duration']) : 0,
                    'last_seen_at' => $now,
                    'ended_at' => null,
                ],
            );
        }

        PortaoneActiveSession::query()
            ->where('client_id', $client->id)
            ->whereNull('ended_at')
            ->when($seenCallIds !== [], fn ($query) => $query->whereNotIn('call_id', $seenCallIds), fn ($query) => $query)
            ->update(['ended_at' => $now]);
    }
}
