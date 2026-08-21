export interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    client_id: number;
    clientName: string | null;
    role: 'client_admin' | 'client_user';
    isSystemAdmin: boolean;
    email_verified_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
