import BillStatusBadge from '@/Components/BillStatusBadge';
import Pagination from '@/Components/Pagination';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface CustomerRow {
    id: number;
    name: string | null;
    company_name: string | null;
    email: string | null;
    bill_status: string | null;
    accounts_count: number;
    client_name?: string | null;
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

interface CustomersProps {
    customers: {
        data: CustomerRow[];
        links: PaginationLink[];
    };
    search: string;
    basePath: string;
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
}

export default function Customers({ customers, search, basePath, clients, selectedClientId }: CustomersProps) {
    const [query, setQuery] = useState(search);
    const showingAll = selectedClientId === 'all';

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(basePath, { search: query, client_id: selectedClientId ?? undefined }, { preserveState: true });
    };

    const changeClient = (clientId: string) => {
        router.get(basePath, { client_id: clientId }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Customers</h2>}>
            <Head title="Customers" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        {clients && (
                            <select
                                value={selectedClientId ?? ''}
                                onChange={(event) => changeClient(event.target.value)}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            >
                                <option value="all">Todos</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        )}
                        <form onSubmit={submit}>
                            <TextInput
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar customer..."
                                className="w-full max-w-sm"
                            />
                        </form>
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                <tr>
                                    {showingAll && <th className="px-6 py-3">Cliente (interno del sistema)</th>}
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Empresa</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Accounts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {customers.data.length === 0 ? (
                                    <tr><td colSpan={showingAll ? 6 : 5} className="px-6 py-4 text-gray-500 dark:text-gray-400">Aún no hay customers sincronizados.</td></tr>
                                ) : customers.data.map((customer) => (
                                    <tr key={customer.id} className="dark:hover:bg-gray-700">
                                        {showingAll && <td className="px-6 py-4 dark:text-gray-300">{customer.client_name ?? '—'}</td>}
                                        <td className="px-6 py-4">
                                            <Link href={`${basePath}/${customer.id}`} className="font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                {customer.name ?? '—'}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 dark:text-gray-300">{customer.company_name ?? '—'}</td>
                                        <td className="px-6 py-4 dark:text-gray-300">{customer.email ?? '—'}</td>
                                        <td className="px-6 py-4"><BillStatusBadge status={customer.bill_status} /></td>
                                        <td className="px-6 py-4 text-right dark:text-gray-300">{customer.accounts_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={customers.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
