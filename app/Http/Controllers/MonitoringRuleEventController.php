<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringRuleEventController extends Controller
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

        return Inertia::render('Alerts/Index', [
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
            'alerts' => MonitoringRuleEvent::query()
                ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
                ->with('rule:id,scope,match_value,description')
                ->latest('occurred_at')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (MonitoringRuleEvent $event): array => [
                    'id' => $event->id,
                    'action' => $event->action,
                    'status' => $event->status,
                    'occurredAt' => $event->occurred_at,
                    'clientName' => $showAll ? $clientNames->get($event->client_id) : null,
                    'account' => $event->context['account'] ?? null,
                    'customer' => $event->context['customer'] ?? null,
                    'calls' => $event->context['calls'] ?? null,
                    'seconds' => $event->context['seconds'] ?? null,
                    'callLimit' => $event->context['call_limit'] ?? null,
                    'durationLimitSeconds' => $event->context['duration_limit_seconds'] ?? null,
                    'rule' => $event->rule ? [
                        'scope' => $event->rule->scope,
                        'matchValue' => $event->rule->match_value,
                        'description' => $event->rule->description,
                    ] : null,
                ]),
        ]);
    }
}
