<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
                    <tr>
                        <td style="background-color:#dc2626; padding:16px 24px;">
                            <span style="color:#ffffff; font-size:16px; font-weight:bold;">Alerta de tráfico &mdash; SMAF2</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:24px;">
                            @if($alert['isTest'] ?? false)
                                <p style="margin:0 0 16px; padding:8px 12px; background-color:#fef3c7; color:#92400e; font-size:13px; border-radius:4px;">
                                    Este es un mensaje de prueba con datos de ejemplo. No corresponde a una alerta real.
                                </p>
                            @endif
                            <p style="margin:0 0 16px; color:#374151; font-size:14px;">
                                Se superó el límite configurado para el prefijo <strong>+{{ $alert['prefix'] }}</strong>.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#374151;">
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280; width:160px;">Cliente interno</td>
                                    <td style="padding:6px 0; font-weight:bold;">{{ $alert['clientName'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Cuenta</td>
                                    <td style="padding:6px 0; font-weight:bold;">{{ $alert['account'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Customer</td>
                                    <td style="padding:6px 0;">{{ $alert['customer'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Origen</td>
                                    <td style="padding:6px 0;">{{ $alert['origin'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Destino</td>
                                    <td style="padding:6px 0;">{{ $alert['destination'] ?? '—' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Prefijo</td>
                                    <td style="padding:6px 0;">+{{ $alert['prefix'] }}</td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px; border-top:1px solid #e5e7eb; padding-top:16px; font-size:14px;">
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280; width:160px;">Llamadas (última hora)</td>
                                    <td style="padding:6px 0; font-weight:bold; color: {{ $alert['callBreach'] ? '#dc2626' : '#374151' }};">
                                        {{ $alert['calls'] }} @if($alert['callLimit'] !== null) / límite {{ $alert['callLimit'] }} @endif
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Duración (segundos)</td>
                                    <td style="padding:6px 0; font-weight:bold; color: {{ $alert['durationBreach'] ? '#dc2626' : '#374151' }};">
                                        {{ $alert['seconds'] }} @if($alert['durationLimitSeconds'] !== null) / límite {{ $alert['durationLimitSeconds'] }} @endif
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:20px 0 0; font-size:13px; color:#9ca3af;">
                                Acción configurada: {{ $alert['action'] === 'block' ? 'Bloquear' : 'Notificar' }} &middot;
                                {{ $alert['occurredAt'] }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
