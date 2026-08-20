import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        client_name: '',
        portaone_environment: '',
        portaone_username: '',
        portaone_token: '',
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Registrar cliente" />

            <form onSubmit={submit}>
                <h2 className="text-xl font-semibold text-gray-900">Registrar cliente</h2>
                <p className="mt-1 text-sm text-gray-600">Crea el cliente y su primer administrador.</p>
                <div className="mt-6">
                    <InputLabel htmlFor="client_name" value="Nombre del cliente" />
                    <TextInput id="client_name" value={data.client_name} className="mt-1 block w-full" onChange={(e) => setData('client_name', e.target.value)} required />
                    <InputError message={errors.client_name} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="portaone_environment" value="Environment de PortaOne" />
                    <TextInput id="portaone_environment" value={data.portaone_environment} className="mt-1 block w-full" onChange={(e) => setData('portaone_environment', e.target.value)} required />
                    <InputError message={errors.portaone_environment} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="portaone_username" value="Usuario de PortaOne" />
                    <TextInput id="portaone_username" value={data.portaone_username} className="mt-1 block w-full" onChange={(e) => setData('portaone_username', e.target.value)} required />
                    <InputError message={errors.portaone_username} className="mt-2" />
                </div>
                <div className="mt-4">
                    <InputLabel htmlFor="portaone_token" value="Token de PortaOne" />
                    <TextInput id="portaone_token" type="password" value={data.portaone_token} className="mt-1 block w-full" onChange={(e) => setData('portaone_token', e.target.value)} required />
                    <InputError message={errors.portaone_token} className="mt-2" />
                </div>
                <div>
                    <InputLabel htmlFor="name" value="Nombre del administrador" />

                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        isFocused={true}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />

                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="username" value="Usuario" />
                    <TextInput id="username" value={data.username} className="mt-1 block w-full" autoComplete="username" onChange={(e) => setData('username', e.target.value)} required />
                    <InputError message={errors.username} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Correo electrónico" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password"                     value="Contraseña" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmar contraseña"
                    />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        required
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <Link
                        href={route('login')}
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        ¿Ya tienes una cuenta?
                    </Link>

                    <PrimaryButton className="ms-4" disabled={processing}>
                        Registrar cliente
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
