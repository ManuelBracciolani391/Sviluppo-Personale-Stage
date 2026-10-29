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
        Schema::create('sprint_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sprint_id')->constrained('sprints')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users'); // null = metrica di team
            $table->date('date')->nullable();                               // null = metrica dello sprint
            $table->string('key');                                          // vecchio alias
            $table->decimal('value', 10, 2)->nullable();
            $table->decimal('billing_value', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['sprint_id', 'user_id', 'date', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprint_metrics');
    }
};
