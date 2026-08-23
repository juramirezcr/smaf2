<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneCustomer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DestinationReportController extends Controller
{
    private const RESULT_CAP = 5000;

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

        $availableCustomers = PortaoneCustomer::query()
            ->when(! $showAll, fn (Builder $query) => $query->where('client_id', $clientId))
            ->active()
            ->orderBy('name')
            ->pluck('name')
            ->filter()
            ->unique()
            ->values();

        $availableAccounts = PortaoneAccount::query()
            ->when(! $showAll, fn (Builder $query) => $query->where('client_id', $clientId))
            ->active()
            ->orderBy('account_id')
            ->pluck('account_id')
            ->filter()
            ->unique()
            ->values();

        $selectedCustomers = array_values(array_filter((array) $request->input('customer', [])));
        $selectedAccounts = array_values(array_filter((array) $request->input('account', [])));
        $destinationSearch = $request->string('destination_search', '')->trim()->value();

        $period = $request->input('period', '24h');
        $since = $this->periodStart($period);

        $query = CallRecord::query()
            ->when(! $showAll, fn (Builder $q) => $q->where('client_id', $clientId))
            ->where('connected_at', '>=', $since)
            ->when($selectedCustomers !== [], fn (Builder $q) => $q->whereIn('customer', $selectedCustomers))
            ->when($selectedAccounts !== [], fn (Builder $q) => $q->whereIn('account', $selectedAccounts))
            ->when($destinationSearch !== '', fn (Builder $q) => $q->where('destination', 'like', '%'.$destinationSearch.'%'))
            ->select('client_id', 'customer', 'account', 'prefix', 'destination')
            ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
            ->groupBy('client_id', 'customer', 'account', 'prefix', 'destination')
            ->orderByDesc('calls');

        $rows = $query->limit(self::RESULT_CAP + 1)->get();
        $truncated = $rows->count() > self::RESULT_CAP;
        $rows = $rows->take(self::RESULT_CAP);

        $destinations = $rows->map(fn (CallRecord $row) => [
            'clientName' => $showAll ? $clientNames->get($row->client_id) : null,
            'customer' => $row->customer,
            'account' => $row->account,
            'prefix' => $row->prefix,
            'destination' => $row->destination,
            'calls' => (int) $row->calls,
            'seconds' => (int) $row->seconds,
        ]);

        return Inertia::render('Destinations/Index', [
            'client' => $showAll ? null : Client::find($clientId)?->name,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
            'availableCustomers' => $availableCustomers,
            'availableAccounts' => $availableAccounts,
            'selectedCustomers' => $selectedCustomers,
            'selectedAccounts' => $selectedAccounts,
            'destinationSearch' => $destinationSearch,
            'period' => $period,
            'destinations' => $destinations,
            'truncated' => $truncated,
        ]);
    }

    private function periodStart(string $period): \Illuminate\Support\Carbon
    {
        return match ($period) {
            '1h' => now()->subHour(),
            '6h' => now()->subHours(6),
            '24h' => now()->subDay(),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subDay(),
        };
    }
}
