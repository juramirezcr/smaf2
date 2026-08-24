import CheckboxMultiSelect from '@/Components/CheckboxMultiSelect';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface DestinationRow {
    clientName: string | null;
    customer: string | null;
    account: string | null;
    prefix: string | null;
    destination: string | null;
    calls: number;
    seconds: number;
}

interface ClientOption {
    id: number;
    name: string;
}

interface DestinationsProps {
    client: string | null;
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    availableCustomers: string[];
    availableAccounts: string[];
    selectedCustomers: string[];
    selectedAccounts: string[];
    destinationSearch: string;
    period: string;
    destinations: DestinationRow[];
    truncated: boolean;
}

const PERIOD_LABELS: Record<string, string> = {
    '1h': 'Última hora',
    '6h': 'Últimas 6 horas',
    '24h': 'Último día',
    '7d': 'Últimos 7 días',
    '30d': 'Último mes',
};

interface AccountGroup {
    account: string | null;
    calls: number;
    seconds: number;
}

interface CustomerGroup {
    customer: string | null;
    calls: number;
    seconds: number;
    accounts: AccountGroup[];
}

interface DestinationGroup {
    destination: string | null;
    calls: number;
    seconds: number;
    customers: CustomerGroup[];
}

interface PrefixGroup {
    prefix: string | null;
    calls: number;
    seconds: number;
    destinations: DestinationGroup[];
}

interface ClientGroup {
    clientName: string | null;
    calls: number;
    prefixes: PrefixGroup[];
}

function buildGroups(rows: DestinationRow[]): ClientGroup[] {
    const clientMap = new Map<string, ClientGroup>();

    for (const row of rows) {
        const clientKey = row.clientName ?? '';
        if (!clientMap.has(clientKey)) {
            clientMap.set(clientKey, { clientName: row.clientName, calls: 0, prefixes: [] });
        }
        const clientGroup = clientMap.get(clientKey)!;
        clientGroup.calls += row.calls;

        let prefixGroup = clientGroup.prefixes.find((p) => p.prefix === row.prefix);
        if (!prefixGroup) {
            prefixGroup = { prefix: row.prefix, calls: 0, seconds: 0, destinations: [] };
            clientGroup.prefixes.push(prefixGroup);
        }
        prefixGroup.calls += row.calls;
        prefixGroup.seconds += row.seconds;

        let destGroup = prefixGroup.destinations.find((d) => d.destination === row.destination);
        if (!destGroup) {
            destGroup = { destination: row.destination, calls: 0, seconds: 0, customers: [] };
            prefixGroup.destinations.push(destGroup);
        }
        destGroup.calls += row.calls;
        destGroup.seconds += row.seconds;

        let customerGroup = destGroup.customers.find((c) => c.customer === row.customer);
        if (!customerGroup) {
            customerGroup = { customer: row.customer, calls: 0, seconds: 0, accounts: [] };
            destGroup.customers.push(customerGroup);
        }
        customerGroup.calls += row.calls;
        customerGroup.seconds += row.seconds;

        customerGroup.accounts.push({ account: row.account, calls: row.calls, seconds: row.seconds });
    }

    const clientGroups = Array.from(clientMap.values());
    for (const client of clientGroups) {
        client.prefixes.sort((a, b) => b.calls - a.calls);
        for (const prefix of client.prefixes) {
            prefix.destinations.sort((a, b) => b.calls - a.calls);
            for (const dest of prefix.destinations) {
                dest.customers.sort((a, b) => b.calls - a.calls);
                for (const cust of dest.customers) {
                    cust.accounts.sort((a, b) => b.calls - a.calls);
                }
            }
        }
    }
    clientGroups.sort((a, b) => b.calls - a.calls);

    return clientGroups;
}

export default function DestinationsIndex({
    clients,
    selectedClientId,
    availableCustomers,
    availableAccounts,
    selectedCustomers,
    selectedAccounts,
    destinationSearch,
    period,
    destinations,
    truncated,
}: DestinationsProps) {
    const showingAll = selectedClientId === 'all';
    const [search, setSearch] = useState(destinationSearch);
    const [expandedPrefixes, setExpandedPrefixes] = useState<Set<string>>(new Set());
    const [expandedDestinations, setExpandedDestinations] = useState<Set<string>>(new Set());
    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

    const applyFilters = (overrides: Record<string, unknown>) => {
        router.get('/destinations', {
            client_id: selectedClientId ?? undefined,
            customer: selectedCustomers,
            account: selectedAccounts,
            destination_search: search,
            period,
            ...overrides,
        }, { preserveState: true });
    };

    const changeClient = (clientId: string) => applyFilters({ client_id: clientId });
    const changePeriod = (newPeriod: string) => applyFilters({ period: newPeriod });

    const submitSearch: FormEventHandler = (event) => {
        event.preventDefault();
        applyFilters({ destination_search: search });
    };

    const togglePrefix = (key: string) => {
        setExpandedPrefixes((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleDestination = (key: string) => {
        setExpandedDestinations((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleCustomer = (key: string) => {
        setExpandedCustomers((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const groups = buildGroups(destinations);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Destinos</h2>}>
            <Head title="Destinos" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        {clients && (
                            <select
                                value={selectedClientId ?? ''}
                                onChange={(event) => changeClient(event.target.value)}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            >
                                <option value="all">Todos</option>
                                {clients.map((option) => (
                                    <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                            </select>
                        )}
                        <CheckboxMultiSelect
                            label="Customer"
                            options={availableCustomers}
                            selected={selectedCustomers}
                            onChange={(customer) => applyFilters({ customer })}
                        />
                        <CheckboxMultiSelect
                            label="Accounts"
                            options={availableAccounts}
                            selected={selectedAccounts}
                            onChange={(account) => applyFilters({ account })}
                        />
                        <form onSubmit={submitSearch} className="flex items-center gap-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar destino..."
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            />
                            <button type="submit" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700">
                                Buscar
                            </button>
                        </form>
                        <select
                            value={period}
                            onChange={(event) => changePeriod(event.target.value)}
                            className="ml-auto rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                            {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {truncated && (
                        <div className="mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                            Hay más destinos de los que se muestran (límite de 5000 filas). Usa los filtros o un periodo más corto para acotar el resultado.
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {groups.length === 0 ? (
                                <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Aún no hay llamadas registradas para este período.</p>
                            ) : groups.map((client, clientIndex) => (
                                <div key={clientIndex}>
                                    {showingAll && (
                                        <div className="bg-slate-100 px-6 py-2 text-xs font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                            {client.clientName ?? 'Sin cliente'}
                                            <span className="ml-2 font-normal normal-case text-gray-400 dark:text-gray-500">({client.calls} llamadas)</span>
                                        </div>
                                    )}
                                    {client.prefixes.map((prefix, prefixIndex) => {
                                        const prefixKey = `${clientIndex}-${prefixIndex}`;
                                        const isPrefixOpen = expandedPrefixes.has(prefixKey);

                                        return (
                                            <div key={prefixIndex}>
                                                <button
                                                    onClick={() => togglePrefix(prefixKey)}
                                                    className="flex w-full items-center gap-2 bg-slate-50 px-6 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-slate-100 dark:bg-gray-700/40 dark:text-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    <span className={`inline-block transition-transform ${isPrefixOpen ? '' : '-rotate-90'}`}>▼</span>
                                                    <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-600 dark:text-gray-100">+{prefix.prefix ?? '—'}</span>
                                                    <span className="ml-2 font-normal text-gray-600 dark:text-gray-300">{prefix.calls} llamadas · {prefix.seconds}s</span>
                                                    <span className="ml-auto font-normal text-gray-400 dark:text-gray-500">{prefix.destinations.length} destino(s)</span>
                                                </button>
                                                {isPrefixOpen && prefix.destinations.map((dest, destIndex) => {
                                                    const destKey = `${prefixKey}-${destIndex}`;
                                                    const isDestOpen = expandedDestinations.has(destKey);

                                                    return (
                                                        <div key={destIndex}>
                                                            <button
                                                                onClick={() => toggleDestination(destKey)}
                                                                className="flex w-full items-center gap-2 bg-blue-50 px-10 py-2.5 text-left text-sm font-semibold text-gray-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-gray-100 dark:hover:bg-blue-900/30"
                                                            >
                                                                <span className={`inline-block transition-transform ${isDestOpen ? '' : '-rotate-90'}`}>▼</span>
                                                                <span className="font-mono">{dest.destination ?? '—'}</span>
                                                                <span className="ml-2 font-normal text-gray-600 dark:text-gray-300">{dest.calls} llamadas · {dest.seconds}s</span>
                                                                <span className="ml-auto font-normal text-gray-400 dark:text-gray-500">{dest.customers.length} customer(s)</span>
                                                            </button>
                                                            {isDestOpen && dest.customers.map((cust, custIndex) => {
                                                                const custKey = `${destKey}-${custIndex}`;
                                                                const isCustOpen = expandedCustomers.has(custKey);

                                                                return (
                                                                    <div key={custIndex}>
                                                                        <button
                                                                            onClick={() => toggleCustomer(custKey)}
                                                                            className="flex w-full items-center gap-2 border-l-4 border-indigo-400 bg-indigo-50 px-14 py-2 text-left text-sm font-medium text-gray-700 hover:bg-indigo-100 dark:border-indigo-500 dark:bg-indigo-900/20 dark:text-gray-300 dark:hover:bg-indigo-900/30"
                                                                        >
                                                                            <span className={`inline-block text-xs transition-transform ${isCustOpen ? '' : '-rotate-90'}`}>▼</span>
                                                                            {cust.customer ?? '—'}
                                                                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">{cust.calls} llamadas · {cust.seconds}s</span>
                                                                        </button>
                                                                        {isCustOpen && (
                                                                            <table className="min-w-full text-sm">
                                                                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-gray-900/40 dark:text-gray-500">
                                                                                    <tr>
                                                                                        <th className="px-20 py-1.5">Account</th>
                                                                                        <th className="px-4 py-1.5 text-right">Llamadas</th>
                                                                                        <th className="px-4 py-1.5 text-right">Segundos</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                                                                    {cust.accounts.map((acc, accIndex) => (
                                                                                        <tr key={accIndex}>
                                                                                            <td className="px-20 py-1.5 font-mono">{acc.account ?? '—'}</td>
                                                                                            <td className="px-4 py-1.5 text-right">{acc.calls}</td>
                                                                                            <td className="px-4 py-1.5 text-right">{acc.seconds}</td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
