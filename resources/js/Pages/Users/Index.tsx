import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type ClientUser = {
    id: number;
    name: string;
    email: string;
    role: 'client_admin' | 'client_user';
    createdAt: string;
};

export default function Index({ users }: { users: ClientUser[] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'client_user',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('users.store'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Usuarios</h2>}>
            <Head title="Usuarios" />
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow lg:col-span-1">
                    <h3 className="text-lg font-medium text-gray-900">Crear usuario</h3>
                    <div className="mt-4">
                        <InputLabel htmlFor="name" value="Nombre" />
                        <TextInput id="name" value={data.name} className="mt-1 block w-full" onChange={(event) => setData('name', event.target.value)} required />
                        <InputError message={errors.name} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="email" value="Correo electrónico" />
                        <TextInput id="email" type="email" value={data.email} className="mt-1 block w-full" onChange={(event) => setData('email', event.target.value)} required />
                        <InputError message={errors.email} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="password" value="Contraseña" />
                        <TextInput id="password" type="password" value={data.password} className="mt-1 block w-full" onChange={(event) => setData('password', event.target.value)} required />
                        <InputError message={errors.password} className="mt-2" />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="password_confirmation" value="Confirmar contraseña" />
                        <TextInput id="password_confirmation" type="password" value={data.password_confirmation} className="mt-1 block w-full" onChange={(event) => setData('password_confirmation', event.target.value)} required />
                    </div>
                    <div className="mt-4">
                        <InputLabel htmlFor="role" value="Rol" />
                        <select id="role" value={data.role} onChange={(event) => setData('role', event.target.value as 'client_admin' | 'client_user')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                            <option value="client_user">Usuario</option>
                            <option value="client_admin">Administrador</option>
                        </select>
                    </div>
                    <PrimaryButton className="mt-6" disabled={processing}>Crear usuario</PrimaryButton>
                </form>
                <div className="overflow-hidden rounded-lg bg-white shadow lg:col-span-2">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Correo</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Rol</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">{users.map((user) => <tr key={user.id}><td className="px-6 py-4 text-sm text-gray-900">{user.name}</td><td className="px-6 py-4 text-sm text-gray-500">{user.email}</td><td className="px-6 py-4 text-sm text-gray-500">{user.role === 'client_admin' ? 'Administrador' : 'Usuario'}</td></tr>)}</tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
