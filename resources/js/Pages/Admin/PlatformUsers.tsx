import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface PlatformUser {
    id: number;
    name: string;
    username: string;
    email: string;
    createdAt: string;
}

export default function PlatformUsers({ users }: { users: PlatformUser[] }) {
    const pageErrors = usePage().props.errors as Record<string, string>;
    const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                reset();
                setEditingUser(null);
            },
        };

        if (editingUser) {
            patch(route('admin.platform-users.update', editingUser.id), options);

            return;
        }

        post(route('admin.platform-users.store'), options);
    };

    const startEditing = (user: PlatformUser) => {
        setEditingUser(user);
        setData({ name: user.name, username: user.username, email: user.email, password: '', password_confirmation: '' });
    };

    const cancelEditing = () => {
        reset();
        setEditingUser(null);
    };

    const deleteUser = (user: PlatformUser) => {
        if (!confirm(`¿Eliminar el usuario "${user.name}"?`)) {
            return;
        }

        router.delete(route('admin.platform-users.destroy', user.id), {
            onSuccess: () => {
                if (editingUser?.id === user.id) {
                    cancelEditing();
                }
            },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Administradores</h2>}>
            <Head title="Administradores" />
            {pageErrors?.user && (
                <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
                    <p className="rounded bg-amber-50 p-4 text-amber-800">{pageErrors.user}</p>
                </div>
            )}
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow lg:col-span-1">
                    <h3 className="text-lg font-medium text-gray-900">{editingUser ? `Editar ${editingUser.name}` : 'Crear administrador'}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        No pertenecen a ningún cliente. Úsalos para tener siempre acceso a la plataforma aunque se elimine un cliente.
                    </p>

                    <div className="mt-4">
                        <InputLabel htmlFor="name" value="Nombre" />
                        <TextInput id="name" value={data.name} className="mt-1 block w-full" onChange={(event) => setData('name', event.target.value)} required />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="username" value="Usuario" />
                        <TextInput id="username" value={data.username} className="mt-1 block w-full" onChange={(event) => setData('username', event.target.value)} required />
                        <InputError message={errors.username} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="email" value="Correo electrónico" />
                        <TextInput id="email" type="email" value={data.email} className="mt-1 block w-full" onChange={(event) => setData('email', event.target.value)} required />
                        <InputError message={errors.email} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="password" value={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'} />
                        <TextInput id="password" type="password" value={data.password} className="mt-1 block w-full" onChange={(event) => setData('password', event.target.value)} required={!editingUser} />
                        <InputError message={errors.password} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="password_confirmation" value={editingUser ? 'Confirmar nueva contraseña' : 'Confirmar contraseña'} />
                        <TextInput id="password_confirmation" type="password" value={data.password_confirmation} className="mt-1 block w-full" onChange={(event) => setData('password_confirmation', event.target.value)} required={!editingUser} />
                    </div>

                    <div className="mt-6 flex gap-3">
                        <PrimaryButton disabled={processing}>{editingUser ? 'Guardar cambios' : 'Crear administrador'}</PrimaryButton>
                        {editingUser && <button type="button" onClick={cancelEditing} className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>}
                    </div>
                </form>

                <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Correo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-sm text-gray-500">Aún no hay administradores sin cliente.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{user.username}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button type="button" onClick={() => startEditing(user)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">Editar</button>
                                            <button type="button" onClick={() => deleteUser(user)} className="ms-4 text-sm font-medium text-red-600 hover:text-red-900">Eliminar</button>
                                        </td>
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
