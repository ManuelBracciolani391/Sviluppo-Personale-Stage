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
                Schema::create('sprints', function (Blueprint $table) {
                        $table->id();

                        $table->foreignId('project_id')
                                ->constrained('projects')
                                ->restrictOnDelete();
                        $table->unsignedSmallInteger('number');

                        $table->date('start_date');
                        $table->date('end_date');

                        $table->boolean('is_concluded')->default(false);
                        $table->boolean('is_pilot')->default(false);
                        $table->boolean('is_billing')->default(false);
                        $table->boolean('has_csv')->default(false);
                        $table->boolean('is_planningdone')->default(false);
                        $table->boolean('is_estimatedone')->default(false);
                        $table->boolean('is_reviewdone')->default(false);
                        $table->unsignedSmallInteger('daily_duration')->nullable()->default(30);   // minuti
                        $table->decimal('team_assessment', 3, 1)->nullable();
                        $table->timestamp('closed_at')->nullable();

                        $table->unique(['project_id', 'number']);

                        $table->timestamps();
                        $table->softDeletes();

                        $table->foreignId('teamcategory_id')
                                ->constrained('teamcategories')
                                ->restrictOnDelete();
                });
        }

        public function down(): void
        {
                Schema::dropIfExists('sprints');
        }

};
