import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import type { PrefixRule } from '../types';

interface RuleFormProps {
    rule?: PrefixRule;
}

interface RuleFormData {
    prefix: string;
    country: string;
    description: string;
    account: string;
    customer: string;
    hourly_call_limit: number;
    hourly_minutes_limit: number;
    action: 'notify' | 'block';
    enabled: boolean;
}

export default function RuleForm({ rule }: RuleFormProps) {
    const form = useForm<RuleFormData>({
        prefix: rule?.prefix ?? '',
        country: rule?.country ?? '',
        description: rule?.description ?? '',
        account: rule?.account ?? '',
        customer: rule?.customer ?? '',
        hourly_call_limit: rule?.hourlyCallLimit ?? 100,
        hourly_minutes_limit: rule?.hourlyMinutesLimit ?? 60,
        action: rule?.action ?? 'notify',
        enabled: rule?.enabled ?? true,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (rule) {
            form.put(route('prefixes.update', rule.id));
            return;
        }

        form.post(route('prefixes.store'));
    }

    return (
        <form onSubmit={submit} className="space-y-8">
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                <div>
                    <InputLabel htmlFor="prefix" value="Prefijo" />
                    <TextInput
                        id="prefix"
                        name="prefix"
                        value={form.data.prefix}
                        onChange={(event) =>
                            form.setData(
                                'prefix',
                                event.target.value.replace(/\D/g, ''),
                            )
                        }
                        className="mt-1 block w-full font-mono"
                        inputMode="numeric"
                        maxLength={16}
                        autoFocus
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Solo dígitos, sin + ni 00.
                    </p>
                    <InputError message={form.errors.prefix} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="country" value="País" />
                    <TextInput
                        id="country"
                        name="country"
                        value={form.data.country}
                        onChange={(event) =>
                            form.setData('country', event.target.value)
                        }
                        className="mt-1 block w-full"
                        placeholder="Ej. México"
                    />
                    <InputError message={form.errors.country} className="mt-2" />
                </div>

                <div className="md:col-span-2">
                    <InputLabel htmlFor="description" value="Descripción" />
                    <textarea
                        id="description"
                        name="description"
                        value={form.data.description}
                        onChange={(event) =>
                            form.setData('description', event.target.value)
                        }
                        className="mt-1 block min-h-24 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        maxLength={500}
                        placeholder="Contexto para identificar la regla."
                    />
                    <InputError message={form.errors.description} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="customer" value="Cliente" />
                    <TextInput
                        id="customer"
                        name="customer"
                        value={form.data.customer}
                        onChange={(event) =>
                            form.setData('customer', event.target.value)
                        }
                        className="mt-1 block w-full"
                        placeholder="Todos los clientes"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Déjalo vacío para todos.
                    </p>
                    <InputError message={form.errors.customer} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="account" value="Cuenta" />
                    <TextInput
                        id="account"
                        name="account"
                        value={form.data.account}
                        onChange={(event) =>
                            form.setData('account', event.target.value)
                        }
                        className="mt-1 block w-full"
                        placeholder="Todas las cuentas"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Acota la regla a una cuenta específica.
                    </p>
                    <InputError message={form.errors.account} className="mt-2" />
                </div>
            </div>

            <div className="border-y border-gray-200 py-6">
                <h3 className="text-base font-semibold text-gray-900">
                    Umbrales por hora
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                    La futura evaluación comparará estos límites con las llamadas
                    que coincidan con el prefijo y alcance definidos.
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div>
                        <InputLabel
                            htmlFor="hourly_call_limit"
                            value="Límite de llamadas"
                        />
                        <TextInput
                            id="hourly_call_limit"
                            type="number"
                            min="1"
                            max="1000000"
                            value={form.data.hourly_call_limit}
                            onChange={(event) =>
                                form.setData(
                                    'hourly_call_limit',
                                    Number(event.target.value),
                                )
                            }
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError
                            message={form.errors.hourly_call_limit}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <InputLabel
                            htmlFor="hourly_minutes_limit"
                            value="Límite de minutos"
                        />
                        <TextInput
                            id="hourly_minutes_limit"
                            type="number"
                            min="1"
                            max="1000000"
                            value={form.data.hourly_minutes_limit}
                            onChange={(event) =>
                                form.setData(
                                    'hourly_minutes_limit',
                                    Number(event.target.value),
                                )
                            }
                            className="mt-1 block w-full"
                            required
                        />
                        <InputError
                            message={form.errors.hourly_minutes_limit}
                            className="mt-2"
                        />
                    </div>
                </div>
            </div>

            <fieldset>
                <legend className="text-base font-semibold text-gray-900">
                    Acción al superar el límite
                </legend>
                <p className="mt-1 text-sm text-gray-600">
                    Solo se guarda la intención. Esta versión no envía
                    notificaciones ni bloquea en PortaOne.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                        {
                            value: 'notify' as const,
                            label: 'Notificar',
                            description: 'Registrar y preparar una alerta operativa.',
                        },
                        {
                            value: 'block' as const,
                            label: 'Bloquear',
                            description: 'Registrar una solicitud de bloqueo para una futura integración.',
                        },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={`cursor-pointer rounded-lg border p-4 transition ${
                                form.data.action === option.value
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <input
                                type="radio"
                                name="action"
                                value={option.value}
                                checked={form.data.action === option.value}
                                onChange={() => form.setData('action', option.value)}
                                className="sr-only"
                            />
                            <span className="block font-medium text-gray-900">
                                {option.label}
                            </span>
                            <span className="mt-1 block text-sm text-gray-600">
                                {option.description}
                            </span>
                        </label>
                    ))}
                </div>
                <InputError message={form.errors.action} className="mt-2" />
            </fieldset>

            <label className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <input
                    type="checkbox"
                    checked={form.data.enabled}
                    onChange={(event) =>
                        form.setData('enabled', event.target.checked)
                    }
                    className="mt-1 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                />
                <span>
                    <span className="block font-medium text-gray-900">
                        Regla activa
                    </span>
                    <span className="mt-1 block text-sm text-gray-600">
                        Una regla inactiva conserva su configuración sin participar
                        en futuras evaluaciones.
                    </span>
                </span>
            </label>
            <InputError message={form.errors.enabled} className="mt-2" />

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                <Link
                    href={rule ? route('prefixes.show', rule.id) : route('prefixes.index')}
                    className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                    Cancelar
                </Link>
                <button
                    type="submit"
                    disabled={form.processing}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.processing
                        ? 'Guardando...'
                        : rule
                          ? 'Guardar cambios'
                          : 'Crear regla'}
                </button>
            </div>
        </form>
    );
}
