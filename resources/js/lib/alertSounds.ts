export type AlertSoundKey = 'beep' | 'double' | 'siren';

export const ALERT_SOUND_LABELS: Record<AlertSoundKey, string> = {
    beep: 'Beep sencillo',
    double: 'Beep doble',
    siren: 'Sirena corta',
};

export function isAlertSoundKey(value: string): value is AlertSoundKey {
    return value === 'beep' || value === 'double' || value === 'siren';
}

// Los tonos se generan con Web Audio API en vez de archivos de audio: no hay
// nada que empaquetar/servir y suenan igual en cualquier navegador.
function tone(ctx: AudioContext, startAt: number, frequency: number, duration: number, peakGain = 0.28) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.01);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
}

export function playAlertSound(key: AlertSoundKey): void {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    let closeAfter = 0.8;

    if (key === 'beep') {
        tone(ctx, now, 880, 0.18);
        closeAfter = 0.4;
    } else if (key === 'double') {
        tone(ctx, now, 880, 0.12);
        tone(ctx, now + 0.18, 880, 0.12);
        closeAfter = 0.6;
    } else if (key === 'siren') {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'sawtooth';
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.linearRampToValueAtTime(1000, now + 0.3);
        oscillator.frequency.linearRampToValueAtTime(600, now + 0.6);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.65);
        closeAfter = 0.9;
    }

    // Liberar el AudioContext un poco después de terminar; mantenerlos vivos
    // indefinidamente puede acumular recursos si se dispara muchas alertas.
    setTimeout(() => ctx.close().catch(() => undefined), closeAfter * 1000);
}
