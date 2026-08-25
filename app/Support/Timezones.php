<?php

namespace App\Support;

class Timezones
{
    /**
     * Zona horaria usada cuando ni el usuario ni su cliente tienen una
     * configurada explícitamente.
     */
    public const DEFAULT = 'America/Costa_Rica';

    /**
     * Lista corta de zonas horarias relevantes para los clientes de SMAF2
     * (Centroamérica y Estados Unidos, donde operan la mayoría). Se usa
     * tanto en los selects del frontend como para validar el valor
     * guardado en el perfil o en el cliente.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function options(): array
    {
        return [
            ['value' => 'America/Costa_Rica', 'label' => 'Costa Rica (UTC-6)'],
            ['value' => 'America/Guatemala', 'label' => 'Guatemala / El Salvador / Honduras (UTC-6)'],
            ['value' => 'America/Managua', 'label' => 'Nicaragua (UTC-6)'],
            ['value' => 'America/Panama', 'label' => 'Panamá (UTC-5)'],
            ['value' => 'America/Bogota', 'label' => 'Colombia (UTC-5)'],
            ['value' => 'America/New_York', 'label' => 'Estados Unidos - Este (UTC-5/-4)'],
            ['value' => 'America/Chicago', 'label' => 'Estados Unidos - Central (UTC-6/-5)'],
            ['value' => 'America/Denver', 'label' => 'Estados Unidos - Montaña (UTC-7/-6)'],
            ['value' => 'America/Los_Angeles', 'label' => 'Estados Unidos - Pacífico (UTC-8/-7)'],
            ['value' => 'UTC', 'label' => 'UTC'],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::options(), 'value');
    }

    public static function isValid(?string $timezone): bool
    {
        return $timezone !== null && in_array($timezone, self::values(), true);
    }
}
