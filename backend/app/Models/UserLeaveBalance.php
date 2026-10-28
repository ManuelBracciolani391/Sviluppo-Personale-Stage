<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLeaveBalance extends Model
{
    use HasFactory;

    protected $table = 'user_leave_balances';

    protected $fillable = [
        'user_id',
        'leave_type',
        'contract_type', // se lo hai aggiunto
        'reference_month',
        'remaining_hours',
        'accrued_hours',
        'monthly_accrual',
    ];

    protected $casts = [
        'reference_month' => 'date',
        'remaining_hours' => 'decimal:2',
        'accrued_hours' => 'decimal:2',
        'monthly_accrual' => 'decimal:2',
    ];

    /**
     * Relazione con l'utente proprietario dei permessi/ferie.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}