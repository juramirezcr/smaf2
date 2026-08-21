<?php

namespace App\Services;

use App\Models\Client;
use App\Models\PortaoneSetting;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente para la API Gateway v2 de PortaOne (REST + OAuth2 password grant),
 * documentada en https://demo.portaone.com/api/v2/+docs. El "usuario API" y
 * la "clave API" del cliente se envían como login/password: PortaOne emite
 * un token de acceso para cuentas de servicio que se usa igual que una
 * contraseña normal en /auth/login.
 */
class PortaOneClient
{
    public function __construct(private readonly Client $client)
    {
    }

    /**
     * Inicia sesión con las credenciales del cliente, cuenta los customers y
     * accounts visibles para ese token, y cierra la sesión. No persiste nada.
     */
    public function testConnection(): array
    {
        $baseUrl = rtrim((string) PortaoneSetting::current()->base_url, '/');

        if ($baseUrl === '') {
            throw new RuntimeException('Configure la URL de conexión de PortaOne antes de probar.');
        }

        $accessToken = $this->login($baseUrl);

        try {
            return [
                'customersCount' => $this->countResource($baseUrl, 'customers', $accessToken),
                'accountsCount' => $this->countResource($baseUrl, 'accounts', $accessToken),
            ];
        } finally {
            $this->logout($baseUrl, $accessToken);
        }
    }

    private function login(string $baseUrl): string
    {
        try {
            $response = Http::acceptJson()
                ->timeout(10)
                ->post("{$baseUrl}/api/v2/auth/login", [
                    'login' => $this->client->portaone_username,
                    'password' => $this->client->portaone_token,
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con PortaOne.', previous: $exception);
        }

        if ($response->failed()) {
            throw new RuntimeException($this->explainFailure($response, 'PortaOne rechazó el usuario o la clave API del cliente.'));
        }

        $accessToken = $response->json('access_token');

        if (! is_string($accessToken) || $accessToken === '') {
            throw new RuntimeException('PortaOne no devolvió un token de acceso válido.');
        }

        return $accessToken;
    }

    private function countResource(string $baseUrl, string $resource, string $accessToken): int
    {
        try {
            $response = Http::withToken($accessToken)
                ->withHeaders(['Accept' => 'application/vnd.api+json'])
                ->timeout(10)
                ->get("{$baseUrl}/api/v2/{$resource}");
        } catch (ConnectionException $exception) {
            throw new RuntimeException('No fue posible conectar con PortaOne.', previous: $exception);
        }

        if ($response->failed()) {
            throw new RuntimeException($this->explainFailure($response, "PortaOne rechazó la consulta de {$resource}."));
        }

        $total = $response->json('meta.page.total');

        return is_int($total) ? $total : count($response->json('data') ?? []);
    }

    private function logout(string $baseUrl, string $accessToken): void
    {
        try {
            Http::withToken($accessToken)->timeout(10)->post("{$baseUrl}/api/v2/auth/logout");
        } catch (ConnectionException) {
            // La prueba ya obtuvo su resultado; un fallo al cerrar sesión no es crítico.
        }
    }

    /**
     * Los errores de la API v2 llegan normalmente como una lista de objetos
     * {code, title, detail}. Si la respuesta no tiene esa forma (por ejemplo,
     * un proxy devolviendo HTML), mostramos el código HTTP y un fragmento
     * crudo del cuerpo para poder diagnosticar sin adivinar.
     */
    private function explainFailure(Response $response, string $fallback): string
    {
        $detail = $response->json('0.detail') ?? $response->json('detail');

        if (is_string($detail) && $detail !== '') {
            return "{$fallback} ({$detail})";
        }

        $snippet = trim(preg_replace('/\s+/', ' ', substr($response->body(), 0, 200)) ?? '');

        return $snippet !== ''
            ? "{$fallback} (HTTP {$response->status()}: {$snippet})"
            : "{$fallback} (HTTP {$response->status()}, sin cuerpo de respuesta)";
    }
}
