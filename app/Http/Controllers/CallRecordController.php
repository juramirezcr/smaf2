<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CallRecordController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->client_id === null;

        $clients = null;
        $clientId = $user->client_id;

        if ($isAdmin) {
            $clients = Client::query()->orderBy('name')->get(['id', 'name']);
            $clientId = $request->integer('client_id') ?: optional($clients->first())->id;
        }

        return Inertia::render('Calls/Index', [
            'client' => Client::find($clientId)?->name,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? $clientId : null,
            'calls' => CallRecord::query()
                ->where('client_id', $clientId)
                ->latest('connected_at')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (CallRecord $call): array => [
                    'id' => $call->id,
                    'customer' => $call->customer,
                    'account' => $call->account,
                    'origin' => $call->origin,
                    'destination' => $call->destination,
                    'countryCode' => $call->country_code,
                    'prefix' => $call->prefix,
                    'durationSeconds' => $call->duration_seconds,
                    'chargedAmount' => $call->charged_amount,
                    'connectedAt' => $call->connected_at,
                ]),
        ]);
    }
}
