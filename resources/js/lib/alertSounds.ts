export type AlertSoundKey = 'beep' | 'double' | 'siren';

export const ALERT_SOUND_LABELS: Record<AlertSoundKey, string> = {
    beep: 'Beep sencillo',
    double: 'Beep doble',
    siren: 'Sirena larga (x3)',
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
        // Sirena tipo "whoop-whoop-whoop": un barrido largo de subida y
        // bajada de tono, repetido 3 veces con un pequeño silencio entre
        // cada repetición para que se distingan como 3 toques, no uno solo.
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = 'sawtooth';
        oscillator.connect(gain);
        gain.connect(ctx.destination);

        const cycles = 3;
        const upDuration = 0.7;
        const downDuration = 0.7;
        const gapDuration = 0.15;

        gain.gain.setValueAtTime(0, now);
        oscillator.frequency.setValueAtTime(600, now);

        let cursor = now;

        for (let cycle = 0; cycle < cycles; cycle++) {
            gain.gain.linearRampToValueAtTime(0.24, cursor + 0.03);
            oscillator.frequency.linearRampToValueAtTime(1000, cursor + upDuration);
            oscillator.frequency.linearRampToValueAtTime(600, cursor + upDuration + downDuration);
            gain.gain.linearRampToValueAtTime(0, cursor + upDuration + downDuration);
            cursor += upDuration + downDuration;

            if (cycle < cycles - 1) {
                gain.gain.setValueAtTime(0, cursor);
                cursor += gapDuration;
                oscillator.frequency.setValueAtTime(600, cursor);
            }
        }

        oscillator.start(now);
        oscillator.stop(cursor + 0.05);
        closeAfter = cursor - now + 0.3;
    }

    // Liberar el AudioContext un poco después de terminar; mantenerlos vivos
    // indefinidamente puede acumular recursos si se dispara muchas alertas.
    setTimeout(() => ctx.close().catch(() => undefined), closeAfter * 1000);
}
