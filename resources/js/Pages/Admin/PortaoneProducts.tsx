import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ProductItem {
    id: number;
    i_product: number;
    name: string;
    end_user_name: string | null;
    is_telephony: boolean;
    synced_at: string | null;
}

export default function PortaoneProducts({ client, products }: { client: { id: number; name: string }; products: ProductItem[] }) {
    const pageErrors = usePage().props.errors as Record<string, string>;
    const [selected, setSelected] = useState<Set<number>>(new Set(products.filter((p) => p.is_telephony).map((p) => p.id)));
    const { processing } = useForm();
    const [refreshing, setRefreshing] = useState(false);

    const toggle = (id: number) => {
        setSelected((previous) => {
            const next = new Set(previous);
            next.has(id) ? next.delete(id) : next.add(id);

            return next;
        });
    };

    const save: FormEventHandler = (event) => {
        event.preventDefault();
        router.patch(route('admin.clients.products.update', client.id), { telephony_ids: Array.from(selected) });
    };

    const refresh = () => {
        setRefreshing(true);
        router.post(route('admin.clients.products.refresh', client.id), {}, { onFinish: () => setRefreshing(false) });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Productos PortaOne — {client.name}</h2>}>
            <Head title={`Productos — ${client.name}`} />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    {pageErrors?.products && (
                        <p className="mb-4 rounded bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">{pageErrors.products}</p>
                    )}
                    <form onSubmit={save} className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Marca los productos de telefonía (voz/VoIP)</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Solo las accounts de los productos marcados se sincronizan como cuentas de servicio.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={refresh}
                                disabled={refreshing}
                                className="shrink-0 rounded-md border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {refreshing ? 'Actualizando...' : 'Actualizar desde PortaOne'}
                            </button>
                        </div>

                        {products.length === 0 ? (
                            <p className="mt-6 text-gray-600 dark:text-gray-300">
                                Aún no hay productos. Haz clic en "Actualizar desde PortaOne" para traerlos.
                            </p>
                        ) : (
                            <ul className="mt-6 divide-y divide-gray-200 dark:divide-gray-700">
                                {products.map((product) => (
                                    <li key={product.id} className="flex items-center gap-3 py-3">
                                        <input
                                            type="checkbox"
                                            id={`product-${product.id}`}
                                            checked={selected.has(product.id)}
                                            onChange={() => toggle(product.id)}
                                            className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <label htmlFor={`product-${product.id}`} className="flex-1">
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                                            {product.end_user_name && <span className="ms-2 text-sm text-gray-500 dark:text-gray-400">({product.end_user_name})</span>}
                                        </label>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">#{product.i_product}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {products.length > 0 && (
                            <div className="mt-6">
                                <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
