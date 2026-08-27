<?php

namespace App\Support;

class CallPrefix
{
    /**
     * Bucket de prefijo (3-4 dígitos) usado para monitoreo de tráfico y
     * agrupación en el dashboard. Un destino de menos de 5 dígitos no puede
     * ser un número real en E.164 (el código de país + número más corto ya
     * supera esa longitud), así que es una extensión interna: se devuelve
     * null para que no cuente en ningún prefijo ni dispare reglas de
     * monitoreo (ej. una extensión "2000" no debe activar una regla del
     * prefijo "20").
     */
    public static function forDestination(string $destination): ?string
    {
        $normalized = preg_replace('/\D/', '', $destination);

        if ($normalized === '' || strlen($normalized) < 5) {
            return null;
        }

        if (str_starts_with($normalized, '011')) {
            $normalized = substr($normalized, 3);
        }

        return str_starts_with($normalized, '1')
            ? substr($normalized, 0, 4)
            : substr($normalized, 0, 3);
    }
}
