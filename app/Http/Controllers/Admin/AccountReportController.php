<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CallRecord;
use App\Models\Client;
use Inertia\Inertia;
use Inertia\Response;

class AccountReportController extends Controller
{
    public function index(Client $client): Response
    {
        return Inertia::render('Accounts/Index', [
            'client' => $client->name,
            'backToClients' => true,
            'accounts' => CallRecord::query()
                ->where('client_id', $client->id)
                ->select('customer', 'account')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'account')
                ->orderByDesc('calls')
                ->paginate(25)
                ->withQueryString(),
        ]);
    }
}
