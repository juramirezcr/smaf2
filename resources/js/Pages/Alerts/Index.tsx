import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface AlertItem {
    id: number;
    action: 'ignore' | 'notify' | 'block';
    status: string;
    occurredAt: string;
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

interface AlertsProps {
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

export default function AlertsIndex({ alerts }: AlertsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Alertas</h2>}>
            <Head title="Alertas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Regla</th>
                                    <th className="px-6 py-3">Acción</th>
                                    <th className="px-6 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {alerts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-gray-500">
                                            Aún no hay alertas registradas. Esto es normal si todavía no hay un proceso que evalúe las reglas de monitoreo contra las llamadas importadas.
                                        </td>
                                    </tr>
                                ) : alerts.data.map((alert) => (
                                    <tr key={alert.id}>
                                        <td className="px-6 py-4">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(alert.occurredAt))}</td>
                                        <td className="px-6 py-4">{alert.rule?.description || alert.rule?.matchValue || '—'}</td>
                                        <td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${ACTION_COLOR[alert.action]}`}>{ACTION_LABEL[alert.action]}</span></td>
                                        <td className="px-6 py-4">{alert.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={alerts.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
