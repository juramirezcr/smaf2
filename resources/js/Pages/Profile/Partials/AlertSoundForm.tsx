import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { ALERT_SOUND_LABELS, AlertSoundKey, isAlertSoundKey, playAlertSound } from '@/lib/alertSounds';
import { Transition } from '@headlessui/react';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function AlertSoundForm({ className = '' }: { className?: string }) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, processing, recentlySuccessful } = useForm({
        alert_sound: user.alertSound ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.alert-sound.update'), { preserveScroll: true });
    };

    const preview = () => {
        if (isAlertSoundKey(data.alert_sound)) {
            playAlertSound(data.alert_sound);
        }
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sonido de alerta</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Se reproduce en este navegador cuando aparece una alerta nueva en el Panel de Control — útil si dejas la pantalla abierta en un NOC.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                    <InputLabel htmlFor="alert_sound" value="Sonido" />
                    <div className="mt-1 flex items-center gap-2">
                        <select
                            id="alert_sound"
                            value={data.alert_sound}
                            onChange={(e) => setData('alert_sound', e.target.value)}
                            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        >
                            <option value="">Sin sonido</option>
                            {(Object.keys(ALERT_SOUND_LABELS) as AlertSoundKey[]).map((key) => (
                                <option key={key} value={key}>{ALERT_SOUND_LABELS[key]}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            disabled={!data.alert_sound}
                            onClick={preview}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Probar
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Guardar</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600 dark:text-gray-300">Guardado.</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
