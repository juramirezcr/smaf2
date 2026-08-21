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
 * https://docs.portaone.com/API/mr105/AdminInterface/). Confirmado contra
 * el servidor real: login admite "token" en vez de "password" para cuentas
 * de servicio, y "i_env" para la partición. Las llamadas autenticadas
 * llevan un header SOAP "auth_info" (tipo AuthInfoStructure) con el
 * access_token devuelto por el login.
 */
class PortaOneClient
{
    private const AUTH_NAMESPACE = 'http://schemas.portaone.com/soap';

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
            $params = ['limit' => 1, 'offset' => 0, 'get_total' => 1];

            return [
                'customersCount' => $this->countList($baseUrl, 'CustomerAdminService', 'get_customer_list', 'customer_list', $params, $accessToken),
                'accountsCount' => $this->countList($baseUrl, 'AccountAdminService', 'get_account_list', 'account_list', $params, $accessToken),
            ];
        } finally {
            $this->logout($baseUrl, $accessToken);
        }
    }

    private function login(string $baseUrl): string
    {
        $params = [
            'login' => $this->client->portaone_username,
            'token' => $this->client->portaone_token,
        ];

        if (is_numeric($this->client->portaone_environment)) {
            $params['i_env'] = (int) $this->client->portaone_environment;
        }

        $result = $this->call($baseUrl, 'SessionAdminService', 'login', $params);

        $accessToken = $result->access_token ?? null;

        if (! is_string($accessToken) || $accessToken === '') {
            throw new RuntimeException('PortaOne no devolvió un token de acceso válido. Verifique el usuario, la clave API y la partición del cliente.');
        }

        return $accessToken;
    }

    private function countList(string $baseUrl, string $service, string $method, string $listField, array $params, string $accessToken): int
    {
        $result = $this->call($baseUrl, $service, $method, $params, $accessToken);

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

    private function logout(string $baseUrl, string $accessToken): void
    {
        try {
            $this->call($baseUrl, 'SessionAdminService', 'logout', ['access_token' => $accessToken], $accessToken);
        } catch (RuntimeException) {
            // La prueba ya obtuvo su resultado; un fallo al cerrar sesión no es crítico.
        }
    }

    private function call(string $baseUrl, string $service, string $method, array $params, ?string $accessToken = null): object
    {
        try {
            $client = new SoapClient("{$baseUrl}/wsdl/{$service}.wsdl", [
                'exceptions' => true,
                'connection_timeout' => 10,
                'cache_wsdl' => WSDL_CACHE_NONE,
            ]);

            if ($accessToken !== null) {
                $authInfo = new SoapVar(
                    ['access_token' => $accessToken],
                    SOAP_ENC_OBJECT,
                    'AuthInfoStructure',
                    self::AUTH_NAMESPACE,
                );
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
