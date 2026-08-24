<?php

use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\EmailSettingController;
use App\Http\Controllers\Admin\NotificationTestController;
use App\Http\Controllers\Admin\PlatformUserController;
use App\Http\Controllers\Admin\PortaoneProductController;
use App\Http\Controllers\Admin\PortaoneSettingController;
use App\Http\Controllers\Admin\QueueMonitorController;
use App\Http\Controllers\Admin\ReleaseController;
use App\Http\Controllers\Admin\SystemStatusController;
use App\Http\Controllers\Admin\TelegramSettingController;
use App\Http\Controllers\AccountReportController;
use App\Http\Controllers\CallRecordController;
use App\Http\Controllers\ClientUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DestinationReportController;
use App\Http\Controllers\HelpController;
use App\Http\Controllers\ImportBatchController;
use App\Http\Controllers\MonitoringRuleEventController;
use App\Http\Controllers\PortaoneAccountController;
use App\Http\Controllers\PrefixRuleController;
use App\Http\Controllers\ProcessRunController;
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
        Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');
        Route::post('/clients', [ClientController::class, 'store'])->name('clients.store');
        Route::patch('/clients/{client}', [ClientController::class, 'update'])->name('clients.update');
        Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->name('clients.destroy');
        Route::post('/clients/{client}/users', [ClientController::class, 'storeUser'])->name('clients.users.store');
        Route::patch('/clients/{client}/users/{user}', [ClientController::class, 'updateUser'])->name('clients.users.update');
        Route::post('/clients/{client}/test-connection', [ClientController::class, 'testConnection'])->name('clients.test-connection');
        Route::post('/clients/{client}/sync', [ClientController::class, 'sync'])->name('clients.sync');
        Route::post('/clients/{client}/test-telegram', [NotificationTestController::class, 'telegram'])->name('clients.test-telegram');
        Route::post('/clients/{client}/test-email', [NotificationTestController::class, 'email'])->name('clients.test-email');
        Route::get('/clients/{client}/products', [PortaoneProductController::class, 'index'])->name('clients.products.index');
        Route::post('/clients/{client}/products/refresh', [PortaoneProductController::class, 'refresh'])->name('clients.products.refresh');
        Route::patch('/clients/{client}/products', [PortaoneProductController::class, 'update'])->name('clients.products.update');
        Route::get('/portaone', [PortaoneSettingController::class, 'edit'])->name('portaone.edit');
        Route::patch('/portaone', [PortaoneSettingController::class, 'update'])->name('portaone.update');
        Route::get('/telegram', [TelegramSettingController::class, 'edit'])->name('telegram.edit');
        Route::patch('/telegram', [TelegramSettingController::class, 'update'])->name('telegram.update');
        Route::post('/telegram/test', [NotificationTestController::class, 'adminTelegram'])->name('telegram.test');
        Route::get('/email', [EmailSettingController::class, 'edit'])->name('email.edit');
        Route::patch('/email', [EmailSettingController::class, 'update'])->name('email.update');
        Route::get('/platform-users', [PlatformUserController::class, 'index'])->name('platform-users.index');
        Route::post('/platform-users', [PlatformUserController::class, 'store'])->name('platform-users.store');
        Route::patch('/platform-users/{user}', [PlatformUserController::class, 'update'])->name('platform-users.update');
        Route::delete('/platform-users/{user}', [PlatformUserController::class, 'destroy'])->name('platform-users.destroy');
        Route::get('/status', [SystemStatusController::class, 'index'])->name('status.index');
        Route::get('/queue', [QueueMonitorController::class, 'index'])->name('queue.index');
        Route::post('/queue/failed/{uuid}/retry', [QueueMonitorController::class, 'retryFailed'])->name('queue.failed.retry');
        Route::delete('/queue/failed/{uuid}', [QueueMonitorController::class, 'forgetFailed'])->name('queue.failed.forget');
    });
    Route::get('/imports', [ImportBatchController::class, 'index'])->name('imports.index');
    Route::post('/imports', [ImportBatchController::class, 'store'])->name('imports.store');
    Route::resource('prefixes', PrefixRuleController::class)->except('destroy');
    Route::get('/calls', [CallRecordController::class, 'index'])->name('calls.index');
    Route::get('/destinations', [DestinationReportController::class, 'index'])->name('destinations.index');
    Route::get('/accounts', [AccountReportController::class, 'index'])->name('accounts.index');
    Route::get('/portaone-customers', [PortaoneAccountController::class, 'index'])->name('portaone-customers.index');
    Route::get('/portaone-customers/{customer}', [PortaoneAccountController::class, 'show'])->name('portaone-customers.show');
    Route::get('/portaone-accounts/{account}/calls', [PortaoneAccountController::class, 'accountCalls'])->name('portaone-accounts.calls');
    Route::get('/alerts', [MonitoringRuleEventController::class, 'index'])->name('alerts.index');
    Route::get('/ayuda', [HelpController::class, 'index'])->name('help.index');
    Route::get('/process-runs', [ProcessRunController::class, 'index'])->name('process-runs.index');
    Route::get('/users', [ClientUserController::class, 'index'])->name('users.index');
    Route::post('/users', [ClientUserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [ClientUserController::class, 'update'])->name('users.update');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
