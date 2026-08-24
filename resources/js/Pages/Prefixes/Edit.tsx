import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RuleForm from './Partials/RuleForm';
import type { PrefixRule } from './types';

export default function EditPrefixRule({ rule }: { rule: PrefixRule }) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                        Editar regla +{rule.prefix}
                    </h2>
                    <Link
                        href={route('prefixes.show', rule.id)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Ver detalle
                    </Link>
                </div>
            }
        >
            <Head title={`Editar prefijo +${rule.prefix}`} />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white px-6 py-7 shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="border-b border-gray-200 pb-6 dark:border-gray-700">
                            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                Actualiza la regla
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                Los cambios se aplicarán a las próximas evaluaciones;
                                no ejecutan acciones externas.
                            </p>
                        </div>
                        <div className="pt-6">
                            <RuleForm rule={rule} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
