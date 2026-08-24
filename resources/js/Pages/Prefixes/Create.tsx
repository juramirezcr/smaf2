import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import RuleForm from './Partials/RuleForm';

interface ClientOption {
    id: number;
    name: string;
}

interface CreatePrefixRuleProps {
    clients?: ClientOption[] | null;
    selectedClientId?: number | null;
}

export default function CreatePrefixRule({ clients, selectedClientId }: CreatePrefixRuleProps) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">
                        Nueva regla de prefijo
                    </h2>
                    <Link
                        href={route('prefixes.index')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        Volver a prefijos
                    </Link>
                </div>
            }
        >
            <Head title="Nueva regla de prefijo" />
            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="bg-white px-6 py-7 shadow-sm sm:rounded-lg dark:bg-gray-800">
                        <div className="border-b border-gray-200 pb-6 dark:border-gray-700">
                            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                Define el alcance y los umbrales
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                La regla es propiedad de tu usuario y puede limitarse
                                a un cliente o cuenta antes de que el motor de
                                monitoreo la evalúe.
                            </p>
                        </div>
                        <div className="pt-6">
                            <RuleForm clients={clients} initialClientId={selectedClientId} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
