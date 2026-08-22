import BillStatusBadge from '@/Components/BillStatusBadge';
import Pagination from '@/Components/Pagination';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { FormEventHandler, useState } from 'react';
import { Head, router } from '@inertiajs/react';

interface AccountRow {
    id: number;
    account_id: string | null;
    customer_name: string | null;
    product_name: string | null;
    bill_status: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface ClientOption {
    id: number;
    name: string;
}

interface AccountsProps {
    client: string | null;
    search: string;
    clients?: ClientOption[] | null;
    selectedClientId?: number | null;
    accounts: {
        data: AccountRow[];
        links: PaginationLink[];
    };
}

export default function AccountsIndex({ client, search, clients, selectedClientId, accounts }: AccountsProps) {
    const [query, setQuery] = useState(search);

    const changeClient = (clientId: string) => {
        router.get('/accounts', { client_id: clientId }, { preserveState: true });
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        router.get('/accounts', { search: query, client_id: selectedClientId }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Cuentas</h2>}>
            <Head title="Cuentas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        {clients && (
                            <select
                                value={selectedClientId ?? ''}
                                onChange={(event) => changeClient(event.target.value)}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                {clients.map((option) => (
                                    <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                            </select>
                        )}
                        <form onSubmit={submit}>
                            <TextInput
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar account..."
                                className="w-full max-w-sm"
                            />
                        </form>
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Cliente (interno del sistema)</th>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Account</th>
                                    <th className="px-6 py-3">Producto</th>
                                    <th className="px-6 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {accounts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-gray-500">
                                            Este cliente aún no tiene accounts de telefonía sincronizadas.
                                        </td>
                                    </tr>
                                ) : accounts.data.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-6 py-4">{client ?? '—'}</td>
                                        <td className="px-6 py-4">{row.customer_name ?? '—'}</td>
                                        <td className="px-6 py-4">{row.account_id ?? '—'}</td>
                                        <td className="px-6 py-4">{row.product_name ?? '—'}</td>
                                        <td className="px-6 py-4"><BillStatusBadge status={row.bill_status} /></td>
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
