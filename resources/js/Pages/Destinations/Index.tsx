import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

interface DestinationRow {
    country_code: string | null;
    prefix: string | null;
    destination: string | null;
    calls: number;
    seconds: number;
    customer_count: number;
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

interface DestinationsProps {
    client: string | null;
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    destinations: {
        data: DestinationRow[];
        links: PaginationLink[];
    };
}

export default function DestinationsIndex({ clients, selectedClientId, destinations }: DestinationsProps) {
    const showingAll = selectedClientId === 'all';

    const changeClient = (clientId: string) => {
        router.get('/destinations', { client_id: clientId }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Destinos</h2>}>
            <Head title="Destinos" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {clients && (
                        <div className="mb-4">
                            <select
                                value={selectedClientId ?? ''}
                                onChange={(event) => changeClient(event.target.value)}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="all">Todos</option>
                                {clients.map((option) => (
                                    <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <p className="mb-4 text-sm text-gray-500">
                        Total de llamadas y duración por destino, sin importar el customer o account que llamó — útil para detectar destinos con tráfico anormal.
                    </p>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-left text-gray-500">
                                    <tr>
                                        {showingAll && <th className="px-6 py-3">Cliente</th>}
                                        <th className="px-6 py-3">País</th>
                                        <th className="px-6 py-3">Prefijo</th>
                                        <th className="px-6 py-3">Destino</th>
                                        <th className="px-6 py-3 text-right">Customers distintos</th>
                                        <th className="px-6 py-3 text-right">Llamadas</th>
                                        <th className="px-6 py-3 text-right">Segundos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {destinations.data.length === 0 ? (
                                        <tr><td colSpan={showingAll ? 7 : 6} className="px-6 py-4 text-gray-500">Aún no hay llamadas registradas.</td></tr>
                                    ) : destinations.data.map((row, index) => (
                                        <tr key={index} className={row.customer_count > 1 ? 'bg-amber-50' : undefined}>
                                            {showingAll && <td className="px-6 py-4">{row.client_name ?? '—'}</td>}
                                            <td className="px-6 py-4">{row.country_code ?? '—'}</td>
                                            <td className="px-6 py-4">{row.prefix ?? '—'}</td>
                                            <td className="px-6 py-4">{row.destination ?? '—'}</td>
                                            <td className="px-6 py-4 text-right">{row.customer_count}</td>
                                            <td className="px-6 py-4 text-right">{row.calls}</td>
                                            <td className="px-6 py-4 text-right">{row.seconds}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination links={destinations.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
