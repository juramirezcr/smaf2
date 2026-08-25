import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Fragment, ReactNode, useEffect, useState } from 'react';

interface StatItem {
    clientId: number;
    label: string;
    calls: number;
    seconds: number;
    history: number[];
    alerted: boolean;
}

interface StatGroup {
    clientName: string | null;
    items: StatItem[];
}

interface DestinationItem {
    prefix: string | null;
    destination: string | null;
    calls: number;
    seconds: number;
    history: number[];
}

interface DestinationGroup {
    clientName: string | null;
    items: DestinationItem[];
}

interface AccountItem {
    clientId: number;
    customer: string | null;
    account: string | null;
    calls: number;
    seconds: number;
    history: number[];
    alerted: boolean;
}

interface AccountGroup {
    clientName: string | null;
    items: AccountItem[];
}

interface ClientActiveItem {
    clientId: number;
    clientName: string | null;
    calls: number;
}

interface TrafficPoint {
    at: string;
    calls: number;
    seconds: number;
}

interface QueueSummary {
    pending: number;
    running: number;
    failedRecent: number;
    oldestPendingSeconds: number | null;
}

interface AlertRecentItem {
    id: number;
    occurredAt: string;
    clientName: string | null;
    account: string | null;
    calls: number | null;
    seconds: number | null;
    action: 'ignore' | 'notify' | 'block';
    ruleLabel: string | null;
    reviewStatus: 'pending' | 'cleared' | 'maintained';
}

interface WidgetDef {
    key: string;
    label: string;
    description: string;
    icon: string;
    adminOnly: boolean;
}

interface DashboardKpis {
    activeCalls: number;
    accountsInReview: number;
    prefixesMonitored: number;
}

interface DashboardProps {
    period: string;
    isAdmin: boolean;
    prefixStats: StatGroup[];
    destinationStats: DestinationGroup[];
    accountStats: AccountGroup[];
    alertCounts: Record<string, number>;
    kpis: DashboardKpis;
    availableWidgets: WidgetDef[];
    activeWidgets: string[];
    clientsActive: ClientActiveItem[];
    trafficSeries: TrafficPoint[];
    heatmap: number[][];
    queueSummary: QueueSummary | null;
    alertsRecent: AlertRecentItem[];
}

function Sparkline({ data }: { data: number[] }) {
    const width = 90;
    const height = 22;
    const max = Math.max(...data, 1);
    const step = width / Math.max(data.length - 1, 1);
    const points = data.map((value, index) => `${index * step},${height - (value / max) * (height - 2) - 1}`).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block overflow-visible align-middle">
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400" />
        </svg>
    );
}

function CallsMinutesBadge({ calls, seconds, alerted }: { calls: number; seconds: number; alerted: boolean }) {
    const minutes = Math.round(seconds / 60);

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
                alerted
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
            }`}
        >
            {calls} / {minutes} min
        </span>
    );
}

const HISTORY_PERIOD_LABELS: Record<string, string> = {
    '1h': 'Última hora',
    '6h': 'Últimas 6 horas',
    '24h': 'Últimas 24 horas',
    '7d': 'Últimos 7 días',
    '30d': 'Último mes',
};

interface HistoryBucket {
    at: string;
    calls: number;
    seconds: number;
}

function formatBucketLabel(iso: string): string {
    return new Date(iso).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function HistoryChart({ buckets, loading }: { buckets: HistoryBucket[] | null; loading: boolean }) {
    if (loading || buckets === null) {
        return <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Cargando histórico...</p>;
    }

    if (buckets.every((bucket) => bucket.calls === 0)) {
        return <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Sin llamadas en este período.</p>;
    }

    const width = 960;
    const height = 380;
    const paddingX = 24;
    const paddingTop = 32;
    const paddingBottom = 40;
    const plotHeight = height - paddingTop - paddingBottom;
    const maxCalls = Math.max(...buckets.map((bucket) => bucket.calls), 1);
    const stepX = (width - paddingX * 2) / Math.max(buckets.length - 1, 1);
    const points = buckets.map((bucket, index) => ({
        x: paddingX + index * stepX,
        y: height - paddingBottom - (bucket.calls / maxCalls) * plotHeight,
        ...bucket,
    }));

    const totalCalls = buckets.reduce((sum, bucket) => sum + bucket.calls, 0);
    const totalSeconds = buckets.reduce((sum, bucket) => sum + bucket.seconds, 0);
    const dateLabelEvery = Math.max(1, Math.ceil(points.length / 8));

    return (
        <div>
            <div className="mb-3 flex gap-6 text-base text-gray-600 dark:text-gray-300">
                <span>Llamadas: <strong className="text-gray-900 dark:text-gray-100">{totalCalls}</strong></span>
                <span>Segundos: <strong className="text-gray-900 dark:text-gray-100">{totalSeconds}</strong></span>
            </div>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const y = height - paddingBottom - fraction * plotHeight;

                    return <line key={fraction} x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="stroke-gray-100 dark:stroke-gray-700" strokeWidth={1} />;
                })}
                <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" className="stroke-indigo-500" strokeWidth={2.5} />
                {points.map((p, index) => <circle key={index} cx={p.x} cy={p.y} r={3.5} className="fill-indigo-500" />)}
                {points.map((p, index) => p.calls > 0 && (
                    <text key={index} x={p.x} y={Math.max(14, p.y - 10)} textAnchor="middle" className="fill-indigo-700 text-[13px] font-semibold dark:fill-indigo-300">
                        {p.calls}
                    </text>
                ))}
                {points.map((p, index) => (index % dateLabelEvery === 0 || index === points.length - 1) && (
                    <text key={index} x={p.x} y={height - 12} textAnchor="middle" className="fill-gray-400 text-[11px] dark:fill-gray-500">
                        {formatBucketLabel(p.at)}
                    </text>
                ))}
            </svg>
        </div>
    );
}

function PeriodSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        >
            {Object.entries(HISTORY_PERIOD_LABELS).map(([value_, label]) => (
                <option key={value_} value={value_}>{label}</option>
            ))}
        </select>
    );
}

interface PrefixRuleData {
    id: number;
    prefix: string;
    country: string | null;
    description: string | null;
    hourlyCallLimit: number;
    hourlyMinutesLimit: number;
    action: 'notify' | 'block';
    enabled: boolean;
    lastEvaluatedAt: string | null;
}

function PrefixDetailModal({ clientId, prefix, onClose }: { clientId: number; prefix: string; onClose: () => void }) {
    const [tab, setTab] = useState<'history' | 'config'>('history');
    const [period, setPeriod] = useState('1h');
    const [buckets, setBuckets] = useState<HistoryBucket[] | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [loadingRule, setLoadingRule] = useState(false);
    const [rule, setRule] = useState<PrefixRuleData | null>(null);
    const [matchedScope, setMatchedScope] = useState<'client' | 'global' | 'none'>('none');
    const [canEdit, setCanEdit] = useState(false);
    const [ruleLoadError, setRuleLoadError] = useState<string | null>(null);
    const [form, setForm] = useState({ country: '', description: '', hourly_call_limit: 100, hourly_minutes_limit: 60, action: 'notify' as 'notify' | 'block', enabled: true });
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        setLoadingHistory(true);
        axios.get(route('dashboard.prefix-history'), { params: { client_id: clientId, prefix, period } })
            .then((response) => setBuckets(response.data.buckets))
            .catch(() => setBuckets([]))
            .finally(() => setLoadingHistory(false));
    }, [clientId, prefix, period]);

    useEffect(() => {
        setLoadingRule(true);
        setRuleLoadError(null);
        axios.get(route('dashboard.prefix-rule'), { params: { client_id: clientId, prefix } })
            .then((response) => {
                const data = response.data as { rule: PrefixRuleData | null; matchedScope: 'client' | 'global' | 'none'; canEdit: boolean };
                setRule(data.rule);
                setMatchedScope(data.matchedScope);
                setCanEdit(data.canEdit);
                setForm({
                    country: data.rule?.country ?? '',
                    description: data.rule?.description ?? '',
                    hourly_call_limit: data.rule?.hourlyCallLimit ?? 100,
                    hourly_minutes_limit: data.rule?.hourlyMinutesLimit ?? 60,
                    action: data.rule?.action ?? 'notify',
                    enabled: data.rule?.enabled ?? true,
                });
            })
            .catch((error) => {
                const message = axios.isAxiosError(error) && error.response
                    ? `Error ${error.response.status}: ${error.response.data?.message ?? 'sin detalle.'}`
                    : 'No fue posible conectar con el servidor.';
                setRuleLoadError(message);
            })
            .finally(() => setLoadingRule(false));
    }, [clientId, prefix]);

    const saveRule = async () => {
        setSaving(true);
        setSaveResult(null);

        try {
            const response = await axios.post(route('dashboard.prefix-rule.update'), {
                client_id: clientId,
                prefix,
                ...form,
            });
            setRule(response.data.rule);
            setMatchedScope(response.data.matchedScope);
            setSaveResult({ status: 'success', message: 'Configuración guardada.' });
        } catch (error) {
            const message = axios.isAxiosError(error) && error.response?.data?.message
                ? error.response.data.message
                : 'No fue posible guardar la configuración.';
            setSaveResult({ status: 'error', message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal show onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Prefijo +{prefix}</h3>

                <div className="mt-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => setTab('history')}
                        className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                    >
                        Histórico
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('config')}
                        className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === 'config' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                    >
                        Configuración
                    </button>
                </div>

                {tab === 'history' && (
                    <div className="mt-4">
                        <div className="mb-3 flex justify-end">
                            <PeriodSelect value={period} onChange={setPeriod} />
                        </div>
                        <HistoryChart buckets={buckets} loading={loadingHistory} />
                    </div>
                )}

                {tab === 'config' && (
                    loadingRule ? (
                        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Cargando configuración...</p>
                    ) : ruleLoadError ? (
                        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                            {ruleLoadError}
                        </p>
                    ) : (
                        <div className="mt-4 space-y-4">
                            {matchedScope === 'global' && (
                                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                    Actualmente aplica la regla global. Guardar aquí crea una regla específica para este cliente sin afectar a los demás.
                                </p>
                            )}
                            {matchedScope === 'none' && (
                                <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                    Este prefijo no tiene una regla de monitoreo configurada todavía para este cliente.
                                </p>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="rule_country" value="País" />
                                    <TextInput id="rule_country" value={form.country} disabled={!canEdit} className="mt-1 block w-full" onChange={(event) => setForm((previous) => ({ ...previous, country: event.target.value }))} />
                                </div>
                                <div>
                                    <InputLabel htmlFor="rule_action" value="Acción" />
                                    <select
                                        id="rule_action"
                                        value={form.action}
                                        disabled={!canEdit}
                                        onChange={(event) => setForm((previous) => ({ ...previous, action: event.target.value as 'notify' | 'block' }))}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    >
                                        <option value="notify">Notificar</option>
                                        <option value="block">Bloquear</option>
                                    </select>
                                </div>
                                <div>
                                    <InputLabel htmlFor="rule_calls" value="Límite de llamadas/hora" />
                                    <TextInput id="rule_calls" type="number" value={form.hourly_call_limit} disabled={!canEdit} className="mt-1 block w-full" onChange={(event) => setForm((previous) => ({ ...previous, hourly_call_limit: Number(event.target.value) }))} />
                                </div>
                                <div>
                                    <InputLabel htmlFor="rule_minutes" value="Límite de minutos/hora" />
                                    <TextInput id="rule_minutes" type="number" value={form.hourly_minutes_limit} disabled={!canEdit} className="mt-1 block w-full" onChange={(event) => setForm((previous) => ({ ...previous, hourly_minutes_limit: Number(event.target.value) }))} />
                                </div>
                                <div className="col-span-2">
                                    <InputLabel htmlFor="rule_description" value="Descripción" />
                                    <TextInput id="rule_description" value={form.description} disabled={!canEdit} className="mt-1 block w-full" onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={form.enabled}
                                            disabled={!canEdit}
                                            onChange={(event) => setForm((previous) => ({ ...previous, enabled: event.target.checked }))}
                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        Regla habilitada
                                    </label>
                                </div>
                            </div>

                            {canEdit ? (
                                <div className="flex items-center gap-3">
                                    <PrimaryButton disabled={saving} onClick={saveRule}>Guardar</PrimaryButton>
                                    {saveResult && (
                                        <span className={`text-xs ${saveResult.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {saveResult.message}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 dark:text-gray-500">Solo un administrador puede editar esta configuración.</p>
                            )}
                        </div>
                    )
                )}
            </div>
        </Modal>
    );
}

function AccountDetailModal({ clientId, customer, account, onClose }: { clientId: number; customer: string | null; account: string; onClose: () => void }) {
    const [tab, setTab] = useState<'info' | 'history'>('info');
    const [period, setPeriod] = useState('1h');
    const [buckets, setBuckets] = useState<HistoryBucket[] | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        setLoadingHistory(true);
        axios.get(route('dashboard.account-history'), { params: { client_id: clientId, customer: customer ?? '', account, period } })
            .then((response) => setBuckets(response.data.buckets))
            .catch(() => setBuckets([]))
            .finally(() => setLoadingHistory(false));
    }, [clientId, customer, account, period]);

    return (
        <Modal show onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Cuenta {account}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{customer ?? 'Sin customer'}</p>

                <div className="mt-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => setTab('info')}
                        className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === 'info' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                    >
                        Información
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('history')}
                        className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400'}`}
                    >
                        Histórico
                    </button>
                </div>

                {tab === 'info' && (
                    <ul className="mt-4 space-y-2 text-sm">
                        <li className="flex justify-between border-b border-gray-100 py-1.5 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Customer</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{customer ?? '—'}</span>
                        </li>
                        <li className="flex justify-between border-b border-gray-100 py-1.5 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Cuenta</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{account}</span>
                        </li>
                    </ul>
                )}

                {tab === 'history' && (
                    <div className="mt-4">
                        <div className="mb-3 flex justify-end">
                            <PeriodSelect value={period} onChange={setPeriod} />
                        </div>
                        <HistoryChart buckets={buckets} loading={loadingHistory} />
                    </div>
                )}
            </div>
        </Modal>
    );
}

/* ================================================================
   Panel de Control — chrome & new widgets
   ================================================================ */

function WidgetCard({ icon, title, tag, href, children }: { icon: string; title: string; tag?: string; href?: string; children: ReactNode }) {
    const inner = (
        <>
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <span>{icon}</span>
                    {title}
                </h2>
                {tag && <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">{tag}</span>}
            </div>
            <div className="min-w-0 flex-1 p-4">{children}</div>
        </>
    );

    const className = 'flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800';

    return href ? <Link href={href} className={className}>{inner}</Link> : <div className={className}>{inner}</div>;
}

function TrafficChart({ points }: { points: TrafficPoint[] }) {
    if (points.every((p) => p.calls === 0)) {
        return <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Sin llamadas en este período.</p>;
    }

    const width = 720;
    const height = 220;
    const padX = 12;
    const padTop = 28;
    const padBottom = 34;
    const plotH = height - padTop - padBottom;
    const max = Math.max(...points.map((p) => p.calls), 1);
    const stepX = (width - padX * 2) / Math.max(points.length - 1, 1);
    const coords = points.map((p, i) => ({ x: padX + i * stepX, y: height - padBottom - (p.calls / max) * plotH, ...p }));
    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padBottom} L${coords[0].x.toFixed(1)},${height - padBottom} Z`;
    const peakIndex = points.findIndex((p) => p.calls === max);
    const timeLabelEvery = Math.max(1, Math.ceil(coords.length / 8));

    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {[0, 0.5, 1].map((f) => {
                const y = height - padBottom - f * plotH;
                return <line key={f} x1={padX} x2={width - padX} y1={y} y2={y} className="stroke-gray-100 dark:stroke-gray-700" strokeWidth={1} />;
            })}
            <path d={areaPath} className="fill-indigo-500/10" />
            <path d={linePath} fill="none" className="stroke-indigo-500" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {coords.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={i === peakIndex ? 4 : 2.5} className={i === peakIndex ? 'fill-red-500' : 'fill-indigo-500'} />
            ))}
            {coords.map((c, i) => c.calls > 0 && (
                <text
                    key={i}
                    x={c.x}
                    y={Math.max(12, c.y - 10)}
                    textAnchor="middle"
                    className={i === peakIndex ? 'fill-gray-900 text-[12px] font-semibold dark:fill-gray-100' : 'fill-gray-500 text-[10px] dark:fill-gray-400'}
                >
                    {c.calls}
                </text>
            ))}
            {coords.map((c, i) => (i % timeLabelEvery === 0 || i === coords.length - 1) && (
                <text key={i} x={c.x} y={height - 12} textAnchor="middle" className="fill-gray-400 text-[10px] dark:fill-gray-500">
                    {formatBucketLabel(c.at)}
                </text>
            ))}
        </svg>
    );
}

const ACTION_LABEL: Record<string, string> = { notify: 'Notificadas', block: 'Bloqueadas', ignore: 'Ignoradas' };

function RankedList({ items, colorClass }: { items: { key: string; label: string; sub?: string; value: number; display: string }[]; colorClass: string }) {
    const max = Math.max(...items.map((i) => i.value), 1);

    if (items.length === 0) {
        return <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Sin datos en este período.</p>;
    }

    return (
        <div className="space-y-2.5">
            {items.map((item) => (
                <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
                    <div>
                        <p className="truncate font-medium text-gray-800 dark:text-gray-100">{item.label}{item.sub && <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500">{item.sub}</span>}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                            <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${Math.max(4, Math.round((item.value / max) * 100))}%` }} />
                        </div>
                    </div>
                    <span className="shrink-0 font-mono text-gray-500 dark:text-gray-400">{item.display}</span>
                </div>
            ))}
        </div>
    );
}

function HeatmapGrid({ matrix }: { matrix: number[][] }) {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const max = Math.max(...matrix.flat(), 1);

    return (
        <div className="overflow-x-auto">
            <div
                className="grid min-w-[560px] gap-1"
                style={{ gridTemplateColumns: `28px repeat(24, minmax(0, 1fr))` }}
            >
                {matrix.map((row, dayIndex) => (
                    <Fragment key={dayIndex}>
                        <span className="flex items-center text-[10px] text-gray-400 dark:text-gray-500">{days[dayIndex]}</span>
                        {row.map((value, hour) => {
                            const intensity = value / max;
                            return (
                                <div
                                    key={hour}
                                    title={`${days[dayIndex]} ${hour}:00 — ${value} llamadas`}
                                    className="aspect-square rounded-[2px] bg-indigo-500"
                                    style={{ opacity: value === 0 ? 0.06 : Math.max(0.15, intensity) }}
                                />
                            );
                        })}
                    </Fragment>
                ))}
                <span />
                {Array.from({ length: 24 }, (_, hour) => (
                    <span key={hour} className="text-center text-[9px] text-gray-400 dark:text-gray-500">
                        {hour % 3 === 0 ? hour : ''}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ReviewChip({ status }: { status: AlertRecentItem['reviewStatus'] }) {
    const map: Record<AlertRecentItem['reviewStatus'], { label: string; className: string }> = {
        pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' },
        cleared: { label: 'Levantado', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' },
        maintained: { label: 'Mantenido', className: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400' },
    };
    const { label, className } = map[status];

    return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{label}</span>;
}

const ACTION_CHIP: Record<AlertRecentItem['action'], string> = {
    block: 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400',
    notify: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400',
    ignore: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

interface WidgetPickerProps {
    open: boolean;
    onClose: () => void;
    available: WidgetDef[];
    active: Set<string>;
    onToggle: (key: string) => void;
}

function WidgetPicker({ open, onClose, available, active, onToggle }: WidgetPickerProps) {
    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            />
            <div
                className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl transition-transform dark:bg-gray-800 ${open ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personalizar panel</h3>
                    <button type="button" onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {available.map((widget) => (
                        <label key={widget.key} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <input
                                type="checkbox"
                                checked={active.has(widget.key)}
                                onChange={() => onToggle(widget.key)}
                                className="h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100 text-base dark:bg-gray-700">{widget.icon}</span>
                            <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{widget.label}</span>
                                <span className="block text-xs text-gray-400 dark:text-gray-500">{widget.description}</span>
                            </span>
                        </label>
                    ))}
                </div>
                <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                    Los cambios se guardan automáticamente en tu cuenta.
                </div>
            </div>
        </>
    );
}

function KpiTile({ label, value, sub, href }: { label: string; value: string; sub?: ReactNode; href?: string }) {
    const inner = (
        <>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">{value}</p>
            {sub && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
        </>
    );
    const className = 'rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800';

    return href ? <Link href={href} className={className}>{inner}</Link> : <div className={className}>{inner}</div>;
}

const AUTO_REFRESH_OPTIONS = [
    { value: 0, label: 'Sin auto-actualizar' },
    { value: 60_000, label: 'Cada 1 min' },
    { value: 300_000, label: 'Cada 5 min' },
    { value: 900_000, label: 'Cada 15 min' },
];

export default function Dashboard({
    period,
    isAdmin,
    prefixStats,
    destinationStats,
    accountStats,
    alertCounts,
    kpis,
    availableWidgets,
    activeWidgets,
    clientsActive,
    trafficSeries,
    heatmap,
    queueSummary,
    alertsRecent,
}: DashboardProps) {
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(60_000);
    const [prefixModal, setPrefixModal] = useState<{ clientId: number; prefix: string } | null>(null);
    const [accountModal, setAccountModal] = useState<{ clientId: number; customer: string | null; account: string } | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [active, setActive] = useState<Set<string>>(new Set(activeWidgets));

    useEffect(() => setActive(new Set(activeWidgets)), [activeWidgets]);

    const handlePeriodChange = (newPeriod: string) => {
        router.get(route('dashboard'), { period: newPeriod }, { preserveState: true });
    };

    useEffect(() => {
        if (autoRefreshInterval === 0) {
            return;
        }

        const interval = setInterval(() => {
            router.reload({ only: ['prefixStats', 'destinationStats', 'accountStats', 'alertCounts', 'kpis', 'clientsActive', 'trafficSeries', 'heatmap', 'queueSummary', 'alertsRecent'] });
        }, autoRefreshInterval);

        return () => clearInterval(interval);
    }, [autoRefreshInterval, period]);

    const toggleWidget = (key: string) => {
        const next = new Set(active);
        next.has(key) ? next.delete(key) : next.add(key);
        setActive(next);
        router.patch(route('dashboard.widgets.update'), { widgets: Array.from(next) }, { preserveState: true, preserveScroll: true, only: [] });
    };

    const periodLabels: Record<string, string> = HISTORY_PERIOD_LABELS;
    const alertsTotal = (alertCounts.block ?? 0) + (alertCounts.notify ?? 0) + (alertCounts.ignore ?? 0);

    const header = (
        <div className="flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-100">
                📡 Panel de Control
            </h1>
            <div className="flex items-center gap-2">
                <select
                    value={autoRefreshInterval}
                    onChange={(event) => setAutoRefreshInterval(Number(event.target.value))}
                    className="rounded-md border-gray-300 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                    {AUTO_REFRESH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                <select
                    value={period}
                    onChange={(event) => handlePeriodChange(event.target.value)}
                    className="rounded-md border-gray-300 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                >
                    {Object.entries(periodLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    ⚙ Personalizar panel
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 font-mono text-[11px]">{active.size}</span>
                </button>
            </div>
        </div>
    );

    const isOn = (key: string) => active.has(key);

    return (
        <AuthenticatedLayout header={header}>
            <Head title="Panel de Control" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 2xl:max-w-none 2xl:px-10">
                    <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                        <KpiTile label="Llamadas activas" value={kpis.activeCalls.toLocaleString('es-CR')} sub={periodLabels[period]} />
                        <KpiTile
                            label="Alertas (24h)"
                            value={alertsTotal.toLocaleString('es-CR')}
                            href={route('alerts.index')}
                            sub={(
                                <div className="flex gap-3">
                                    <span>🚫 {alertCounts.block ?? 0}</span>
                                    <span>🔔 {alertCounts.notify ?? 0}</span>
                                    <span>➖ {alertCounts.ignore ?? 0}</span>
                                </div>
                            )}
                        />
                        <KpiTile
                            label="Acciones"
                            value={alertsTotal.toLocaleString('es-CR')}
                            href={route('alerts.index')}
                            sub={(
                                <div className="flex gap-3">
                                    <span>🔔 {alertsTotal > 0 ? Math.round(((alertCounts.notify ?? 0) / alertsTotal) * 100) : 0}%</span>
                                    <span>🚫 {alertsTotal > 0 ? Math.round(((alertCounts.block ?? 0) / alertsTotal) * 100) : 0}%</span>
                                    <span>➖ {alertsTotal > 0 ? Math.round(((alertCounts.ignore ?? 0) / alertsTotal) * 100) : 0}%</span>
                                </div>
                            )}
                        />
                        <KpiTile
                            label="Cuentas en revisión"
                            value={kpis.accountsInReview.toLocaleString('es-CR')}
                            href={route('alerts.index')}
                            sub="Bloqueos pendientes"
                        />
                        <KpiTile
                            label="Prefijos monitoreados"
                            value={kpis.prefixesMonitored.toLocaleString('es-CR')}
                            href={route('prefixes.index')}
                            sub="Con tráfico en este período"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 min-[1800px]:grid-cols-4">

                        {isOn('traffic') && (
                            <div className="md:col-span-2">
                                <WidgetCard icon="📈" title="Tráfico de llamadas" tag={periodLabels[period]}>
                                    <TrafficChart points={trafficSeries} />
                                </WidgetCard>
                            </div>
                        )}

                        {isOn('heatmap') && (
                            <div className="md:col-span-2">
                                <WidgetCard icon="🕘" title="Intensidad de tráfico por hora" tag="7 DÍAS">
                                    <HeatmapGrid matrix={heatmap} />
                                </WidgetCard>
                            </div>
                        )}

                        {isOn('prefixes') && (
                            <WidgetCard icon="🌐" title="Prefijos" href={route('prefixes.index')}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                                            <tr>
                                                <th className="py-1.5 text-left">Prefijo</th>
                                                <th className="py-1.5 text-right">Llamadas/Min.</th>
                                                <th className="py-1.5 text-right">Histórico</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                            {prefixStats.length === 0 ? (
                                                <tr><td colSpan={3} className="py-3 text-gray-500 dark:text-gray-400">Sin llamadas en este período.</td></tr>
                                            ) : prefixStats.map((group, groupIndex) => (
                                                <Fragment key={groupIndex}>
                                                    {group.clientName && (
                                                        <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                            <td colSpan={3} className="py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{group.clientName}</td>
                                                        </tr>
                                                    )}
                                                    {group.items.map((item, itemIndex) => (
                                                        <tr
                                                            key={itemIndex}
                                                            onClick={(event) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                setPrefixModal({ clientId: item.clientId, prefix: item.label });
                                                            }}
                                                            className={`cursor-pointer transition ${item.alerted ? 'bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                        >
                                                            <td className="py-2 font-mono">{item.label ?? '—'}</td>
                                                            <td className="py-2 text-right">
                                                                <CallsMinutesBadge calls={item.calls} seconds={item.seconds} alerted={item.alerted} />
                                                            </td>
                                                            <td className="py-2 text-right text-indigo-400"><Sparkline data={item.history} /></td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </WidgetCard>
                        )}

                        {isOn('destinations') && (
                            <WidgetCard icon="📞" title="Destinos (Top 10)" href={route('destinations.index')}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                                            <tr>
                                                <th className="py-1.5 text-left">Prefijo</th>
                                                <th className="py-1.5 text-left">Destino</th>
                                                <th className="py-1.5 text-right">Llamadas</th>
                                                <th className="py-1.5 text-right">Histórico</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                            {destinationStats.length === 0 ? (
                                                <tr><td colSpan={4} className="py-3 text-gray-500 dark:text-gray-400">Sin llamadas en este período.</td></tr>
                                            ) : destinationStats.map((group, groupIndex) => (
                                                <Fragment key={groupIndex}>
                                                    {group.clientName && (
                                                        <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                            <td colSpan={4} className="py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{group.clientName}</td>
                                                        </tr>
                                                    )}
                                                    {group.items.map((item, itemIndex) => (
                                                        <tr key={itemIndex}>
                                                            <td className="py-2">{item.prefix ?? '—'}</td>
                                                            <td className="py-2">{item.destination ?? '—'}</td>
                                                            <td className="py-2 text-right">{item.calls}</td>
                                                            <td className="py-2 text-right text-indigo-400"><Sparkline data={item.history} /></td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </WidgetCard>
                        )}

                        {isOn('accounts') && (
                            <WidgetCard icon="👥" title="Cuentas" href={route('accounts.index')}>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                                            <tr>
                                                {isAdmin && <th className="py-1.5 text-left">Customer</th>}
                                                <th className="py-1.5 text-left">Cuenta</th>
                                                <th className="py-1.5 text-right">Llamadas/Min.</th>
                                                <th className="py-1.5 text-right">Histórico</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                            {accountStats.length === 0 ? (
                                                <tr><td colSpan={isAdmin ? 4 : 3} className="py-3 text-gray-500 dark:text-gray-400">Sin llamadas en este período.</td></tr>
                                            ) : accountStats.map((group, groupIndex) => (
                                                <Fragment key={groupIndex}>
                                                    {group.clientName && (
                                                        <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                            <td colSpan={isAdmin ? 4 : 3} className="py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{group.clientName}</td>
                                                        </tr>
                                                    )}
                                                    {group.items.map((item, itemIndex) => (
                                                        <tr
                                                            key={itemIndex}
                                                            onClick={(event) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                if (item.account) {
                                                                    setAccountModal({ clientId: item.clientId, customer: item.customer, account: item.account });
                                                                }
                                                            }}
                                                            className={`cursor-pointer transition ${item.alerted ? 'bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                        >
                                                            {isAdmin && <td className="py-2">{item.customer ?? '—'}</td>}
                                                            <td className="py-2">{item.account ?? '—'}</td>
                                                            <td className="py-2 text-right">
                                                                <CallsMinutesBadge calls={item.calls} seconds={item.seconds} alerted={item.alerted} />
                                                            </td>
                                                            <td className="py-2 text-right text-indigo-400"><Sparkline data={item.history} /></td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </WidgetCard>
                        )}

                        {isAdmin && isOn('clients') && (
                            <WidgetCard icon="🏢" title="Clientes activos" href={route('admin.clients.index')}>
                                <RankedList
                                    colorClass="bg-indigo-500"
                                    items={clientsActive.slice(0, 8).map((c) => ({
                                        key: String(c.clientId),
                                        label: c.clientName ?? `Cliente #${c.clientId}`,
                                        value: c.calls,
                                        display: c.calls.toLocaleString('es-CR'),
                                    }))}
                                />
                            </WidgetCard>
                        )}

                        {isAdmin && isOn('queue') && (
                            <WidgetCard icon="⚙" title="Cola de jobs" href={route('admin.queue.index')}>
                                {queueSummary === null ? (
                                    <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Sin datos.</p>
                                ) : (
                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-300">Pendientes</span>
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">{queueSummary.pending}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-300">En ejecución</span>
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">{queueSummary.running}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-600 dark:text-gray-300">Fallidos (24h)</span>
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 font-mono text-xs text-red-800 dark:bg-red-500/10 dark:text-red-400">{queueSummary.failedRecent}</span>
                                        </div>
                                        {queueSummary.oldestPendingSeconds !== null && (
                                            <p className="border-t border-gray-100 pt-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                                                Pendiente más antiguo: hace {Math.round(queueSummary.oldestPendingSeconds / 60)} min
                                            </p>
                                        )}
                                    </div>
                                )}
                            </WidgetCard>
                        )}

                        {isOn('alerts') && (
                            <div className="md:col-span-2 min-[1800px]:col-span-4">
                                <WidgetCard icon="🔔" title="Alertas recientes" href={route('alerts.index')}>
                                    {alertsRecent.length === 0 ? (
                                        <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">Aún no hay alertas registradas.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                                                    <tr>
                                                        <th className="py-1.5 text-left">Hora</th>
                                                        {isAdmin && <th className="py-1.5 text-left">Cliente</th>}
                                                        <th className="py-1.5 text-left">Cuenta</th>
                                                        <th className="py-1.5 text-left">Regla</th>
                                                        <th className="py-1.5 text-right">Llamadas</th>
                                                        <th className="py-1.5 text-right">Segundos</th>
                                                        <th className="py-1.5 text-left">Acción</th>
                                                        <th className="py-1.5 text-left">Revisión</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-200">
                                                    {alertsRecent.map((alert) => (
                                                        <tr key={alert.id}>
                                                            <td className="py-2 font-mono text-xs">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(alert.occurredAt))}</td>
                                                            {isAdmin && <td className="py-2">{alert.clientName ?? '—'}</td>}
                                                            <td className="py-2 font-mono">{alert.account ?? '—'}</td>
                                                            <td className="py-2">{alert.ruleLabel ?? '—'}</td>
                                                            <td className="py-2 text-right">{alert.calls ?? '—'}</td>
                                                            <td className="py-2 text-right">{alert.seconds ?? '—'}</td>
                                                            <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_CHIP[alert.action]}`}>{ACTION_LABEL[alert.action]}</span></td>
                                                            <td className="py-2">{alert.action === 'block' ? <ReviewChip status={alert.reviewStatus} /> : <span className="text-gray-400 dark:text-gray-500">—</span>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </WidgetCard>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            <WidgetPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                available={availableWidgets}
                active={active}
                onToggle={toggleWidget}
            />

            {prefixModal && (
                <PrefixDetailModal
                    clientId={prefixModal.clientId}
                    prefix={prefixModal.prefix}
                    onClose={() => setPrefixModal(null)}
                />
            )}
            {accountModal && (
                <AccountDetailModal
                    clientId={accountModal.clientId}
                    customer={accountModal.customer}
                    account={accountModal.account}
                    onClose={() => setAccountModal(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
