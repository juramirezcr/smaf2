export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    client_id: number;
    clientName: string | null;
    role: 'client_admin' | 'client_user';
    isSystemAdmin: boolean;
    readOnly: boolean;
    email_verified_at?: string;
    timezone: string | null;
    effectiveTimezone: string;
}

export interface TimezoneOption {
    value: string;
    label: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    timezoneOptions: TimezoneOption[];
};
