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
                Schema::create('capacities', function (Blueprint $table) {
                        $table->id();

                        $table->foreignId('user_id')
                                ->constrained('users')
                                ->restrictOnDelete();

                        $table->date('date');

                        $table->decimal('value', 8, 2)->unsigned();

                        $table->decimal('billing_value', 8, 2)
                                ->unsigned()
                                ->nullable();

                        $table->foreignId('sprint_id')
                                ->constrained('sprints')
                                ->restrictOnDelete();

                        $table->unique(['sprint_id', 'user_id', 'date']);

                        $table->timestamps();
                        $table->softDeletes();
                });
        }

        public function down(): void
        {
                Schema::dropIfExists('capacities');
        }

};
