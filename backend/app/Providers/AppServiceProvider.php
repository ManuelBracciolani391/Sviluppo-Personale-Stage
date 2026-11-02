<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;

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
        Gate::define('manage-users', function (User $user): bool {
            return $user->roles()
                ->whereIn('alias', ['Admin', 'HR'])
                ->exists();
        });

        // -> AGGIUNGI QUESTO GATE PER I PROGETTI <-
        Gate::define('manage-projects', function (User $user): bool {
            return $user->roles()
                ->whereIn('alias', ['Admin', 'Project Manager', 'PM'])
                ->exists();
        });

        ResetPassword::createUrlUsing(
            function ($notifiable, string $token): string {
                return 'http://localhost:3000/reset-password?token='
                    . $token
                    . '&email='
                    . urlencode($notifiable->getEmailForPasswordReset());
            }
        );
    }
}
