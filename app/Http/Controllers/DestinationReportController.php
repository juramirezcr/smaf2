<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DestinationReportController extends Controller
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
            $showAll = in_array($selected, [null, 'all'], true);
            $clientId = $showAll ? null : ((int) $selected ?: optional($clients->first())->id);
        }

        $clientNames = $showAll ? $clients->pluck('name', 'id') : null;

        $destinations = CallRecord::query()
            ->when(! $showAll, fn (Builder $query) => $query->where('client_id', $clientId))
            ->select('client_id', 'country_code', 'prefix', 'destination')
            ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds, count(distinct customer) as customer_count')
            ->groupBy('client_id', 'country_code', 'prefix', 'destination')
            ->orderByDesc('calls')
            ->paginate(25)
            ->withQueryString();

        if ($showAll) {
            $destinations->getCollection()->transform(function (CallRecord $row) use ($clientNames) {
                $row->client_name = $clientNames->get($row->client_id);

                return $row;
            });
        }

        return Inertia::render('Destinations/Index', [
            'client' => $showAll ? null : Client::find($clientId)?->name,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
            'destinations' => $destinations,
        ]);
    }
}
