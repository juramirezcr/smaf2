import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type ClientUser = {
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'client_admin' | 'client_user';
    createdAt: string;
};

export default function Index({ users }: { users: ClientUser[] }) {
    const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'client_user',
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
            patch(route('users.update', editingUser.id), options);

            return;
        }

        post(route('users.store'), options);
    };

    const startEditing = (user: ClientUser) => {
        setEditingUser(user);
        setData({
            name: user.name,
            username: user.username,
            email: user.email,
            password: '',
            password_confirmation: '',
            role: user.role,
        });
    };

    const cancelEditing = () => {
        reset();
        setEditingUser(null);
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Usuarios</h2>}>
            <Head title="Usuarios" />
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow lg:col-span-1">
                    <h3 className="text-lg font-medium text-gray-900">{editingUser ? 'Editar usuario' : 'Crear usuario'}</h3>
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
                        <TextInput id="password" type="password" value={data.password} className="mt-1 block w-full" onChange={(event) => setData('password', event.target.value)}                         required={!editingUser} />
                        <InputError message={errors.password} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="password_confirmation" value={editingUser ? 'Confirmar nueva contraseña' : 'Confirmar contraseña'} />
                        <TextInput id="password_confirmation" type="password" value={data.password_confirmation} className="mt-1 block w-full" onChange={(event) => setData('password_confirmation', event.target.value)}                         required={!editingUser} />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="role" value="Rol" />
                        <select id="role" value={data.role} onChange={(event) => setData('role', event.target.value as 'client_admin' | 'client_user')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            <option value="client_user">Usuario</option>
                            <option value="client_admin">Administrador</option>
                        </select>
                    </div>
                    <div className="mt-6 flex gap-3">
                        <PrimaryButton disabled={processing}>{editingUser ? 'Guardar cambios' : 'Crear usuario'}</PrimaryButton>
                        {editingUser && <button type="button" onClick={cancelEditing} className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Cancelar</button>}
                    </div>
                </form>
                <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuario</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Correo</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Rol</th><th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">{users.map((user) => <tr key={user.id}><td className="px-6 py-4 text-sm text-gray-900">{user.name}</td><td className="px-6 py-4 text-sm text-gray-500">{user.username}</td><td className="px-6 py-4 text-sm text-gray-500">{user.email}</td><td className="px-6 py-4 text-sm text-gray-500">{user.role === 'client_admin' ? 'Administrador' : 'Usuario'}</td><td className="px-6 py-4 text-right"><button type="button" onClick={() => startEditing(user)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">Editar</button></td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
