<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserLeaveBalanceController;

Route::
    prefix('users')
    ->name('users.')
    ->controller(UserController::class)
    ->group(function () {

        Route::get('/allocation-list', 'listForAllocation')
            ->name('allocation-list');
        Route::get('/disabled', 'disabled')
            ->name('disabled');
        Route::patch('/{id}/restore', 'restore')
            ->name('restore');

        Route::get('/index', 'index')->name('index');
        Route::post('/store', 'store')->name('store');
        Route::get('/{user}', 'show')->name('show');
        Route::put('/{user}', 'update')->name('update');
        Route::patch('/{user}', 'update')->name('patch');
        Route::delete('/{user}', 'destroy')->name('destroy');
    });



Route::prefix('users/{user}/leave-balances')
    ->controller(UserLeaveBalanceController::class)
    ->group(function () {
        Route::get('/', 'index');
        Route::post('/', 'store');

        Route::get('/{leaveBalance}', 'show');
        Route::put('/{leaveBalance}', 'update');
        Route::delete('/{leaveBalance}', 'destroy');
    });

