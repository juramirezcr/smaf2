import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

interface QueueStat {
    queue: string;
    pending: number;
    running: number;
    oldestPendingAt: number | null;
}

interface JobTypeStat {
    job: string;
    total: number;
    running: number;
    maxAttempts: number;
    oldestCreatedAt: number;
}

interface RunningJob {
    id: number;
    queue: string;
    job: string;
    attempts: number;
    runningSeconds: number;
    createdAtIso: string;
}

interface FailedJob {
    id: number;
    uuid: string;
    queue: string;
    job: string;
    message: string | null;
    failedAt: string;
}

interface QueueMonitorProps {
    summary: {
        pending: number;
        running: number;
        failed: number;
    };
    byQueue: QueueStat[];
    byJobType: JobTypeStat[];
    runningJobs: RunningJob[];
    failedJobs: FailedJob[];
    runningListLimit: number;
    failedListLimit: number;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
}

function formatAge(timestamp: number): string {
    return formatDuration(Math.floor(Date.now() / 1000) - timestamp);
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}

export default function QueueMonitor({ summary, byQueue, byJobType, runningJobs, failedJobs, runningListLimit, failedListLimit }: QueueMonitorProps) {
    const retryFailed = (uuid: string) => {
        router.post(route('admin.queue.failed.retry', uuid), {}, { preserveScroll: true });
    };

    const forgetFailed = (uuid: string) => {
        if (!confirm('¿Eliminar este job fallido? No se podrá reintentar después.')) {
            return;
        }
        router.delete(route('admin.queue.failed.forget', uuid), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Cola de jobs</h2>}>
            <Head title="Cola de jobs" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">Pendientes</p>
                            <p className="mt-1 text-3xl font-semibold text-gray-900">{summary.pending}</p>
                        </div>
                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">En ejecución ahora</p>
                            <p className="mt-1 text-3xl font-semibold text-indigo-600">{summary.running}</p>
                        </div>
                        <div className="rounded-lg bg-white p-5 shadow-sm">
                            <p className="text-sm text-gray-500">Fallidos</p>
                            <p className="mt-1 text-3xl font-semibold text-red-600">{summary.failed}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <section className="rounded-lg bg-white shadow-sm">
                            <div className="border-b px-6 py-4 font-semibold text-gray-900">Por cola</div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-6 py-2 text-left">Cola</th>
                                        <th className="px-6 py-2 text-right">Pendientes</th>
                                        <th className="px-6 py-2 text-right">Corriendo</th>
                                        <th className="px-6 py-2 text-right">Más antiguo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byQueue.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-4 text-gray-500">Sin jobs en cola.</td></tr>
                                    ) : byQueue.map((row) => (
                                        <tr key={row.queue}>
                                            <td className="px-6 py-3 font-mono">{row.queue}</td>
                                            <td className="px-6 py-3 text-right">{row.pending}</td>
                                            <td className="px-6 py-3 text-right">{row.running}</td>
                                            <td className="px-6 py-3 text-right text-gray-500">
                                                {row.oldestPendingAt ? formatAge(row.oldestPendingAt) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <section className="rounded-lg bg-white shadow-sm">
                            <div className="border-b px-6 py-4 font-semibold text-gray-900">Por tipo de job</div>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-6 py-2 text-left">Job</th>
                                        <th className="px-6 py-2 text-right">Total</th>
                                        <th className="px-6 py-2 text-right">Corriendo</th>
                                        <th className="px-6 py-2 text-right">Intentos (máx)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {byJobType.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-4 text-gray-500">Sin jobs en cola.</td></tr>
                                    ) : byJobType.map((row) => (
                                        <tr key={row.job}>
                                            <td className="px-6 py-3 font-mono text-xs">{row.job.split('\\').pop()}</td>
                                            <td className="px-6 py-3 text-right">{row.total}</td>
                                            <td className="px-6 py-3 text-right">{row.running}</td>
                                            <td className="px-6 py-3 text-right">{row.maxAttempts}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    </div>

                    <section className="rounded-lg bg-white shadow-sm">
                        <div className="border-b px-6 py-4">
                            <h3 className="font-semibold text-gray-900">En ejecución ahora</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Si un job lleva mucho tiempo aquí, probablemente está atascado. Mostrando hasta {runningListLimit}.
                            </p>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-2 text-left">Job</th>
                                    <th className="px-6 py-2 text-left">Cola</th>
                                    <th className="px-6 py-2 text-right">Intentos</th>
                                    <th className="px-6 py-2 text-right">Corriendo desde hace</th>
                                    <th className="px-6 py-2 text-right">Creado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {runningJobs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-gray-500">No hay jobs en ejecución en este momento.</td></tr>
                                ) : runningJobs.map((job) => (
                                    <tr key={job.id} className={job.runningSeconds > 300 ? 'bg-amber-50' : undefined}>
                                        <td className="px-6 py-3 font-mono text-xs">{job.job.split('\\').pop()}</td>
                                        <td className="px-6 py-3 font-mono">{job.queue}</td>
                                        <td className="px-6 py-3 text-right">{job.attempts}</td>
                                        <td className="px-6 py-3 text-right font-medium">{formatDuration(job.runningSeconds)}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{formatDateTime(job.createdAtIso)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section className="rounded-lg bg-white shadow-sm">
                        <div className="border-b px-6 py-4">
                            <h3 className="font-semibold text-gray-900">Fallidos recientes</h3>
                            <p className="mt-1 text-sm text-gray-500">Mostrando hasta {failedListLimit}.</p>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-2 text-left">Job</th>
                                    <th className="px-6 py-2 text-left">Cola</th>
                                    <th className="px-6 py-2 text-left">Error</th>
                                    <th className="px-6 py-2 text-left">Falló</th>
                                    <th className="px-6 py-2 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {failedJobs.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-gray-500">Sin jobs fallidos.</td></tr>
                                ) : failedJobs.map((job) => (
                                    <tr key={job.id}>
                                        <td className="px-6 py-3 font-mono text-xs">{job.job.split('\\').pop()}</td>
                                        <td className="px-6 py-3 font-mono">{job.queue}</td>
                                        <td className="max-w-md truncate px-6 py-3 text-red-600" title={job.message ?? ''}>{job.message ?? '—'}</td>
                                        <td className="px-6 py-3 text-gray-500">{formatDateTime(job.failedAt)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => retryFailed(job.uuid)}
                                                className="mr-3 text-sm font-medium text-indigo-600 hover:text-indigo-900"
                                            >
                                                Reintentar
                                            </button>
                                            <button
                                                onClick={() => forgetFailed(job.uuid)}
                                                className="text-sm font-medium text-red-600 hover:text-red-900"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
