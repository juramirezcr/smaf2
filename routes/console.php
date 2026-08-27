<?php

use App\Jobs\PollPortaOneActiveSessions;
use App\Jobs\SyncPortaOneCalls;
use App\Jobs\SyncPortaOneData;
use App\Models\Client;
use App\Models\PortaoneAccount;
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
    // PortaOne exige consultar el XDR cuenta por cuenta (ver PortaOneClient::
    // syncXdrsForAccounts), así que repartimos las cuentas de cada cliente en
    // lotes y despachamos un job por lote: corren en paralelo entre los
    // workers de la cola en vez de que un solo job acumule minutos por la
    // sola cantidad de cuentas, aunque cada llamada SOAP individual sea rápida.
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
})->everyThirtyMinutes()->name('portaone-xdr-sync')->withoutOverlapping();

Schedule::command('smaf:evaluate-monitoring-rules')
    ->everyFiveMinutes()
    ->name('evaluate-monitoring-rules')
    ->withoutOverlapping();

Schedule::command('smaf:record-system-metrics')
    ->everyFiveMinutes()
    ->name('record-system-metrics')
    ->withoutOverlapping();
