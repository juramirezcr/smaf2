<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.key' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']);
    }

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'client_name' => 'Cliente de prueba',
            'portaone_environment' => 'https://portaone.test',
            'portaone_username' => 'portaone-user',
            'portaone_token' => 'portaone-token',
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $this->assertDatabaseHas('clients', [
            'name' => 'Cliente de prueba',
            'portaone_environment' => 'https://portaone.test',
            'portaone_username' => 'portaone-user',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'role' => 'client_admin',
        ]);
        $response->assertRedirect(route('dashboard', absolute: false));
    }
}
