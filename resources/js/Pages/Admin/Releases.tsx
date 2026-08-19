import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface Release {
    tag: string;
    name: string;
    publishedAt: string;
    url: string;
}

interface ReleasesProps {
    currentVersion: string;
    repository: string;
    latest: Release | null;
    error: string | null;
}

export default function Releases({ currentVersion, repository, latest, error }: ReleasesProps) {
    const updateAvailable = latest !== null && latest.tag.replace(/^v/, '') !== currentVersion;

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
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
