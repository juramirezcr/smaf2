<?php

namespace App\Support;

class CallPrefix
{
    /**
     * Bucket de prefijo (3-4 dígitos) usado para monitoreo de tráfico y
     * agrupación en el dashboard. Un destino de 8 dígitos o menos no alcanza
     * a ser un número real en E.164 (código de país + número), así que se
     * trata como extensión/llamada interna: se devuelve null para que no
     * cuente en ningún prefijo ni dispare reglas de monitoreo (ej. una
     * extensión "2000", o el formato "X10002" que PortaOne usa para algunas
     * llamadas internas, no deben activar una regla de prefijo).
     */
    public static function forDestination(string $destination): ?string
    {
        $normalized = preg_replace('/\D/', '', $destination);

        if ($normalized === '' || strlen($normalized) <= 8) {
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
