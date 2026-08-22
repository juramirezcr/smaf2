<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use App\Support\PortaOneBillStatus;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupClosedPortaoneData extends Command
{
    protected $signature = 'smaf:cleanup-closed-portaone-data {--apply : Persist changes; without it the command is a dry run}';

    protected $description = 'Delete PortaOne customers/accounts already closed or terminated, and every account belonging to a closed customer.';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        Client::query()->each(function (Client $client) use ($apply) {
            $closedCustomerIds = PortaoneCustomer::query()
                ->where('client_id', $client->id)
                ->get(['id', 'i_customer', 'bill_status'])
                ->filter(fn (PortaoneCustomer $customer) => PortaOneBillStatus::isClosed($customer->bill_status));

            $closedIndividualAccounts = PortaoneAccount::query()
                ->where('client_id', $client->id)
                ->get(['id', 'bill_status'])
                ->filter(fn (PortaoneAccount $account) => PortaOneBillStatus::isClosed($account->bill_status));

            $accountsOfClosedCustomers = $closedCustomerIds->isEmpty()
                ? collect()
                : PortaoneAccount::query()
                    ->where('client_id', $client->id)
                    ->whereIn('i_customer', $closedCustomerIds->pluck('i_customer'))
                    ->get(['id']);

            $accountIdsToDelete = $accountsOfClosedCustomers->pluck('id')
                ->merge($closedIndividualAccounts->pluck('id'))
                ->unique();

            if ($closedCustomerIds->isEmpty() && $accountIdsToDelete->isEmpty()) {
                return;
            }

            $this->info(sprintf(
                '%s: %d customers cerrados/terminados, %d accounts a eliminar (de esos customers + individualmente cerradas).',
                $client->name,
                $closedCustomerIds->count(),
                $accountIdsToDelete->count(),
            ));

            if (! $apply) {
                return;
            }

            DB::transaction(function () use ($accountIdsToDelete, $closedCustomerIds) {
                PortaoneAccount::query()->whereIn('id', $accountIdsToDelete)->delete();
                PortaoneCustomer::query()->whereIn('id', $closedCustomerIds->pluck('id'))->delete();
            });
        });

        $this->info($apply ? 'Limpieza aplicada.' : 'Dry run: nada se eliminó. Usa --apply para persistir.');

        return self::SUCCESS;
    }
}
