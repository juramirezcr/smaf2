import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function TelegramSettings({ hasToken }: { hasToken: boolean }) {
    const { data, setData, patch, processing, errors, reset } = useForm({ telegram_bot_token: '' });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        patch(route('admin.telegram.update'), { onSuccess: () => reset() });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Telegram</h2>}>
            <Head title="Telegram" />
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow">
                    <h3 className="text-lg font-medium text-gray-900">Bot de notificaciones</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Token del bot de Telegram usado para enviar las alertas. Crea un bot con{' '}
                        <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                            @BotFather
                        </a>{' '}
                        y pega aquí el token que te entregue. Cada cliente configura su propio Chat ID en la pantalla de Clientes
                        para recibir las alertas en su chat.
                    </p>

                    {hasToken && (
                        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            Ya hay un token configurado. Escribe uno nuevo solo si quieres reemplazarlo.
                        </p>
                    )}

                    <div className="mt-4">
                        <InputLabel htmlFor="telegram_bot_token" value={hasToken ? 'Nuevo token (dejar en blanco para no cambiarlo)' : 'Token del bot'} />
                        <TextInput
                            id="telegram_bot_token"
                            type="password"
                            value={data.telegram_bot_token}
                            className="mt-1 block w-full font-mono"
                            placeholder="123456789:AAExampleTokenValue"
                            onChange={(event) => setData('telegram_bot_token', event.target.value)}
                        />
                        <InputError message={errors.telegram_bot_token} className="mt-2" />
                    </div>
                    <div className="mt-6">
                        <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
