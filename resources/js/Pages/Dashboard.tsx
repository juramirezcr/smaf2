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

interface DashboardProps {
    period: string;
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

export default function Dashboard({ period, prefixStats, destinationStats, accountStats, alertCounts }: DashboardProps) {
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(300_000);

    const handlePeriodChange = (newPeriod: string) => {
        router.get(route('dashboard'), { period: newPeriod }, { preserveState: true });
    };

    useEffect(() => {
        if (autoRefreshInterval === 0) {
            return;
        }

        const interval = setInterval(() => {
            router.reload({ only: ['prefixStats', 'destinationStats', 'accountStats', 'alertCounts'] });
        }, autoRefreshInterval);

        return () => clearInterval(interval);
    }, [autoRefreshInterval, period]);

    const periodLabels: Record<string, string> = {
        '1h': 'Última hora',
        '6h': 'Últimas 6 horas',
        '24h': 'Últimas 24 horas',
        '7d': 'Últimos 7 días',
        '30d': 'Último mes',
    };

    const header = (
        <div className="flex items-center justify-end gap-2">
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
    );

    return (
        <AuthenticatedLayout header={header}>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Link
                        href={route('alerts.index')}
                        className="mb-4 flex items-center gap-6 rounded-lg bg-white px-4 py-3 text-sm shadow-sm hover:bg-gray-50"
                    >
                        <span className="font-semibold text-gray-700">Alertas (24h):</span>
                        <span title="Bloqueadas">🚫 {alertCounts.block ?? 0}</span>
                        <span title="Notificadas">🔔 {alertCounts.notify ?? 0}</span>
                        <span title="Ignoradas">➖ {alertCounts.ignore ?? 0}</span>
                    </Link>

                    <div className="mb-4">
                        <Card color="bg-slate-700" title="Prefijos" icon="🌐" href={route('prefixes.index')}>
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
