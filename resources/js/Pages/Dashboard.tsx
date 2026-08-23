import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';

interface StatItem {
    label: string;
    calls: number;
    seconds: number;
    history: number[];
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

interface AccountStat {
    customer: string | null;
    account: string | null;
    calls: number;
    seconds: number;
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
    accountStats: AccountStat[];
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
                <div className="absolute inset-3 flex items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-500">
                    {total}
                </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                {items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                        <span className="truncate text-gray-700">{item.label}</span>
                        <span className="ml-auto shrink-0 font-medium text-gray-900">{item.value}</span>
                        <span className="w-10 shrink-0 text-right text-gray-400">{Math.round((item.value / total) * 100)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Card({ color, title, icon, href, children }: { color: string; title: string; icon: string; href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="block overflow-hidden rounded-lg bg-white shadow-sm">
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
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(300_000);

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
                className="flex items-center gap-4 rounded-md px-3 py-1.5 text-sm hover:bg-gray-50"
            >
                <span className="font-semibold text-gray-700">Alertas (24h):</span>
                <span title="Bloqueadas">🚫 {alertCounts.block ?? 0}</span>
                <span title="Notificadas">🔔 {alertCounts.notify ?? 0}</span>
                <span title="Ignoradas">➖ {alertCounts.ignore ?? 0}</span>
            </Link>
            <div className="flex items-center gap-2">
            <select
                value={autoRefreshInterval}
                onChange={(event) => setAutoRefreshInterval(Number(event.target.value))}
                className="rounded-md border-gray-300 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
                {AUTO_REFRESH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
            <select
                value={period}
                onChange={(event) => handlePeriodChange(event.target.value)}
                className="rounded-md border-gray-300 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-4 grid gap-4 md:grid-cols-2">
                        <Card color="bg-slate-700" title="Prefijos" icon="🌐" href={route('prefixes.index')}>
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Prefijo</th>
                                        <th className="px-4 py-2 text-right">Llamadas</th>
                                        <th className="px-4 py-2 text-right">Segundos</th>
                                        <th className="px-4 py-2 text-right">Histórico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {prefixStats.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-3 text-gray-500">Sin llamadas en este período.</td></tr>
                                    ) : prefixStats.map((group, groupIndex) => (
                                        <Fragment key={groupIndex}>
                                            {group.clientName && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-gray-600">{group.clientName}</td>
                                                </tr>
                                            )}
                                            {group.items.map((item, itemIndex) => (
                                                <tr key={itemIndex}>
                                                    <td className="px-4 py-2 font-mono">{item.label ?? '—'}</td>
                                                    <td className="px-4 py-2 text-right">{item.calls}</td>
                                                    <td className="px-4 py-2 text-right">{item.seconds}</td>
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
                                    <p className="p-6 text-sm text-gray-500">Sin llamadas en este período.</p>
                                ) : (
                                    <div className="divide-y">
                                        {clientPrefixDonuts.map((client, index) => (
                                            <div key={index} className="px-4 py-3">
                                                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{client.clientName}</p>
                                                {client.data.length === 0 ? (
                                                    <p className="text-sm text-gray-400">Sin llamadas en este período.</p>
                                                ) : (
                                                    <DonutChart items={client.data} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : prefixDonutData.length === 0 ? (
                                <p className="p-6 text-sm text-gray-500">Sin llamadas en este período.</p>
                            ) : (
                                <>
                                    <DonutChart items={prefixDonutData} />
                                    <div className="space-y-3 border-t px-4 py-3">
                                        <p className="text-xs font-semibold uppercase text-gray-500">Customers por prefijo</p>
                                        {topPrefixItems.map((item, index) => {
                                            const customers = item.label ? prefixCustomerStats[item.label] ?? [] : [];

                                            return (
                                                <div key={index} className="text-xs">
                                                    <p className="font-mono font-semibold text-gray-700">{item.label ?? '—'}</p>
                                                    {customers.length === 0 ? (
                                                        <p className="text-gray-400">Sin datos de customer.</p>
                                                    ) : (
                                                        <ul className="ml-2 space-y-0.5">
                                                            {customers.map((c, cIndex) => (
                                                                <li key={cIndex} className="flex justify-between text-gray-600">
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
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card color="bg-pink-700" title="Destinos (Top 10)" icon="📞" href={route('destinations.index')}>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Prefijo</th>
                                        <th className="px-4 py-2 text-left">Destino</th>
                                        <th className="px-4 py-2 text-right">Llamadas</th>
                                        <th className="px-4 py-2 text-right">Histórico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {destinationStats.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-3 text-gray-500">Sin llamadas en este período.</td></tr>
                                    ) : destinationStats.map((group, groupIndex) => (
                                        <Fragment key={groupIndex}>
                                            {group.clientName && (
                                                <tr className="bg-gray-50">
                                                    <td colSpan={4} className="px-4 py-1.5 text-xs font-semibold text-gray-600">{group.clientName}</td>
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
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Cliente</th>
                                        <th className="px-4 py-2 text-left">Cuenta</th>
                                        <th className="px-4 py-2 text-right">Llamadas</th>
                                        <th className="px-4 py-2 text-right">Segundos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {accountStats.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-3 text-gray-500">Sin llamadas en este período.</td></tr>
                                    ) : accountStats.map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-2">{row.customer ?? '—'}</td>
                                            <td className="px-4 py-2">{row.account ?? '—'}</td>
                                            <td className="px-4 py-2 text-right">{row.calls}</td>
                                            <td className="px-4 py-2 text-right">{row.seconds}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
