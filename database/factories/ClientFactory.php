<?php

namespace Database\Factories;

use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'portaone_environment' => 'test',
            'portaone_username' => fake()->userName(),
            'portaone_token' => fake()->sha256(),
        ];
    }
}
