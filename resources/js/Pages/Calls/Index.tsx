import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface Call {
    id: number;
    customer: string | null;
    account: string | null;
    origin: string | null;
    destination: string | null;
    countryCode: string | null;
    prefix: string | null;
    durationSeconds: number;
    connectedAt: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface CallsProps {
    calls: {
        data: Call[];
        links: PaginationLink[];
    };
}

export default function CallsIndex({ calls }: CallsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Llamadas</h2>}>
            <Head title="Llamadas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Cuenta</th>
                                    <th className="px-6 py-3">Origen</th>
                                    <th className="px-6 py-3">Destino</th>
                                    <th className="px-6 py-3">País</th>
                                    <th className="px-6 py-3">Prefijo</th>
                                    <th className="px-6 py-3 text-right">Segundos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {calls.data.length === 0 ? (
                                    <tr><td colSpan={8} className="px-6 py-4 text-gray-500">Aún no hay llamadas registradas.</td></tr>
                                ) : calls.data.map((call) => (
                                    <tr key={call.id}>
                                        <td className="px-6 py-4">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectedAt))}</td>
                                        <td className="px-6 py-4">{call.customer ?? '—'}</td>
                                        <td className="px-6 py-4">{call.account ?? '—'}</td>
                                        <td className="px-6 py-4">{call.origin ?? '—'}</td>
                                        <td className="px-6 py-4">{call.destination ?? '—'}</td>
                                        <td className="px-6 py-4">{call.countryCode ?? '—'}</td>
                                        <td className="px-6 py-4">{call.prefix ?? '—'}</td>
                                        <td className="px-6 py-4 text-right">{call.durationSeconds}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={calls.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
