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
        $showAll = false;

        if ($isAdmin) {
            $clients = Client::query()->orderBy('name')->get(['id', 'name']);
            $selected = $request->input('client_id');
            $showAll = $selected === 'all';
            $clientId = $showAll ? null : ((int) $selected ?: optional($clients->first())->id);
        }

        $clientNames = $showAll ? $clients->pluck('name', 'id') : null;

        return Inertia::render('Calls/Index', [
            'client' => $showAll ? null : Client::find($clientId)?->name,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
            'calls' => CallRecord::query()
                ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
                ->latest('connected_at')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (CallRecord $call): array => [
                    'id' => $call->id,
                    'clientName' => $clientNames?->get($call->client_id),
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
