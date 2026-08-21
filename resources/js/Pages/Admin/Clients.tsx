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

interface ClientItem {
    id: number;
    name: string;
    portaoneEnvironment: string;
    portaoneUsername: string;
    usersCount: number;
    createdAt: string;
    syncRun: SyncRun | null;
}

interface ConnectionTestResult {
    status: 'loading' | 'success' | 'error';
    message: string;
}

function ProgressBar({ label, progress }: { label: string; progress?: SyncProgress }) {
    if (!progress) {
        return null;
    }

    const pct = progress.total > 0 ? Math.min(100, Math.round((progress.synced / progress.total) * 100)) : 0;

    return (
        <div className="mt-1">
            <div className="flex justify-between text-xs text-gray-500">
                <span>{label}</span>
                <span>{progress.synced} / {progress.total}</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full rounded-full bg-gray-200">
                <div className="h-1.5 rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

const STEP_TITLES = ['Datos del cliente', 'Administrador inicial'];

export default function Clients({ clients }: { clients: ClientItem[] }) {
    const pageErrors = usePage().props.errors as Record<string, string>;
    const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [testResults, setTestResults] = useState<Record<number, ConnectionTestResult>>({});
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
            portaone_environment: client.portaoneEnvironment,
            portaone_username: client.portaoneUsername,
            portaone_token: '',
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

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Clientes</h2>}>
            <Head title="Clientes" />
            {pageErrors?.client && (
                <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
                    <p className="rounded bg-amber-50 p-4 text-amber-800">{pageErrors.client}</p>
                </div>
            )}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-4 flex justify-end">
                    <PrimaryButton onClick={openCreateModal}>+ Agregar cliente</PrimaryButton>
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Partición</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuario API</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuarios</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Conexión</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {clients.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-4 text-sm text-gray-500">Aún no hay clientes.</td></tr>
                                ) : (
                                    clients.map((client) => (
                                        <tr key={client.id}>
                                            <td className="px-6 py-4 text-sm text-gray-900">{client.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{client.portaoneEnvironment}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{client.portaoneUsername}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{client.usersCount}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => testConnection(client)}
                                                    disabled={testResults[client.id]?.status === 'loading'}
                                                    className="font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                                >
                                                    {testResults[client.id]?.status === 'loading' ? 'Probando...' : 'Probar conexión'}
                                                </button>
                                                {testResults[client.id] && testResults[client.id].status !== 'loading' && (
                                                    <p className={`mt-1 text-xs ${testResults[client.id].status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {testResults[client.id].message}
                                                    </p>
                                                )}

                                                <div className="mt-3 border-t pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => syncClient(client)}
                                                        disabled={client.syncRun?.status === 'started'}
                                                        className="font-medium text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                                    >
                                                        {client.syncRun?.status === 'started' ? 'Sincronizando...' : 'Sincronizar'}
                                                    </button>
                                                    {client.syncRun && (
                                                        <div className="mt-1 w-48">
                                                            <p className="text-xs text-gray-500">
                                                                {client.syncRun.status === 'completed' && 'Última sincronización completa'}
                                                                {client.syncRun.status === 'failed' && (
                                                                    <span className="text-red-600">Falló: {client.syncRun.message}</span>
                                                                )}
                                                                {client.syncRun.status === 'started' && 'Sincronizando...'}
                                                            </p>
                                                            <ProgressBar label="Productos" progress={client.syncRun.context?.products} />
                                                            <ProgressBar label="Customers" progress={client.syncRun.context?.customers} />
                                                            <ProgressBar label="Accounts (telefonía)" progress={client.syncRun.context?.accounts} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={route('admin.clients.products.index', client.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">Productos</Link>
                                                <button type="button" onClick={() => startEditing(client)} className="ms-4 text-sm font-medium text-indigo-600 hover:text-indigo-900">Editar</button>
                                                <button type="button" onClick={() => deleteClient(client)} className="ms-4 text-sm font-medium text-red-600 hover:text-red-900">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal show={modalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">
                            {editingClient ? `Editar ${editingClient.name}` : `Crear cliente — ${STEP_TITLES[step - 1]}`}
                        </h3>
                        {isWizard && <span className="text-sm text-gray-400">Paso {step} de 2</span>}
                    </div>

                    {(step === 1 || !isWizard) && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <InputLabel htmlFor="name" value="Nombre del cliente" />
                                <TextInput id="name" value={data.name} className="mt-1 block w-full" onChange={(event) => setData('name', event.target.value)} required />
                                <InputError message={errors.name} className="mt-2" />
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
        </AuthenticatedLayout>
    );
}
