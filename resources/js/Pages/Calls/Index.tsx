import CheckboxMultiSelect from '@/Components/CheckboxMultiSelect';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

interface ActiveCall {
    id: number;
    clientName?: string | null;
    customerName: string | null;
    accountId: string | null;
    cli: string | null;
    cld: string | null;
    country: string | null;
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
    availableCustomers: string[];
    availableAccounts: string[];
    selectedCustomers: string[];
    selectedAccounts: string[];
    activeCalls: ActiveCall[];
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
}: CallsProps) {
    const showingAll = selectedClientId === 'all';

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
                    <div className="mb-4 flex flex-wrap items-center gap-3">
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
                        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-emerald-200">
                            <div className="border-b bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800">
                                Llamadas activas ({activeCalls.length})
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50 text-left text-gray-500">
                                        <tr>
                                            {showingAll && <th className="px-6 py-3">Cliente (interno del sistema)</th>}
                                            <th className="px-6 py-3">Customer</th>
                                            <th className="px-6 py-3">Account</th>
                                            <th className="px-6 py-3">Desde</th>
                                            <th className="px-6 py-3">Hacia</th>
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
                                                <td className="px-6 py-4">{call.country ?? '—'}</td>
                                                <td className="px-6 py-4">{call.connectTime ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectTime)) : '—'}</td>
                                                <td className="px-6 py-4 text-right">{call.durationSeconds}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
