import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface ClientItem {
    id: number;
    name: string;
    portaoneEnvironment: string;
    portaoneUsername: string;
    usersCount: number;
    createdAt: string;
}

export default function Clients({ clients }: { clients: ClientItem[] }) {
    const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        portaone_environment: '',
        portaone_username: '',
        portaone_token: '',
        admin_name: '',
        admin_username: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                reset();
                setEditingClient(null);
            },
        };

        if (editingClient) {
            patch(route('admin.clients.update', editingClient.id), options);

            return;
        }

        post(route('admin.clients.store'), options);
    };

    const startEditing = (client: ClientItem) => {
        setEditingClient(client);
        setData({
            name: client.name,
            portaone_environment: client.portaoneEnvironment,
            portaone_username: client.portaoneUsername,
            portaone_token: '',
            admin_name: '',
            admin_username: '',
            admin_email: '',
            admin_password: '',
            admin_password_confirmation: '',
        });
    };

    const cancelEditing = () => {
        reset();
        setEditingClient(null);
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Clientes</h2>}>
            <Head title="Clientes" />
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow lg:col-span-1">
                    <h3 className="text-lg font-medium text-gray-900">{editingClient ? `Editar ${editingClient.name}` : 'Crear cliente'}</h3>

                    <div className="mt-4">
                        <InputLabel htmlFor="name" value="Nombre del cliente" />
                        <TextInput id="name" value={data.name} className="mt-1 block w-full" onChange={(event) => setData('name', event.target.value)} required />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="portaone_environment" value="Partición / entorno PortaOne" />
                        <TextInput id="portaone_environment" value={data.portaone_environment} className="mt-1 block w-full" onChange={(event) => setData('portaone_environment', event.target.value)} required />
                        <InputError message={errors.portaone_environment} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="portaone_username" value="Usuario API" />
                        <TextInput id="portaone_username" value={data.portaone_username} className="mt-1 block w-full" onChange={(event) => setData('portaone_username', event.target.value)} required />
                        <InputError message={errors.portaone_username} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="portaone_token" value={editingClient ? 'Nueva clave API (dejar en blanco para no cambiarla)' : 'Clave API'} />
                        <TextInput id="portaone_token" type="password" value={data.portaone_token} className="mt-1 block w-full" onChange={(event) => setData('portaone_token', event.target.value)} required={!editingClient} />
                        <InputError message={errors.portaone_token} className="mt-2" />
                    </div>

                    {!editingClient && (
                        <>
                            <h4 className="mt-6 text-sm font-semibold text-gray-700">Administrador inicial del cliente</h4>
                            <div className="mt-4">
                                <InputLabel htmlFor="admin_name" value="Nombre" />
                                <TextInput id="admin_name" value={data.admin_name} className="mt-1 block w-full" onChange={(event) => setData('admin_name', event.target.value)} required />
                                <InputError message={errors.admin_name} className="mt-2" />
                            </div>
                            <div className="mt-4">
                                <InputLabel htmlFor="admin_username" value="Usuario" />
                                <TextInput id="admin_username" value={data.admin_username} className="mt-1 block w-full" onChange={(event) => setData('admin_username', event.target.value)} required />
                                <InputError message={errors.admin_username} className="mt-2" />
                            </div>
                            <div className="mt-4">
                                <InputLabel htmlFor="admin_email" value="Correo electrónico" />
                                <TextInput id="admin_email" type="email" value={data.admin_email} className="mt-1 block w-full" onChange={(event) => setData('admin_email', event.target.value)} required />
                                <InputError message={errors.admin_email} className="mt-2" />
                            </div>
                            <div className="mt-4">
                                <InputLabel htmlFor="admin_password" value="Contraseña" />
                                <TextInput id="admin_password" type="password" value={data.admin_password} className="mt-1 block w-full" onChange={(event) => setData('admin_password', event.target.value)} required />
                                <InputError message={errors.admin_password} className="mt-2" />
                            </div>
                            <div className="mt-4">
                                <InputLabel htmlFor="admin_password_confirmation" value="Confirmar contraseña" />
                                <TextInput id="admin_password_confirmation" type="password" value={data.admin_password_confirmation} className="mt-1 block w-full" onChange={(event) => setData('admin_password_confirmation', event.target.value)} required />
                            </div>
                        </>
                    )}

                    <div className="mt-6 flex gap-3">
                        <PrimaryButton disabled={processing}>{editingClient ? 'Guardar cambios' : 'Crear cliente'}</PrimaryButton>
                        {editingClient && <button type="button" onClick={cancelEditing} className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>}
                    </div>
                </form>

                <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Partición</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuario API</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuarios</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {clients.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-4 text-sm text-gray-500">Aún no hay clientes.</td></tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{client.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{client.portaoneEnvironment}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{client.portaoneUsername}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{client.usersCount}</td>
                                        <td className="px-6 py-4 text-right"><button type="button" onClick={() => startEditing(client)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">Editar</button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
