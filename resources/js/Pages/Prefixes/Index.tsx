import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { Paginated, PrefixRule } from './types';

interface ClientOption {
    id: number;
    name: string;
}

interface PrefixesIndexProps {
    rules: Paginated<PrefixRule>;
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    availableCountries: string[];
    selectedCountries: string[];
}

function Scope({ rule }: { rule: PrefixRule }) {
    const parts = [
        rule.customer && `Cliente: ${rule.customer}`,
        rule.account && `Cuenta: ${rule.account}`,
    ].filter(Boolean);

    return (
        <p className="mt-1 text-sm text-gray-500">
            {parts.length > 0 ? parts.join(' · ') : 'Todos los clientes y cuentas'}
        </p>
    );
}

function CountryFilter({ available, selected, onChange }: { available: string[]; selected: string[]; onChange: (countries: string[]) => void }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggle = (country: string) => {
        onChange(selected.includes(country) ? selected.filter((c) => c !== country) : [...selected, country]);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50"
            >
                Países{selected.length > 0 ? ` (${selected.length})` : ''}
            </button>
            {open && (
                <div className="absolute z-10 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                    {selected.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="mb-2 block text-xs font-medium text-indigo-600 hover:text-indigo-900"
                        >
                            Limpiar selección
                        </button>
                    )}
                    {available.length === 0 ? (
                        <p className="px-1 py-1 text-sm text-gray-500">Sin países disponibles.</p>
                    ) : available.map((country) => (
                        <label key={country} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50">
                            <input
                                type="checkbox"
                                checked={selected.includes(country)}
                                onChange={() => toggle(country)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            {country}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PrefixesIndex({ rules, clients, selectedClientId, availableCountries, selectedCountries }: PrefixesIndexProps) {
    const showingAll = selectedClientId === 'all';

    const changeClient = (clientId: string) => {
        router.get(route('prefixes.index'), { client_id: clientId, country: selectedCountries }, { preserveState: true });
    };

    const changeCountries = (countries: string[]) => {
        router.get(route('prefixes.index'), { client_id: selectedClientId ?? undefined, country: countries }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Reglas de prefijo
                    </h2>
                    <Link
                        href={route('prefixes.create', { client_id: selectedClientId ?? undefined })}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                        Nueva regla
                    </Link>
                </div>
            }
        >
            <Head title="Reglas de prefijo" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center gap-3">
                        {clients && (
                            <select
                                value={selectedClientId ?? ''}
                                onChange={(event) => changeClient(event.target.value)}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="all">Todos</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        )}
                        <CountryFilter available={availableCountries} selected={selectedCountries} onChange={changeCountries} />
                    </div>

                    <section className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="font-semibold text-gray-900">
                                {rules.total} {rules.total === 1 ? 'regla' : 'reglas'}
                            </h2>
                            <span className="text-sm text-gray-500">
                                10 por página
                            </span>
                        </div>

                        {rules.data.length === 0 ? (
                            <div className="px-6 py-14 text-center">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Aún no hay reglas de prefijo
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                                    Crea la primera regla para empezar a preparar el
                                    monitoreo de destinos de alto riesgo.
                                </p>
                                <Link
                                    href={route('prefixes.create', { client_id: selectedClientId ?? undefined })}
                                    className="mt-5 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                                >
                                    Crear regla
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="divide-y divide-gray-200">
                                    {rules.data.map((rule) => (
                                        <article
                                            key={rule.id}
                                            className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Link
                                                        href={route('prefixes.show', rule.id)}
                                                        className="font-mono text-lg font-semibold text-indigo-700 hover:text-indigo-900"
                                                    >
                                                        +{rule.prefix}
                                                    </Link>
                                                    {rule.country && (
                                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                                            {rule.country}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                                            rule.enabled
                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {rule.enabled ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                </div>
                                                {showingAll && rule.clientName && (
                                                    <p className="mt-1 text-sm font-medium text-gray-700">
                                                        {rule.clientName}
                                                    </p>
                                                )}
                                                {rule.description && (
                                                    <p className="mt-2 text-sm text-gray-800">
                                                        {rule.description}
                                                    </p>
                                                )}
                                                <Scope rule={rule} />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                                                <div>
                                                    <p className="text-gray-500">
                                                        Llamadas / hora
                                                    </p>
                                                    <p className="font-semibold text-gray-900">
                                                        {rule.hourlyCallLimit.toLocaleString('es-MX')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">
                                                        Minutos / hora
                                                    </p>
                                                    <p className="font-semibold text-gray-900">
                                                        {rule.hourlyMinutesLimit.toLocaleString('es-MX')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Acción</p>
                                                    <p className="font-semibold text-gray-900">
                                                        {rule.action === 'notify'
                                                            ? 'Notificar'
                                                            : 'Bloquear'}
                                                    </p>
                                                </div>
                                                <Link
                                                    href={route('prefixes.show', rule.id)}
                                                    className="rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                    Ver detalle
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                {rules.last_page > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                                        {rules.current_page > 1 ? (
                                            <Link
                                                href={route('prefixes.index', {
                                                    page: rules.current_page - 1,
                                                    client_id: selectedClientId ?? undefined,
                                                    country: selectedCountries,
                                                })}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Anterior
                                            </Link>
                                        ) : (
                                            <span />
                                        )}
                                        <p className="text-sm text-gray-600">
                                            Página {rules.current_page} de {rules.last_page}
                                        </p>
                                        {rules.current_page < rules.last_page ? (
                                            <Link
                                                href={route('prefixes.index', {
                                                    page: rules.current_page + 1,
                                                    client_id: selectedClientId ?? undefined,
                                                    country: selectedCountries,
                                                })}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Siguiente
                                            </Link>
                                        ) : (
                                            <span />
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
