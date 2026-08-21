const BILL_STATUS_LABELS: Record<string, string> = {
    O: 'Activa',
    B: 'Bloqueada',
    C: 'Cerrada',
};

export function billStatusLabel(status: string | null): string {
    if (!status) {
        return '—';
    }

    return BILL_STATUS_LABELS[status.toUpperCase()] ?? status;
}
