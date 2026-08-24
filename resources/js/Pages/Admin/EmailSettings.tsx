import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface EmailSettingsProps {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUsername: string | null;
    smtpEncryption: string | null;
    smtpFromAddress: string | null;
    smtpFromName: string | null;
    hasPassword: boolean;
}

export default function EmailSettings({ smtpHost, smtpPort, smtpUsername, smtpEncryption, smtpFromAddress, smtpFromName, hasPassword }: EmailSettingsProps) {
    const { data, setData, patch, processing, errors } = useForm({
        smtp_host: smtpHost ?? '',
        smtp_port: smtpPort ?? 587,
        smtp_username: smtpUsername ?? '',
        smtp_password: '',
        smtp_encryption: smtpEncryption ?? 'tls',
        smtp_from_address: smtpFromAddress ?? '',
        smtp_from_name: smtpFromName ?? 'SMAF 2',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        patch(route('admin.email.update'), { onSuccess: () => setData('smtp_password', '') });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Correo electrónico</h2>}>
            <Head title="Correo electrónico" />
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow">
                    <h3 className="text-lg font-medium text-gray-900">Servidor SMTP</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Configuración de envío usada para las alertas por correo. Cada cliente configura su propio
                        correo destino en la pantalla de Clientes.
                    </p>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <InputLabel htmlFor="smtp_host" value="Host SMTP" />
                            <TextInput id="smtp_host" value={data.smtp_host} className="mt-1 block w-full" placeholder="smtp.gmail.com" onChange={(event) => setData('smtp_host', event.target.value)} />
                            <InputError message={errors.smtp_host} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="smtp_port" value="Puerto" />
                            <TextInput id="smtp_port" type="number" value={data.smtp_port} className="mt-1 block w-full" onChange={(event) => setData('smtp_port', Number(event.target.value))} />
                            <InputError message={errors.smtp_port} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="smtp_encryption" value="Cifrado" />
                            <select
                                id="smtp_encryption"
                                value={data.smtp_encryption}
                                onChange={(event) => setData('smtp_encryption', event.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="tls">TLS</option>
                                <option value="ssl">SSL</option>
                            </select>
                        </div>
                        <div>
                            <InputLabel htmlFor="smtp_username" value="Usuario" />
                            <TextInput id="smtp_username" value={data.smtp_username} className="mt-1 block w-full" onChange={(event) => setData('smtp_username', event.target.value)} />
                            <InputError message={errors.smtp_username} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="smtp_password" value={hasPassword ? 'Nueva contraseña (dejar en blanco para no cambiarla)' : 'Contraseña'} />
                            <TextInput id="smtp_password" type="password" value={data.smtp_password} className="mt-1 block w-full" onChange={(event) => setData('smtp_password', event.target.value)} />
                            <InputError message={errors.smtp_password} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="smtp_from_address" value="Correo remitente" />
                            <TextInput id="smtp_from_address" type="email" value={data.smtp_from_address} className="mt-1 block w-full" placeholder="alertas@empresa.com" onChange={(event) => setData('smtp_from_address', event.target.value)} />
                            <InputError message={errors.smtp_from_address} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="smtp_from_name" value="Nombre remitente" />
                            <TextInput id="smtp_from_name" value={data.smtp_from_name} className="mt-1 block w-full" onChange={(event) => setData('smtp_from_name', event.target.value)} />
                            <InputError message={errors.smtp_from_name} className="mt-2" />
                        </div>
                    </div>

                    <div className="mt-6">
                        <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
