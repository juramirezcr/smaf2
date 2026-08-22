import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

interface Call {
    id: number;
    customer: string | null;
    account: string | null;
    origin: string | null;
    destination: string | null;
    countryCode: string | null;
    prefix: string | null;
    durationSeconds: number;
    chargedAmount: string | null;
    connectedAt: string;
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

interface CallsProps {
    client: string | null;
    clients?: ClientOption[] | null;
    selectedClientId?: number | null;
    calls: {
        data: Call[];
        links: PaginationLink[];
    };
}

export default function CallsIndex({ client, clients, selectedClientId, calls }: CallsProps) {
    const changeClient = (clientId: string) => {
        router.get('/calls', { client_id: clientId }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Llamadas</h2>}>
            <Head title="Llamadas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {clients && (
                        <div className="mb-4">
                            <select
                                value={selectedClientId ?? ''}
                                onChange={(event) => changeClient(event.target.value)}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                {clients.map((option) => (
                                    <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-left text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        <th className="px-6 py-3">Cliente (interno del sistema)</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Account</th>
                                        <th className="px-6 py-3">Origen</th>
                                        <th className="px-6 py-3">Destino</th>
                                        <th className="px-6 py-3">País</th>
                                        <th className="px-6 py-3">Prefijo</th>
                                        <th className="px-6 py-3 text-right">Segundos</th>
                                        <th className="px-6 py-3 text-right">Cargo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {calls.data.length === 0 ? (
                                        <tr><td colSpan={10} className="px-6 py-4 text-gray-500">Aún no hay llamadas registradas.</td></tr>
                                    ) : calls.data.map((call) => (
                                        <tr key={call.id}>
                                            <td className="px-6 py-4">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectedAt))}</td>
                                            <td className="px-6 py-4">{client ?? '—'}</td>
                                            <td className="px-6 py-4">{call.customer ?? '—'}</td>
                                            <td className="px-6 py-4">{call.account ?? '—'}</td>
                                            <td className="px-6 py-4">{call.origin ?? '—'}</td>
                                            <td className="px-6 py-4">{call.destination ?? '—'}</td>
                                            <td className="px-6 py-4">{call.countryCode ?? '—'}</td>
                                            <td className="px-6 py-4">{call.prefix ?? '—'}</td>
                                            <td className="px-6 py-4 text-right">{call.durationSeconds}</td>
                                            <td className="px-6 py-4 text-right">{call.chargedAmount ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination links={calls.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
