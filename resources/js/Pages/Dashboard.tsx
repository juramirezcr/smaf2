import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

interface PrefixStat {
    client_name: string | null;
    country_code: string | null;
    prefix: string | null;
    calls: number;
    seconds: number;
}

interface DestinationStat {
    customer: string | null;
    country_code: string | null;
    prefix: string | null;
    destination: string | null;
    calls: number;
    seconds: number;
}

interface AccountStat {
    customer: string | null;
    account: string | null;
    calls: number;
    seconds: number;
}

interface DashboardProps {
    period: string;
    prefixStats: PrefixStat[];
    destinationStats: DestinationStat[];
    accountStats: AccountStat[];
    alertCounts: Record<string, number>;
    recentRuns: Array<{
        id: number;
        type: string;
        status: string;
        message: string | null;
        started_at: string;
        finished_at: string | null;
    }>;
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

export default function Dashboard({ period, prefixStats, destinationStats, accountStats, alertCounts, recentRuns }: DashboardProps) {
    const handlePeriodChange = (newPeriod: string) => {
        router.get(route('dashboard'), { period: newPeriod }, { preserveState: true });
    };

    const periodLabels: Record<string, string> = {
        '1h': 'Última hora',
        '6h': 'Últimas 6 horas',
        '24h': 'Últimas 24 horas',
        '7d': 'Últimos 7 días',
        '30d': 'Último mes',
    };

    const header = (
        <div className="flex items-center justify-end">
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
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card color="bg-slate-700" title="Prefijos" icon="🌐" href={route('prefixes.index')}>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                                    <tr>
                                        {prefixStats.some(s => s.client_name) && <th className="px-4 py-2 text-left">Cliente</th>}
                                        <th className="px-4 py-2 text-left">País</th>
                                        <th className="px-4 py-2 text-left">Prefijo</th>
                                        <th className="px-4 py-2 text-right">Llamadas</th>
                                        <th className="px-4 py-2 text-right">Segundos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {prefixStats.length === 0 ? (
                                        <tr><td colSpan={prefixStats.some(s => s.client_name) ? 5 : 4} className="px-4 py-3 text-gray-500">Sin llamadas en este período.</td></tr>
                                    ) : prefixStats.map((row, index) => (
                                        <tr key={index}>
                                            {prefixStats.some(s => s.client_name) && <td className="px-4 py-2">{row.client_name ?? '—'}</td>}
                                            <td className="px-4 py-2">{row.country_code ?? '—'}</td>
                                            <td className="px-4 py-2">{row.prefix ?? '—'}</td>
                                            <td className="px-4 py-2 text-right">{row.calls}</td>
                                            <td className="px-4 py-2 text-right">{row.seconds}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>

                        <Card color="bg-red-700" title="Alertas" icon="⚠️" href={route('alerts.index')}>
                            <div className="flex items-center justify-center gap-8 px-4 py-6 text-lg">
                                <span title="Bloqueadas">🚫 {alertCounts.block ?? 0}</span>
                                <span title="Notificadas">🔔 {alertCounts.notify ?? 0}</span>
                                <span title="Ignoradas">➖ {alertCounts.ignore ?? 0}</span>
                            </div>
                        </Card>

                        <Card color="bg-pink-700" title="Destinos" icon="📞" href={route('destinations.index')}>
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Cliente</th>
                                        <th className="px-4 py-2 text-left">País</th>
                                        <th className="px-4 py-2 text-left">Prefijo</th>
                                        <th className="px-4 py-2 text-left">Destino</th>
                                        <th className="px-4 py-2 text-right">Llamadas</th>
                                        <th className="px-4 py-2 text-right">Segundos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {destinationStats.length === 0 ? (
                                        <tr><td colSpan={6} className="px-4 py-3 text-gray-500">Sin llamadas en este período.</td></tr>
                                    ) : destinationStats.map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-2">{row.customer ?? '—'}</td>
                                            <td className="px-4 py-2">{row.country_code ?? '—'}</td>
                                            <td className="px-4 py-2">{row.prefix ?? '—'}</td>
                                            <td className="px-4 py-2">{row.destination ?? '—'}</td>
                                            <td className="px-4 py-2 text-right">{row.calls}</td>
                                            <td className="px-4 py-2 text-right">{row.seconds}</td>
                                        </tr>
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

                    <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="border-b px-6 py-4 font-semibold text-gray-900">Ejecuciones recientes</div>
                        <div className="divide-y">
                            {recentRuns.length === 0 ? (
                                <p className="p-6 text-sm text-gray-500">Aún no hay ejecuciones registradas.</p>
                            ) : recentRuns.map((run) => (
                                <div key={run.id} className="flex items-center justify-between px-6 py-4 text-sm">
                                    <div>
                                        <p className="font-medium text-gray-900">{run.type}</p>
                                        {run.message && <p className="text-red-600">{run.message}</p>}
                                    </div>
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{run.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
