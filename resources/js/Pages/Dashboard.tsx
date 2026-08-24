import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { Fragment, useEffect, useState } from 'react';

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

interface DonutItem {
    label: string;
    value: number;
}

interface CustomerBreakdownItem {
    customer: string | null;
    calls: number;
}

interface DashboardProps {
    period: string;
    isAdmin: boolean;
    prefixCustomerStats: Record<string, CustomerBreakdownItem[]>;
    prefixStats: StatGroup[];
    destinationStats: DestinationGroup[];
    accountStats: AccountGroup[];
    alertCounts: Record<string, number>;
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

    const width = 640;
    const height = 200;
    const padding = 32;
    const maxCalls = Math.max(...buckets.map((bucket) => bucket.calls), 1);
    const stepX = (width - padding * 2) / Math.max(buckets.length - 1, 1);
    const points = buckets.map((bucket, index) => ({
        x: padding + index * stepX,
        y: height - padding - (bucket.calls / maxCalls) * (height - padding * 2),
        ...bucket,
    }));

    const totalCalls = buckets.reduce((sum, bucket) => sum + bucket.calls, 0);
    const totalSeconds = buckets.reduce((sum, bucket) => sum + bucket.seconds, 0);
    const labelEvery = Math.max(1, Math.ceil(points.length / 6));

    return (
        <div>
            <div className="mb-3 flex gap-6 text-sm text-gray-600 dark:text-gray-300">
                <span>Llamadas: <strong className="text-gray-900 dark:text-gray-100">{totalCalls}</strong></span>
                <span>Segundos: <strong className="text-gray-900 dark:text-gray-100">{totalSeconds}</strong></span>
            </div>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const y = height - padding - fraction * (height - padding * 2);

                    return <line key={fraction} x1={padding} x2={width - padding} y1={y} y2={y} className="stroke-gray-100 dark:stroke-gray-700" strokeWidth={1} />;
                })}
                <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" className="stroke-indigo-500" strokeWidth={2} />
                {points.map((p, index) => <circle key={index} cx={p.x} cy={p.y} r={2.5} className="fill-indigo-500" />)}
                {points.map((p, index) => (index % labelEvery === 0 || index === points.length - 1) && (
                    <text key={index} x={p.x} y={height - 6} textAnchor="middle" className="fill-gray-400 text-[9px] dark:fill-gray-500">
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
    const [form, setForm] = useState({ country: '', description: '', hourly_call_limit: 100, hourly_minutes_limit: 60, action: 'notify' as 'notify' | 'block', enabled: true });
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        setLoadingHistory(true);
        axios.get(route('dashboard.prefix-history'), { params: { client_id: clientId, prefix, period } })
            .then((response) => setBuckets(response.data.buckets))
            .finally(() => setLoadingHistory(false));
    }, [clientId, prefix, period]);

    useEffect(() => {
        setLoadingRule(true);
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
        <Modal show onClose={onClose} maxWidth="lg">
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
            .finally(() => setLoadingHistory(false));
    }, [clientId, customer, account, period]);

    return (
        <Modal show onClose={onClose} maxWidth="lg">
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

const DONUT_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#94a3b8'];

function DonutChart({ items }: { items: { label: string; value: number }[] }) {
    const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
    let cumulative = 0;
    const stops = items.map((item, index) => {
        const start = (cumulative / total) * 360;
        cumulative += item.value;
        const end = (cumulative / total) * 360;
        return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}deg ${end}deg`;
    }).join(', ');

    return (
        <div className="flex items-center gap-6 p-4">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
                <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    {total}
                </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                        <span className="truncate text-gray-700 dark:text-gray-300">{item.label}</span>
                        <span className="ml-auto shrink-0 font-medium text-gray-900 dark:text-gray-100">{item.value}</span>
                        <span className="w-10 shrink-0 text-right text-gray-400 dark:text-gray-500">{Math.round((item.value / total) * 100)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Card({ color, title, icon, href, children }: { color: string; title: string; icon: string; href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="block overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
            <div className={`flex items-center justify-center gap-2 px-4 py-3 text-white ${color}`}>
                <span className="text-lg">{icon}</span>
                <span className="font-semibold">{title}</span>
            </div>
            {children}
        </Link>
    );
}

const AUTO_REFRESH_OPTIONS = [
    { value: 0, label: 'Sin auto-actualizar' },
    { value: 60_000, label: 'Cada 1 min' },
    { value: 300_000, label: 'Cada 5 min' },
    { value: 900_000, label: 'Cada 15 min' },
];

export default function Dashboard({ period, isAdmin, prefixCustomerStats, prefixStats, destinationStats, accountStats, alertCounts }: DashboardProps) {
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(60_000);
    const [prefixModal, setPrefixModal] = useState<{ clientId: number; prefix: string } | null>(null);
    const [accountModal, setAccountModal] = useState<{ clientId: number; customer: string | null; account: string } | null>(null);

    const handlePeriodChange = (newPeriod: string) => {
        router.get(route('dashboard'), { period: newPeriod }, { preserveState: true });
    };

    useEffect(() => {
        if (autoRefreshInterval === 0) {
            return;
        }

        const interval = setInterval(() => {
            router.reload({ only: ['prefixStats', 'destinationStats', 'accountStats', 'alertCounts', 'prefixCustomerStats'] });
        }, autoRefreshInterval);

        return () => clearInterval(interval);
    }, [autoRefreshInterval, period]);

    const capWithOthers = (items: DonutItem[], max: number): DonutItem[] => {
        const sorted = [...items].sort((a, b) => b.value - a.value);
        const top = sorted.slice(0, max);
        const restTotal = sorted.slice(max).reduce((sum, item) => sum + item.value, 0);

        return restTotal > 0 ? [...top, { label: 'Otros', value: restTotal }] : top;
    };

    const clientPrefixDonuts = prefixStats.map((group) => ({
        clientName: group.clientName,
        data: capWithOthers(group.items.map((item) => ({ label: item.label ?? '—', value: item.calls })), 5),
    }));

    const topPrefixItems = prefixStats[0]?.items ?? [];
    const prefixDonutData = capWithOthers(
        topPrefixItems.map((item) => ({ label: item.label ?? '—', value: item.calls })),
        6,
    );

    const periodLabels: Record<string, string> = {
        '1h': 'Última hora',
        '6h': 'Últimas 6 horas',
        '24h': 'Últimas 24 horas',
        '7d': 'Últimos 7 días',
        '30d': 'Último mes',
    };

    const header = (
        <div className="flex items-center justify-between gap-2">
            <Link
                href={route('alerts.index')}
                className="flex items-center gap-4 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            >
                <span className="font-semibold text-gray-700 dark:text-gray-300">Alertas (24h):</span>
                <span title="Bloqueadas">🚫 {alertCounts.block ?? 0}</span>
                <span title="Notificadas">🔔 {alertCounts.notify ?? 0}</span>
                <span title="Ignoradas">➖ {alertCounts.ignore ?? 0}</span>
            </Link>
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
            </div>
        </div>
    );

    return (
        <AuthenticatedLayout header={header}>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 2xl:max-w-none 2xl:px-10">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Card color="bg-slate-700" title="Prefijos" icon="🌐" href={route('prefixes.index')}>
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Prefijo</th>
                                        <th className="px-4 py-2 text-right">Llamadas/Minutos</th>
                                        <th className="px-4 py-2 text-right">Histórico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                    {prefixStats.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-3 text-gray-500 dark:text-gray-400">Sin llamadas en este período.</td></tr>
                                    ) : prefixStats.map((group, groupIndex) => (
                                        <Fragment key={groupIndex}>
                                            {group.clientName && (
                                                <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                    <td colSpan={3} className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{group.clientName}</td>
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
                                                    <td className="px-4 py-2 font-mono">{item.label ?? '—'}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <CallsMinutesBadge calls={item.calls} seconds={item.seconds} alerted={item.alerted} />
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-indigo-400"><Sparkline data={item.history} /></td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </Card>

                        <Card
                            color="bg-slate-500"
                            title={isAdmin ? 'Distribución de Prefijos por Cliente' : 'Distribución por Prefijo'}
                            icon="📊"
                            href={route(isAdmin ? 'admin.clients.index' : 'prefixes.index')}
                        >
                            {isAdmin ? (
                                clientPrefixDonuts.length === 0 ? (
                                    <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Sin llamadas en este período.</p>
                                ) : (
                                    <div className="divide-y dark:divide-gray-700">
                                        {clientPrefixDonuts.map((client, index) => (
                                            <div key={index} className="px-4 py-3">
                                                <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{client.clientName}</p>
                                                {client.data.length === 0 ? (
                                                    <p className="text-sm text-gray-400 dark:text-gray-500">Sin llamadas en este período.</p>
                                                ) : (
                                                    <DonutChart items={client.data} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : prefixDonutData.length === 0 ? (
                                <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Sin llamadas en este período.</p>
                            ) : (
                                <>
                                    <DonutChart items={prefixDonutData} />
                                    <div className="space-y-3 border-t px-4 py-3 dark:border-gray-700">
                                        <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Customers por prefijo</p>
                                        {topPrefixItems.map((item, index) => {
                                            const customers = item.label ? prefixCustomerStats[item.label] ?? [] : [];

                                            return (
                                                <div key={index} className="text-xs">
                                                    <p className="font-mono font-semibold text-gray-700 dark:text-gray-300">{item.label ?? '—'}</p>
                                                    {customers.length === 0 ? (
                                                        <p className="text-gray-400 dark:text-gray-500">Sin datos de customer.</p>
                                                    ) : (
                                                        <ul className="ml-2 space-y-0.5">
                                                            {customers.map((c, cIndex) => (
                                                                <li key={cIndex} className="flex justify-between text-gray-600 dark:text-gray-300">
                                                                    <span className="truncate">{c.customer ?? '—'}</span>
                                                                    <span className="ml-2 shrink-0 font-medium">{c.calls}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </Card>

                        <Card color="bg-pink-700" title="Destinos (Top 10)" icon="📞" href={route('destinations.index')}>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Prefijo</th>
                                        <th className="px-4 py-2 text-left">Destino</th>
                                        <th className="px-4 py-2 text-right">Llamadas</th>
                                        <th className="px-4 py-2 text-right">Histórico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                    {destinationStats.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-3 text-gray-500 dark:text-gray-400">Sin llamadas en este período.</td></tr>
                                    ) : destinationStats.map((group, groupIndex) => (
                                        <Fragment key={groupIndex}>
                                            {group.clientName && (
                                                <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                    <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{group.clientName}</td>
                                                </tr>
                                            )}
                                            {group.items.map((item, itemIndex) => (
                                                <tr key={itemIndex}>
                                                    <td className="px-4 py-2">{item.prefix ?? '—'}</td>
                                                    <td className="px-4 py-2">{item.destination ?? '—'}</td>
                                                    <td className="px-4 py-2 text-right">{item.calls}</td>
                                                    <td className="px-4 py-2 text-right text-indigo-400"><Sparkline data={item.history} /></td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </Card>

                        <Card color="bg-purple-700" title="Cuentas" icon="👥" href={route('accounts.index')}>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        {isAdmin && <th className="px-4 py-2 text-left">Customer</th>}
                                        <th className="px-4 py-2 text-left">Cuenta</th>
                                        <th className="px-4 py-2 text-right">Llamadas/Minutos</th>
                                        <th className="px-4 py-2 text-right">Histórico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 dark:text-gray-100">
                                    {accountStats.length === 0 ? (
                                        <tr><td colSpan={isAdmin ? 4 : 3} className="px-4 py-3 text-gray-500 dark:text-gray-400">Sin llamadas en este período.</td></tr>
                                    ) : accountStats.map((group, groupIndex) => (
                                        <Fragment key={groupIndex}>
                                            {group.clientName && (
                                                <tr className="bg-gray-50 dark:bg-gray-900/40">
                                                    <td colSpan={isAdmin ? 4 : 3} className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">{group.clientName}</td>
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
                                                    {isAdmin && <td className="px-4 py-2">{item.customer ?? '—'}</td>}
                                                    <td className="px-4 py-2">{item.account ?? '—'}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <CallsMinutesBadge calls={item.calls} seconds={item.seconds} alerted={item.alerted} />
                                                    </td>
                                                    <td className="px-4 py-2 text-right text-indigo-400"><Sparkline data={item.history} /></td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                </div>
            </div>

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
