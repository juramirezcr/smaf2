import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

interface AlertItem {
    id: number;
    action: 'ignore' | 'notify' | 'block';
    status: string;
    occurredAt: string;
    clientName: string | null;
    account: string | null;
    customer: string | null;
    calls: number | null;
    seconds: number | null;
    callLimit: number | null;
    durationLimitSeconds: number | null;
    rule: {
        scope: string;
        matchValue: string;
        description: string | null;
    } | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface ClientOption {
    id: number;
    name: string;
}

interface AlertsProps {
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    alerts: {
        data: AlertItem[];
        links: PaginationLink[];
    };
}

const ACTION_LABEL: Record<AlertItem['action'], string> = {
    block: 'Bloqueada',
    notify: 'Notificada',
    ignore: 'Ignorada',
};

const ACTION_COLOR: Record<AlertItem['action'], string> = {
    block: 'bg-red-100 text-red-800',
    notify: 'bg-amber-100 text-amber-800',
    ignore: 'bg-gray-100 text-gray-700',
};

export default function AlertsIndex({ clients, selectedClientId, alerts }: AlertsProps) {
    const showingAll = selectedClientId === 'all';

    const changeClient = (clientId: string) => {
        router.get('/alerts', { client_id: clientId }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Alertas</h2>}>
            <Head title="Alertas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {clients && (
                        <div className="mb-4">
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
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-left text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        {showingAll && <th className="px-6 py-3">Cliente</th>}
                                        <th className="px-6 py-3">Cuenta</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Regla</th>
                                        <th className="px-6 py-3 text-right">Llamadas</th>
                                        <th className="px-6 py-3 text-right">Segundos</th>
                                        <th className="px-6 py-3">Acción</th>
                                        <th className="px-6 py-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {alerts.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={showingAll ? 9 : 8} className="px-6 py-4 text-gray-500">
                                                Aún no hay alertas registradas. Se generan automáticamente cuando una cuenta supera los límites de llamadas o duración configurados en un prefijo, evaluados sobre la última hora.
                                            </td>
                                        </tr>
                                    ) : alerts.data.map((alert) => (
                                        <tr key={alert.id}>
                                            <td className="px-6 py-4">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(alert.occurredAt))}</td>
                                            {showingAll && <td className="px-6 py-4">{alert.clientName ?? '—'}</td>}
                                            <td className="px-6 py-4 font-mono">{alert.account ?? '—'}</td>
                                            <td className="px-6 py-4">{alert.customer ?? '—'}</td>
                                            <td className="px-6 py-4">{alert.rule?.description || alert.rule?.matchValue || '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                {alert.calls ?? '—'}
                                                {alert.callLimit !== null && <span className="text-gray-400"> / {alert.callLimit}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {alert.seconds ?? '—'}
                                                {alert.durationLimitSeconds !== null && <span className="text-gray-400"> / {alert.durationLimitSeconds}</span>}
                                            </td>
                                            <td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${ACTION_COLOR[alert.action]}`}>{ACTION_LABEL[alert.action]}</span></td>
                                            <td className="px-6 py-4">{alert.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination links={alerts.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
