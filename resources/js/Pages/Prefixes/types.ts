export interface PrefixRule {
    id: number;
    prefix: string;
    country: string | null;
    description: string | null;
    account: string | null;
    customer: string | null;
    hourlyCallLimit: number;
    hourlyMinutesLimit: number;
    action: 'notify' | 'block';
    enabled: boolean;
    lastEvaluatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    clientName?: string | null;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}
