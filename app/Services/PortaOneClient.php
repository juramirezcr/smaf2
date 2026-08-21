<?php

namespace App\Services;

use App\Models\Client;
use App\Models\PortaoneSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class PortaOneClient
{
    public function __construct(private readonly Client $client)
    {
    }

    /**
     * Inicia sesión con las credenciales del cliente, cuenta los customers y
     * accounts visibles para esa sesión, y cierra la sesión. No persiste nada.
     */
    public function testConnection(): array
    {
        $baseUrl = rtrim((string) PortaoneSetting::current()->base_url, '/');

        if ($baseUrl === '') {
            throw new RuntimeException('Configure la URL de conexión de PortaOne antes de probar.');
        }

        $sessionId = $this->login($baseUrl);

        try {
            return [
                'customersCount' => $this->countList($baseUrl, 'Customer/get_customer_list', 'customer_list', $sessionId),
                'accountsCount' => $this->countList($baseUrl, 'Account/get_account_list', 'account_list', $sessionId),
            ];
        } finally {
            $this->logout($baseUrl, $sessionId);
        }
    }

    private function login(string $baseUrl): string
    {
        $response = $this->post($baseUrl, 'Session/login', [
            'login' => $this->client->portaone_username,
            'token' => $this->client->portaone_token,
        ]);

        $sessionId = $response['session_id'] ?? null;

        if (! is_string($sessionId) || $sessionId === '') {
            throw new RuntimeException('PortaOne no devolvió una sesión válida. Verifique el usuario y la clave API del cliente.');
        }

        return $sessionId;
    }

    private function countList(string $baseUrl, string $endpoint, string $listKey, string $sessionId): int
    {
        $response = $this->post($baseUrl, $endpoint, ['session_id' => $sessionId]);

        return count($response[$listKey] ?? []);
    }

    private function logout(string $baseUrl, string $sessionId): void
    {
        try {
            $this->post($baseUrl, 'Session/logout', ['session_id' => $sessionId]);
        } catch (RuntimeException) {
            // La prueba ya obtuvo su resultado; un fallo al cerrar sesión no es crítico.
        }
    }

    private function post(string $baseUrl, string $endpoint, array $params): array
    {
        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->post("{$baseUrl}/{$endpoint}", ['params' => $params]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con PortaOne.', previous: $exception);
        }

        $body = $response->json();

        if (! is_array($body)) {
            throw new RuntimeException("PortaOne respondió con un formato inesperado (HTTP {$response->status()}).");
        }

        if (isset($body['faultstring']) || isset($body['faultcode'])) {
            throw new RuntimeException('PortaOne rechazó la solicitud: '.($body['faultstring'] ?? $body['faultcode']));
        }

        if ($response->failed()) {
            throw new RuntimeException("PortaOne respondió con error HTTP {$response->status()}.");
        }

        return $body;
    }
}
