import { usePage } from '@inertiajs/react';

/**
 * Zona horaria efectiva del usuario actual (la suya si es administrador y
 * la configuró, o la de su cliente). Todas las fechas de llamadas se
 * guardan en UTC (así las entrega PortaOne), así que cualquier fecha
 * mostrada al usuario debe pasar por esta zona horaria explícitamente en
 * vez de depender de la del navegador.
 */
export function useTimezone(): string {
    return usePage().props.auth.user?.effectiveTimezone ?? 'America/Costa_Rica';
}

export function formatDateTime(iso: string, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(iso).toLocaleString('es-CR', { timeZone, ...options });
}

export function formatDate(iso: string, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(iso).toLocaleDateString('es-CR', { timeZone, ...options });
}

export function formatTime(iso: string, timeZone: string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(iso).toLocaleTimeString('es-CR', { timeZone, ...options });
}
