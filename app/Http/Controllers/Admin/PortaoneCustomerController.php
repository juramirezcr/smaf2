<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortaoneCustomerController extends Controller
{
    public function index(Client $client, Request $request): Response
    {
        $accountsCount = PortaoneAccount::query()
            ->selectRaw('count(*)')
            ->whereColumn('i_customer', 'portaone_customers.i_customer')
            ->whereColumn('client_id', 'portaone_customers.client_id')
            ->active();

        $customers = PortaoneCustomer::query()
            ->where('client_id', $client->id)
            ->active()
            ->when($request->string('search')->toString(), function (Builder $query, string $search) {
                $query->where(function (Builder $query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->addSelect(['accounts_count' => $accountsCount])
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Accounts/Customers', [
            'client' => ['id' => $client->id, 'name' => $client->name],
            'customers' => $customers,
            'search' => $request->string('search')->toString(),
            'basePath' => "/admin/clients/{$client->id}/customers",
        ]);
    }

    public function show(Client $client, PortaoneCustomer $customer): Response
    {
        abort_unless($customer->client_id === $client->id, 404);

        $accounts = $customer->accounts()
            ->active()
            ->orderBy('account_id')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Accounts/CustomerAccounts', [
            'client' => ['id' => $client->id, 'name' => $client->name],
            'customer' => $customer->only(['id', 'name', 'company_name', 'email', 'bill_status']),
            'accounts' => $accounts,
            'indexPath' => "/admin/clients/{$client->id}/customers",
        ]);
    }
}
