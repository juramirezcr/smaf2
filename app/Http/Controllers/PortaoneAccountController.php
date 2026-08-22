<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortaoneAccountController extends Controller
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

        $accountsCount = PortaoneAccount::query()
            ->selectRaw('count(*)')
            ->whereColumn('i_customer', 'portaone_customers.i_customer')
            ->whereColumn('client_id', 'portaone_customers.client_id')
            ->active();

        $customers = PortaoneCustomer::query()
            ->when(! $showAll, fn (Builder $query) => $query->where('client_id', $clientId))
            ->active()
            ->when($request->string('search')->toString(), function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->addSelect(['accounts_count' => $accountsCount])
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        if ($showAll) {
            $clientNames = $clients->pluck('name', 'id');
            $customers->getCollection()->transform(function (PortaoneCustomer $customer) use ($clientNames) {
                $customer->client_name = $clientNames->get($customer->client_id);

                return $customer;
            });
        }

        return Inertia::render('Accounts/Customers', [
            'customers' => $customers,
            'search' => $request->string('search')->toString(),
            'basePath' => '/portaone-customers',
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
        ]);
    }

    public function show(PortaoneCustomer $customer): Response
    {
        $userClientId = auth()->user()->client_id;

        abort_unless($userClientId === null || $customer->client_id === $userClientId, 403);

        $accounts = $customer->accounts()
            ->active()
            ->orderBy('account_id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Accounts/CustomerAccounts', [
            'customer' => $customer->only(['id', 'name', 'company_name', 'email', 'bill_status']),
            'accounts' => $accounts,
            'indexPath' => $userClientId === null
                ? "/portaone-customers?client_id={$customer->client_id}"
                : '/portaone-customers',
        ]);
    }
}
