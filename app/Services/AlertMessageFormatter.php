<?php

namespace App\Services;

class AlertMessageFormatter
{
    /**
     * @param  array<string, mixed>  $alert
     */
    public static function telegramText(array $alert): string
    {
        $lines = [
            ($alert['isTest'] ?? false) ? '🧪 <b>Prueba de notificación</b>' : '🚨 <b>Alerta de tráfico</b>',
            '',
            "Cliente: <b>{$alert['clientName']}</b>",
            'Cuenta: '.($alert['account'] ?? '—'),
            'Customer: '.($alert['customer'] ?? '—'),
            'Origen: '.($alert['origin'] ?? '—'),
            'Destino: '.($alert['destination'] ?? '—'),
            'Prefijo: +'.$alert['prefix'],
            '',
            'Llamadas: '.$alert['calls'].($alert['callLimit'] !== null ? ' / límite '.$alert['callLimit'] : ''),
            'Segundos: '.$alert['seconds'].($alert['durationLimitSeconds'] !== null ? ' / límite '.$alert['durationLimitSeconds'] : ''),
            '',
            'Acción: '.($alert['action'] === 'block' ? 'Bloquear' : 'Notificar'),
            'Hora: '.$alert['occurredAt'],
        ];

        return implode("\n", $lines);
    }

    /**
     * @return array<string, mixed>
     */
    public static function sampleAlert(string $clientName): array
    {
        return [
            'clientName' => $clientName,
            'account' => 'CUENTA-DEMO-001',
            'customer' => 'Customer Demo',
            'origin' => '88887777',
            'destination' => '50688990000',
            'prefix' => '506',
            'calls' => 128,
            'callLimit' => 100,
            'callBreach' => true,
            'seconds' => 5400,
            'durationLimitSeconds' => 3600,
            'durationBreach' => true,
            'action' => 'notify',
            'occurredAt' => now()->format('Y-m-d H:i'),
            'isTest' => true,
        ];
    }
}
