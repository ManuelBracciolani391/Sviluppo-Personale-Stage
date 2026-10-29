<?php

namespace App\Models;

use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sprint extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'teamcategory_id',
        'number',
        'start_date',
        'end_date',
        'is_concluded',
        'is_pilot',
        'is_billing',
        'has_csv',
        'is_planningdone',
        'is_estimatedone',
        'is_reviewdone',
        'daily_duration',
        'team_assessment',
        'closed_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_concluded' => 'boolean',
        'is_pilot' => 'boolean',
        'is_billing' => 'boolean',
        'has_csv' => 'boolean',
        'is_planningdone' => 'boolean',
        'is_estimatedone' => 'boolean',
        'is_reviewdone' => 'boolean',
        'daily_duration' => 'integer',
        'team_assessment' => 'decimal:1',
        'closed_at' => 'datetime',
    ];

    /* ---------- Relazioni ---------- */

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function teamCategory(): BelongsTo
    {
        return $this->belongsTo(TeamCategory::class, 'teamcategory_id');
    }

    public function capacities(): HasMany
    {
        return $this->hasMany(Capacity::class);
    }

    public function dailies(): HasMany
    {
        return $this->hasMany(SprintDaily::class);
    }

    public function metrics(): HasMany
    {
        return $this->hasMany(SprintMetric::class);
    }

    /* ---------- Scope ---------- */

    // Lo sprint corrente è derivato dalle date e dallo stato, non da un flag salvato.
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('is_concluded', false)
            ->whereDate('start_date', '<=', today())
            ->whereDate('end_date', '>=', today());
    }

    public function scopeForProject(Builder $query, int $projectId): Builder
    {
        return $query->where('project_id', $projectId);
    }

    /* ---------- Helper ---------- */

    public function isCurrent(): bool
    {
        return !$this->is_concluded
            && today()->betweenIncluded($this->start_date, $this->end_date);
    }

    // Giorni lavorativi (lun-ven) dello sprint: le colonne della griglia.
    // Le festività non sono considerate.
    public function workingDays(): array
    {
        return CarbonPeriod::create($this->start_date, $this->end_date)
            ->filter(fn($date) => $date->isWeekday())
            ->toArray();
    }
}