<?php

use App\Http\Controllers\Admin\ReleaseController;
use App\Http\Controllers\ClientUserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImportBatchController;
use App\Http\Controllers\PrefixRuleController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login');

Route::get('/dashboard', DashboardController::class)
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/admin/releases', ReleaseController::class)->name('admin.releases');
    Route::get('/imports', [ImportBatchController::class, 'index'])->name('imports.index');
    Route::post('/imports', [ImportBatchController::class, 'store'])->name('imports.store');
    Route::resource('prefixes', PrefixRuleController::class)->except('destroy');
    Route::get('/users', [ClientUserController::class, 'index'])->name('users.index');
    Route::post('/users', [ClientUserController::class, 'store'])->name('users.store');
    Route::patch('/users/{user}', [ClientUserController::class, 'update'])->name('users.update');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
