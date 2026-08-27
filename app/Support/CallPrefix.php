<?php

namespace App\Support;

class CallPrefix
{
    /**
     * Bucket de prefijo (3-4 dígitos) usado para monitoreo de tráfico y
     * agrupación en el dashboard. Las extensiones internas observadas van de
     * 3 a 5 dígitos (ej. "100", "2000", o "X10002" que PortaOne usa para
     * algunas llamadas internas → "10002"), mientras que hay números locales
     * reales de 7 dígitos (ej. "5061122") que sí deben contar como llamada.
     * Con 6 dígitos o más se trata como número real; con 5 o menos, como
     * extensión/llamada interna: se devuelve null para que no cuente en
     * ningún prefijo ni dispare reglas de monitoreo.
     *
     * Para una llamada interna, PortaOne a veces devuelve el destino con una
     * etiqueta entre paréntesis repitiendo el número (ej. "2000 (2000)"), no
     * solo el número. Quitar TODOS los caracteres no numéricos del string
     * completo concatenaría ambas apariciones ("20002000", 8 dígitos) y lo
     * haría pasar por número real; por eso solo se toma el primer bloque de
     * dígitos, ignorando cualquier cosa después de un espacio o paréntesis.
     */
    public static function forDestination(string $destination): ?string
    {
        preg_match('/^\D*(\d+)/', $destination, $matches);
        $normalized = $matches[1] ?? '';

        if ($normalized === '' || strlen($normalized) <= 5) {
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
