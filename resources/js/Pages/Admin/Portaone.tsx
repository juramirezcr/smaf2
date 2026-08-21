import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Portaone({ baseUrl }: { baseUrl: string | null }) {
    const { data, setData, patch, processing, errors } = useForm({ base_url: baseUrl ?? '' });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        patch(route('admin.portaone.update'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">PortaOne</h2>}>
            <Head title="PortaOne" />
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow">
                    <h3 className="text-lg font-medium text-gray-900">Conexión SOAP</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Dirección raíz del servidor PortaOne (sin rutas adicionales), compartida por todos los
                        clientes. Los WSDL se leen de <code>/wsdl/</code> bajo esta URL. El usuario API, la clave
                        API y la partición (entorno) de cada cliente se configuran en la pantalla de Clientes.
                    </p>
                    <div className="mt-4">
                        <InputLabel htmlFor="base_url" value="URL de conexión" />
                        <TextInput
                            id="base_url"
                            value={data.base_url}
                            className="mt-1 block w-full"
                            placeholder="https://clientes.rhitcr.com"
                            onChange={(event) => setData('base_url', event.target.value)}
                            required
                        />
                        <InputError message={errors.base_url} className="mt-2" />
                    </div>
                    <div className="mt-6">
                        <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
