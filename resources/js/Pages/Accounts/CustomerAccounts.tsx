import Pagination from '@/Components/Pagination';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { billStatusLabel } from '@/utils/billStatus';
import { Head, Link } from '@inertiajs/react';

interface AccountRow {
    id: number;
    account_id: string | null;
    product_name: string | null;
    bill_status: string | null;
    blocked: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface CustomerInfo {
    id: number;
    name: string | null;
    company_name: string | null;
    email: string | null;
    bill_status: string | null;
}

interface CustomerAccountsProps {
    customer: CustomerInfo;
    accounts: {
        data: AccountRow[];
        links: PaginationLink[];
    };
    indexPath: string;
}

export default function CustomerAccounts({ customer, accounts, indexPath }: CustomerAccountsProps) {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">{customer.name ?? 'Customer'}</h2>}>
            <Head title={customer.name ?? 'Customer'} />
            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Link href={indexPath} className="mb-4 inline-block text-sm text-indigo-600 hover:text-indigo-900">
                        &larr; Volver a Customers
                    </Link>

                    <div className="mb-6 rounded-lg bg-white p-4 shadow-sm text-sm text-gray-600">
                        <p><span className="font-medium text-gray-900">Empresa:</span> {customer.company_name ?? '—'}</p>
                        <p><span className="font-medium text-gray-900">Email:</span> {customer.email ?? '—'}</p>
                        <p><span className="font-medium text-gray-900">Estado:</span> {billStatusLabel(customer.bill_status)}</p>
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Account</th>
                                    <th className="px-6 py-3">Producto</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3">Bloqueada</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {accounts.data.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-4 text-gray-500">Este customer no tiene accounts de telefonía sincronizadas.</td></tr>
                                ) : accounts.data.map((account) => (
                                    <tr key={account.id}>
                                        <td className="px-6 py-4">{account.account_id ?? '—'}</td>
                                        <td className="px-6 py-4">{account.product_name ?? '—'}</td>
                                        <td className="px-6 py-4">{billStatusLabel(account.bill_status)}</td>
                                        <td className="px-6 py-4">{account.blocked ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination links={accounts.links} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
