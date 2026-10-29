<?php

use App\Http\Controllers\CapacityController;
use App\Http\Controllers\SprintController;
use App\Http\Controllers\SprintDailyController;
use App\Http\Controllers\SprintMemberController;
use Illuminate\Support\Facades\Route;

/*
| Rotte Scrum / Fatturazione.
| Includile in routes/api.php:  require __DIR__ . '/scrum.php';
| Adatta il middleware di autenticazione a quello che usate per le altre API.
| I permessi (Admin / Scrum Master / Team Leader / Project Manager) sono gestiti da SprintPolicy.
*/

$date = '[0-9]{4}-[0-9]{2}-[0-9]{2}'; // Y-m-d

Route::middleware('auth:sanctum')->prefix('scrum')->name('scrum.')->group(function () use ($date) {

    // Sprint di un progetto
    Route::get('projects/{project}/sprints', [SprintController::class, 'index'])
        ->whereNumber('project')->name('sprints.index');
    Route::post('projects/{project}/sprints', [SprintController::class, 'store'])
        ->whereNumber('project')->name('sprints.store');

    // Singolo sprint: griglia, flag/assessment, chiusura
    Route::get('sprints/{sprint}', [SprintController::class, 'show'])
        ->whereNumber('sprint')->name('sprints.show');
    Route::patch('sprints/{sprint}', [SprintController::class, 'update'])
        ->whereNumber('sprint')->name('sprints.update');
    Route::post('sprints/{sprint}/close', [SprintController::class, 'close'])
        ->whereNumber('sprint')->name('sprints.close');

    // Team dello sprint
    Route::post('sprints/{sprint}/members', [SprintMemberController::class, 'store'])
        ->whereNumber('sprint')->name('members.store');
    Route::delete('sprints/{sprint}/members/{user}', [SprintMemberController::class, 'destroy'])
        ->whereNumber(['sprint', 'user'])->name('members.destroy');

    // Cella capacity/fatturazione (utente + giorno)
    Route::put('sprints/{sprint}/users/{user}/capacities/{date}', [CapacityController::class, 'update'])
        ->whereNumber(['sprint', 'user'])->where('date', $date)->name('capacities.update');

    // Daily del giorno
    Route::put('sprints/{sprint}/dailies/{date}', [SprintDailyController::class, 'update'])
        ->whereNumber('sprint')->where('date', $date)->name('dailies.update');
});