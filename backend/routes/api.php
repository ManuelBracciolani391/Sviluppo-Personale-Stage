<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\UserLeaveBalanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectMemberController;
use App\Http\Controllers\Api\TimesheetProjectController;
use App\Http\Controllers\Api\TimesheetProjectMemberController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotte Pubbliche
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
| Rotte Protette (Auth: Sanctum)
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
    | Gestione Utenti (Admin / manage-users)
    |--------------------------------------------------------------------------
    */
    Route::middleware('can:manage-users')
        ->prefix('users')
        ->name('users.')
        ->controller(UserController::class)
        ->group(function () {
            Route::get('/allocation-list', 'listForAllocation')->name('allocation-list');
            Route::get('/disabled', 'disabled')->name('disabled');
            Route::patch('/{id}/restore', 'restore')->name('restore');
            Route::get('/index', 'index')->name('index');
            Route::post('/store', 'store')->name('store');
            Route::get('/{user}', 'show')->name('show');
            Route::put('/{user}', 'update')->name('update');
            Route::patch('/{user}', 'update')->name('patch');
            Route::delete('/{user}', 'destroy')->name('destroy');
        });


    /*
    |--------------------------------------------------------------------------
    | Gestione Saldi Permessi Utente
    |--------------------------------------------------------------------------
    */
    Route::middleware('can:manage-users')
        ->prefix('users/{user}/leave-balances')
        ->name('users.leave-balances.')
        ->controller(UserLeaveBalanceController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::get('/{leaveBalance}', 'show')->name('show');
            Route::put('/{leaveBalance}', 'update')->name('update');
            Route::delete('/{leaveBalance}', 'destroy')->name('destroy');
            Route::get('/{balanceId}/history', 'history')->whereNumber('balanceId')->name('history');
            Route::post('/{balanceId}/undo', 'undo')->whereNumber('balanceId')->name('undo');
            Route::post('/{balanceId}/redo', 'redo')->whereNumber('balanceId')->name('redo');
        });


    /*
    |--------------------------------------------------------------------------
    | Modulo Progetti (Projects)
    | Lettura libera per utenti autenticati, Scrittura protetta da permessi
    |--------------------------------------------------------------------------
    */
    // Lettura aperta a tutti gli utenti autenticati
    Route::get('projects', [ProjectController::class, 'index']);
    Route::get('projects/{id}', [ProjectController::class, 'show']);

    // Azioni di scrittura/modifica protette (es. blocco per utenti standard come Giulia -> 403 Forbidden)
    Route::middleware('can:manage-projects')->group(function () {
        Route::post('projects', [ProjectController::class, 'store']);
        Route::put('projects/{id}', [ProjectController::class, 'update']);
        Route::delete('projects/{id}', [ProjectController::class, 'destroy']);
        Route::post('projects/{id}/restore', [ProjectController::class, 'restore']);
        Route::post('projects/{id}/upload-file', [ProjectController::class, 'uploadFile']);
    });

    // Membri del Progetto Standard
    Route::get('projects/{projectId}/members', [ProjectMemberController::class, 'index']);
    Route::post('projects/{projectId}/members', [ProjectMemberController::class, 'store']);
    Route::delete('projects/{projectId}/members/{userId}', [ProjectMemberController::class, 'destroy']);


    /*
    |--------------------------------------------------------------------------
    | Modulo Timesheet Projects
    |--------------------------------------------------------------------------
    */
    Route::apiResource('timesheet-projects', TimesheetProjectController::class);
    Route::post('timesheet-projects/{id}/upload-logo', [TimesheetProjectController::class, 'uploadLogo']);
    Route::put('timesheet-projects/{id}/note', [TimesheetProjectController::class, 'updateNote']);

    Route::get('timesheet-projects/{timesheetProjectId}/members', [TimesheetProjectMemberController::class, 'index']);
    Route::post('timesheet-projects/{timesheetProjectId}/members', [TimesheetProjectMemberController::class, 'store']);
    Route::delete('timesheet-projects/{timesheetProjectId}/members/{userId}', [TimesheetProjectMemberController::class, 'destroy']);

});


require __DIR__ . '/scrum.php';
