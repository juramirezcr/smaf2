<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\MonitoringRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrefixRuleController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Prefixes/Index', [
            'rules' => MonitoringRule::query()
                ->where('client_id', $request->user()->client_id)
                ->where('scope', 'prefix')
                ->latest()
                ->paginate(10)
                ->withQueryString()
                ->through(fn (MonitoringRule $rule) => $this->ruleData($rule)),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Prefixes/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $rule = MonitoringRule::create([
            ...$this->validatedRule($request),
            'scope' => 'prefix',
            'user_id' => $request->user()->id,
            'client_id' => $request->user()->client_id,
        ]);

        return to_route('prefixes.show', $rule)
            ->with('success', 'La regla de prefijo fue creada.');
    }

    public function show(Request $request, MonitoringRule $prefix): Response
    {
        $rule = $this->ownedPrefix($request, $prefix);
        $period = $request->string('period', '24h')->value();
        abort_unless(array_key_exists($period, $this->periodHours()), 404);

        $matchingCalls = $this->matchingCalls($rule, $period);
        $summary = (clone $matchingCalls)
            ->selectRaw('COUNT(*) as call_count, COALESCE(SUM(duration_seconds), 0) as duration_seconds')
            ->first();

        return Inertia::render('Prefixes/Show', [
            'rule' => $this->ruleData($rule),
            'period' => $period,
            'summary' => [
                'callCount' => (int) $summary->call_count,
                'durationSeconds' => (int) $summary->duration_seconds,
            ],
            'calls' => $matchingCalls
                ->latest('connected_at')
                ->paginate(10)
                ->withQueryString()
                ->through(fn (CallRecord $call) => [
                    'id' => $call->id,
                    'account' => $call->account,
                    'customer' => $call->customer,
                    'origin' => $call->origin,
                    'destination' => $call->destination,
                    'prefix' => $call->prefix,
                    'durationSeconds' => $call->duration_seconds,
                    'connectedAt' => $call->connected_at->toIso8601String(),
                ]),
        ]);
    }

    public function edit(Request $request, MonitoringRule $prefix): Response
    {
        return Inertia::render('Prefixes/Edit', [
            'rule' => $this->ruleData($this->ownedPrefix($request, $prefix)),
        ]);
    }

    public function update(Request $request, MonitoringRule $prefix): RedirectResponse
    {
        $rule = $this->ownedPrefix($request, $prefix);
        $rule->update($this->validatedRule($request));

        return to_route('prefixes.show', $rule)
            ->with('success', 'La regla de prefijo fue actualizada.');
    }

    /**
     * @return array<string, int>
     */
    private function periodHours(): array
    {
        return [
            '24h' => 24,
            '7d' => 24 * 7,
            '30d' => 24 * 30,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedRule(Request $request): array
    {
        $validated = $request->validate([
            'prefix' => ['required', 'string', 'regex:/^\d{1,16}$/'],
            'country' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:500'],
            'account' => ['nullable', 'string', 'max:255'],
            'customer' => ['nullable', 'string', 'max:255'],
            'hourly_call_limit' => ['required', 'integer', 'min:1', 'max:1000000'],
            'hourly_minutes_limit' => ['required', 'integer', 'min:1', 'max:1000000'],
            'action' => ['required', 'in:notify,block'],
            'enabled' => ['required', 'boolean'],
        ]);

        return [
            'match_value' => $validated['prefix'],
            'country' => $validated['country'] ?: null,
            'description' => $validated['description'] ?: null,
            'account' => $validated['account'] ?: null,
            'customer' => $validated['customer'] ?: null,
            'call_limit' => $validated['hourly_call_limit'],
            'duration_limit_seconds' => $validated['hourly_minutes_limit'] * 60,
            'action' => $validated['action'],
            'enabled' => $validated['enabled'],
        ];
    }

    private function ownedPrefix(Request $request, MonitoringRule $prefix): MonitoringRule
    {
        abort_unless(
            $prefix->client_id === $request->user()->client_id && $prefix->scope === 'prefix',
            404,
        );

        return $prefix;
    }

    private function matchingCalls(MonitoringRule $rule, string $period): Builder
    {
        return CallRecord::query()
            ->where('client_id', $rule->client_id)
            ->where('connected_at', '>=', now()->subHours($this->periodHours()[$period]))
            ->where(function (Builder $query) use ($rule) {
                $query->where('prefix', $rule->match_value)
                    ->orWhere('destination', 'like', $rule->match_value.'%');
            })
            ->when($rule->account, fn (Builder $query, string $account) => $query->where('account', $account))
            ->when($rule->customer, fn (Builder $query, string $customer) => $query->where('customer', $customer));
    }

    /**
     * @return array<string, mixed>
     */
    private function ruleData(MonitoringRule $rule): array
    {
        return [
            'id' => $rule->id,
            'prefix' => $rule->match_value,
            'country' => $rule->country,
            'description' => $rule->description,
            'account' => $rule->account,
            'customer' => $rule->customer,
            'hourlyCallLimit' => $rule->call_limit,
            'hourlyMinutesLimit' => (int) ceil($rule->duration_limit_seconds / 60),
            'action' => $rule->action,
            'enabled' => $rule->enabled,
            'lastEvaluatedAt' => $rule->last_evaluated_at?->toIso8601String(),
            'createdAt' => $rule->created_at->toIso8601String(),
            'updatedAt' => $rule->updated_at->toIso8601String(),
        ];
    }
}
