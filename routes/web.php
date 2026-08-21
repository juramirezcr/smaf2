<?php

use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\PortaoneSettingController;
use App\Http\Controllers\Admin\ReleaseController;
use App\Http\Controllers\Admin\ReleaseNoteController;
use App\Http\Controllers\AccountReportController;
use App\Http\Controllers\CallRecordController;
use App\Http\Controllers\ClientUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DestinationReportController;
use App\Http\Controllers\ImportBatchController;
use App\Http\Controllers\MonitoringRuleEventController;
use App\Http\Controllers\PrefixRuleController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::middleware('system-admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/releases', [ReleaseController::class, 'index'])->name('releases');
        Route::post('/releases/deploy', [ReleaseController::class, 'deploy'])->name('releases.deploy');
        Route::post('/release-notes', [ReleaseNoteController::class, 'store'])->name('release-notes.store');
        Route::patch('/release-notes/{releaseNote}', [ReleaseNoteController::class, 'update'])->name('release-notes.update');
        Route::delete('/release-notes/{releaseNote}', [ReleaseNoteController::class, 'destroy'])->name('release-notes.destroy');
        Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
        Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
        Route::patch('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
        Route::post('/clients/{client}/test-connection', [ClientController::class, 'testConnection'])->name('clients.test-connection');
        Route::get('/portaone', [PortaoneSettingController::class, 'edit'])->name('portaone.edit');
        Route::patch('/portaone', [PortaoneSettingController::class, 'update'])->name('portaone.update');
    });
    Route::get('/imports', [ImportBatchController::class, 'index'])->name('imports.index');
    Route::post('/imports', [ImportBatchController::class, 'store'])->name('imports.store');
    Route::resource('prefixes', PrefixRuleController::class)->except('destroy');
    Route::get('/calls', [CallRecordController::class, 'index'])->name('calls.index');
    Route::get('/destinations', [DestinationReportController::class, 'index'])->name('destinations.index');
    Route::get('/accounts', [AccountReportController::class, 'index'])->name('accounts.index');
    Route::get('/alerts', [MonitoringRuleEventController::class, 'index'])->name('alerts.index');
    Route::get('/users', [ClientUserController::class, 'index'])->name('users.index');
    Route::post('/users', [ClientUserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [ClientUserController::class, 'update'])->name('users.update');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
