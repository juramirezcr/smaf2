<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\MonitoringRuleEvent;
use Illuminate\Http\RedirectResponse;
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
        $canReviewAnyClient = $user->client_id === null;

        $search = trim((string) $request->input('search', ''));
        $action = $request->input('action');
        $action = in_array($action, ['notify', 'block', 'ignore'], true) ? $action : null;
        $reviewStatus = $request->input('review_status');
        $reviewStatus = in_array($reviewStatus, ['pending', 'cleared', 'maintained'], true) ? $reviewStatus : null;
        $from = $request->date('from');
        $to = $request->date('to');

        return Inertia::render('Alerts/Index', [
            'clients' => $clients,
            'selectedClientId' => $isAdmin ? ($showAll ? 'all' : $clientId) : null,
            'filters' => [
                'search' => $search !== '' ? $search : null,
                'action' => $action,
                'reviewStatus' => $reviewStatus,
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
            ],
            'alerts' => MonitoringRuleEvent::query()
                ->when(! $showAll, fn ($query) => $query->where('client_id', $clientId))
                ->when($search !== '', fn ($query) => $query->where(
                    fn ($q) => $q->where('context->account', 'like', "%{$search}%")
                        ->orWhere('context->customer', 'like', "%{$search}%")
                        ->orWhereHas('rule', fn ($r) => $r->where('match_value', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%"))
                ))
                ->when($action !== null, fn ($query) => $query->where('action', $action))
                ->when($reviewStatus !== null, fn ($query) => $query->where('review_status', $reviewStatus))
                ->when($from !== null, fn ($query) => $query->where('occurred_at', '>=', $from->startOfDay()))
                ->when($to !== null, fn ($query) => $query->where('occurred_at', '<=', $to->endOfDay()))
                ->with(['rule:id,scope,match_value,description', 'reviewer:id,name'])
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
                    'reviewStatus' => $event->review_status,
                    'feedbackNotes' => $event->feedback_notes,
                    'reviewedByName' => $event->reviewer?->name,
                    'reviewedAt' => $event->reviewed_at,
                    'canReview' => $event->action === 'block'
                        && ($canReviewAnyClient || ($user->client_id === $event->client_id && $user->isClientAdmin())),
                ]),
        ]);
    }

    public function review(Request $request, MonitoringRuleEvent $alert): RedirectResponse
    {
        $user = $request->user();

        abort_unless(
            $user->client_id === null || ($user->client_id === $alert->client_id && $user->isClientAdmin()),
            403,
        );

        abort_unless($alert->action === 'block', 422, 'Solo las alertas de bloqueo se pueden revisar.');

        $validated = $request->validate([
            'decision' => ['required', 'in:cleared,maintained'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $alert->update([
            'review_status' => $validated['decision'],
            'feedback_notes' => $validated['notes'] ?: null,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'La alerta fue revisada.');
    }
}
