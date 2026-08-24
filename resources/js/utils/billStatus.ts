const BILL_STATUS_LABELS: Record<string, string> = {
    O: 'Activa',
    B: 'Bloqueada',
    C: 'Cerrada',
    S: 'Suspendida',
};

const BILL_STATUS_BADGE_CLASSES: Record<string, string> = {
    O: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    B: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    C: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    S: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export function billStatusLabel(status: string | null): string {
    if (!status) {
        return '—';
    }

    return BILL_STATUS_LABELS[status.toUpperCase()] ?? status;
}

export function billStatusBadgeClass(status: string | null): string {
    if (!status) {
        return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
    }

    return BILL_STATUS_BADGE_CLASSES[status.toUpperCase()] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
}
