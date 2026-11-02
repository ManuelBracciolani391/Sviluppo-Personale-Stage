<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('leave_audit_logs', function (Blueprint $table) {
            $table->uuid('operation_id')->nullable();
            $table->unsignedInteger('revision')->nullable();
            $table->string('action')->nullable();
            $table->unsignedBigInteger('balance_id')->nullable()->after('user_id');
            $table->timestamp('discarded_at')->nullable();

            // revision è NULL sulle righe di dettaglio, quindi l'unique vale solo per le teste
            $table->unique(['balance_id', 'revision']);
            $table->index(['balance_id', 'field_name']);

            $table->json('before_data')->nullable();
            $table->json('after_data')->nullable();

            $table->timestamp('undone_at')->nullable();
            $table->foreignId('undone_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->index(['user_id', 'revision']);
            $table->index('operation_id');
        });
    }

    public function down(): void
    {
        Schema::table('leave_audit_logs', function (Blueprint $table) {
            $table->dropForeign(['undone_by']);

            $table->dropIndex(['user_id', 'revision']);
            $table->dropIndex(['operation_id']);

            $table->dropColumn([
                'operation_id',
                'revision',
                'action',
                'before_data',
                'after_data',
                'undone_at',
                'undone_by',
            ]);
        });
    }
};
