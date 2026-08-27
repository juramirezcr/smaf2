<?php

namespace App\Jobs;

use App\Models\CallRecord;
use App\Models\Client;
use App\Models\PortaoneCustomer;
use App\Models\ProcessRun;
use App\Services\PortaOneClient;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SyncPortaOneCalls implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    /**
     * Evita apilar corridas: si el lote anterior de este mismo grupo de
     * cuentas sigue corriendo, el scheduler simplemente omite el disparo
     * actual en vez de encolar otro job detrás; el siguiente tick lo
     * vuelve a intentar.
     */
    public int $uniqueFor = 3600;

    /**
     * @var array<int, string|null>
     */
    private array $customerNameCache = [];

    /**
     * PortaOne exige i_account en get_xdr_list (no admite consulta en lote
     * por fecha), así que hay que consultarlo cuenta por cuenta. Con
     * clientes de muchas cuentas eso puede sumar miles de llamadas SOAP por
     * corrida; el scheduler reparte las cuentas en lotes de este tamaño y
     * despacha un job por lote, para que corran en paralelo entre los
     * workers de la cola y ninguno solo acumule minutos por volumen.
     *
     * $fromDate es opcional: si se indica (flujo recurrente del scheduler,
     * que solo pasa cuentas con actividad reciente y una ventana fija de
     * ~15 minutos), se usa tal cual y NO se avanza xdr_synced_until, porque
     * esa marca representa "hasta dónde quedó sincronizado el historial
     * completo del cliente", no el resultado de una ventana corta puntual.
     * Si se omite (botón manual "Sincronizar ahora"), se retoma desde esa
     * marca como antes, para poder ponerse al día con el historial completo.
     *
     * @param  array<int, int>  $iAccounts
     */
    public function __construct(
        public readonly int $clientId,
        public readonly array $iAccounts,
        public readonly ?\DateTimeInterface $fromDate = null,
    ) {
    }

    public function uniqueId(): string
    {
        return $this->clientId.':'.md5(implode(',', $this->iAccounts));
    }

    public function handle(): void
    {
        $client = Client::findOrFail($this->clientId);
        $isFullCatchUp = $this->fromDate === null;

        // Pequeño solape hacia atrás para no perder registros que aún se
        // estaban finalizando en el borde de la ventana de la corrida anterior.
        $fromDate = $this->fromDate ?? ($client->xdr_synced_until !== null
            ? $client->xdr_synced_until->clone()->subMinutes(10)
            : now()->subDays(7));

        $run = ProcessRun::create([
            'client_id' => $client->id,
            'type' => 'portaone_xdr_sync',
            'status' => 'started',
            'context' => ['calls' => ['total' => 0, 'synced' => 0], 'accounts' => count($this->iAccounts)],
            'started_at' => now(),
        ]);

        $iAccounts = $this->iAccounts;

        if ($iAccounts === []) {
            $run->update(['status' => 'completed', 'finished_at' => now()]);

            return;
        }

        $portaOne = new PortaOneClient($client);
        $maxConnectTime = $client->xdr_synced_until;
        $synced = 0;
        $totalAcrossAccounts = 0;

        try {
            $portaOne->syncXdrsForAccounts(
                $iAccounts,
                $fromDate,
                onPage: function (array $rows) use ($client, $run, &$synced, &$maxConnectTime) {
                    foreach ($rows as $row) {
                        if (! isset($row['i_xdr'])) {
                            continue;
                        }

                        $iXdr = (int) $row['i_xdr'];
                        $iCustomer = isset($row['i_customer']) ? (int) $row['i_customer'] : null;
                        $iAccount = isset($row['i_account']) ? (int) $row['i_account'] : null;
                        $connectTime = $row['connect_time'] ?? null;

                        $duration = 0;

                        if (isset($row['unix_connect_time'], $row['unix_disconnect_time'])) {
                            $duration = max(0, (int) $row['unix_disconnect_time'] - (int) $row['unix_connect_time']);
                        }

                        CallRecord::updateOrCreate(
                            ['client_id' => $client->id, 'external_id' => (string) $iXdr],
                            [
                                'i_xdr' => $iXdr,
                                'i_customer' => $iCustomer,
                                'i_account' => $iAccount,
                                'account' => $row['account_id'] ?? null,
                                'customer' => $this->customerName($client, $iCustomer),
                                'origin' => $row['CLI'] ?? null,
                                'destination' => $row['CLD'] ?? null,
                                'prefix' => $this->prefixFor((string) ($row['CLD'] ?? '')),
                                'duration_seconds' => $duration,
                                'charged_amount' => $row['charged_amount'] ?? null,
                                'connected_at' => $connectTime,
                            ],
                        );

                        $synced++;

                        if ($connectTime !== null) {
                            $candidate = Carbon::parse($connectTime);

                            if ($maxConnectTime === null || $candidate->greaterThan($maxConnectTime)) {
                                $maxConnectTime = $candidate;
                            }
                        }
                    }

                    $this->setContext($run, 'calls', ['synced' => $synced], merge: true);
                },
                onTotal: function (int $accountTotal) use ($run, &$totalAcrossAccounts) {
                    $totalAcrossAccounts += $accountTotal;
                    $this->setContext($run, 'calls', ['total' => $totalAcrossAccounts], merge: true);
                },
            );

            // Varios lotes del mismo cliente pueden terminar casi al mismo tiempo;
            // solo se avanza la marca si este lote realmente vio una llamada más
            // reciente que la ya guardada, para que un lote sin llamadas no la
            // pise con un valor desactualizado. Solo aplica al catch-up completo:
            // una corrida de ventana corta no representa "hasta dónde está al día
            // el historial", así que no debe mover esa marca.
            if ($isFullCatchUp && $maxConnectTime !== null) {
                $current = $client->refresh()->xdr_synced_until;

                if ($current === null || $maxConnectTime->greaterThan($current)) {
                    $client->update(['xdr_synced_until' => $maxConnectTime]);
                }
            }

            $run->update(['status' => 'completed', 'finished_at' => now()]);
        } catch (Throwable $exception) {
            report($exception);
            $run->update([
                'status' => 'failed',
                'message' => $exception->getMessage(),
                'finished_at' => now(),
            ]);

            throw $exception;
        }
    }

    private function customerName(Client $client, ?int $iCustomer): ?string
    {
        if ($iCustomer === null) {
            return null;
        }

        if (! array_key_exists($iCustomer, $this->customerNameCache)) {
            $this->customerNameCache[$iCustomer] = PortaoneCustomer::query()
                ->where('client_id', $client->id)
                ->where('i_customer', $iCustomer)
                ->value('name');
        }

        return $this->customerNameCache[$iCustomer];
    }

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

    private function setContext(ProcessRun $run, string $section, array $values, bool $merge = false): void
    {
        $context = $run->context ?? [];
        $context[$section] = $merge ? [...($context[$section] ?? []), ...$values] : $values;
        $run->update(['context' => $context]);
    }
}
