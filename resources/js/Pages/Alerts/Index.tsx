import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import Pagination from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime, useTimezone } from '@/lib/datetime';
import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

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
    reviewStatus: 'pending' | 'cleared' | 'maintained';
    feedbackNotes: string | null;
    reviewedByName: string | null;
    reviewedAt: string | null;
    canReview: boolean;
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

interface AlertFilters {
    search: string | null;
    action: AlertItem['action'] | null;
    reviewStatus: AlertItem['reviewStatus'] | null;
    from: string | null;
    to: string | null;
}

interface AlertsProps {
    clients?: ClientOption[] | null;
    selectedClientId?: number | 'all' | null;
    filters: AlertFilters;
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
    block: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
    notify: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
    ignore: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const REVIEW_LABEL: Record<AlertItem['reviewStatus'], string> = {
    pending: 'Pendiente de revisión',
    cleared: 'Bloqueo levantado',
    maintained: 'Bloqueo mantenido',
};

const REVIEW_COLOR: Record<AlertItem['reviewStatus'], string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
    cleared: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400',
    maintained: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
};

function ReviewModal({ alert, onClose }: { alert: AlertItem; onClose: () => void }) {
    const [decision, setDecision] = useState<'cleared' | 'maintained'>('maintained');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = () => {
        setProcessing(true);
        setError(null);

        router.patch(route('alerts.review', alert.id), { decision, notes }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errors) => setError(Object.values(errors)[0] as string ?? 'No fue posible guardar la revisión.'),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Modal show onClose={onClose} maxWidth="md">
            <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Revisar alerta de bloqueo</h3>
                <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>Cuenta: <span className="font-mono">{alert.account ?? '—'}</span></li>
                    <li>Customer: {alert.customer ?? '—'}</li>
                    <li>Regla: {alert.rule?.description || alert.rule?.matchValue || '—'}</li>
                    <li>Llamadas: {alert.calls ?? '—'}{alert.callLimit !== null ? ` / límite ${alert.callLimit}` : ''}</li>
                    <li>Segundos: {alert.seconds ?? '—'}{alert.durationLimitSeconds !== null ? ` / límite ${alert.durationLimitSeconds}` : ''}</li>
                </ul>

                <div className="mt-5">
                    <InputLabel value="Decisión tras validar con el cliente" />
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <label className={`cursor-pointer rounded-lg border p-3 text-sm transition ${decision === 'cleared' ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-500/10' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
                            <input type="radio" name="decision" className="sr-only" checked={decision === 'cleared'} onChange={() => setDecision('cleared')} />
                            <span className="block font-medium text-gray-900 dark:text-gray-100">Levantar bloqueo</span>
                            <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">Las llamadas son legítimas.</span>
                        </label>
                        <label className={`cursor-pointer rounded-lg border p-3 text-sm transition ${decision === 'maintained' ? 'border-red-500 bg-red-50 dark:border-red-500 dark:bg-red-500/10' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}>
                            <input type="radio" name="decision" className="sr-only" checked={decision === 'maintained'} onChange={() => setDecision('maintained')} />
                            <span className="block font-medium text-gray-900 dark:text-gray-100">Mantener bloqueo</span>
                            <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">Se confirma tráfico sospechoso.</span>
                        </label>
                    </div>
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="notes" value="Notas de la llamada al cliente" />
                    <textarea
                        id="notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        rows={3}
                        maxLength={2000}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="Ej. Se llamó al cliente, confirma que las llamadas fueron autorizadas."
                    />
                </div>

                {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">Cancelar</button>
                    <PrimaryButton disabled={processing} onClick={submit}>Guardar revisión</PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}

export default function AlertsIndex({ clients, selectedClientId, filters, alerts }: AlertsProps) {
    const showingAll = selectedClientId === 'all';
    const [reviewingAlert, setReviewingAlert] = useState<AlertItem | null>(null);
    const timeZone = useTimezone();

    const [search, setSearch] = useState(filters.search ?? '');
    const [action, setAction] = useState(filters.action ?? '');
    const [reviewStatus, setReviewStatus] = useState(filters.reviewStatus ?? '');
    const [from, setFrom] = useState(filters.from ?? '');
    const [to, setTo] = useState(filters.to ?? '');
    const isFirstRender = useRef(true);

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params: Record<string, string> = {
            search,
            action,
            review_status: reviewStatus,
            from,
            to,
            ...overrides,
        };

        if (selectedClientId !== null && selectedClientId !== undefined) {
            params.client_id = String(selectedClientId);
        }

        Object.keys(params).forEach((key) => {
            if (params[key] === '') {
                delete params[key];
            }
        });

        router.get('/alerts', params, { preserveState: true, replace: true });
    };

    // Debounce solo el texto libre; los selects y fechas aplican al instante.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeout = setTimeout(() => applyFilters(), 400);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const changeClient = (clientId: string) => {
        router.get('/alerts', { ...(clientId !== 'all' ? { client_id: clientId } : {}), search, action, review_status: reviewStatus, from, to }, { preserveState: true });
    };

    const clearFilters = () => {
        setSearch('');
        setAction('');
        setReviewStatus('');
        setFrom('');
        setTo('');
        router.get('/alerts', selectedClientId !== null && selectedClientId !== undefined ? { client_id: String(selectedClientId) } : {}, { preserveState: true });
    };

    const hasActiveFilters = search !== '' || action !== '' || reviewStatus !== '' || from !== '' || to !== '';

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Alertas</h2>}>
            <Head title="Alertas" />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-4 flex flex-wrap items-end gap-3">
                        {clients && (
                            <div>
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
                            </div>
                        )}

                        <div className="min-w-[220px] flex-1">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por cuenta, customer o regla…"
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>

                        <select
                            value={action}
                            onChange={(event) => { setAction(event.target.value); applyFilters({ action: event.target.value }); }}
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                            <option value="">Toda acción</option>
                            <option value="block">Bloqueada</option>
                            <option value="notify">Notificada</option>
                            <option value="ignore">Ignorada</option>
                        </select>

                        <select
                            value={reviewStatus}
                            onChange={(event) => { setReviewStatus(event.target.value); applyFilters({ review_status: event.target.value }); }}
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                            <option value="">Toda revisión</option>
                            <option value="pending">Pendiente de revisión</option>
                            <option value="cleared">Bloqueo levantado</option>
                            <option value="maintained">Bloqueo mantenido</option>
                        </select>

                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={from}
                                onChange={(event) => { setFrom(event.target.value); applyFilters({ from: event.target.value }); }}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            />
                            <span className="text-sm text-gray-400 dark:text-gray-500">–</span>
                            <input
                                type="date"
                                value={to}
                                onChange={(event) => { setTo(event.target.value); applyFilters({ to: event.target.value }); }}
                                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            />
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                                <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Fecha</th>
                                        {showingAll && <th className="px-6 py-3">Cliente</th>}
                                        <th className="px-6 py-3">Cuenta</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Regla</th>
                                        <th className="px-6 py-3 text-right">Llamadas</th>
                                        <th className="px-6 py-3 text-right">Segundos</th>
                                        <th className="px-6 py-3">Acción</th>
                                        <th className="px-6 py-3">Revisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {alerts.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={showingAll ? 9 : 8} className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                Aún no hay alertas registradas. Se generan automáticamente cuando una cuenta supera los límites de llamadas o duración configurados en un prefijo, evaluados sobre la última hora.
                                            </td>
                                        </tr>
                                    ) : alerts.data.map((alert) => (
                                        <tr
                                            key={alert.id}
                                            className={
                                                alert.action === 'block' && alert.reviewStatus === 'pending'
                                                    ? 'bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20'
                                                    : 'dark:hover:bg-gray-700'
                                            }
                                        >
                                            <td className="px-6 py-4 dark:text-gray-300">{formatDateTime(alert.occurredAt, timeZone, { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            {showingAll && <td className="px-6 py-4 dark:text-gray-300">{alert.clientName ?? '—'}</td>}
                                            <td className="px-6 py-4 font-mono dark:text-gray-300">{alert.account ?? '—'}</td>
                                            <td className="px-6 py-4 dark:text-gray-300">{alert.customer ?? '—'}</td>
                                            <td className="px-6 py-4 dark:text-gray-300">{alert.rule?.description || alert.rule?.matchValue || '—'}</td>
                                            <td className="px-6 py-4 text-right dark:text-gray-300">
                                                {alert.calls ?? '—'}
                                                {alert.callLimit !== null && <span className="text-gray-400 dark:text-gray-500"> / {alert.callLimit}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right dark:text-gray-300">
                                                {alert.seconds ?? '—'}
                                                {alert.durationLimitSeconds !== null && <span className="text-gray-400 dark:text-gray-500"> / {alert.durationLimitSeconds}</span>}
                                            </td>
                                            <td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${ACTION_COLOR[alert.action]}`}>{ACTION_LABEL[alert.action]}</span></td>
                                            <td className="px-6 py-4">
                                                {alert.action === 'block' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`rounded-full px-2 py-1 text-xs font-medium ${REVIEW_COLOR[alert.reviewStatus]}`}
                                                            title={alert.feedbackNotes ?? undefined}
                                                        >
                                                            {REVIEW_LABEL[alert.reviewStatus]}
                                                        </span>
                                                        {alert.canReview && alert.reviewStatus === 'pending' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setReviewingAlert(alert)}
                                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                            >
                                                                Revisar
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination links={alerts.links} />
                    </div>
                </div>
            </div>

            {reviewingAlert && (
                <ReviewModal alert={reviewingAlert} onClose={() => setReviewingAlert(null)} />
            )}
        </AuthenticatedLayout>
    );
}
