import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import type { Paginated, PrefixRule } from './types';

interface CallRecord {
    id: number;
    clientName?: string | null;
    account: string;
    customer: string | null;
    origin: string | null;
    destination: string;
    prefix: string | null;
    durationSeconds: number;
    connectedAt: string;
}

interface PrefixRuleShowProps {
    rule: PrefixRule;
    period: '24h' | '7d' | '30d';
    summary: {
        callCount: number;
        durationSeconds: number;
    };
    calls: Paginated<CallRecord>;
}

const periods = [
    { value: '24h', label: '24 horas' },
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
] as const;

function formatDuration(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export default function PrefixRuleShow({
    rule,
    period,
    summary,
    calls,
}: PrefixRuleShowProps) {
    const scope = [
        rule.customer && `Customer: ${rule.customer}`,
        rule.account && `Cuenta: ${rule.account}`,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Link
                            href={route('prefixes.index')}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            ← Reglas de prefijo
                        </Link>
                        <h2 className="mt-1 text-xl font-semibold leading-tight text-gray-800">
                            Prefijo +{rule.prefix}
                        </h2>
                    </div>
                    <Link
                        href={route('prefixes.edit', rule.id)}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                        Editar regla
                    </Link>
                </div>
            }
        >
            <Head title={`Prefijo +${rule.prefix}`} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <section className="bg-white px-6 py-6 shadow-sm sm:rounded-lg">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-3xl font-semibold tracking-tight text-gray-900">
                                        +{rule.prefix}
                                    </span>
                                    {rule.country && (
                                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                                            {rule.country}
                                        </span>
                                    )}
                                    <span
                                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                                            rule.enabled
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {rule.enabled ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                                    {rule.description ?? 'Sin descripción registrada.'}
                                </p>
                                <p className="mt-3 text-sm font-medium text-gray-800">
                                    {rule.isGlobal && (
                                        <span className="mr-2 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                            Regla global · todos los clientes
                                        </span>
                                    )}
                                    {scope || (rule.isGlobal ? 'Todas las cuentas' : 'Todas las cuentas de este cliente')}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Llamadas / hora</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">
                                        {rule.hourlyCallLimit.toLocaleString('es-MX')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Minutos / hora</p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900">
                                        {rule.hourlyMinutesLimit.toLocaleString('es-MX')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Acción configurada</p>
                                    <p className="mt-1 font-semibold text-gray-900">
                                        {rule.action === 'notify' ? 'Notificar' : 'Bloquear'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Última evaluación</p>
                                    <p className="mt-1 font-semibold text-gray-900">
                                        {rule.lastEvaluatedAt
                                            ? formatDate(rule.lastEvaluatedAt)
                                            : 'Aún no evaluada'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white shadow-sm sm:rounded-lg">
                        <div className="border-b border-gray-200 px-6 py-5">
                            <h1 className="text-lg font-semibold text-gray-900">
                                Llamadas que coinciden
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Registros con este prefijo y el alcance de cliente o
                                cuenta configurado.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {periods.map((option) => (
                                    <Link
                                        key={option.value}
                                        href={route('prefixes.show', {
                                            prefix: rule.id,
                                            period: option.value,
                                        })}
                                        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                                            period === option.value
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {option.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="grid border-b border-gray-200 sm:grid-cols-2">
                            <div className="px-6 py-4">
                                <p className="text-sm text-gray-500">
                                    Llamadas en {periods.find((item) => item.value === period)?.label}
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-gray-900">
                                    {summary.callCount.toLocaleString('es-MX')}
                                </p>
                            </div>
                            <div className="border-t border-gray-200 px-6 py-4 sm:border-l sm:border-t-0">
                                <p className="text-sm text-gray-500">
                                    Duración acumulada
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-gray-900">
                                    {formatDuration(summary.durationSeconds)}
                                </p>
                            </div>
                        </div>

                        {calls.data.length === 0 ? (
                            <div className="px-6 py-14 text-center">
                                <h2 className="text-base font-semibold text-gray-900">
                                    No hay llamadas en este período
                                </h2>
                                <p className="mt-2 text-sm text-gray-600">
                                    Cambia el período o espera nuevos registros importados.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                        <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                                            <tr>
                                                <th className="px-6 py-3">Conectada</th>
                                                <th className="px-6 py-3">Destino</th>
                                                {rule.isGlobal && <th className="px-6 py-3">Cliente</th>}
                                                <th className="px-6 py-3">Customer / cuenta</th>
                                                <th className="px-6 py-3">Origen</th>
                                                <th className="px-6 py-3 text-right">Duración</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 text-gray-700">
                                            {calls.data.map((call) => (
                                                <tr key={call.id}>
                                                    <td className="whitespace-nowrap px-6 py-4">
                                                        {formatDate(call.connectedAt)}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                                                        {call.destination}
                                                    </td>
                                                    {rule.isGlobal && (
                                                        <td className="px-6 py-4 text-gray-600">
                                                            {call.clientName ?? '—'}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4">
                                                        <p>{call.customer ?? '—'}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {call.account}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono">
                                                        {call.origin ?? '—'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium">
                                                        {formatDuration(call.durationSeconds)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {calls.last_page > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
                                        {calls.current_page > 1 ? (
                                            <Link
                                                href={route('prefixes.show', {
                                                    prefix: rule.id,
                                                    period,
                                                    page: calls.current_page - 1,
                                                })}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Anterior
                                            </Link>
                                        ) : (
                                            <span />
                                        )}
                                        <p className="text-sm text-gray-600">
                                            Página {calls.current_page} de {calls.last_page}
                                        </p>
                                        {calls.current_page < calls.last_page ? (
                                            <Link
                                                href={route('prefixes.show', {
                                                    prefix: rule.id,
                                                    period,
                                                    page: calls.current_page + 1,
                                                })}
                                                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Siguiente
                                            </Link>
                                        ) : (
                                            <span />
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
