<?php

namespace App\Support;

class DashboardWidgets
{
    /**
     * Catálogo de widgets disponibles para el Panel de Control. El orden
     * aquí es el orden por defecto en el que se activan para un usuario
     * nuevo (todos, salvo que estén marcados admin_only y el usuario no
     * sea administrador).
     *
     * @return array<int, array{key: string, label: string, description: string, icon: string, adminOnly: bool}>
     */
    public static function catalog(): array
    {
        return [
            ['key' => 'traffic', 'label' => 'Tráfico de llamadas', 'description' => 'Serie de tiempo de todo el tráfico monitoreado.', 'icon' => '📈', 'adminOnly' => false],
            ['key' => 'prefixes', 'label' => 'Prefijos', 'description' => 'Llamadas y minutos por prefijo, agrupado por cliente.', 'icon' => '🌐', 'adminOnly' => false],
            ['key' => 'destinations', 'label' => 'Destinos (Top 10)', 'description' => 'Destinos con más llamadas del período.', 'icon' => '📞', 'adminOnly' => false],
            ['key' => 'accounts', 'label' => 'Cuentas (Top 10)', 'description' => 'Cuentas con más llamadas del período, agrupadas por cliente.', 'icon' => '👥', 'adminOnly' => false],
            ['key' => 'heatmap', 'label' => 'Intensidad por hora', 'description' => 'Mapa de calor de llamadas por día y hora.', 'icon' => '🕘', 'adminOnly' => true],
            ['key' => 'alerts', 'label' => 'Alertas recientes', 'description' => 'Tabla detallada con estado de revisión.', 'icon' => '🔔', 'adminOnly' => false],
        ];
    }

    /**
     * @param  bool  $canSeeAdminWidgets  Si puede ver los widgets admin_only
     *                                    (administrador de sistema con acceso
     *                                    completo, no de solo lectura).
     * @return array<int, string>
     */
    public static function allowedKeys(bool $canSeeAdminWidgets): array
    {
        return array_values(array_map(
            fn (array $widget) => $widget['key'],
            array_filter(self::catalog(), fn (array $widget) => $canSeeAdminWidgets || ! $widget['adminOnly']),
        ));
    }

    /**
     * Intersecta la preferencia guardada del usuario con lo que realmente
     * puede ver (según su rol) y con el catálogo vigente. Si nunca ha
     * guardado nada, o su preferencia quedó vacía tras el filtro, se
     * activa el set completo permitido.
     *
     * @param  array<int, string>|null  $saved
     * @return array<int, string>
     */
    public static function resolveActive(?array $saved, bool $canSeeAdminWidgets): array
    {
        $allowed = self::allowedKeys($canSeeAdminWidgets);

        if ($saved === null) {
            return $allowed;
        }

        $active = array_values(array_intersect($saved, $allowed));

        return $active === [] ? $allowed : $active;
    }
}
