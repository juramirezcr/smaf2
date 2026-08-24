import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

interface Batch {
    id: number;
    filename: string;
    source: string;
    status: string;
    totalRows: number;
    processedRows: number;
    rejectedRows: number;
    failureReason: string | null;
    createdAt: string;
}

interface ImportsProps {
    batches: { data: Batch[] };
}

export default function ImportsIndex({ batches }: ImportsProps) {
    const { setData, post, processing, errors, reset } = useForm({
        source: 'manual',
        file: null as File | null,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        post(route('imports.store'), { onSuccess: () => reset('file') });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Importaciones</h2>}>
            <Head title="Importaciones" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cargar archivo CDR</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">CSV sin encabezado: ID, cuenta, origen, destino, fecha, segundos, usuario, cliente y ambiente.</p>
                        <div className="mt-4 flex flex-wrap gap-4">
                            <input type="file" accept=".csv,.log,text/csv,text/plain" onChange={(event) => setData('file', event.target.files?.[0] ?? null)} className="dark:text-gray-100" />
                            <button disabled={processing} className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
                                {processing ? 'Encolando...' : 'Procesar archivo'}
                            </button>
                        </div>
                        {errors.file && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.file}</p>}
                    </form>
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                <tr><th className="px-6 py-3">Archivo</th><th className="px-6 py-3">Estado</th><th className="px-6 py-3">Procesadas</th><th className="px-6 py-3">Rechazadas</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 dark:text-gray-100">
                                {batches.data.map((batch) => (
                                    <tr key={batch.id}>
                                        <td className="px-6 py-4"><p className="font-medium">{batch.filename}</p>{batch.failureReason && <p className="text-red-600 dark:text-red-400">{batch.failureReason}</p>}</td>
                                        <td className="px-6 py-4">{batch.status}</td>
                                        <td className="px-6 py-4">{batch.processedRows} / {batch.totalRows}</td>
                                        <td className="px-6 py-4">{batch.rejectedRows}</td>
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
