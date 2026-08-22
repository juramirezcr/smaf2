<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneActiveSession;
use App\Models\PortaoneCustomer;
use App\Services\PrefixResolver;
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
        $clientNames = null;

        if ($isAdmin) {
            $clients = Client::query()->orderBy('name')->get(['id', 'name']);
            $selected = $request->input('client_id');
            $showAll = in_array($selected, [null, 'all'], true);
            $clientId = $showAll ? null : ((int) $selected ?: optional($clients->first())->id);
            $clientNames = $clients->pluck('name', 'id');
        }

        $availableCustomers = PortaoneCustomer::query()
            ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
            ->active()
            ->orderBy('name')
            ->pluck('name')
            ->filter()
            ->unique()
            ->values();

        $availableAccounts = PortaoneAccount::query()
            ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
            ->active()
            ->orderBy('account_id')
            ->pluck('account_id')
            ->filter()
            ->unique()
            ->values();

        $selectedCustomers = array_values(array_filter((array) $request->input('customer', [])));
        $selectedAccounts = array_values(array_filter((array) $request->input('account', [])));

        $availableClients = $showAll
            ? PortaoneActiveSession::query()
                ->active()
                ->distinct('client_id')
                ->with('client')
                ->get()
                ->pluck('client.name', 'client_id')
                ->filter()
                ->unique()
                ->values()
            : [];

        $since = now()->subHours(23)->startOfHour();
        $hourlyRows = CallRecord::query()
            ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
            ->where('connected_at', '>=', $since)
            ->selectRaw("customer, DATE_FORMAT(connected_at, '%Y-%m-%d %H:00:00') as hour_bucket, COUNT(*) as call_count")
            ->groupBy('customer', 'hour_bucket')
            ->get()
            ->groupBy('customer');

        $hourBuckets = collect(range(0, 23))
            ->map(fn (int $offset) => $since->copy()->addHours($offset)->format('Y-m-d H:00:00'));

        $customerCallHistory = $hourlyRows->map(function ($rows) use ($hourBuckets) {
            $byHour = $rows->pluck('call_count', 'hour_bucket');

            return $hourBuckets->map(fn (string $hour) => (int) ($byHour->get($hour) ?? 0))->values();
        });

        $activeCalls = PortaoneActiveSession::query()
            ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
            ->when($selectedCustomers !== [], fn ($query) => $query->whereIn('customer_name', $selectedCustomers))
            ->when($selectedAccounts !== [], fn ($query) => $query->whereIn('account_id', $selectedAccounts))
            ->active()
            ->orderByDesc('connect_time')
            ->get(['id', 'client_id', 'customer_name', 'account_id', 'cli', 'cld', 'country', 'connect_time', 'duration_seconds'])
            ->map(function (PortaoneActiveSession $session) use ($clientNames): array {
                $prefixData = PrefixResolver::resolve($session->cld);
                return [
                    'id' => $session->id,
                    'clientName' => $clientNames?->get($session->client_id),
                    'customerName' => $session->customer_name,
                    'accountId' => $session->account_id,
                    'cli' => $session->cli,
                    'cld' => $session->cld,
                    'country' => $session->country,
                    'prefix' => $prefixData['prefix'] ?? null,
                    'prefixCountry' => $prefixData['country_name'] ?? null,
                    'connectTime' => $session->connect_time,
                    'durationSeconds' => $session->duration_seconds,
                ];
            });

        return Inertia::render('Calls/Index', [
            'client' => $showAll ? null : Client::find($clientId)?->name,
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
            'availableClients' => $availableClients,
            'availableCustomers' => $availableCustomers,
            'availableAccounts' => $availableAccounts,
            'selectedCustomers' => $selectedCustomers,
            'selectedAccounts' => $selectedAccounts,
            'activeCalls' => $activeCalls,
            'customerCallHistory' => $customerCallHistory,
        ]);
    }
}
