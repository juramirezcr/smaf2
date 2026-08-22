<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountReportController extends Controller
{
    public function index(Request $request): Response
    {
        $user = auth()->user();
        $isAdmin = $user->client_id === null;

        $clients = null;
        $clientId = $user->client_id;
        $showAll = false;

        if ($isAdmin) {
            $clients = Client::query()->orderBy('name')->get(['id', 'name']);
            $selected = $request->input('client_id');
            $showAll = $selected === 'all';
            $clientId = $showAll ? null : ((int) $selected ?: optional($clients->first())->id);
        }

        $accounts = PortaoneAccount::query()
            ->when(! $showAll, fn (Builder $query) => $query->where('client_id', $clientId))
            ->active()
            ->when($request->string('search')->toString(), function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('account_id', 'like', "%{$search}%")
                        ->orWhere('product_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('account_id')
            ->paginate(10)
            ->withQueryString();

        $customerNames = PortaoneCustomer::query()
            ->when(! $showAll, fn (Builder $query) => $query->where('client_id', $clientId))
            ->whereIn('i_customer', $accounts->getCollection()->pluck('i_customer')->filter()->unique())
            ->get(['i_customer', 'client_id', 'name'])
            ->keyBy(fn (PortaoneCustomer $customer) => $customer->client_id.':'.$customer->i_customer);

        $clientNames = $showAll ? $clients->pluck('name', 'id') : null;

        $accounts->getCollection()->transform(function (PortaoneAccount $account) use ($customerNames, $clientNames) {
            $account->customer_name = $account->i_customer
                ? $customerNames->get($account->client_id.':'.$account->i_customer)?->name
                : null;

            if ($clientNames !== null) {
                $account->client_name = $clientNames->get($account->client_id);
            }

            return $account;
        });

        return Inertia::render('Accounts/Index', [
            'client' => $showAll ? null : Client::find($clientId)?->name,
            'search' => $request->string('search')->toString(),
            'accounts' => $accounts,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
        ]);
    }
}
