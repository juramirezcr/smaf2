<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientUserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.key' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']);
    }

    public function test_client_admin_can_create_users_for_its_own_client(): void
    {
        $client = Client::factory()->create();
        $admin = User::factory()->for($client)->create(['role' => 'client_admin']);

        $this->actingAs($admin)->post(route('users.store'), [
            'name' => 'Client User',
            'email' => 'member@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'client_user',
        ])->assertRedirect(route('users.index'));

        $this->assertDatabaseHas('users', [
            'client_id' => $client->id,
            'email' => 'member@example.com',
            'role' => 'client_user',
        ]);
    }

    public function test_regular_client_user_cannot_manage_users(): void
    {
        $user = User::factory()->create(['role' => 'client_user']);

        $this->actingAs($user)->get(route('users.index'))->assertForbidden();
    }
}
