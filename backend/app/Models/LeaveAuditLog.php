<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveAuditLog extends Model
{
    use HasFactory;

    protected $table = 'leave_audit_logs';

    protected $fillable = [
        'user_id',
        'admin_id',
        'leave_type',
        'reference_month',
        'field_name',
        'old_value',
        'new_value',
        'operation_id',
        'revision',
        'action',
        'before_data',
        'after_data',
        'undone_at',
        'undone_by',
        'balance_id',
        'discarded_at',
    ];

    protected $casts = [
        'reference_month' => 'date',
        'old_value' => 'decimal:2',
        'new_value' => 'decimal:2',
        'before_data' => 'array',
        'after_data' => 'array',
        'undone_at' => 'datetime',
        'discarded_at' => 'datetime',
    ];

    /**
     * L'utente a cui si riferisce la modifica dei permessi/ferie.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * L'utente HR/Admin che ha eseguito la modifica.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}