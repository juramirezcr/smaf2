import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface DashboardProps {
    metrics: {
        callsToday: number;
        activeRules: number;
        processingBatches: number;
    };
    recentRuns: Array<{
        id: number;
        type: string;
        status: string;
        message: string | null;
        started_at: string;
        finished_at: string | null;
    }>;
}

export default function Dashboard({ metrics, recentRuns }: DashboardProps) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    SMAF 2
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <p className="text-gray-600">Monitoreo, procesamiento y trazabilidad operativa.</p>
                        <Link className="rounded bg-indigo-600 px-4 py-2 text-white" href={route('imports.index')}>
                            Importar archivo
                        </Link>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            ['Llamadas hoy', metrics.callsToday],
                            ['Reglas activas', metrics.activeRules],
                            ['Lotes en proceso', metrics.processingBatches],
                        ].map(([label, value]) => (
                            <div key={String(label)} className="rounded-lg bg-white p-6 shadow-sm">
                                <p className="text-sm text-gray-500">{label}</p>
                                <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="border-b px-6 py-4 font-semibold text-gray-900">Ejecuciones recientes</div>
                        <div className="divide-y">
                            {recentRuns.length === 0 ? (
                                <p className="p-6 text-sm text-gray-500">Aún no hay ejecuciones registradas.</p>
                            ) : recentRuns.map((run) => (
                                <div key={run.id} className="flex items-center justify-between px-6 py-4 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">{run.type}</p>
                                        {run.message && <p className="text-red-600">{run.message}</p>}
                                    </div>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{run.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
