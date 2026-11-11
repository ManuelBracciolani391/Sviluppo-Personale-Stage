<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_user', function (Blueprint $table) {
            $table->boolean('is_difficult')->default(false)->after('work_allocation');
        });
    }

    public function down(): void
    {
        Schema::table('project_user', function (Blueprint $table) {
            $table->dropColumn('is_difficult');
        });
    }
};