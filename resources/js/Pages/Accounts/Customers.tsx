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
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface CustomersProps {
    customers: {
        data: CustomerRow[];
        links: PaginationLink[];
    };
    search: string;
}

export default function Customers({ customers, search }: CustomersProps) {
    const [query, setQuery] = useState(search);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        router.get(route('portaone-customers.index'), { search: query }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Customers</h2>}>
            <Head title="Customers" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="mb-4">
                        <TextInput
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar customer..."
                            className="w-full max-w-sm"
                        />
                    </form>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Empresa</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Accounts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {customers.data.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-gray-500">Aún no hay customers sincronizados.</td></tr>
                                ) : customers.data.map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="px-6 py-4">
                                            <Link href={route('portaone-customers.show', customer.id)} className="font-medium text-indigo-600 hover:text-indigo-900">
                                                {customer.name ?? '—'}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">{customer.company_name ?? '—'}</td>
                                        <td className="px-6 py-4">{customer.email ?? '—'}</td>
                                        <td className="px-6 py-4">{customer.bill_status ?? '—'}</td>
                                        <td className="px-6 py-4 text-right">{customer.accounts_count}</td>
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
