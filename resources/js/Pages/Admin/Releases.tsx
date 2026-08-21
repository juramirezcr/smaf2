import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface Release {
    tag: string;
    name: string;
    publishedAt: string;
    url: string;
    notes: string | null;
}

interface DeployRun {
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: string | null;
    htmlUrl: string;
    createdAt: string;
    revision: string;
}

interface ReleasesProps {
    currentVersion: string;
    repository: string;
    latest: Release | null;
    history: Release[];
    error: string | null;
    deployRun: DeployRun | null;
    deployError: string | null;
}

const STATUS_LABEL: Record<DeployRun['status'], string> = {
    queued: 'En cola',
    in_progress: 'En progreso',
    completed: 'Completado',
};

export default function Releases({ currentVersion, repository, latest, history, error, deployRun, deployError }: ReleasesProps) {
    const updateAvailable = latest !== null && latest.tag.replace(/^v/, '') !== currentVersion;
    const { post, processing, errors } = useForm({ tag: latest?.tag ?? '' });
    const [triggeredAt, setTriggeredAt] = useState<number | null>(null);

    // GitHub tarda unos segundos en listar la ejecución recién disparada: mientras
    // no aparezca una ejecución más reciente que el momento del clic, seguimos
    // mostrando "en curso" en vez de reactivar el botón con el estado (obsoleto) anterior.
    const runIsFresh = triggeredAt !== null && deployRun !== null && new Date(deployRun.createdAt).getTime() >= triggeredAt;
    const deployRunning = processing || (triggeredAt !== null && !runIsFresh) || (runIsFresh && deployRun!.status !== 'completed');

    useEffect(() => {
        if (!deployRunning) {
            return;
        }

        const interval = setInterval(() => {
            router.reload({ only: ['deployRun', 'deployError'] });
        }, 5000);

        return () => clearInterval(interval);
    }, [deployRunning]);

    function deploy() {
        if (!latest) {
            return;
        }

        setTriggeredAt(Date.now());
        post(route('admin.releases.deploy'));
    }

    function refreshStatus() {
        router.reload({ only: ['deployRun', 'deployError'] });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Actualizaciones</h2>}>
            <Head title="Actualizaciones" />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="rounded-lg bg-white p-6 shadow-sm">
                        <dl className="grid gap-6 sm:grid-cols-2">
                            <div><dt className="text-sm text-gray-500">Versión instalada</dt><dd className="mt-1 text-2xl font-semibold">{currentVersion}</dd></div>
                            <div><dt className="text-sm text-gray-500">Repositorio</dt><dd className="mt-1 font-medium">{repository}</dd></div>
                        </dl>
                        {error ? <p className="mt-6 rounded bg-amber-50 p-4 text-amber-800">{error}</p> : latest && (
                            <div className="mt-6 rounded border p-4">
                                <p className="font-semibold">{updateAvailable ? `Actualización disponible: ${latest.tag}` : 'La instalación está actualizada.'}</p>
                                <a className="mt-2 inline-block text-indigo-600 underline" href={latest.url} target="_blank" rel="noreferrer">Ver release en GitHub</a>
                            </div>
                        )}
                        {!error && updateAvailable && (
                            <div className="mt-6 border-t pt-6">
                                <h3 className="font-semibold text-gray-900">Despliegue</h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    Descarga {latest?.tag} en el servidor, construye la imagen, valida las migraciones
                                    en modo de prueba y sólo si todo pasa las aplica. Si algo falla, restaura
                                    automáticamente la versión anterior.
                                </p>
                                <button
                                    onClick={deploy}
                                    disabled={processing || deployRunning}
                                    className="mt-3 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    {deployRunning ? 'Despliegue en curso...' : `Actualizar a ${latest?.tag}`}
                                </button>
                                {errors.tag && <p className="mt-2 text-sm text-red-600">{errors.tag}</p>}
                            </div>
                        )}
                        {deployError && <p className="mt-4 rounded bg-amber-50 p-4 text-amber-800">{deployError}</p>}
                        {deployRun && (
                            <div className="mt-4 rounded border p-4 text-sm">
                                <div className="flex items-baseline justify-between gap-4">
                                    <p className="font-semibold">
                                        Última ejecución ({deployRun.revision}): {STATUS_LABEL[deployRun.status]}
                                        {deployRun.status === 'completed' && ` — ${deployRun.conclusion === 'success' ? 'éxito' : 'falló'}`}
                                    </p>
                                    <span className="flex shrink-0 items-center gap-3">
                                        <button onClick={refreshStatus} className="text-indigo-600 underline">Actualizar estado</button>
                                        <a className="text-indigo-600 underline" href={deployRun.htmlUrl} target="_blank" rel="noreferrer">Ver en GitHub</a>
                                    </span>
                                </div>
                                {deployRun.status === 'completed' && deployRun.conclusion !== 'success' && (
                                    <p className="mt-2 text-red-600">
                                        El despliegue falló y el workflow restauró la revisión anterior. Revise el
                                        registro en GitHub Actions para más detalle antes de reintentar.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    {!error && (
                        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-800">Historial de cambios</h3>
                            {history.length === 0 ? (
                                <p className="mt-4 text-gray-600">Aún no hay versiones publicadas.</p>
                            ) : (
                                <ol className="mt-4 divide-y divide-gray-200">
                                    {history.map((release) => (
                                        <li key={release.tag} className="py-4 first:pt-0">
                                            <div className="flex items-baseline justify-between gap-4">
                                                <a className="font-semibold text-indigo-600 underline" href={release.url} target="_blank" rel="noreferrer">{release.tag} {release.name}</a>
                                                <time className="shrink-0 text-sm text-gray-500">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(release.publishedAt))}</time>
                                            </div>
                                            {release.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{release.notes}</p>}
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
