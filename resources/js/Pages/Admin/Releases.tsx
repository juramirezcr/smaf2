import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';

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

    const noteForm = useForm({ version: currentVersion, notes: '' });
    const editForm = useForm({ version: '', notes: '' });
    const [editingId, setEditingId] = useState<number | null>(null);

    function submitNote(event: FormEvent) {
        event.preventDefault();
        noteForm.post(route('admin.release-notes.store'), {
            onSuccess: () => noteForm.reset('notes'),
        });
    }

    function startEdit(note: ReleaseNoteItem) {
        setEditingId(note.id);
        editForm.setData({ version: note.version, notes: note.notes });
        editForm.clearErrors();
    }

    function cancelEdit() {
        setEditingId(null);
    }

    function submitEdit(event: FormEvent, id: number) {
        event.preventDefault();
        editForm.patch(route('admin.release-notes.update', id), {
            onSuccess: () => setEditingId(null),
        });
    }

    function deleteNote(id: number) {
        if (!confirm('¿Eliminar esta nota de versión?')) {
            return;
        }

        router.delete(route('admin.release-notes.destroy', id));
    }

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
                    <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800">Notas de versión</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Documentación propia de cada versión, independiente de las notas automáticas de GitHub.
                        </p>

                        <form onSubmit={submitNote} className="mt-4 rounded border p-4">
                            <div className="flex flex-wrap items-end gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500">Versión</label>
                                    <input
                                        type="text"
                                        value={noteForm.data.version}
                                        onChange={(event) => noteForm.setData('version', event.target.value)}
                                        className="mt-1 w-32 rounded border-gray-300 text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={noteForm.processing}
                                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    Agregar nota
                                </button>
                            </div>
                            <textarea
                                value={noteForm.data.notes}
                                onChange={(event) => noteForm.setData('notes', event.target.value)}
                                placeholder="Qué cambió en esta versión..."
                                rows={3}
                                className="mt-3 w-full rounded border-gray-300 text-sm"
                            />
                            {noteForm.errors.version && <p className="mt-1 text-sm text-red-600">{noteForm.errors.version}</p>}
                            {noteForm.errors.notes && <p className="mt-1 text-sm text-red-600">{noteForm.errors.notes}</p>}
                        </form>

                        {releaseNotes.length === 0 ? (
                            <p className="mt-4 text-gray-600">Aún no hay notas documentadas.</p>
                        ) : (
                            <ol className="mt-4 divide-y divide-gray-200">
                                {releaseNotes.map((note) =>
                                    editingId === note.id ? (
                                        <li key={note.id} className="py-4 first:pt-0">
                                            <form onSubmit={(event) => submitEdit(event, note.id)}>
                                                <input
                                                    type="text"
                                                    value={editForm.data.version}
                                                    onChange={(event) => editForm.setData('version', event.target.value)}
                                                    className="w-32 rounded border-gray-300 text-sm font-semibold"
                                                />
                                                <textarea
                                                    value={editForm.data.notes}
                                                    onChange={(event) => editForm.setData('notes', event.target.value)}
                                                    rows={3}
                                                    className="mt-2 w-full rounded border-gray-300 text-sm"
                                                />
                                                {editForm.errors.version && <p className="mt-1 text-sm text-red-600">{editForm.errors.version}</p>}
                                                {editForm.errors.notes && <p className="mt-1 text-sm text-red-600">{editForm.errors.notes}</p>}
                                                <div className="mt-2 flex gap-3 text-sm">
                                                    <button type="submit" disabled={editForm.processing} className="text-indigo-600 underline disabled:opacity-50">Guardar</button>
                                                    <button type="button" onClick={cancelEdit} className="text-gray-500 underline">Cancelar</button>
                                                </div>
                                            </form>
                                        </li>
                                    ) : (
                                        <li key={note.id} className="py-4 first:pt-0">
                                            <div className="flex items-baseline justify-between gap-4">
                                                <p className="font-semibold">{note.version}</p>
                                                <span className="flex shrink-0 items-center gap-3 text-sm">
                                                    <time className="text-gray-500">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(note.createdAt))}</time>
                                                    <button onClick={() => startEdit(note)} className="text-indigo-600 underline">Editar</button>
                                                    <button onClick={() => deleteNote(note.id)} className="text-red-600 underline">Eliminar</button>
                                                </span>
                                            </div>
                                            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{note.notes}</p>
                                        </li>
                                    ),
                                )}
                            </ol>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
