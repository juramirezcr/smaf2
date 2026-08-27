<?php

use App\Jobs\PollPortaOneActiveSessions;
use App\Jobs\SyncPortaOneCalls;
use App\Jobs\SyncPortaOneData;
use App\Models\Client;
use App\Models\PortaoneAccount;
use App\Models\PortaoneActiveSession;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    Client::query()
        ->whereNotNull('portaone_username')
        ->whereNotNull('portaone_token')
        ->each(fn (Client $client) => SyncPortaOneData::dispatch($client->id));
})->hourly()->name('portaone-sync')->withoutOverlapping();

Schedule::call(function () {
    Client::query()
        ->whereNotNull('portaone_username')
        ->whereNotNull('portaone_token')
        ->each(fn (Client $client) => PollPortaOneActiveSessions::dispatch($client->id)->onQueue('sessions'));
})->everyMinute()->name('portaone-active-sessions')->withoutOverlapping();

Schedule::call(function () {
    // En vez de barrer el catálogo completo de cuentas de cada cliente (que
    // no escala con miles de cuentas la mayoría sin tráfico), solo se
    // consultan las cuentas con una sesión activa o recién finalizada
    // (portaone_active_sessions, poblada cada minuto), y solo se les pide el
    // XDR de los últimos 15 minutos. El monitoreo de límites en tiempo real
    // ya no depende de esto (usa sesiones activas + CDR de la última hora vía
    // EvaluateMonitoringRules); esta corrida solo mantiene al día el
    // historial de llamadas terminadas para reportes/dashboard.
    $since = now()->subMinutes(15);

    Client::query()
        ->whereNotNull('portaone_username')
        ->whereNotNull('portaone_token')
        ->each(function (Client $client) use ($since) {
            $iAccounts = PortaoneActiveSession::query()
                ->where('client_id', $client->id)
                ->where(fn ($q) => $q->whereNull('ended_at')->orWhere('ended_at', '>=', $since))
                ->whereNotNull('i_account')
                ->distinct()
                ->pluck('i_account')
                ->filter();

            if ($iAccounts->isEmpty()) {
                return;
            }

            $iAccounts->chunk(150)
                ->each(fn ($chunk) => SyncPortaOneCalls::dispatch($client->id, $chunk->values()->all(), $since));
        });
})->everyFiveMinutes()->name('portaone-xdr-sync')->withoutOverlapping();

Schedule::call(function () {
    // Respaldo: una llamada que dura menos de 1 minuto puede arrancar y
    // colgar entre dos sondeos de PollPortaOneActiveSessions sin llegar a
    // verse nunca como "activa", y por tanto nunca dispara el sync de arriba.
    // Una vez al día se barre el catálogo completo de cuentas (con la lógica
    // vieja de xdr_synced_until) para atrapar cualquier llamada que se haya
    // escapado por ese hueco.
    Client::query()
        ->whereNotNull('portaone_username')
        ->whereNotNull('portaone_token')
        ->each(function (Client $client) {
            PortaoneAccount::query()
                ->where('client_id', $client->id)
                ->active()
                ->pluck('i_account')
                ->filter()
                ->chunk(150)
                ->each(fn ($chunk) => SyncPortaOneCalls::dispatch($client->id, $chunk->values()->all()));
        });
})->dailyAt('03:00')->name('portaone-xdr-full-catchup')->withoutOverlapping();

Schedule::command('smaf:evaluate-monitoring-rules')
    ->everyFiveMinutes()
    ->name('evaluate-monitoring-rules')
    ->withoutOverlapping();

Schedule::command('smaf:record-system-metrics')
    ->everyFiveMinutes()
    ->name('record-system-metrics')
    ->withoutOverlapping();
