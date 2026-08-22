const BILL_STATUS_LABELS: Record<string, string> = {
    O: 'Activa',
    B: 'Bloqueada',
    C: 'Cerrada',
    S: 'Suspendida',
};

const BILL_STATUS_BADGE_CLASSES: Record<string, string> = {
    O: 'bg-emerald-50 text-emerald-700',
    B: 'bg-amber-50 text-amber-700',
    C: 'bg-red-50 text-red-700',
    S: 'bg-gray-100 text-gray-600',
};

export function billStatusLabel(status: string | null): string {
    if (!status) {
        return '—';
    }

    return BILL_STATUS_LABELS[status.toUpperCase()] ?? status;
}

export function billStatusBadgeClass(status: string | null): string {
    if (!status) {
        return 'bg-gray-100 text-gray-500';
    }

    return BILL_STATUS_BADGE_CLASSES[status.toUpperCase()] ?? 'bg-gray-100 text-gray-600';
}
