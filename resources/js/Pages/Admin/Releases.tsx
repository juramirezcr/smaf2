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

interface ReleaseNoteItem {
    id: number;
    version: string;
    notes: string;
    createdAt: string;
}

interface ReleasesProps {
    currentVersion: string;
    repository: string;
    latest: Release | null;
    error: string | null;
    deployRun: DeployRun | null;
    deployError: string | null;
    releaseNotes: ReleaseNoteItem[];
}

const STATUS_LABEL: Record<DeployRun['status'], string> = {
    queued: 'En cola',
    in_progress: 'En progreso',
    completed: 'Completado',
};

export default function Releases({ currentVersion, repository, latest, error, deployRun, deployError, releaseNotes }: ReleasesProps) {
    const updateAvailable = latest !== null && latest.tag.replace(/^v/, '') !== currentVersion;
    const { post, processing, errors } = useForm({ tag: latest?.tag ?? '' });
    const [triggeredAt, setTriggeredAt] = useState<number | null>(null);
    const [awaitingFreshRun, setAwaitingFreshRun] = useState(false);

    // GitHub tarda unos segundos en listar la ejecución recién disparada: mientras
    // no aparezca una ejecución más reciente que el momento del clic, seguimos
    // mostrando "en curso" en vez de reactivar el botón con el estado (obsoleto) anterior.
    // Si el disparo falló (por ejemplo, el token sin permiso), nunca aparecerá una
    // ejecución nueva, así que awaitingFreshRun se limpia en el propio onError.
    const runIsFresh = triggeredAt !== null && deployRun !== null && new Date(deployRun.createdAt).getTime() >= triggeredAt;
    const remoteRunning = deployRun !== null && deployRun.status !== 'completed';
    const deployRunning = processing || awaitingFreshRun || remoteRunning;

    useEffect(() => {
        if (runIsFresh) {
            setAwaitingFreshRun(false);
        }
    }, [runIsFresh]);

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

        post(route('admin.releases.deploy'), {
            onSuccess: () => {
                setTriggeredAt(Date.now());
                setAwaitingFreshRun(true);
            },
            onError: () => {
                setTriggeredAt(null);
                setAwaitingFreshRun(false);
            },
        });
    }

    function refreshStatus() {
        router.reload({ only: ['deployRun', 'deployError'] });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Actualizaciones</h2>}>
            <Head title="Actualizaciones" />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                        <dl className="grid gap-6 sm:grid-cols-2">
                            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Versión instalada</dt><dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{currentVersion}</dd></div>
                            <div><dt className="text-sm text-gray-500 dark:text-gray-400">Repositorio</dt><dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">{repository}</dd></div>
                        </dl>
                        {error ? <p className="mt-6 rounded bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">{error}</p> : latest && (
                            <div className="mt-6 rounded border p-4 dark:border-gray-700">
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{updateAvailable ? `Actualización disponible: ${latest.tag}` : 'La instalación está actualizada.'}</p>
                                <a className="mt-2 inline-block text-indigo-600 underline dark:text-indigo-400" href={latest.url} target="_blank" rel="noreferrer">Ver release en GitHub</a>
                            </div>
                        )}
                        {!error && updateAvailable && (
                            <div className="mt-6 border-t pt-6 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Despliegue</h3>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
                                {errors.tag && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.tag}</p>}
                            </div>
                        )}
                        {deployError && <p className="mt-4 rounded bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">{deployError}</p>}
                        {deployRun && (
                            <div className="mt-4 rounded border p-4 text-sm dark:border-gray-700">
                                <div className="flex items-baseline justify-between gap-4">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                        Última ejecución ({deployRun.revision}): {STATUS_LABEL[deployRun.status]}
                                        {deployRun.status === 'completed' && ` — ${deployRun.conclusion === 'success' ? 'éxito' : 'falló'}`}
                                    </p>
                                    <span className="flex shrink-0 items-center gap-3">
                                        <button onClick={refreshStatus} className="text-indigo-600 underline dark:text-indigo-400">Actualizar estado</button>
                                        <a className="text-indigo-600 underline dark:text-indigo-400" href={deployRun.htmlUrl} target="_blank" rel="noreferrer">Ver en GitHub</a>
                                    </span>
                                </div>
                                {deployRun.status === 'completed' && deployRun.conclusion !== 'success' && (
                                    <p className="mt-2 text-red-600 dark:text-red-400">
                                        El despliegue falló y el workflow restauró la revisión anterior. Revise el
                                        registro en GitHub Actions para más detalle antes de reintentar.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="mt-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Historial de versiones</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Registro automático: cada vez que la versión instalada cambia, queda constancia aquí de
                            cuándo pasó y qué commits se aplicaron. Nadie necesita escribir nada.
                        </p>

                        {releaseNotes.length === 0 ? (
                            <p className="mt-4 text-gray-600 dark:text-gray-300">Aún no se ha detectado ningún cambio de versión.</p>
                        ) : (
                            <ol className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">
                                {releaseNotes.map((note) => (
                                    <li key={note.id} className="py-4 first:pt-0">
                                        <div className="flex items-baseline justify-between gap-4">
                                            <p className="font-semibold text-gray-900 dark:text-gray-100">{note.version}</p>
                                            <time className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                                {new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(note.createdAt))}
                                            </time>
                                        </div>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{note.notes}</p>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
