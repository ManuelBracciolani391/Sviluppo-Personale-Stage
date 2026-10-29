<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'alias' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:in corso,manutenzione,sospeso,concluso',
            'priority' => 'required|in:bassa,media,alta',
            'project_manager_id' => 'required|exists:users,id',
            'team_leader_id' => 'required|exists:users,id',
            'scrumMaster' => 'required|exists:users,id', // coerenza con il nome della relazione
            'azure_project_name' => 'nullable|string',
            'azure_team_name' => 'required|string',
            'bug_count_url' => 'required|string',
            'pbi_without_feature_url' => 'nullable|string',
            'pbi_past_feature_url' => 'nullable|string',
            'is_daily' => 'boolean',
            'is_azure' => 'boolean',
            'is_ux_ui' => 'boolean',
            'is_timesheet' => 'boolean',
            'is_course' => 'boolean',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
            'filestorage_id' => 'required|exists:filestorage,id',
            'note' => 'nullable|string',
        ];
    }
}