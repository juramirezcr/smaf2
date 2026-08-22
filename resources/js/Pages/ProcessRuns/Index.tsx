import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface RunRow {
    id: number;
    type: string;
    status: string;
    message: string | null;
    started_at: string;
    finished_at: string | null;
    client_name?: string | null;
}

interface ProcessRunsProps {
    runs: {
        data: RunRow[];
        links: PaginationLink[];
    };
}

export default function ProcessRunsIndex({ runs }: ProcessRunsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Ejecuciones</h2>}>
            <Head title="Ejecuciones" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="divide-y">
                            {runs.data.length === 0 ? (
                                <p className="p-6 text-sm text-gray-500">Aún no hay ejecuciones registradas.</p>
                            ) : runs.data.map((run) => (
                                <div key={run.id} className="flex items-center justify-between px-6 py-4 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {run.type}
                                            {run.client_name && <span className="ml-2 text-xs font-normal text-gray-500">({run.client_name})</span>}
                                        </p>
                                        {run.message && <p className="text-red-600">{run.message}</p>}
                                        <p className="text-xs text-gray-400">
                                            {new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(run.started_at))}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{run.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4">
                        <Pagination links={runs.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
