<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use Inertia\Inertia;
use Inertia\Response;

class DestinationReportController extends Controller
{
    public function index(): Response
    {
        $clientId = auth()->user()->client_id;

        return Inertia::render('Destinations/Index', [
            'destinations' => CallRecord::query()
                ->where('client_id', $clientId)
                ->select('customer', 'country_code', 'prefix', 'destination')
                ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
                ->groupBy('customer', 'country_code', 'prefix', 'destination')
                ->orderByDesc('calls')
                ->paginate(25)
                ->withQueryString(),
        ]);
    }
}
