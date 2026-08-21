import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface DestinationRow {
    customer: string | null;
    country_code: string | null;
    prefix: string | null;
    destination: string | null;
    calls: number;
    seconds: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface DestinationsProps {
    destinations: {
        data: DestinationRow[];
        links: PaginationLink[];
    };
}

export default function DestinationsIndex({ destinations }: DestinationsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Destinos</h2>}>
            <Head title="Destinos" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">País</th>
                                    <th className="px-6 py-3">Prefijo</th>
                                    <th className="px-6 py-3">Destino</th>
                                    <th className="px-6 py-3 text-right">Llamadas</th>
                                    <th className="px-6 py-3 text-right">Segundos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {destinations.data.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-4 text-gray-500">Aún no hay llamadas registradas.</td></tr>
                                ) : destinations.data.map((row, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4">{row.customer ?? '—'}</td>
                                        <td className="px-6 py-4">{row.country_code ?? '—'}</td>
                                        <td className="px-6 py-4">{row.prefix ?? '—'}</td>
                                        <td className="px-6 py-4">{row.destination ?? '—'}</td>
                                        <td className="px-6 py-4 text-right">{row.calls}</td>
                                        <td className="px-6 py-4 text-right">{row.seconds}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={destinations.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
