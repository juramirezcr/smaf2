import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { PrefixRule } from './types';

interface ClientOption {
    id: number;
    name: string;
}

interface PrefixesIndexProps {
    rules: PrefixRule[];
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    availableCountries: string[];
    selectedCountries: string[];
    prefixSearch: string;
}

interface CountryGroup {
    country: string;
    rules: PrefixRule[];
}

interface ClientGroup {
    key: string;
    label: string;
    isGlobal: boolean;
    count: number;
    countries: CountryGroup[];
}

function buildGroups(rules: PrefixRule[]): ClientGroup[] {
    const clientMap = new Map<string, ClientGroup>();

    for (const rule of rules) {
        const key = rule.isGlobal ? '__global__' : `client-${rule.clientName ?? 'sin-cliente'}`;

        if (!clientMap.has(key)) {
            clientMap.set(key, {
                key,
                label: rule.isGlobal ? 'Todos los clientes (regla global)' : (rule.clientName ?? 'Sin cliente'),
                isGlobal: Boolean(rule.isGlobal),
                count: 0,
                countries: [],
            });
        }

        const clientGroup = clientMap.get(key)!;
        clientGroup.count += 1;

        const countryKey = rule.country ?? 'Sin país';
        let countryGroup = clientGroup.countries.find((c) => c.country === countryKey);
        if (!countryGroup) {
            countryGroup = { country: countryKey, rules: [] };
            clientGroup.countries.push(countryGroup);
        }
        countryGroup.rules.push(rule);
    }

    const groups = Array.from(clientMap.values());
    for (const group of groups) {
        group.countries.sort((a, b) => a.country.localeCompare(b.country));
        for (const country of group.countries) {
            country.rules.sort((a, b) => Number(a.prefix) - Number(b.prefix));
        }
    }

    groups.sort((a, b) => {
        if (a.isGlobal !== b.isGlobal) return a.isGlobal ? -1 : 1;
        return a.label.localeCompare(b.label);
    });

    return groups;
}

function Scope({ rule }: { rule: PrefixRule }) {
    const parts = [
        rule.customer && `Customer: ${rule.customer}`,
        rule.account && `Cuenta: ${rule.account}`,
    ].filter(Boolean);

    if (parts.length === 0) {
        return null;
    }

    return (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {parts.join(' · ')}
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
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
                Países{selected.length > 0 ? ` (${selected.length})` : ''}
            </button>
            {open && (
                <div className="absolute z-10 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    {selected.length > 0 && (
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="mb-2 block text-xs font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                            Limpiar selección
                        </button>
                    )}
                    {available.length === 0 ? (
                        <p className="px-1 py-1 text-sm text-gray-500 dark:text-gray-400">Sin países disponibles.</p>
                    ) : available.map((country) => (
                        <label key={country} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
                            <input
                                type="checkbox"
                                checked={selected.includes(country)}
                                onChange={() => toggle(country)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            {country}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

function RuleRow({ rule }: { rule: PrefixRule }) {
    return (
        <article className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={route('prefixes.show', rule.id)}
                        className="font-mono text-lg font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        +{rule.prefix}
                    </Link>
                    <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            rule.enabled
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {rule.enabled ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
                {rule.description && (
                    <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                        {rule.description}
                    </p>
                )}
                <Scope rule={rule} />
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                <div>
                    <p className="text-gray-500 dark:text-gray-400">Llamadas / hora</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {rule.hourlyCallLimit.toLocaleString('es-MX')}
                    </p>
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400">Minutos / hora</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {rule.hourlyMinutesLimit.toLocaleString('es-MX')}
                    </p>
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400">Acción</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {rule.action === 'notify' ? 'Notificar' : 'Bloquear'}
                    </p>
                </div>
                <Link
                    href={route('prefixes.show', rule.id)}
                    className="rounded-md border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                    Ver detalle
                </Link>
            </div>
        </article>
    );
}

export default function PrefixesIndex({ rules, clients, selectedClientId, availableCountries, selectedCountries, prefixSearch }: PrefixesIndexProps) {
    const [search, setSearch] = useState(prefixSearch);
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

    const changeClient = (clientId: string) => {
        router.get(route('prefixes.index'), { client_id: clientId, country: selectedCountries, prefix_search: search || undefined }, { preserveState: true });
    };

    const changeCountries = (countries: string[]) => {
        router.get(route('prefixes.index'), { client_id: selectedClientId ?? undefined, country: countries, prefix_search: search || undefined }, { preserveState: true });
    };

    const handlePrefixSearch = (value: string) => {
        setSearch(value);
        router.get(route('prefixes.index'), { client_id: selectedClientId ?? undefined, country: selectedCountries, prefix_search: value || undefined }, { preserveState: true });
    };

    const toggleClient = (key: string) => {
        setExpandedClients((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleCountry = (key: string) => {
        setExpandedCountries((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const groups = buildGroups(rules);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
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
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            >
                                <option value="all">Todos</option>
                                {clients.map((client) => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        )}
                        <CountryFilter available={availableCountries} selected={selectedCountries} onChange={changeCountries} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handlePrefixSearch(e.target.value)}
                            placeholder="Buscar prefijo..."
                            className="rounded-md border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                    </div>

                    <section className="overflow-hidden bg-white shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                                {rules.length} {rules.length === 1 ? 'regla' : 'reglas'}
                            </h2>
                        </div>

                        {groups.length === 0 ? (
                            <div className="px-6 py-14 text-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Aún no hay reglas de prefijo
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    Crea la primera regla para empezar a preparar el
                                    monitoreo de destinos de alto riesgo.
                                </p>
                                <Link
                                    href={route('prefixes.create', { client_id: selectedClientId ?? undefined })}
                                    className="mt-5 inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                                >
                                    Crear regla
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {groups.map((clientGroup) => {
                                    const isClientOpen = expandedClients.has(clientGroup.key);

                                    return (
                                        <div key={clientGroup.key}>
                                            <button
                                                onClick={() => toggleClient(clientGroup.key)}
                                                className={`flex w-full items-center gap-2 px-6 py-3 text-left text-sm font-semibold hover:bg-opacity-80 ${
                                                    clientGroup.isGlobal ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-slate-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                }`}
                                            >
                                                <span className={`inline-block transition-transform ${isClientOpen ? '' : '-rotate-90'}`}>▼</span>
                                                {clientGroup.label}
                                                <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">({clientGroup.count} {clientGroup.count === 1 ? 'regla' : 'reglas'})</span>
                                            </button>
                                            {isClientOpen && clientGroup.countries.map((countryGroup) => {
                                                const countryKey = `${clientGroup.key}::${countryGroup.country}`;
                                                const isCountryOpen = expandedCountries.has(countryKey);

                                                return (
                                                    <div key={countryGroup.country}>
                                                        <button
                                                            onClick={() => toggleCountry(countryKey)}
                                                            className="flex w-full items-center gap-2 border-l-4 border-indigo-300 bg-blue-50 px-10 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-blue-100 dark:border-indigo-500/40 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-700"
                                                        >
                                                            <span className={`inline-block text-xs transition-transform ${isCountryOpen ? '' : '-rotate-90'}`}>▼</span>
                                                            {countryGroup.country}
                                                            <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">({countryGroup.rules.length})</span>
                                                        </button>
                                                        {isCountryOpen && (
                                                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                {countryGroup.rules.map((rule) => (
                                                                    <RuleRow key={rule.id} rule={rule} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
