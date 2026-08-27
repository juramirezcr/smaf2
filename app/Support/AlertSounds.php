<?php

namespace App\Support;

class AlertSounds
{
    /**
     * Claves válidas de sonido de alerta. El tono en sí se genera en el
     * navegador con Web Audio API (Dashboard.tsx), no hay archivos de audio
     * que mantener; este listado es solo para validar la preferencia
     * guardada por el usuario.
     *
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return ['beep', 'double', 'siren'];
    }

    public static function isValid(?string $key): bool
    {
        return $key === null || in_array($key, self::keys(), true);
    }
}
