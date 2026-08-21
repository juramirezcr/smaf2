<?php

use App\Jobs\SyncPortaOneData;
use App\Models\Client;
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
