<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use Inertia\Inertia;
use Inertia\Response;

class CallRecordController extends Controller
{
    public function index(): Response
    {
        $clientId = auth()->user()->client_id;

        return Inertia::render('Calls/Index', [
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
                    'connectedAt' => $call->connected_at,
                ]),
        ]);
    }
}
