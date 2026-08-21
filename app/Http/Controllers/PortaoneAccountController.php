<?php

namespace App\Http\Controllers;

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
        $clientId = auth()->user()->client_id;

        $accountsCount = PortaoneAccount::query()
            ->selectRaw('count(*)')
            ->whereColumn('i_customer', 'portaone_customers.i_customer')
            ->whereColumn('client_id', 'portaone_customers.client_id')
            ->active();

        $customers = PortaoneCustomer::query()
            ->where('client_id', $clientId)
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
            'customers' => $customers,
            'search' => $request->string('search')->toString(),
        ]);
    }

    public function show(PortaoneCustomer $customer): Response
    {
        abort_unless($customer->client_id === auth()->user()->client_id, 403);

        $accounts = $customer->accounts()
            ->active()
            ->orderBy('account_id')
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Accounts/CustomerAccounts', [
            'customer' => $customer->only(['id', 'name', 'company_name', 'email', 'bill_status']),
            'accounts' => $accounts,
        ]);
    }
}
