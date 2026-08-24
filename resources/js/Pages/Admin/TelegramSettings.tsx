import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { FormEventHandler, useState } from 'react';

interface TelegramSettingsProps {
    hasToken: boolean;
    adminTelegramChatId: string | null;
}

interface TestResult {
    status: 'loading' | 'success' | 'error';
    message: string;
}

export default function TelegramSettings({ hasToken, adminTelegramChatId }: TelegramSettingsProps) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        telegram_bot_token: '',
        admin_telegram_chat_id: adminTelegramChatId ?? '',
    });
    const [adminTestResult, setAdminTestResult] = useState<TestResult | null>(null);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        patch(route('admin.telegram.update'), { onSuccess: () => setData('telegram_bot_token', '') });
    };

    const testAdminChannel = async () => {
        setAdminTestResult({ status: 'loading', message: '' });

        try {
            const response = await axios.post(route('admin.telegram.test'));
            setAdminTestResult({ status: 'success', message: response.data.message });
        } catch (error) {
            const message = axios.isAxiosError(error) && error.response?.data?.error
                ? error.response.data.error
                : 'No fue posible enviar el mensaje de prueba.';
            setAdminTestResult({ status: 'error', message });
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Telegram</h2>}>
            <Head title="Telegram" />
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
                <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Bot de notificaciones</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Token del bot de Telegram usado para enviar las alertas. Crea un bot con{' '}
                        <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-indigo-600 underline dark:text-indigo-400">
                            @BotFather
                        </a>{' '}
                        y pega aquí el token que te entregue. Cada cliente configura su propio Chat ID en la pantalla de Clientes
                        para recibir las alertas en su chat.
                    </p>

                    {hasToken && (
                        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
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
                    <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Notificaciones de administración</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Chat ID que recibirá avisos operativos: pérdida de conexión con PortaOne, jobs que
                            fallaron, etc. Puede ser el mismo bot, en un chat separado del de los clientes.
                        </p>

                        <div className="mt-4">
                            <InputLabel htmlFor="admin_telegram_chat_id" value="Chat ID de administración" />
                            <TextInput
                                id="admin_telegram_chat_id"
                                value={data.admin_telegram_chat_id}
                                className="mt-1 block w-full"
                                placeholder="Opcional"
                                onChange={(event) => setData('admin_telegram_chat_id', event.target.value)}
                            />
                            <InputError message={errors.admin_telegram_chat_id} className="mt-2" />
                        </div>

                        {adminTelegramChatId && (
                            <div className="mt-3">
                                <button
                                    type="button"
                                    onClick={testAdminChannel}
                                    disabled={adminTestResult?.status === 'loading'}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    {adminTestResult?.status === 'loading' ? 'Enviando...' : 'Probar canal de administración'}
                                </button>
                                {adminTestResult && adminTestResult.status !== 'loading' && (
                                    <p className={`mt-1 text-xs ${adminTestResult.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {adminTestResult.message}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-6">
                        <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
