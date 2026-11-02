<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class TimesheetProject extends Model
{
    use HasFactory;

    protected $table = 'timesheet_projects';

    protected $fillable = [
        'name',
        'azure_project_name',
        'azure_team_name',
        'bug_count_url',
        'pbi_with_feature_url',
        'pbi_without_feature_url',
        'description',
        'note',
        'filestorage_id',
    ];

    public function filestorage(): BelongsTo
    {
        return $this->belongsTo(FileStorage::class, 'filestorage_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'timesheet_project_user', 'timesheet_project_id', 'user_id')
                    ->withTimestamps();
    }
}
