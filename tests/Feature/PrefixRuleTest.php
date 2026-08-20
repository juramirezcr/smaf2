<?php

namespace Tests\Feature;

use App\Models\CallRecord;
use App\Models\ImportBatch;
use App\Models\MonitoringRule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PrefixRuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.key' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']);
    }

    public function test_user_can_create_a_prefix_rule_with_hourly_limits(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('prefixes.store'), [
            'prefix' => '1202',
            'country' => 'México',
            'description' => 'Destinos móviles de prueba',
            'customer' => 'Cliente A',
            'account' => '40101234',
            'hourly_call_limit' => 25,
            'hourly_minutes_limit' => 90,
            'action' => 'notify',
            'enabled' => true,
        ]);

        $rule = MonitoringRule::firstOrFail();

        $response->assertRedirect(route('prefixes.show', $rule));
        $this->assertDatabaseHas('monitoring_rules', [
            'id' => $rule->id,
            'user_id' => $user->id,
            'scope' => 'prefix',
            'match_value' => '1202',
            'country' => 'México',
            'call_limit' => 25,
            'duration_limit_seconds' => 5400,
            'action' => 'notify',
            'enabled' => true,
        ]);
    }

    public function test_prefix_detail_only_shows_owned_matching_calls_and_paginates_them(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $rule = MonitoringRule::create([
            'user_id' => $user->id,
            'client_id' => $user->client_id,
            'scope' => 'prefix',
            'match_value' => '1202',
            'customer' => 'Cliente A',
            'account' => '40101234',
            'call_limit' => 20,
            'duration_limit_seconds' => 3600,
            'action' => 'notify',
            'enabled' => true,
        ]);
        $batch = $this->batchFor($user);

        foreach (range(1, 11) as $number) {
            CallRecord::create([
                'user_id' => $user->id,
                'client_id' => $user->client_id,
                'import_batch_id' => $batch->id,
                'external_id' => "matching-{$number}",
                'account' => '40101234',
                'customer' => 'Cliente A',
                'destination' => '12025550123',
                'prefix' => '1202',
                'duration_seconds' => 60,
                'connected_at' => now()->subMinutes($number),
            ]);
        }

        CallRecord::create([
            'user_id' => $user->id,
            'client_id' => $user->client_id,
            'import_batch_id' => $batch->id,
            'external_id' => 'wrong-account',
            'account' => '99999999',
            'customer' => 'Cliente A',
            'destination' => '12025550123',
            'prefix' => '1202',
            'duration_seconds' => 60,
            'connected_at' => now()->subMinute(),
        ]);

        $otherBatch = $this->batchFor($otherUser);
        CallRecord::create([
            'user_id' => $otherUser->id,
            'client_id' => $otherUser->client_id,
            'import_batch_id' => $otherBatch->id,
            'external_id' => 'other-user',
            'account' => '40101234',
            'customer' => 'Cliente A',
            'destination' => '12025550123',
            'prefix' => '1202',
            'duration_seconds' => 60,
            'connected_at' => now()->subMinute(),
        ]);

        $this->actingAs($user)
            ->get(route('prefixes.show', ['prefix' => $rule, 'period' => '24h']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Prefixes/Show')
                ->where('summary.callCount', 11)
                ->where('summary.durationSeconds', 660)
                ->has('calls.data', 10)
                ->where('calls.total', 11));
    }

    public function test_prefix_rules_are_scoped_to_the_authenticated_user(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $rule = MonitoringRule::create([
            'user_id' => $owner->id,
            'client_id' => $owner->client_id,
            'scope' => 'prefix',
            'match_value' => '1202',
            'call_limit' => 20,
            'duration_limit_seconds' => 3600,
            'action' => 'block',
            'enabled' => true,
        ]);

        $this->actingAs($otherUser)
            ->get(route('prefixes.show', $rule))
            ->assertNotFound();
    }

    public function test_rule_actions_can_be_recorded_for_future_auditing(): void
    {
        $user = User::factory()->create();
        $rule = MonitoringRule::create([
            'user_id' => $user->id,
            'client_id' => $user->client_id,
            'scope' => 'prefix',
            'match_value' => '1202',
            'call_limit' => 20,
            'duration_limit_seconds' => 3600,
            'action' => 'block',
            'enabled' => true,
        ]);

        $event = $rule->recordAction('queued', ['call_count' => 23]);

        $this->assertDatabaseHas('monitoring_rule_events', [
            'id' => $event->id,
            'monitoring_rule_id' => $rule->id,
            'user_id' => $user->id,
            'action' => 'block',
            'status' => 'queued',
        ]);
        $this->assertSame(['call_count' => 23], $event->context);
    }

    private function batchFor(User $user): ImportBatch
    {
        return ImportBatch::create([
            'user_id' => $user->id,
            'client_id' => $user->client_id,
            'source' => 'test',
            'original_filename' => 'calls.csv',
            'storage_path' => 'imports/calls-'.$user->id.'.csv',
            'checksum' => 'test-checksum-'.$user->id,
        ]);
    }
}
