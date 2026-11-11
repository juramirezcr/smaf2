<?php

namespace Tests\Feature;

use App\Jobs\ApplyAccountBlock;
use App\Models\Client;
use App\Models\MonitoringRule;
use App\Models\PortaoneAccount;
use App\Services\PortaOneClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class ApplyAccountBlockTest extends TestCase
{
    use RefreshDatabase;

    private function makeEvent(): array
    {
        $client = Client::factory()->create();
        $account = PortaoneAccount::create([
            'client_id' => $client->id,
            'i_account' => 555,
            'account_id' => '40101234',
            'blocked' => 'N',
        ]);
        $rule = MonitoringRule::create([
            'user_id' => \App\Models\User::factory()->create()->id,
            'client_id' => $client->id,
            'scope' => 'prefix',
            'match_value' => '1202',
            'call_limit' => 5,
            'action' => 'block',
            'enabled' => true,
        ]);
        $event = $rule->recordAction('triggered', ['account' => '40101234'], clientId: $client->id);

        return [$client, $account, $event];
    }

    public function test_blocks_the_account_in_portaone_and_marks_the_event(): void
    {
        [, $account, $event] = $this->makeEvent();

        $mock = Mockery::mock(PortaOneClient::class);
        $mock->shouldReceive('setAccountBlocked')->once()->with(555, true);
        $this->app->bind(PortaOneClient::class, fn () => $mock);

        (new ApplyAccountBlock($event->id))->handle();

        $this->assertSame('Y', $account->fresh()->blocked);
        $this->assertSame('blocked', $event->fresh()->block_status);
        $this->assertNotNull($event->fresh()->blocked_at);
    }

    public function test_unblocks_the_account(): void
    {
        [, $account, $event] = $this->makeEvent();
        $account->update(['blocked' => 'Y']);

        $mock = Mockery::mock(PortaOneClient::class);
        $mock->shouldReceive('setAccountBlocked')->once()->with(555, false);
        $this->app->bind(PortaOneClient::class, fn () => $mock);

        (new ApplyAccountBlock($event->id, false))->handle();

        $this->assertSame('N', $account->fresh()->blocked);
        $this->assertSame('unblocked', $event->fresh()->block_status);
    }

    public function test_marks_failure_when_account_is_not_in_catalog(): void
    {
        [, $account, $event] = $this->makeEvent();
        $account->delete();

        (new ApplyAccountBlock($event->id))->handle();

        $this->assertSame('failed', $event->fresh()->block_status);
        $this->assertNotNull($event->fresh()->block_error);
    }
}
