import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface ClientRow {
    id: number;
    name: string;
    customers_count: number;
    accounts_count: number;
}

export default function CustomersClientPicker({ clients }: { clients: ClientRow[] }) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Customers</h2>}>
            <Head title="Customers" />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <p className="mb-4 text-sm text-gray-500">
                        Selecciona un cliente para ver sus customers y accounts sincronizados.
                    </p>
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Cliente (interno del sistema)</th>
                                    <th className="px-6 py-3 text-right">Customers</th>
                                    <th className="px-6 py-3 text-right">Accounts</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {clients.length === 0 ? (
                                    <tr><td colSpan={3} className="px-6 py-4 text-gray-500">Aún no hay clientes registrados.</td></tr>
                                ) : clients.map((client) => (
                                    <tr key={client.id}>
                                        <td className="px-6 py-4">
                                            <Link href={route('admin.clients.customers.index', client.id)} className="font-medium text-indigo-600 hover:text-indigo-900">
                                                {client.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-right">{client.customers_count}</td>
                                        <td className="px-6 py-4 text-right">{client.accounts_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
