import CheckboxMultiSelect from '@/Components/CheckboxMultiSelect';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';

interface ActiveCall {
    id: number;
    clientName?: string | null;
    customerName: string | null;
    accountId: string | null;
    cli: string | null;
    cld: string | null;
    country: string | null;
    prefix: string | null;
    prefixCountry: string | null;
    connectTime: string | null;
    durationSeconds: number;
}

interface ClientOption {
    id: number;
    name: string;
}

interface CallsProps {
    client: string | null;
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    availableClients?: string[];
    availableCustomers: string[];
    availableAccounts: string[];
    selectedCustomers: string[];
    selectedAccounts: string[];
    activeCalls: ActiveCall[];
    customerCallHistory?: Record<string, number[]>;
}

function Sparkline({ data }: { data: number[] }) {
    const width = 80;
    const height = 24;
    const max = Math.max(...data, 1);
    const step = width / Math.max(data.length - 1, 1);
    const points = data.map((value, index) => `${index * step},${height - (value / max) * (height - 2) - 1}`).join(' ');
    const total = data.reduce((sum, value) => sum + value, 0);

    return (
        <span className="inline-flex items-center gap-1.5 align-middle" title={`${total} llamadas en las últimas 24h`}>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400" />
            </svg>
            <span className="text-xs font-normal text-gray-500">{total} / 24h</span>
        </span>
    );
}

type GroupBy = 'none' | 'client' | 'customer' | 'account' | 'customer+account';

interface GroupedCalls {
    [key: string]: {
        calls: ActiveCall[];
        subGroups?: { [subKey: string]: ActiveCall[] };
    };
}

export default function CallsIndex({
    client,
    clients,
    selectedClientId,
    availableCustomers,
    availableAccounts,
    selectedCustomers,
    selectedAccounts,
    activeCalls,
    customerCallHistory = {},
}: CallsProps) {
    const showingAll = selectedClientId === 'all';
    const [groupBy, setGroupBy] = useState<GroupBy>('customer');
    const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5000); // 5 segundos
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    // Los grupos inician colapsados; expandedGroups guarda solo los que el usuario abrió.
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const toggleSubGroup = (key: string) => {
        setExpandedSubGroups((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setIsRefreshing(true);
            router.get('/calls', {
                client_id: selectedClientId ?? undefined,
                customer: selectedCustomers,
                account: selectedAccounts,
            }, {
                preserveState: true,
                onFinish: () => {
                    setLastUpdated(new Date());
                    setIsRefreshing(false);
                },
            });
        }, autoRefreshInterval);

        return () => clearInterval(interval);
    }, [autoRefreshInterval, selectedClientId, selectedCustomers, selectedAccounts]);

    const groupCalls = (calls: ActiveCall[], type: GroupBy): GroupedCalls => {
        if (type === 'none') {
            return { all: { calls } };
        }

        if (type === 'client') {
            return calls.reduce((acc, call) => {
                const key = call.clientName || 'Sin cliente';
                if (!acc[key]) acc[key] = { calls: [] };
                acc[key].calls.push(call);
                return acc;
            }, {} as GroupedCalls);
        }

        if (type === 'account') {
            return calls.reduce((acc, call) => {
                const key = call.accountId || 'Sin account';
                if (!acc[key]) acc[key] = { calls: [] };
                acc[key].calls.push(call);
                return acc;
            }, {} as GroupedCalls);
        }

        if (type === 'customer' || type === 'customer+account') {
            return calls.reduce((acc, call) => {
                const customerKey = call.customerName || 'Sin customer';
                const accountKey = call.accountId || 'Sin account';

                if (!acc[customerKey]) {
                    acc[customerKey] = { calls: [], subGroups: {} };
                }
                if (!acc[customerKey].subGroups![accountKey]) {
                    acc[customerKey].subGroups![accountKey] = [];
                }

                acc[customerKey].calls.push(call);
                acc[customerKey].subGroups![accountKey].push(call);
                return acc;
            }, {} as GroupedCalls);
        }

        return { all: { calls } };
    };

    const groupedCalls = groupCalls(activeCalls, groupBy);

    const applyFilters = (overrides: Record<string, unknown>) => {
        router.get('/calls', {
            client_id: selectedClientId ?? undefined,
            customer: selectedCustomers,
            account: selectedAccounts,
            ...overrides,
        }, { preserveState: true });
    };

    const changeClient = (clientId: string) => {
        applyFilters({ client_id: clientId });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Llamadas</h2>}>
            <Head title="Llamadas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {clients && (
                                <select
                                    value={selectedClientId ?? ''}
                                    onChange={(event) => changeClient(event.target.value)}
                                    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                        </div>

                        {activeCalls.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Agrupar por:</span>
                                    {(['none', 'client', 'customer', 'account', 'customer+account'] as GroupBy[]).map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => setGroupBy(option)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                                                groupBy === option
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {option === 'none' ? 'Sin agrupar' : option === 'client' ? 'Cliente' : option === 'customer' ? 'Customer' : option === 'account' ? 'Account' : 'Customer + Account'}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-gray-700">Auto-actualizar:</span>
                                        {([3000, 5000, 10000, 30000, 0] as const).map((interval) => (
                                            <button
                                                key={interval}
                                                onClick={() => setAutoRefreshInterval(interval)}
                                                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                                                    autoRefreshInterval === interval
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {interval === 0 ? 'Off' : interval === 3000 ? '3s' : interval === 5000 ? '5s' : interval === 10000 ? '10s' : '30s'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
                                        {isRefreshing && (
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                                <span>Actualizando...</span>
                                            </div>
                                        )}
                                        {!isRefreshing && (
                                            <span>Última actualización: {lastUpdated.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {activeCalls.length > 0 && (
                        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-emerald-200">
                            <div className="border-b bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800">
                                Llamadas activas ({activeCalls.length})
                            </div>
                            <div className="overflow-x-auto">
                                {groupBy === 'none' ? (
                                    // Sin agrupar
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50 text-left text-gray-500">
                                            <tr>
                                                {showingAll && <th className="px-6 py-3">Cliente (interno del sistema)</th>}
                                                <th className="px-6 py-3">Customer</th>
                                                <th className="px-6 py-3">Account</th>
                                                <th className="px-6 py-3">Desde</th>
                                                <th className="px-6 py-3">Hacia</th>
                                                <th className="px-6 py-3">Prefijo</th>
                                                <th className="px-6 py-3">País</th>
                                                <th className="px-6 py-3">Conectada</th>
                                                <th className="px-6 py-3 text-right">Segundos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {activeCalls.map((call) => (
                                                <tr key={call.id}>
                                                    {showingAll && <td className="px-6 py-4">{call.clientName ?? '—'}</td>}
                                                    <td className="px-6 py-4">
                                                        {call.customerName ? (
                                                            <button
                                                                onClick={() => applyFilters({ customer: selectedCustomers.includes(call.customerName!) ? selectedCustomers.filter(c => c !== call.customerName) : [...selectedCustomers, call.customerName!] })}
                                                                className="text-indigo-600 hover:text-indigo-900 hover:underline"
                                                            >
                                                                {call.customerName}
                                                            </button>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {call.accountId ? (
                                                            <button
                                                                onClick={() => applyFilters({ account: selectedAccounts.includes(call.accountId!) ? selectedAccounts.filter(a => a !== call.accountId) : [...selectedAccounts, call.accountId!] })}
                                                                className="text-indigo-600 hover:text-indigo-900 hover:underline"
                                                            >
                                                                {call.accountId}
                                                            </button>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4">{call.cli ?? '—'}</td>
                                                    <td className="px-6 py-4">{call.cld ?? '—'}</td>
                                                    <td className="px-6 py-4"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{call.prefix ? `+${call.prefix}` : '—'}</span></td>
                                                    <td className="px-6 py-4">{call.prefixCountry ?? call.country ?? '—'}</td>
                                                    <td className="px-6 py-4">{call.connectTime ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectTime)) : '—'}</td>
                                                    <td className="px-6 py-4 text-right">{call.durationSeconds}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : groupBy === 'customer' || groupBy === 'customer+account' ? (
                                    // Agrupado por Customer (con sub-grupo por Account)
                                    <div className="divide-y divide-gray-200">
                                        {Object.entries(groupedCalls).map(([customer, groupData]) => {
                                            const isCollapsed = !expandedGroups.has(customer);
                                            const history = customerCallHistory[customer];
                                            return (
                                                <div key={customer} className="border-t">
                                                    <button
                                                        onClick={() => toggleGroup(customer)}
                                                        className="w-full flex items-center gap-2 bg-blue-50 px-6 py-3 font-semibold text-gray-800 hover:bg-blue-100 transition-colors text-left"
                                                    >
                                                        <span className={`inline-block transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>▼</span>
                                                        {customer}
                                                        <span className="ml-2 text-sm font-normal text-gray-600">({groupData.calls.length} llamadas)</span>
                                                        {history && <Sparkline data={history} />}
                                                    </button>
                                                    {!isCollapsed && Object.entries(groupData.subGroups || {}).map(([account, calls]) => {
                                                        const subKey = `${customer}::${account}`;
                                                        const isSubCollapsed = !expandedSubGroups.has(subKey);
                                                        return (
                                                            <div key={account}>
                                                                <button
                                                                    onClick={() => toggleSubGroup(subKey)}
                                                                    className="w-full flex items-center gap-2 bg-indigo-50 px-8 py-2 text-sm font-medium text-gray-700 border-l-4 border-indigo-400 hover:bg-indigo-100 transition-colors text-left"
                                                                >
                                                                    <span className={`inline-block transition-transform text-xs ${isSubCollapsed ? '-rotate-90' : ''}`}>▼</span>
                                                                    Account: {account}
                                                                    <span className="ml-2 text-xs font-normal text-gray-600">({calls.length})</span>
                                                                </button>
                                                                {!isSubCollapsed && (
                                                                    <table className="min-w-full text-sm">
                                                                        <tbody className="divide-y divide-gray-200">
                                                                            {calls.map((call) => (
                                                                                <tr key={call.id} className="hover:bg-gray-50">
                                                                                    {showingAll && <td className="px-6 py-4 text-gray-600 text-xs">{call.clientName ?? '—'}</td>}
                                                                                    <td className="px-6 py-4">{call.cli ?? '—'}</td>
                                                                                    <td className="px-6 py-4">{call.cld ?? '—'}</td>
                                                                                    <td className="px-6 py-4"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{call.prefix ? `+${call.prefix}` : '—'}</span></td>
                                                                                    <td className="px-6 py-4 text-sm">{call.prefixCountry ?? call.country ?? '—'}</td>
                                                                                    <td className="px-6 py-4">{call.connectTime ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectTime)) : '—'}</td>
                                                                                    <td className="px-6 py-4 text-right font-semibold text-emerald-600">{call.durationSeconds}</td>
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
                                ) : (
                                    // Agrupado por Client o Account
                                    <div className="divide-y divide-gray-200">
                                        {Object.entries(groupedCalls).map(([groupName, groupData]) => {
                                            const isCollapsed = !expandedGroups.has(groupName);
                                            return (
                                                <div key={groupName} className="border-t">
                                                    <button
                                                        onClick={() => toggleGroup(groupName)}
                                                        className="w-full flex items-center gap-2 bg-blue-50 px-6 py-3 font-semibold text-gray-800 hover:bg-blue-100 transition-colors text-left"
                                                    >
                                                        <span className={`inline-block transition-transform ${isCollapsed ? '-rotate-90' : ''}`}>▼</span>
                                                        {groupBy === 'client' ? 'Cliente' : 'Account'}: {groupName}
                                                        <span className="ml-2 text-sm font-normal text-gray-600">({groupData.calls.length} llamadas)</span>
                                                    </button>
                                                    {!isCollapsed && (
                                                        <table className="min-w-full text-sm w-full">
                                                            <tbody className="divide-y divide-gray-200">
                                                                {groupData.calls.map((call) => (
                                                                    <tr key={call.id} className="hover:bg-gray-50">
                                                                        {showingAll && groupBy !== 'client' && <td className="px-6 py-4 text-gray-600 text-xs">{call.clientName ?? '—'}</td>}
                                                                        {groupBy === 'account' && <td className="px-6 py-4 text-sm text-gray-600"><button onClick={() => applyFilters({ customer: [...new Set([...selectedCustomers, call.customerName || ''])] })} className="text-indigo-600 hover:underline">{call.customerName ?? '—'}</button></td>}
                                                                        <td className="px-6 py-4">{call.cli ?? '—'}</td>
                                                                        <td className="px-6 py-4">{call.cld ?? '—'}</td>
                                                                        <td className="px-6 py-4"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{call.prefix ? `+${call.prefix}` : '—'}</span></td>
                                                                        <td className="px-6 py-4 text-sm">{call.prefixCountry ?? call.country ?? '—'}</td>
                                                                        <td className="px-6 py-4">{call.connectTime ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectTime)) : '—'}</td>
                                                                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">{call.durationSeconds}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
