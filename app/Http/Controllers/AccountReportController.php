<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
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

        return Inertia::render('Accounts/Index', [
            'client' => Client::find($clientId)?->name,
            'accounts' => CallRecord::query()
                ->where('client_id', $clientId)
                ->select('customer', 'account')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'account')
                ->orderByDesc('calls')
                ->paginate(10)
                ->withQueryString(),
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? $clientId : null,
        ]);
    }
}
