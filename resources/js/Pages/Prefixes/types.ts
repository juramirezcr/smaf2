export interface PrefixRule {
    id: number;
    prefix: string;
    country: string | null;
    description: string | null;
    account: string | null;
    customer: string | null;
    hourlyCallLimit: number;
    hourlyMinutesLimit: number;
    action: 'notify' | 'block' | 'ignore';
    enabled: boolean;
    lastEvaluatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    clientName?: string | null;
    isGlobal?: boolean;
}

export const PREFIX_RULE_ACTION_LABEL: Record<PrefixRule['action'], string> = {
    notify: 'Notificar',
    block: 'Bloquear',
    ignore: 'Ignorar',
};

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}
