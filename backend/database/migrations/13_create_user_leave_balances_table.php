
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_leave_balances', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->enum('leave_type', ['ferie', 'permesso', 'rol']);

            $table->date('reference_month');

            $table->string('contract_type')->nullable();
            $table->string('balance_unit')->default('ore');

            $table->decimal('remaining_hours', 8, 2)->default(0);
            $table->decimal('accrued_hours', 8, 2)->default(0);
            $table->decimal('monthly_accrual', 8, 2)->default(0);

            $table->timestamps();

            $table->unique([
                'user_id',
                'leave_type',
                'reference_month',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_leave_balances');
    }
};
