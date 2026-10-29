<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SprintMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'sprint_id',
        'user_id',
        'date',
        'key',
        'value',
        'billing_value',
    ];

    protected $casts = [
        'date' => 'date',
        'value' => 'decimal:2',
        'billing_value' => 'decimal:2',
    ];

    /* ---------- Relazioni ---------- */

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /* ---------- Scope ---------- */

    // Es. SprintMetric::forKey('velocity')->where('sprint_id', $id)->first()
    public function scopeForKey(Builder $query, string $key): Builder
    {
        return $query->where('key', $key);
    }

    // Metriche di team o di sprint (non legate a un utente).
    public function scopeTeamLevel(Builder $query): Builder
    {
        return $query->whereNull('user_id');
    }
}