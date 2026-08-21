<?php

namespace App\Http\Controllers;

use App\Models\MonitoringRuleEvent;
use Inertia\Inertia;
use Inertia\Response;

class MonitoringRuleEventController extends Controller
{
    public function index(): Response
    {
        $clientId = auth()->user()->client_id;

        return Inertia::render('Alerts/Index', [
            'alerts' => MonitoringRuleEvent::query()
                ->where('client_id', $clientId)
                ->with('rule:id,scope,match_value,description')
                ->latest('occurred_at')
                ->paginate(25)
                ->withQueryString()
                ->through(fn (MonitoringRuleEvent $event): array => [
                    'id' => $event->id,
                    'action' => $event->action,
                    'status' => $event->status,
                    'occurredAt' => $event->occurred_at,
                    'rule' => $event->rule ? [
                        'scope' => $event->rule->scope,
                        'matchValue' => $event->rule->match_value,
                        'description' => $event->rule->description,
                    ] : null,
                ]),
        ]);
    }
}
