<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use Inertia\Inertia;
use Inertia\Response;

class AccountReportController extends Controller
{
    public function index(): Response
    {
        $clientId = auth()->user()->client_id;

        if ($clientId === null) {
            return $this->clientPicker();
        }

        return Inertia::render('Accounts/Index', [
            'client' => Client::find($clientId)?->name,
            'accounts' => CallRecord::query()
                ->where('client_id', $clientId)
                ->select('customer', 'account')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'account')
                ->orderByDesc('calls')
                ->paginate(25)
                ->withQueryString(),
        ]);
    }

    private function clientPicker(): Response
    {
        $callsCount = CallRecord::query()
            ->selectRaw('count(*)')
            ->whereColumn('client_id', 'clients.id');

        $clients = Client::query()
            ->addSelect(['calls_count' => $callsCount])
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Accounts/AccountsClientPicker', [
            'clients' => $clients,
        ]);
    }
}
