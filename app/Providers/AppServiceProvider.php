<?php

namespace App\Providers;

use App\Services\AdminAlertNotifier;
use Illuminate\Queue\Events\JobFailed;
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
    }
}
