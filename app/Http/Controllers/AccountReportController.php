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

        if ($isAdmin) {
            $clients = Client::query()->orderBy('name')->get(['id', 'name']);
            $clientId = $request->integer('client_id') ?: optional($clients->first())->id;
        }

        $accounts = PortaoneAccount::query()
            ->where('client_id', $clientId)
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
            ->where('client_id', $clientId)
            ->whereIn('i_customer', $accounts->getCollection()->pluck('i_customer')->filter()->unique())
            ->pluck('name', 'i_customer');

        $accounts->getCollection()->transform(function (PortaoneAccount $account) use ($customerNames) {
            $account->customer_name = $account->i_customer ? $customerNames->get($account->i_customer) : null;

            return $account;
        });

        return Inertia::render('Accounts/Index', [
            'client' => Client::find($clientId)?->name,
            'search' => $request->string('search')->toString(),
            'accounts' => $accounts,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? $clientId : null,
        ]);
    }
}
