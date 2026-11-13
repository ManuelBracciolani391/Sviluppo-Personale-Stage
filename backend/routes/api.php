
<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\UserLeaveBalanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectMemberController;
use App\Http\Controllers\Api\TimesheetProjectController;
use App\Http\Controllers\Api\TimesheetProjectMemberController;
use App\Http\Controllers\Api\AllocationManagementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rotte pubbliche
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

// Rotte protette
Route::middleware('auth:sanctum')->group(function () {

    // Profilo utente
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Gestione utenti
    Route::middleware('can:manage-users')->group(function () {
        Route::apiResource('users', UserController::class);

        // Gestione ferie e permessi
        Route::get(
            '/users/{user}/leave-balances',
            [UserLeaveBalanceController::class, 'index']
        );

        Route::put(
            '/users/{user}/leave-balances',
            [UserLeaveBalanceController::class, 'update']
        );
    });

    // Gestione allocazioni
    Route::middleware('can:manage-allocations')
        ->prefix('allocations')
        ->name('allocations.')
        ->controller(AllocationManagementController::class)
        ->group(function () {

            Route::get('/', 'index')->name('index');

            // Dati separati per Timesheet
            Route::get('/timesheet', 'timesheetIndex')
                ->name('timesheet.index');

            Route::get('/user/{user}', 'userDetail')
                ->name('user.detail');

            Route::get('/project/{project}', 'projectDetail')
                ->name('project.detail');

            // Assegnazioni ai progetti normali
            Route::post('/assign', 'storeAllocation')
                ->name('assign');

            Route::put(
                '/project/{projectId}/user/{userId}',
                'updateAllocation'
            )->name('update');

            Route::delete(
                '/project/{projectId}/user/{userId}/terminate',
                'terminateAllocation'
            )->name('terminate');

            Route::patch(
                '/project/{projectId}/user/{userId}/toggle-difficulty',
                'toggleDifficulty'
            )->name('toggle-difficulty');

            // Necessità del progetto
            Route::post('/project/{project}/needs', 'storeNeed')
                ->name('needs.store');

            Route::delete('/needs/{need}', 'destroyNeed')
                ->name('needs.destroy');
        });

    // Gestione progetti
    Route::apiResource('projects', ProjectController::class);

    // Membri dei progetti
    Route::get(
        '/projects/{projectId}/members',
        [ProjectMemberController::class, 'index']
    );

    Route::post(
        '/projects/{projectId}/members',
        [ProjectMemberController::class, 'store']
    );

    Route::delete(
        '/projects/{projectId}/members/{userId}',
        [ProjectMemberController::class, 'destroy']
    );

    // Gestione Timesheet
    Route::apiResource(
        'timesheet-projects',
        TimesheetProjectController::class
    );

    Route::post(
        '/timesheet-projects/{timesheetProject}/upload-logo',
        [TimesheetProjectController::class, 'uploadLogo']
    );

    Route::put(
        '/timesheet-projects/{timesheetProject}/note',
        [TimesheetProjectController::class, 'updateNote']
    );

    // Associazione semplice degli utenti ai Timesheet
    Route::get(
        '/timesheet-projects/{timesheetProjectId}/members',
        [TimesheetProjectMemberController::class, 'index']
    );

    Route::post(
        '/timesheet-projects/{timesheetProjectId}/members',
        [TimesheetProjectMemberController::class, 'store']
    );

    Route::delete(
        '/timesheet-projects/{timesheetProjectId}/members/{userId}',
        [TimesheetProjectMemberController::class, 'destroy']
    );
});
