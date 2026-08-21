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
}
