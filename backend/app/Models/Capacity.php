<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Capacity extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'sprint_id',
        'date',
        'value',
        'billing_value',
        'note',
    ];

    protected $casts = [
        'date' => 'date',
        'value' => 'decimal:2',
        'billing_value' => 'decimal:2',
    ];

    /* ---------- Relazioni ---------- */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    /* ---------- Scope ---------- */

    public function scopeForSprint(Builder $query, int $sprintId): Builder
    {
        return $query->where('sprint_id', $sprintId);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /* ---------- Helper ---------- */

    // Fatturazione "simulata": se non è ancora stata inserita usa la capacity.
    public function simulatedBilling(): float
    {
        return (float) ($this->billing_value ?? $this->value);
    }
}