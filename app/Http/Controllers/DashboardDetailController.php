<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use App\Models\MonitoringRule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardDetailController extends Controller
{
    public function prefixHistory(Request $request): JsonResponse
    {
        $clientId = $this->resolveClientId($request);
        $prefix = $request->string('prefix')->trim()->value();
        abort_if($prefix === '', 422, 'prefix es requerido.');

        [$since, $bucketUnitSeconds, $bucketCount] = $this->periodBuckets($request->string('period', '7d')->value());

        $rows = CallRecord::query()
            ->where('client_id', $clientId)
            ->where('prefix', $prefix)
            ->where('connected_at', '>=', $since)
            ->selectRaw('FLOOR((UNIX_TIMESTAMP(connected_at) - ?) / ?) as bucket', [$since->timestamp, $bucketUnitSeconds])
            ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
            ->groupBy('bucket')
            ->get()
            ->keyBy(fn ($row) => (int) $row->bucket);

        return response()->json([
            'buckets' => $this->fillBuckets($rows, $since, $bucketUnitSeconds, $bucketCount),
        ]);
    }

    public function accountHistory(Request $request): JsonResponse
    {
        $clientId = $this->resolveClientId($request);
        $account = $request->string('account')->trim()->value();
        $customer = $request->string('customer')->trim()->value();
        abort_if($account === '', 422, 'account es requerido.');

        [$since, $bucketUnitSeconds, $bucketCount] = $this->periodBuckets($request->string('period', '7d')->value());

        $rows = CallRecord::query()
            ->where('client_id', $clientId)
            ->where('account', $account)
            ->when($customer !== '', fn ($query) => $query->where('customer', $customer))
            ->where('connected_at', '>=', $since)
            ->selectRaw('FLOOR((UNIX_TIMESTAMP(connected_at) - ?) / ?) as bucket', [$since->timestamp, $bucketUnitSeconds])
            ->selectRaw('count(*) as calls, coalesce(sum(duration_seconds), 0) as seconds')
            ->groupBy('bucket')
            ->get()
            ->keyBy(fn ($row) => (int) $row->bucket);

        return response()->json([
            'buckets' => $this->fillBuckets($rows, $since, $bucketUnitSeconds, $bucketCount),
        ]);
    }

    public function prefixRule(Request $request): JsonResponse
    {
        $clientId = $this->resolveClientId($request);
        $prefix = $request->string('prefix')->trim()->value();
        abort_if($prefix === '', 422, 'prefix es requerido.');

        $rule = $this->clientRule($clientId, $prefix);
        $matchedScope = 'client';

        if ($rule === null) {
            $rule = $this->globalRule($prefix);
            $matchedScope = $rule ? 'global' : 'none';
        }

        return response()->json([
            'rule' => $rule ? $this->ruleData($rule) : null,
            'matchedScope' => $matchedScope,
            'canEdit' => $this->canEdit($request, $clientId),
        ]);
    }

    public function updatePrefixRule(Request $request): JsonResponse
    {
        $clientId = $this->resolveClientId($request);
        abort_unless($this->canEdit($request, $clientId), 403);

        $validated = $request->validate([
            'prefix' => ['required', 'string', 'regex:/^\d{1,16}$/'],
            'country' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:500'],
            'hourly_call_limit' => ['required', 'integer', 'min:1', 'max:1000000'],
            'hourly_minutes_limit' => ['required', 'integer', 'min:1', 'max:1000000'],
            'action' => ['required', 'in:notify,block'],
            'enabled' => ['required', 'boolean'],
        ]);

        $attributes = [
            'country' => $validated['country'] ?: null,
            'description' => $validated['description'] ?: null,
            'call_limit' => $validated['hourly_call_limit'],
            'duration_limit_seconds' => $validated['hourly_minutes_limit'] * 60,
            'action' => $validated['action'],
            'enabled' => $validated['enabled'],
        ];

        // Editar desde el dashboard nunca toca una regla global: si lo que
        // aplicaba era la global, se crea un override propio de este cliente
        // para no afectar a los demás clientes que la comparten.
        $rule = $this->clientRule($clientId, $validated['prefix']);

        if ($rule !== null) {
            $rule->update($attributes);
        } else {
            $targetUser = User::query()->where('client_id', $clientId)->orderBy('id')->first();
            abort_if($targetUser === null, 422, 'Este cliente no tiene usuarios.');

            $rule = MonitoringRule::create([
                ...$attributes,
                'scope' => 'prefix',
                'match_value' => $validated['prefix'],
                'client_id' => $clientId,
                'user_id' => $targetUser->id,
            ]);
        }

        return response()->json([
            'rule' => $this->ruleData($rule),
            'matchedScope' => 'client',
        ]);
    }

    private function clientRule(int $clientId, string $prefix): ?MonitoringRule
    {
        return MonitoringRule::query()
            ->where('scope', 'prefix')
            ->where('client_id', $clientId)
            ->where('match_value', $prefix)
            ->where(fn ($query) => $query->whereNull('account')->orWhere('account', ''))
            ->where(fn ($query) => $query->whereNull('customer')->orWhere('customer', ''))
            ->first();
    }

    private function globalRule(string $prefix): ?MonitoringRule
    {
        return MonitoringRule::query()
            ->where('scope', 'prefix')
            ->whereNull('client_id')
            ->where('match_value', $prefix)
            ->where(fn ($query) => $query->whereNull('account')->orWhere('account', ''))
            ->where(fn ($query) => $query->whereNull('customer')->orWhere('customer', ''))
            ->first();
    }

    private function resolveClientId(Request $request): int
    {
        $user = $request->user();

        if ($user->client_id !== null) {
            return $user->client_id;
        }

        $clientId = $request->integer('client_id');

        if ($clientId === 0) {
            Log::warning('resolveClientId: client_id missing/zero', [
                'route' => $request->path(),
                'query' => $request->query(),
                'all' => $request->all(),
                'raw_client_id' => $request->input('client_id'),
                'user_id' => $request->user()?->id,
                'user_client_id' => $request->user()?->client_id,
            ]);
        }

        abort_if($clientId === 0, 422, 'client_id es requerido.');

        return $clientId;
    }

    private function canEdit(Request $request, int $clientId): bool
    {
        $user = $request->user();

        return $user->client_id === null || ($user->client_id === $clientId && $user->isClientAdmin());
    }

    /**
     * @return array{0: Carbon, 1: int, 2: int}
     */
    private function periodBuckets(string $period): array
    {
        return match ($period) {
            '1h' => [now()->subHour(), 300, 12],
            '6h' => [now()->subHours(6), 1800, 12],
            '24h' => [now()->subDay(), 3600, 24],
            '7d' => [now()->subDays(7), 86400, 7],
            '30d' => [now()->subDays(30), 86400, 30],
            default => [now()->subDays(7), 86400, 7],
        };
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function fillBuckets($rows, Carbon $since, int $bucketUnitSeconds, int $bucketCount): array
    {
        $buckets = [];

        for ($i = 0; $i < $bucketCount; $i++) {
            $row = $rows->get($i);

            $buckets[] = [
                'at' => $since->copy()->addSeconds($i * $bucketUnitSeconds)->toIso8601String(),
                'calls' => $row ? (int) $row->calls : 0,
                'seconds' => $row ? (int) $row->seconds : 0,
            ];
        }

        return $buckets;
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
            'hourlyCallLimit' => $rule->call_limit,
            'hourlyMinutesLimit' => (int) ceil($rule->duration_limit_seconds / 60),
            'action' => $rule->action,
            'enabled' => $rule->enabled,
            'lastEvaluatedAt' => $rule->last_evaluated_at?->toIso8601String(),
        ];
    }
}
