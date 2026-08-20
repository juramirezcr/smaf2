export interface User {
    id: number;
    name: string;
    email: string;
    client_id: number;
    role: 'client_admin' | 'client_user';
    email_verified_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
