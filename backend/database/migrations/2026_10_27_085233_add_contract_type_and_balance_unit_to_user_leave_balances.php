<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('user_leave_balances', function (Blueprint $table) {
            $table->string('contract_type')->nullable();
            $table->string('balance_unit', 10)->nullable();
        });

        Schema::table('leave_audit_logs', function (Blueprint $table) {
            $table->dropForeign(['admin_id']);
            $table->unsignedBigInteger('admin_id')->nullable()->change();

            $table->foreign('admin_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Prima del rollback, assegna agli audit senza operatore
        // l'utente a cui si riferisce la modifica.
        DB::table('leave_audit_logs')
            ->whereNull('admin_id')
            ->update([
                'admin_id' => DB::raw('user_id'),
            ]);

        Schema::table('leave_audit_logs', function (Blueprint $table) {
            $table->dropForeign(['admin_id']);
            $table->unsignedBigInteger('admin_id')->nullable(false)->change();

            $table->foreign('admin_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });

        Schema::table('user_leave_balances', function (Blueprint $table) {
            $table->dropColumn([
                'contract_type',
                'balance_unit',
            ]);
        });
    }
};
