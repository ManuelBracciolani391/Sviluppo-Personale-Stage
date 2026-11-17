<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timesheet_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nome del progetto timesheet
            $table->string('azure_project_name')->nullable(); // Nome progetto Azure
            $table->string('azure_team_name')->nullable(); // Nome team Azure
            $table->string('bug_count_url')->nullable(); // Link bug count
            $table->string('pbi_with_feature_url')->nullable(); // Link PBI con feature passata
            $table->string('pbi_without_feature_url')->nullable(); // Link PBI senza feature passata
            $table->text('description')->nullable(); // Descrizione
            
            // Relazione con la tabella filestorage per il logo del progetto
            $table->foreignId('filestorage_id')->nullable()->constrained('filestorage')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timesheet_projects');
    }
};