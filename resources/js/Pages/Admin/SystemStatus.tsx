import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

interface Snapshot {
    recordedAt: string;
    cpuCores: number | null;
    cpuLoad1m: number | null;
    cpuLoad5m: number | null;
    cpuLoad15m: number | null;
    memTotalMb: number | null;
    memUsedMb: number | null;
    diskTotalGb: number | null;
    diskUsedGb: number | null;
}

interface HistoryPoint {
    recordedAt: string;
    cpuPct: number | null;
    memPct: number | null;
    diskPct: number | null;
}

interface SystemStatusProps {
    period: string;
    latest: Snapshot | null;
    history: HistoryPoint[];
}

const PERIOD_LABELS: Record<string, string> = {
    '1h': 'Última hora',
    '6h': 'Últimas 6 horas',
    '24h': 'Últimas 24 horas',
    '7d': 'Últimos 7 días',
    '30d': 'Último mes',
};

function pctColor(pct: number): string {
    if (pct >= 85) return 'text-red-600 dark:text-red-400';
    if (pct >= 65) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
}

function pctStroke(pct: number): string {
    if (pct >= 85) return 'stroke-red-500';
    if (pct >= 65) return 'stroke-amber-500';
    return 'stroke-emerald-500';
}

function LineChart({ title, unit, points, current, detail }: {
    title: string;
    unit: string;
    points: (number | null)[];
    current: number | null;
    detail: string | null;
}) {
    const width = 640;
    const height = 140;
    const padding = 8;
    const values = points.filter((v): v is number => v !== null);

    const body = values.length < 2 ? (
        <div className="flex h-[140px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            Aún no hay suficientes muestras para graficar.
        </div>
    ) : (
        (() => {
            const step = (width - padding * 2) / Math.max(points.length - 1, 1);
            const usable = points.map((v, i) => (v === null ? null : { x: padding + i * step, y: height - padding - (v / 100) * (height - padding * 2) }));

            const segments: { x: number; y: number }[][] = [];
            let current_: { x: number; y: number }[] = [];
            usable.forEach((p) => {
                if (p === null) {
                    if (current_.length > 1) segments.push(current_);
                    current_ = [];
                } else {
                    current_.push(p);
                }
            });
            if (current_.length > 1) segments.push(current_);

            const strokeClass = current !== null ? pctStroke(current) : 'stroke-indigo-400';

            return (
                <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    {[0, 25, 50, 75, 100].map((gridPct) => {
                        const y = height - padding - (gridPct / 100) * (height - padding * 2);

                        return (
                            <g key={gridPct}>
                                <line x1={padding} x2={width - padding} y1={y} y2={y} className="stroke-gray-100 dark:stroke-gray-700" strokeWidth={1} />
                                <text x={0} y={y + 3} className="fill-gray-400 text-[9px] dark:fill-gray-500">{gridPct}</text>
                            </g>
                        );
                    })}
                    {segments.map((segment, index) => (
                        <polyline
                            key={index}
                            points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            className={strokeClass}
                            strokeWidth={2}
                        />
                    ))}
                </svg>
            );
        })()
    );

    return (
        <div className="rounded-lg bg-white p-5 shadow-sm dark:bg-gray-800">
            <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                <div className="text-right">
                    <span className={`text-2xl font-bold ${current !== null ? pctColor(current) : 'text-gray-400 dark:text-gray-500'}`}>
                        {current !== null ? `${current}${unit}` : '—'}
                    </span>
                    {detail && <p className="text-xs text-gray-400 dark:text-gray-500">{detail}</p>}
                </div>
            </div>
            <div className="mt-3">{body}</div>
        </div>
    );
}

export default function SystemStatus({ period, latest, history }: SystemStatusProps) {
    const handlePeriodChange = (value: string) => {
        router.get(route('admin.status.index'), { period: value }, { preserveState: true, replace: true });
    };

    const cpuPct = latest?.cpuLoad1m !== null && latest?.cpuLoad1m !== undefined && latest?.cpuCores
        ? Math.min(100, Math.round((latest.cpuLoad1m / latest.cpuCores) * 1000) / 10)
        : null;
    const memPct = latest?.memUsedMb !== null && latest?.memUsedMb !== undefined && latest?.memTotalMb
        ? Math.round((latest.memUsedMb / latest.memTotalMb) * 1000) / 10
        : null;
    const diskPct = latest?.diskUsedGb !== null && latest?.diskUsedGb !== undefined && latest?.diskTotalGb
        ? Math.round((latest.diskUsedGb / latest.diskTotalGb) * 1000) / 10
        : null;

    const header = (
        <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Estado del servidor</h2>
            <select
                value={period}
                onChange={(event) => handlePeriodChange(event.target.value)}
                className="rounded-md border-gray-300 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                ))}
            </select>
        </div>
    );

    return (
        <AuthenticatedLayout header={header}>
            <Head title="Estado del servidor" />
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Histórico de uso de CPU, RAM y disco del servidor (una muestra cada 5 minutos), para decidir si
                    hay margen para asignar más workers de la cola de jobs.
                </p>

                {!latest ? (
                    <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                        Aún no se ha registrado ninguna muestra. La tarea programada corre cada 5 minutos; vuelve a
                        entrar en un momento.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <LineChart
                            title="CPU"
                            unit="%"
                            points={history.map((h) => h.cpuPct)}
                            current={cpuPct}
                            detail={
                                latest.cpuCores
                                    ? `Carga (1/5/15 min): ${latest.cpuLoad1m?.toFixed(2) ?? '—'} / ${latest.cpuLoad5m?.toFixed(2) ?? '—'} / ${latest.cpuLoad15m?.toFixed(2) ?? '—'} · ${latest.cpuCores} núcleos`
                                    : null
                            }
                        />
                        <LineChart
                            title="RAM"
                            unit="%"
                            points={history.map((h) => h.memPct)}
                            current={memPct}
                            detail={
                                latest.memTotalMb
                                    ? `${(latest.memUsedMb! / 1024).toFixed(1)} GB usados de ${(latest.memTotalMb / 1024).toFixed(1)} GB`
                                    : null
                            }
                        />
                        <LineChart
                            title="Disco"
                            unit="%"
                            points={history.map((h) => h.diskPct)}
                            current={diskPct}
                            detail={
                                latest.diskTotalGb
                                    ? `${latest.diskUsedGb?.toFixed(1)} GB usados de ${latest.diskTotalGb.toFixed(1)} GB`
                                    : null
                            }
                        />
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
