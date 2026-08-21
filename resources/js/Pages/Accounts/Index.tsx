import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface AccountRow {
    customer: string | null;
    account: string | null;
    calls: number;
    seconds: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface AccountsProps {
    client: string | null;
    accounts: {
        data: AccountRow[];
        links: PaginationLink[];
    };
}

export default function AccountsIndex({ client, accounts }: AccountsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Cuentas</h2>}>
            <Head title="Cuentas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Cliente (interno del sistema)</th>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Account</th>
                                    <th className="px-6 py-3 text-right">Llamadas</th>
                                    <th className="px-6 py-3 text-right">Segundos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {accounts.data.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-gray-500">Aún no hay llamadas registradas.</td></tr>
                                ) : accounts.data.map((row, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4">{client ?? '—'}</td>
                                        <td className="px-6 py-4">{row.customer ?? '—'}</td>
                                        <td className="px-6 py-4">{row.account ?? '—'}</td>
                                        <td className="px-6 py-4 text-right">{row.calls}</td>
                                        <td className="px-6 py-4 text-right">{row.seconds}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={accounts.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
