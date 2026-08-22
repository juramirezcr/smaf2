<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use App\Models\PortaoneProduct;
use App\Models\ProcessRun;
use App\Services\PortaOneClient;
use App\Support\PortaOneBillStatus;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SyncPortaOneData implements ShouldQueue
{
    use Queueable;

    /**
     * @var array<int, true>
     */
    private array $closedCustomerIds = [];

    public function __construct(public readonly int $clientId)
    {
    }

    public function handle(): void
    {
        $client = Client::findOrFail($this->clientId);

        $run = ProcessRun::create([
            'client_id' => $client->id,
            'type' => 'portaone_sync',
            'status' => 'started',
            'context' => [
                'products' => ['total' => 0, 'synced' => 0],
                'customers' => ['total' => 0, 'synced' => 0],
                'accounts' => ['total' => 0, 'synced' => 0],
            ],
            'started_at' => now(),
        ]);

        $portaOne = new PortaOneClient($client);

        try {
            $this->syncProducts($client, $portaOne, $run);
            $this->syncCustomers($client, $portaOne, $run);
            $this->syncAccounts($client, $portaOne, $run);

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

    private function syncProducts(Client $client, PortaOneClient $portaOne, ProcessRun $run): void
    {
        $products = $portaOne->fetchProducts();

        $this->setContext($run, 'products', ['total' => count($products), 'synced' => 0]);

        $synced = 0;

        foreach ($products as $product) {
            if (! isset($product['i_product'])) {
                continue;
            }

            PortaoneProduct::updateOrCreate(
                ['client_id' => $client->id, 'i_product' => (int) $product['i_product']],
                [
                    'name' => $product['name'] ?? '',
                    'end_user_name' => $product['end_user_name'] ?? null,
                    'synced_at' => now(),
                ],
            );

            $synced++;
            $this->setContext($run, 'products', ['synced' => $synced], merge: true);
        }
    }

    private function syncCustomers(Client $client, PortaOneClient $portaOne, ProcessRun $run): void
    {
        $synced = 0;

        $portaOne->syncCustomers(
            onPage: function (array $rows) use ($client, $run, &$synced) {
                foreach ($rows as $row) {
                    if (! isset($row['i_customer'])) {
                        continue;
                    }

                    $iCustomer = (int) $row['i_customer'];
                    $billStatus = $row['bill_status'] ?? null;

                    if (PortaOneBillStatus::isClosed($billStatus)) {
                        $this->closedCustomerIds[$iCustomer] = true;
                        PortaoneCustomer::where('client_id', $client->id)->where('i_customer', $iCustomer)->delete();

                        continue;
                    }

                    PortaoneCustomer::updateOrCreate(
                        ['client_id' => $client->id, 'i_customer' => $iCustomer],
                        [
                            'name' => $row['name'] ?? null,
                            'company_name' => $row['companyname'] ?? null,
                            'email' => $row['email'] ?? null,
                            'bill_status' => $billStatus,
                            'synced_at' => now(),
                        ],
                    );
                }

                $synced += count($rows);
                $this->setContext($run, 'customers', ['synced' => $synced], merge: true);
            },
            onTotal: fn (int $total) => $this->setContext($run, 'customers', ['total' => $total], merge: true),
        );
    }

    private function syncAccounts(Client $client, PortaOneClient $portaOne, ProcessRun $run): void
    {
        $telephonyProductIds = PortaoneProduct::query()
            ->where('client_id', $client->id)
            ->where('is_telephony', true)
            ->pluck('i_product');

        if ($telephonyProductIds->isEmpty()) {
            return;
        }

        $total = 0;
        $synced = 0;

        foreach ($telephonyProductIds as $iProduct) {
            $portaOne->syncAccountsForProduct(
                (int) $iProduct,
                onPage: function (array $rows) use ($client, $run, &$synced) {
                    foreach ($rows as $row) {
                        if (! isset($row['i_account'])) {
                            continue;
                        }

                        $iAccount = (int) $row['i_account'];
                        $iCustomer = isset($row['i_customer']) ? (int) $row['i_customer'] : null;
                        $billStatus = $row['bill_status'] ?? null;

                        if (PortaOneBillStatus::isClosed($billStatus) || ($iCustomer !== null && isset($this->closedCustomerIds[$iCustomer]))) {
                            PortaoneAccount::where('client_id', $client->id)->where('i_account', $iAccount)->delete();

                            continue;
                        }

                        PortaoneAccount::updateOrCreate(
                            ['client_id' => $client->id, 'i_account' => $iAccount],
                            [
                                'i_customer' => $iCustomer,
                                'account_id' => $row['id'] ?? null,
                                'i_product' => isset($row['i_product']) ? (int) $row['i_product'] : null,
                                'product_name' => $row['product_name'] ?? null,
                                'bill_status' => $billStatus,
                                'blocked' => $row['blocked'] ?? null,
                                'synced_at' => now(),
                            ],
                        );
                    }

                    $synced += count($rows);
                    $this->setContext($run, 'accounts', ['synced' => $synced], merge: true);
                },
                onTotal: function (int $productTotal) use ($run, &$total) {
                    $total += $productTotal;
                    $this->setContext($run, 'accounts', ['total' => $total], merge: true);
                },
            );
        }

        $this->deleteCustomersWithoutAccounts($client);
    }

    /**
     * SMAF solo tiene sentido para customers con servicio de telefonía; uno
     * sin ninguna account sincronizada no aporta nada que monitorear.
     */
    private function deleteCustomersWithoutAccounts(Client $client): void
    {
        $customerIdsWithAccounts = PortaoneAccount::query()
            ->where('client_id', $client->id)
            ->whereNotNull('i_customer')
            ->distinct()
            ->pluck('i_customer');

        PortaoneCustomer::query()
            ->where('client_id', $client->id)
            ->whereNotIn('i_customer', $customerIdsWithAccounts)
            ->delete();
    }

    private function setContext(ProcessRun $run, string $section, array $values, bool $merge = false): void
    {
        $context = $run->context ?? [];
        $context[$section] = $merge ? [...($context[$section] ?? []), ...$values] : $values;
        $run->update(['context' => $context]);
    }

}
