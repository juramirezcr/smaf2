<?php

namespace App\Services;

use App\Models\Client;
use App\Models\PortaoneSetting;
use RuntimeException;
use SoapClient;
use SoapFault;
use SoapHeader;
use SoapVar;
use Throwable;

/**
 * Cliente SOAP para la interfaz clásica de administración de PortaOne
 * (WSDL en {base}/wsdl/{Servicio}AdminService.wsdl, documentada en
 * https://docs.portaone.com/API/mr105/AdminInterface/). El patrón exacto
 * (campos de login, header "auth_info" con session_id, verificación SSL
 * desactivada) replica el código PHP ya probado en producción de la
 * versión original de SMAF contra este mismo servidor.
 */
class PortaOneClient
{
    private const AUTH_NAMESPACE = 'http://schemas.portaone.com/soap';

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
            $params = ['limit' => 1, 'offset' => 0, 'get_total' => 1];

            return [
                'customersCount' => $this->countList($baseUrl, 'CustomerAdminService', 'get_customer_list', 'customer_list', $params, $sessionId),
                'accountsCount' => $this->countList($baseUrl, 'AccountAdminService', 'get_account_list', 'account_list', $params, $sessionId),
            ];
        } finally {
            $this->logout($baseUrl, $sessionId);
        }
    }

    private function login(string $baseUrl): string
    {
        // La partición ("i_env") no se envía: para cuentas API atadas a un
        // solo entorno, PortaOne rechaza la solicitud de login si se indica
        // explícitamente ("Environment setting is forbidden"). El login y
        // el token ya determinan el entorno correcto por sí mismos.
        $params = [
            'login' => $this->client->portaone_username,
            'token' => $this->client->portaone_token,
        ];

        $result = $this->call($baseUrl, 'SessionAdminService', 'login', $params);

        $sessionId = $result->session_id ?? null;

        if (! is_string($sessionId) || $sessionId === '') {
            throw new RuntimeException('PortaOne no devolvió una sesión válida. Verifique el usuario y la clave API del cliente.');
        }

        return $sessionId;
    }

    private function countList(string $baseUrl, string $service, string $method, string $listField, array $params, string $sessionId): int
    {
        $result = $this->call($baseUrl, $service, $method, $params, $sessionId);

        if (isset($result->total) && is_numeric($result->total)) {
            return (int) $result->total;
        }

        $list = $result->{$listField} ?? null;

        return match (true) {
            is_array($list) => count($list),
            $list !== null => 1,
            default => 0,
        };
    }

    private function logout(string $baseUrl, string $sessionId): void
    {
        try {
            $this->call($baseUrl, 'SessionAdminService', 'logout', ['session_id' => $sessionId], $sessionId);
        } catch (RuntimeException) {
            // La prueba ya obtuvo su resultado; un fallo al cerrar sesión no es crítico.
        }
    }

    private function call(string $baseUrl, string $service, string $method, array $params, ?string $sessionId = null): object
    {
        try {
            $client = new SoapClient("{$baseUrl}/wsdl/{$service}.wsdl", [
                'exceptions' => true,
                'connection_timeout' => 10,
                'cache_wsdl' => WSDL_CACHE_NONE,
                'stream_context' => stream_context_create([
                    'ssl' => ['verify_peer' => false, 'verify_peer_name' => false],
                ]),
            ]);

            if ($sessionId !== null) {
                $authInfo = new SoapVar(['session_id' => $sessionId], SOAP_ENC_OBJECT);
                $client->__setSoapHeaders(new SoapHeader(self::AUTH_NAMESPACE, 'auth_info', $authInfo));
            }

            return $client->__soapCall($method, [$params]);
        } catch (SoapFault $fault) {
            throw new RuntimeException("PortaOne rechazó la solicitud: {$fault->getMessage()}", previous: $fault);
        } catch (Throwable $exception) {
            throw new RuntimeException('No fue posible conectar con PortaOne.', previous: $exception);
        }
    }
}
