<?php

namespace App\Models;

use App\Enums\DailyStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SprintDaily extends Model
{
    use HasFactory;

    protected $table = 'sprint_dailies';

    protected $fillable = [
        'sprint_id',
        'date',
        'status',
        'note',
        'credited_user_id',
        'credited_minutes',
    ];

    protected $casts = [
        'date' => 'date',
        'status' => DailyStatus::class,
        'credited_minutes' => 'integer',
    ];

    /* ---------- Relazioni ---------- */

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    // Utente (Scrum Master) a cui sono stati accreditati i minuti della daily.
    public function creditedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'credited_user_id');
    }
}