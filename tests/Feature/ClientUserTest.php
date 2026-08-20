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
            'username' => 'client-user',
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

    public function test_client_admin_can_edit_a_user_in_its_client(): void
    {
        $client = Client::factory()->create();
        $admin = User::factory()->for($client)->create(['role' => 'client_admin']);
        $user = User::factory()->for($client)->create(['role' => 'client_user']);

        $this->actingAs($admin)->patch(route('users.update', $user), [
            'name' => 'Updated User',
            'username' => 'updated-user',
            'email' => 'updated@example.com',
            'password' => '',
            'password_confirmation' => '',
            'role' => 'client_admin',
        ])->assertRedirect(route('users.index'));

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated User',
            'email' => 'updated@example.com',
            'role' => 'client_admin',
        ]);
    }

    public function test_client_admin_cannot_edit_a_user_from_another_client(): void
    {
        $admin = User::factory()->create(['role' => 'client_admin']);
        $otherClientUser = User::factory()->create(['role' => 'client_user']);

        $this->actingAs($admin)->patch(route('users.update', $otherClientUser), [
            'name' => 'Not Updated',
            'username' => 'not-updated-user',
            'email' => 'not-updated@example.com',
            'role' => 'client_user',
        ])->assertNotFound();
    }
}
