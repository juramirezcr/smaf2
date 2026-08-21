<?php

namespace App\Jobs;

use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use App\Models\PortaoneProduct;
use App\Models\ProcessRun;
use App\Services\PortaOneClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SyncPortaOneData implements ShouldQueue
{
    use Queueable;

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

                    $billStatus = $row['bill_status'] ?? null;

                    PortaoneCustomer::updateOrCreate(
                        ['client_id' => $client->id, 'i_customer' => (int) $row['i_customer']],
                        [
                            'name' => $row['name'] ?? null,
                            'company_name' => $row['companyname'] ?? null,
                            'email' => $row['email'] ?? null,
                            'bill_status' => $billStatus,
                            'archived_at' => $this->isTerminated($billStatus) ? now() : null,
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

                        $billStatus = $row['bill_status'] ?? null;

                        PortaoneAccount::updateOrCreate(
                            ['client_id' => $client->id, 'i_account' => (int) $row['i_account']],
                            [
                                'i_customer' => isset($row['i_customer']) ? (int) $row['i_customer'] : null,
                                'account_id' => $row['id'] ?? null,
                                'i_product' => isset($row['i_product']) ? (int) $row['i_product'] : null,
                                'product_name' => $row['product_name'] ?? null,
                                'bill_status' => $billStatus,
                                'blocked' => $row['blocked'] ?? null,
                                'archived_at' => $this->isTerminated($billStatus) ? now() : null,
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
    }

    private function setContext(ProcessRun $run, string $section, array $values, bool $merge = false): void
    {
        $context = $run->context ?? [];
        $context[$section] = $merge ? [...($context[$section] ?? []), ...$values] : $values;
        $run->update(['context' => $context]);
    }

    private function isTerminated(?string $billStatus): bool
    {
        return $billStatus !== null && str_contains(strtolower($billStatus), 'terminat');
    }
}
