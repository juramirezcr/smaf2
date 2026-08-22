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

    // Lotes pequeños a propósito: evita saturar el servidor de PortaOne con
    // páginas grandes cuando se sincronizan customers/accounts.
    private const PAGE_SIZE = 100;

    public function __construct(private readonly Client $client)
    {
    }

    /**
     * Inicia sesión con las credenciales del cliente, cuenta los customers y
     * accounts visibles para esa sesión, y cierra la sesión. No persiste nada.
     */
    public function testConnection(): array
    {
        return $this->withSession(function (string $baseUrl, string $sessionId) {
            $params = ['limit' => 1, 'offset' => 0, 'get_total' => 1];

            return [
                'customersCount' => $this->countList($baseUrl, 'CustomerAdminService', 'get_customer_list', 'customer_list', $params, $sessionId),
                'accountsCount' => $this->countList($baseUrl, 'AccountAdminService', 'get_account_list', 'account_list', $params, $sessionId),
            ];
        });
    }

    /**
     * Todos los productos configurados para este cliente (catálogo, no por
     * customer). El administrador decide después cuáles son de telefonía.
     */
    public function fetchProducts(): array
    {
        $products = [];

        $this->withSession(function (string $baseUrl, string $sessionId) use (&$products) {
            $this->paginate(
                $baseUrl,
                'ProductAdminService',
                'get_product_list',
                'product_list',
                [],
                $sessionId,
                function (array $page) use (&$products) {
                    $products = [...$products, ...$page];
                },
                200,
            );
        });

        return $products;
    }

    /**
     * Fotografía actual de todas las llamadas en curso (BillingSessionAdminService).
     * A diferencia de get_xdr_list, cada registro ya trae i_account/i_customer y la
     * duración calculada; el call_id es la llave para luego correlacionar con el
     * XDR una vez que la llamada finalice.
     */
    public function fetchActiveSessions(): array
    {
        $sessions = [];

        $this->withSession(function (string $baseUrl, string $sessionId) use (&$sessions) {
            $this->paginate(
                $baseUrl,
                'BillingSessionAdminService',
                'get_active_sessions_list',
                'active_session_list',
                [],
                $sessionId,
                function (array $page) use (&$sessions) {
                    $sessions = [...$sessions, ...$page];
                },
                200,
            );
        });

        return $sessions;
    }

    /**
     * Sincroniza todos los customers del cliente, en lotes de PAGE_SIZE.
     * $onPage recibe cada lote para persistir sin mantener todo en
     * memoria; $onTotal recibe el total real (una sola vez, apenas se
     * conoce) para poder mostrar progreso "X de Y". Devuelve el total
     * sincronizado.
     */
    public function syncCustomers(callable $onPage, ?callable $onTotal = null): int
    {
        return $this->withSession(
            fn (string $baseUrl, string $sessionId) => $this->paginate(
                $baseUrl,
                'CustomerAdminService',
                'get_customer_list',
                'customer_list',
                [],
                $sessionId,
                $onPage,
                onTotal: $onTotal,
            ),
        );
    }

    /**
     * Sincroniza las accounts de un producto específico (normalmente uno
     * marcado como telefonía). Devuelve el total sincronizado.
     */
    public function syncAccountsForProduct(int $iProduct, callable $onPage, ?callable $onTotal = null): int
    {
        return $this->withSession(
            fn (string $baseUrl, string $sessionId) => $this->paginate(
                $baseUrl,
                'AccountAdminService',
                'get_account_list',
                'account_list',
                ['i_product' => $iProduct],
                $sessionId,
                $onPage,
                onTotal: $onTotal,
            ),
        );
    }

    /**
     * Histórico de llamadas finalizadas (AccountAdminService::get_xdr_list)
     * desde $fromDate en adelante, para reportes; no confundir con
     * fetchActiveSessions(), que es la fotografía de llamadas en curso.
     */
    public function syncXdrs(?\DateTimeInterface $fromDate, callable $onPage, ?callable $onTotal = null): int
    {
        $extraParams = $fromDate !== null
            ? ['from_date' => $fromDate->format('Y-m-d\TH:i:s')]
            : [];

        return $this->withSession(
            fn (string $baseUrl, string $sessionId) => $this->paginate(
                $baseUrl,
                'AccountAdminService',
                'get_xdr_list',
                'xdr_list',
                $extraParams,
                $sessionId,
                $onPage,
                onTotal: $onTotal,
            ),
        );
    }

    private function paginate(
        string $baseUrl,
        string $service,
        string $method,
        string $listField,
        array $extraParams,
        string $sessionId,
        callable $onPage,
        int $pageSize = self::PAGE_SIZE,
        ?callable $onTotal = null,
    ): int {
        $offset = 0;
        $total = 0;
        $totalReported = false;

        do {
            $params = [...$extraParams, 'limit' => $pageSize, 'offset' => $offset, 'get_total' => 1];
            $result = $this->call($baseUrl, $service, $method, $params, $sessionId);

            if (! $totalReported && $onTotal !== null && isset($result->total) && is_numeric($result->total)) {
                $onTotal((int) $result->total);
                $totalReported = true;
            }

            $page = $this->normalizeList($result->{$listField} ?? null);

            if ($page !== []) {
                $onPage($page);
                $total += count($page);
            }

            $offset += $pageSize;
        } while (count($page) >= $pageSize);

        return $total;
    }

    /**
     * PHP colapsa un arreglo SOAP de un solo elemento a un objeto suelto en
     * vez de un arreglo de un elemento; esto lo normaliza siempre a arreglo
     * de arreglos asociativos.
     */
    private function normalizeList(mixed $value): array
    {
        if ($value === null) {
            return [];
        }

        if (is_array($value)) {
            return array_map(fn (object $item): array => (array) $item, $value);
        }

        return [(array) $value];
    }

    private function withSession(callable $callback): mixed
    {
        $baseUrl = rtrim((string) PortaoneSetting::current()->base_url, '/');

        if ($baseUrl === '') {
            throw new RuntimeException('Configure la URL de conexión de PortaOne antes de continuar.');
        }

        $sessionId = $this->login($baseUrl);

        try {
            return $callback($baseUrl, $sessionId);
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
