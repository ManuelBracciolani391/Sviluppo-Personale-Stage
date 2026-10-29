<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sprint_dailies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sprint_id')->constrained('sprints')->cascadeOnDelete();
            $table->date('date');
            $table->string('status')->default('pending'); // pending | done | skipped
            $table->string('note')->nullable();
            $table->foreignId('credited_user_id')->nullable()->constrained('users');
            $table->unsignedSmallInteger('credited_minutes')->default(0);
            $table->timestamps();

            $table->unique(['sprint_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprint_dailies');
    }
};
