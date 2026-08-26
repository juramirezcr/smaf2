<?php

namespace App\Providers;

use App\Services\AdminAlertNotifier;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Queue::failing(function (JobFailed $event) {
            $this->app->make(AdminAlertNotifier::class)->notify(sprintf(
                "El job <b>%s</b> falló definitivamente.\n\n%s",
                class_basename($event->job->resolveName()),
                $event->exception->getMessage(),
            ));
        });

        // TEMP local-only test shim: TODO revert before commit.
        if (DB::connection()->getDriverName() === 'sqlite') {
            $pdo = DB::connection()->getPdo();
            $pdo->sqliteCreateFunction('FLOOR', fn ($v) => floor($v), 1);
            $pdo->sqliteCreateFunction('DAYOFWEEK', fn ($d) => (int) date('N', strtotime($d)) % 7 + 1, 1);
            $pdo->sqliteCreateFunction('HOUR', fn ($d) => (int) date('G', strtotime($d)), 1);
            $pdo->sqliteCreateFunction('UNIX_TIMESTAMP', fn ($d) => strtotime($d), 1);
        }
    }
}
