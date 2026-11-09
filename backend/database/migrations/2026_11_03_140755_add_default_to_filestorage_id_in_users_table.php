<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Dice a MySQL di impostare il valore di default a 1 sulla tabella esistente
        DB::statement("ALTER TABLE users ALTER COLUMN filestorage_id SET DEFAULT 1;");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users ALTER COLUMN filestorage_id DROP DEFAULT;");
    }
};