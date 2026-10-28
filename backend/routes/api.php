<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\UserLeaveBalanceController;
use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotte pubbliche
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login'])
    ->name('login');

Route::post('/forgot-password', [
    AuthController::class,
    'forgotPassword',
])->name('password.email');

Route::post('/reset-password', [
    AuthController::class,
    'resetPassword',
])->name('password.update');


/*
|--------------------------------------------------------------------------
| Rotte per utenti autenticati
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [
        AuthController::class,
        'logout',
    ])->name('logout');

    Route::get('/user', function (Request $request) {
        return $request->user();
    })->name('user.profile');


    /*
    |--------------------------------------------------------------------------
    | Gestione utenti - Admin e HR
    |--------------------------------------------------------------------------
    */

    Route::middleware('can:manage-users')
        ->prefix('users')
        ->name('users.')
        ->controller(UserController::class)
        ->group(function () {

            Route::get('/allocation-list', 'listForAllocation')
                ->name('allocation-list');

            Route::get('/disabled', 'disabled')
                ->name('disabled');

            Route::patch('/{id}/restore', 'restore')
                ->name('restore');

            Route::get('/index', 'index')
                ->name('index');

            Route::post('/store', 'store')
                ->name('store');

            Route::get('/{user}', 'show')
                ->name('show');

            Route::put('/{user}', 'update')
                ->name('update');

            Route::patch('/{user}', 'update')
                ->name('patch');

            Route::delete('/{user}', 'destroy')
                ->name('destroy');
        });


    /*
    |--------------------------------------------------------------------------
    | Gestione ferie, permessi e ROL - Admin e HR
    |--------------------------------------------------------------------------
    */

    Route::middleware('can:manage-users')
        ->prefix('users/{user}/leave-balances')
        ->name('users.leave-balances.')
        ->controller(UserLeaveBalanceController::class)
        ->group(function () {

            Route::get('/', 'index')
                ->name('index');

            Route::post('/', 'store')
                ->name('store');

            Route::get('/{leaveBalance}', 'show')
                ->name('show');

            Route::put('/{leaveBalance}', 'update')
                ->name('update');

            Route::delete('/{leaveBalance}', 'destroy')
                ->name('destroy');

            /*
            | Undo / redo per singolo record.
            | {balanceId} è un intero semplice (non un model binding): il record
            | potrebbe essere stato eliminato da un undo e dev'essere ripristinabile.
            */
            Route::get('/{balanceId}/history', 'history')
                ->whereNumber('balanceId')
                ->name('history');

            Route::post('/{balanceId}/undo', 'undo')
                ->whereNumber('balanceId')
                ->name('undo');

            Route::post('/{balanceId}/redo', 'redo')
                ->whereNumber('balanceId')
                ->name('redo');
        });
});
