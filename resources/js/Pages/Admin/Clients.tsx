import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { FormEventHandler, useEffect, useState } from 'react';

interface SyncProgress {
    total: number;
    synced: number;
}

interface SyncRun {
    status: 'started' | 'completed' | 'failed';
    context: {
        products?: SyncProgress;
        customers?: SyncProgress;
        accounts?: SyncProgress;
    } | null;
    message: string | null;
    startedAt: string;
    finishedAt: string | null;
}

interface ClientUser {
    id: number;
    name: string;
    username: string;
    email: string;
    role: 'client_admin' | 'client_user';
}

interface ClientItem {
    id: number;
    name: string;
    timezone: string | null;
    portaoneEnvironment: string;
    portaoneUsername: string;
    telegramChatId: string | null;
    notificationEmail: string | null;
    useCustomTelegramBot: boolean;
    hasCustomTelegramBotToken: boolean;
    usersCount: number;
    users: ClientUser[];
    productsCount: number;
    customersCount: number;
    accountsCount: number;
    callsCount: number;
    createdAt: string;
    syncRun: SyncRun | null;
}

interface ConnectionTestResult {
    status: 'loading' | 'success' | 'error';
    message: string;
}

interface NotificationTestResult {
    status: 'loading' | 'success' | 'error';
    message: string;
}

function StatTile({ label, value, href, progress }: { label: string; value: number; href: string; progress?: SyncProgress }) {
    const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.synced / progress.total) * 100)) : null;

    return (
        <Link
            href={href}
            className="block rounded-md border border-gray-100 bg-gray-50 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
        >
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value.toLocaleString('es-CR')}</p>
            {pct !== null && (
                <>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{progress!.synced} / {progress!.total}</p>
                </>
            )}
        </Link>
    );
}

function SyncStatusBadge({ syncRun }: { syncRun: SyncRun | null }) {
    if (!syncRun || syncRun.status === 'completed') {
        return null;
    }

    if (syncRun.status === 'started') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                Sincronizando
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400" title={syncRun.message ?? undefined}>
            Sync falló
        </span>
    );
}

const STEP_TITLES = ['Datos del cliente', 'Administrador inicial'];

export default function Clients({ clients }: { clients: ClientItem[] }) {
    const pageErrors = usePage().props.errors as Record<string, string>;
    const timezoneOptions = usePage().props.timezoneOptions;
    const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [testResults, setTestResults] = useState<Record<number, ConnectionTestResult>>({});
    const [telegramTestResults, setTelegramTestResults] = useState<Record<number, NotificationTestResult>>({});
    const [emailTestResults, setEmailTestResults] = useState<Record<number, NotificationTestResult>>({});
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        timezone: '',
        portaone_environment: '',
        portaone_username: '',
        portaone_token: '',
        telegram_chat_id: '',
        notification_email: '',
        use_custom_telegram_bot: false,
        telegram_bot_token: '',
        admin_name: '',
        admin_username: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
    });

    const [userModalClient, setUserModalClient] = useState<ClientItem | null>(null);
    const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
    const userForm = useForm({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'client_admin' as 'client_admin' | 'client_user',
    });

    const openUserModal = (client: ClientItem) => {
        userForm.reset();
        userForm.clearErrors();
        setEditingUser(null);
        setUserModalClient(client);
    };

    const openEditUserModal = (client: ClientItem, user: ClientUser) => {
        userForm.clearErrors();
        userForm.setData({
            name: user.name,
            username: user.username,
            email: user.email,
            password: '',
            password_confirmation: '',
            role: user.role,
        });
        setEditingUser(user);
        setUserModalClient(client);
    };

    const closeUserModal = () => {
        userForm.reset();
        setEditingUser(null);
        setUserModalClient(null);
    };

    const submitUser: FormEventHandler = (event) => {
        event.preventDefault();
        if (!userModalClient) return;

        if (editingUser) {
            userForm.patch(route('admin.clients.users.update', [userModalClient.id, editingUser.id]), {
                onSuccess: closeUserModal,
            });

            return;
        }

        userForm.post(route('admin.clients.users.store', userModalClient.id), {
            onSuccess: closeUserModal,
        });
    };

    const isWizard = !editingClient;
    const stepOneComplete = data.name.trim() !== '' && data.portaone_environment.trim() !== '' && data.portaone_username.trim() !== '' && data.portaone_token.trim() !== '';

    const closeModal = () => {
        reset();
        setEditingClient(null);
        setStep(1);
        setModalOpen(false);
    };

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        const options = { onSuccess: closeModal };

        if (editingClient) {
            patch(route('admin.clients.update', editingClient.id), options);

            return;
        }

        post(route('admin.clients.store'), options);
    };

    const openCreateModal = () => {
        reset();
        setEditingClient(null);
        setStep(1);
        setModalOpen(true);
    };

    const startEditing = (client: ClientItem) => {
        setEditingClient(client);
        setData({
            name: client.name,
            timezone: client.timezone ?? '',
            portaone_environment: client.portaoneEnvironment,
            portaone_username: client.portaoneUsername,
            portaone_token: '',
            telegram_chat_id: client.telegramChatId ?? '',
            notification_email: client.notificationEmail ?? '',
            use_custom_telegram_bot: client.useCustomTelegramBot,
            telegram_bot_token: '',
            admin_name: '',
            admin_username: '',
            admin_email: '',
            admin_password: '',
            admin_password_confirmation: '',
        });
        setStep(1);
        setModalOpen(true);
    };

    const deleteClient = (client: ClientItem) => {
        if (!confirm(`¿Eliminar "${client.name}" y sus ${client.usersCount} usuario(s)? Esta acción no se puede deshacer.`)) {
            return;
        }

        router.delete(route('admin.clients.destroy', client.id), {
            onSuccess: () => {
                if (editingClient?.id === client.id) {
                    closeModal();
                }
            },
        });
    };

    const anySyncing = clients.some((client) => client.syncRun?.status === 'started');

    useEffect(() => {
        if (!anySyncing) {
            return;
        }

        const interval = setInterval(() => {
            router.reload({ only: ['clients'] });
        }, 4000);

        return () => clearInterval(interval);
    }, [anySyncing]);

    const syncClient = (client: ClientItem) => {
        router.post(route('admin.clients.sync', client.id));
    };

    const testConnection = async (client: ClientItem) => {
        setTestResults((previous) => ({ ...previous, [client.id]: { status: 'loading', message: '' } }));

        try {
            const response = await axios.post(route('admin.clients.test-connection', client.id));
            const { customersCount, accountsCount } = response.data;
            setTestResults((previous) => ({
                ...previous,
                [client.id]: { status: 'success', message: `${customersCount} customers, ${accountsCount} accounts` },
            }));
        } catch (error) {
            const message = axios.isAxiosError(error) && error.response?.data?.error
                ? error.response.data.error
                : 'No fue posible completar la prueba.';
            setTestResults((previous) => ({ ...previous, [client.id]: { status: 'error', message } }));
        }
    };

    const testTelegram = async (client: ClientItem) => {
        setTelegramTestResults((previous) => ({ ...previous, [client.id]: { status: 'loading', message: '' } }));

        try {
            const response = await axios.post(route('admin.clients.test-telegram', client.id));
            setTelegramTestResults((previous) => ({
                ...previous,
                [client.id]: { status: 'success', message: response.data.message },
            }));
        } catch (error) {
            const message = axios.isAxiosError(error) && error.response?.data?.error
                ? error.response.data.error
                : 'No fue posible enviar el mensaje de prueba.';
            setTelegramTestResults((previous) => ({ ...previous, [client.id]: { status: 'error', message } }));
        }
    };

    const testEmail = async (client: ClientItem) => {
        setEmailTestResults((previous) => ({ ...previous, [client.id]: { status: 'loading', message: '' } }));

        try {
            const response = await axios.post(route('admin.clients.test-email', client.id));
            setEmailTestResults((previous) => ({
                ...previous,
                [client.id]: { status: 'success', message: response.data.message },
            }));
        } catch (error) {
            const message = axios.isAxiosError(error) && error.response?.data?.error
                ? error.response.data.error
                : 'No fue posible enviar el correo de prueba.';
            setEmailTestResults((previous) => ({ ...previous, [client.id]: { status: 'error', message } }));
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Clientes</h2>}>
            <Head title="Clientes" />
            {pageErrors?.client && (
                <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
                    <p className="rounded bg-amber-50 p-4 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400">{pageErrors.client}</p>
                </div>
            )}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-4 flex justify-end">
                    <PrimaryButton onClick={openCreateModal}>+ Agregar cliente</PrimaryButton>
                </div>

                {clients.length === 0 ? (
                    <div className="rounded-lg bg-white p-8 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                        Aún no hay clientes.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {clients.map((client) => (
                            <div key={client.id} className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
                                <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-gray-900 dark:text-gray-100">{client.name}</h3>
                                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                            {client.portaoneUsername} · entorno {client.portaoneEnvironment}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <SyncStatusBadge syncRun={client.syncRun} />
                                        <button type="button" onClick={() => startEditing(client)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                            Editar
                                        </button>
                                        <button type="button" onClick={() => deleteClient(client)} className="text-sm font-medium text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4 px-5 py-4">
                                    <div className="flex items-center gap-4 text-sm">
                                        <button
                                            type="button"
                                            onClick={() => testConnection(client)}
                                            disabled={testResults[client.id]?.status === 'loading'}
                                            className="font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
                                        >
                                            {testResults[client.id]?.status === 'loading' ? 'Probando conexión...' : 'Probar conexión'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => syncClient(client)}
                                            disabled={client.syncRun?.status === 'started'}
                                            className="font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
                                        >
                                            {client.syncRun?.status === 'started' ? 'Sincronizando...' : 'Sincronizar ahora'}
                                        </button>
                                    </div>
                                    {testResults[client.id] && testResults[client.id].status !== 'loading' && (
                                        <p className={`text-xs ${testResults[client.id].status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {testResults[client.id].message}
                                        </p>
                                    )}
                                    {client.syncRun?.status === 'failed' && (
                                        <p className="text-xs text-red-600 dark:text-red-400">Sync falló: {client.syncRun.message}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <StatTile
                                            label="Productos"
                                            value={client.productsCount}
                                            href={route('admin.clients.products.index', client.id)}
                                            progress={client.syncRun?.status === 'started' ? client.syncRun.context?.products : undefined}
                                        />
                                        <StatTile
                                            label="Customers"
                                            value={client.customersCount}
                                            href={`/portaone-customers?client_id=${client.id}`}
                                            progress={client.syncRun?.status === 'started' ? client.syncRun.context?.customers : undefined}
                                        />
                                        <StatTile
                                            label="Cuentas"
                                            value={client.accountsCount}
                                            href={`/accounts?client_id=${client.id}`}
                                            progress={client.syncRun?.status === 'started' ? client.syncRun.context?.accounts : undefined}
                                        />
                                        <StatTile label="Llamadas" value={client.callsCount} href={`/calls?client_id=${client.id}`} />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                            <span className={`rounded-full px-2 py-0.5 ${client.telegramChatId ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                                Telegram {client.telegramChatId ? 'activo' : 'sin configurar'}
                                            </span>
                                            {client.telegramChatId && (
                                                <button
                                                    type="button"
                                                    onClick={() => testTelegram(client)}
                                                    disabled={telegramTestResults[client.id]?.status === 'loading'}
                                                    className="font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                >
                                                    {telegramTestResults[client.id]?.status === 'loading' ? 'Enviando...' : 'Probar'}
                                                </button>
                                            )}
                                            <span className={`rounded-full px-2 py-0.5 ${client.notificationEmail ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                                Correo {client.notificationEmail ? 'activo' : 'sin configurar'}
                                            </span>
                                            {client.notificationEmail && (
                                                <button
                                                    type="button"
                                                    onClick={() => testEmail(client)}
                                                    disabled={emailTestResults[client.id]?.status === 'loading'}
                                                    className="font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                >
                                                    {emailTestResults[client.id]?.status === 'loading' ? 'Enviando...' : 'Probar'}
                                                </button>
                                            )}
                                        </div>
                                        {telegramTestResults[client.id] && telegramTestResults[client.id].status !== 'loading' && (
                                            <p className={`text-xs ${telegramTestResults[client.id].status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                Telegram: {telegramTestResults[client.id].message}
                                            </p>
                                        )}
                                        {emailTestResults[client.id] && emailTestResults[client.id].status !== 'loading' && (
                                            <p className={`text-xs ${emailTestResults[client.id].status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                Correo: {emailTestResults[client.id].message}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                            Usuarios ({client.usersCount})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => openUserModal(client)}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                        >
                                            + Agregar usuario
                                        </button>
                                    </div>
                                    {client.users.length === 0 ? (
                                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Sin usuarios todavía.</p>
                                    ) : (
                                        <ul className="mt-1.5 space-y-1">
                                            {client.users.map((user) => (
                                                <li key={user.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                                                    <span className="truncate">{user.name} <span className="text-gray-400 dark:text-gray-500">({user.username})</span></span>
                                                    <span className="ml-2 flex shrink-0 items-center gap-2">
                                                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                            {user.role === 'client_admin' ? 'Admin' : 'Usuario'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditUserModal(client, user)}
                                                            className="font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        >
                                                            Editar
                                                        </button>
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal show={modalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {editingClient ? `Editar ${editingClient.name}` : `Crear cliente — ${STEP_TITLES[step - 1]}`}
                        </h3>
                        {isWizard && <span className="text-sm text-gray-400 dark:text-gray-500">Paso {step} de 2</span>}
                    </div>

                    {(step === 1 || !isWizard) && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <InputLabel htmlFor="name" value="Nombre del cliente" />
                                <TextInput id="name" value={data.name} className="mt-1 block w-full" onChange={(event) => setData('name', event.target.value)} required />
                                <InputError message={errors.name} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="timezone" value="Zona horaria" />
                                <select
                                    id="timezone"
                                    value={data.timezone}
                                    onChange={(event) => setData('timezone', event.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                >
                                    <option value="">Predeterminada (Costa Rica)</option>
                                    {timezoneOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                    Las llamadas de este cliente se muestran con esta hora a todos sus usuarios.
                                </p>
                                <InputError message={errors.timezone} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="portaone_environment" value="Partición / entorno PortaOne" />
                                <TextInput id="portaone_environment" value={data.portaone_environment} className="mt-1 block w-full" onChange={(event) => setData('portaone_environment', event.target.value)} required />
                                <InputError message={errors.portaone_environment} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="portaone_username" value="Usuario API" />
                                <TextInput id="portaone_username" value={data.portaone_username} className="mt-1 block w-full" onChange={(event) => setData('portaone_username', event.target.value)} required />
                                <InputError message={errors.portaone_username} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="portaone_token" value={editingClient ? 'Nueva clave API (dejar en blanco para no cambiarla)' : 'Clave API'} />
                                <TextInput id="portaone_token" type="password" value={data.portaone_token} className="mt-1 block w-full" onChange={(event) => setData('portaone_token', event.target.value)} required={!editingClient} />
                                <InputError message={errors.portaone_token} className="mt-2" />
                            </div>
                            <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notificaciones de alertas</p>
                                <div className="mt-2 space-y-4">
                                    <div>
                                        <InputLabel htmlFor="telegram_chat_id" value="Chat ID de Telegram" />
                                        <TextInput id="telegram_chat_id" value={data.telegram_chat_id} className="mt-1 block w-full" placeholder="Opcional" onChange={(event) => setData('telegram_chat_id', event.target.value)} />
                                        <InputError message={errors.telegram_chat_id} className="mt-2" />
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                            <input
                                                type="checkbox"
                                                checked={data.use_custom_telegram_bot}
                                                onChange={(event) => setData('use_custom_telegram_bot', event.target.checked)}
                                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                                            />
                                            Usar un bot de Telegram propio para este cliente
                                        </label>
                                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                            Si no se activa, se usa el bot configurado en Configuraciones/Telegram.
                                        </p>
                                        {data.use_custom_telegram_bot && (
                                            <div className="mt-2">
                                                <InputLabel
                                                    htmlFor="telegram_bot_token"
                                                    value={editingClient?.hasCustomTelegramBotToken ? 'Nuevo token del bot (dejar en blanco para no cambiarlo)' : 'Token del bot'}
                                                />
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
                                        )}
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="notification_email" value="Correo para notificaciones" />
                                        <TextInput id="notification_email" type="email" value={data.notification_email} className="mt-1 block w-full" placeholder="Opcional" onChange={(event) => setData('notification_email', event.target.value)} />
                                        <InputError message={errors.notification_email} className="mt-2" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isWizard && step === 2 && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <InputLabel htmlFor="admin_name" value="Nombre" />
                                <TextInput id="admin_name" value={data.admin_name} className="mt-1 block w-full" onChange={(event) => setData('admin_name', event.target.value)} required />
                                <InputError message={errors.admin_name} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="admin_username" value="Usuario" />
                                <TextInput id="admin_username" value={data.admin_username} className="mt-1 block w-full" onChange={(event) => setData('admin_username', event.target.value)} required />
                                <InputError message={errors.admin_username} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="admin_email" value="Correo electrónico" />
                                <TextInput id="admin_email" type="email" value={data.admin_email} className="mt-1 block w-full" onChange={(event) => setData('admin_email', event.target.value)} required />
                                <InputError message={errors.admin_email} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="admin_password" value="Contraseña" />
                                <TextInput id="admin_password" type="password" value={data.admin_password} className="mt-1 block w-full" onChange={(event) => setData('admin_password', event.target.value)} required />
                                <InputError message={errors.admin_password} className="mt-2" />
                            </div>
                            <div>
                                <InputLabel htmlFor="admin_password_confirmation" value="Confirmar contraseña" />
                                <TextInput id="admin_password_confirmation" type="password" value={data.admin_password_confirmation} className="mt-1 block w-full" onChange={(event) => setData('admin_password_confirmation', event.target.value)} required />
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-between gap-3">
                        <SecondaryButton type="button" onClick={closeModal}>Cancelar</SecondaryButton>
                        <div className="flex gap-3">
                            {isWizard && step === 2 && (
                                <SecondaryButton type="button" onClick={() => setStep(1)}>Atrás</SecondaryButton>
                            )}
                            {isWizard && step === 1 ? (
                                <PrimaryButton type="button" disabled={!stepOneComplete} onClick={() => setStep(2)}>Siguiente</PrimaryButton>
                            ) : (
                                <PrimaryButton disabled={processing}>{editingClient ? 'Guardar cambios' : 'Crear cliente'}</PrimaryButton>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal show={userModalClient !== null} onClose={closeUserModal} maxWidth="md">
                <form onSubmit={submitUser} className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {editingUser ? `Editar usuario de ${userModalClient?.name}` : `Agregar usuario a ${userModalClient?.name}`}
                    </h3>
                    <div className="mt-4 space-y-4">
                        <div>
                            <InputLabel htmlFor="user_name" value="Nombre" />
                            <TextInput id="user_name" value={userForm.data.name} className="mt-1 block w-full" onChange={(event) => userForm.setData('name', event.target.value)} required />
                            <InputError message={userForm.errors.name} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_username" value="Usuario" />
                            <TextInput id="user_username" value={userForm.data.username} className="mt-1 block w-full" onChange={(event) => userForm.setData('username', event.target.value)} required />
                            <InputError message={userForm.errors.username} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_email" value="Correo electrónico" />
                            <TextInput id="user_email" type="email" value={userForm.data.email} className="mt-1 block w-full" onChange={(event) => userForm.setData('email', event.target.value)} required />
                            <InputError message={userForm.errors.email} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_role" value="Rol" />
                            <select
                                id="user_role"
                                value={userForm.data.role}
                                onChange={(event) => userForm.setData('role', event.target.value as 'client_admin' | 'client_user')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            >
                                <option value="client_admin">Administrador del cliente</option>
                                <option value="client_user">Usuario</option>
                            </select>
                            <InputError message={userForm.errors.role} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_password" value={editingUser ? 'Nueva contraseña (dejar en blanco para no cambiarla)' : 'Contraseña'} />
                            <TextInput id="user_password" type="password" value={userForm.data.password} className="mt-1 block w-full" onChange={(event) => userForm.setData('password', event.target.value)} required={!editingUser} />
                            <InputError message={userForm.errors.password} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel htmlFor="user_password_confirmation" value="Confirmar contraseña" />
                            <TextInput id="user_password_confirmation" type="password" value={userForm.data.password_confirmation} className="mt-1 block w-full" onChange={(event) => userForm.setData('password_confirmation', event.target.value)} required={!editingUser} />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton type="button" onClick={closeUserModal}>Cancelar</SecondaryButton>
                        <PrimaryButton disabled={userForm.processing}>{editingUser ? 'Guardar cambios' : 'Crear usuario'}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
