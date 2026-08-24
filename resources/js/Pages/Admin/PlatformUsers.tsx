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
    readOnly: boolean;
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
        read_only: false,
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
        setData({ name: user.name, username: user.username, email: user.email, password: '', password_confirmation: '', read_only: user.readOnly });
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
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Administradores</h2>}>
            <Head title="Administradores" />
            {pageErrors?.user && (
                <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
                    <p className="rounded bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">{pageErrors.user}</p>
                </div>
            )}
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow lg:col-span-1 dark:bg-gray-800">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{editingUser ? `Editar ${editingUser.name}` : 'Crear administrador'}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                    <div className="mt-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={data.read_only}
                                onChange={(event) => setData('read_only', event.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                            />
                            Solo lectura
                        </label>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Puede ver todo pero no crear, editar ni eliminar nada, salvo revisar y resolver alertas de bloqueo. Pensado para soporte/NOC.
                        </p>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <PrimaryButton disabled={processing}>{editingUser ? 'Guardar cambios' : 'Crear administrador'}</PrimaryButton>
                        {editingUser && <button type="button" onClick={cancelEditing} className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">Cancelar</button>}
                    </div>
                </form>

                <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2 dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Correo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">Aún no hay administradores sin cliente.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                            {user.name}
                                            {user.readOnly && (
                                                <span className="ms-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                    Solo lectura
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.username}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button type="button" onClick={() => startEditing(user)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Editar</button>
                                            <button type="button" onClick={() => deleteUser(user)} className="ms-4 text-sm font-medium text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Eliminar</button>
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
