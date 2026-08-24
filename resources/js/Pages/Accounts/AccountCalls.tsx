import BillStatusBadge from '@/Components/BillStatusBadge';
import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface ActiveCall {
    id: number;
    cli: string | null;
    cld: string | null;
    country: string | null;
    connect_time: string | null;
    duration_seconds: number;
}

interface CallRow {
    id: number;
    origin: string | null;
    destination: string | null;
    countryCode: string | null;
    prefix: string | null;
    durationSeconds: number;
    chargedAmount: string | null;
    connectedAt: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface AccountInfo {
    id: number;
    account_id: string | null;
    product_name: string | null;
    bill_status: string | null;
}

interface AccountCallsProps {
    account: AccountInfo;
    activeCalls: ActiveCall[];
    calls: {
        data: CallRow[];
        links: PaginationLink[];
    };
    indexPath: string;
}

export default function AccountCalls({ account, activeCalls, calls, indexPath }: AccountCallsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Account {account.account_id ?? account.id}</h2>}>
            <Head title={`Account ${account.account_id ?? account.id}`} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Link href={indexPath} className="mb-4 inline-block text-sm text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                        &larr; Volver a Customer
                    </Link>

                    <div className="mb-6 rounded-lg bg-white p-4 shadow-sm text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        <p><span className="font-medium text-gray-900 dark:text-gray-100">Producto:</span> {account.product_name ?? '—'}</p>
                        <p className="flex items-center gap-2"><span className="font-medium text-gray-900 dark:text-gray-100">Estado:</span> <BillStatusBadge status={account.bill_status} /></p>
                    </div>

                    {activeCalls.length > 0 && (
                        <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-emerald-200 dark:bg-gray-800 dark:ring-emerald-800">
                            <div className="border-b bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800 dark:border-gray-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                Llamadas activas ({activeCalls.length})
                            </div>
                            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                                <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Desde</th>
                                        <th className="px-6 py-3">Hacia</th>
                                        <th className="px-6 py-3">País</th>
                                        <th className="px-6 py-3">Conectada</th>
                                        <th className="px-6 py-3 text-right">Segundos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {activeCalls.map((call) => (
                                        <tr key={call.id} className="dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 dark:text-gray-300">{call.cli ?? '—'}</td>
                                            <td className="px-6 py-4 dark:text-gray-300">{call.cld ?? '—'}</td>
                                            <td className="px-6 py-4 dark:text-gray-300">{call.country ?? '—'}</td>
                                            <td className="px-6 py-4 dark:text-gray-300">{call.connect_time ? new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connect_time)) : '—'}</td>
                                            <td className="px-6 py-4 text-right dark:text-gray-300">{call.duration_seconds}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                        <div className="border-b px-6 py-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
                            Historial de llamadas (XDR)
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Origen</th>
                                    <th className="px-6 py-3">Destino</th>
                                    <th className="px-6 py-3">País</th>
                                    <th className="px-6 py-3">Prefijo</th>
                                    <th className="px-6 py-3 text-right">Segundos</th>
                                    <th className="px-6 py-3 text-right">Cargo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {calls.data.length === 0 ? (
                                    <tr><td colSpan={7} className="px-6 py-4 text-gray-500 dark:text-gray-400">Aún no hay llamadas sincronizadas para esta account.</td></tr>
                                ) : calls.data.map((call) => (
                                    <tr key={call.id} className="dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 dark:text-gray-300">{new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(call.connectedAt))}</td>
                                        <td className="px-6 py-4 dark:text-gray-300">{call.origin ?? '—'}</td>
                                        <td className="px-6 py-4 dark:text-gray-300">{call.destination ?? '—'}</td>
                                        <td className="px-6 py-4 dark:text-gray-300">{call.countryCode ?? '—'}</td>
                                        <td className="px-6 py-4 dark:text-gray-300">{call.prefix ?? '—'}</td>
                                        <td className="px-6 py-4 text-right dark:text-gray-300">{call.durationSeconds}</td>
                                        <td className="px-6 py-4 text-right dark:text-gray-300">{call.chargedAmount ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={calls.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
