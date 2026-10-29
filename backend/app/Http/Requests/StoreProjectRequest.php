<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    /**
     * Determina se l'utente è autorizzato a fare questa richiesta.
     */
    public function authorize(): bool
    {
        return true; 
    }

    /**
     * Regole di validazione per la creazione del progetto.
     */
    public function rules(): array
    {
        return [
            'alias' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'required|in:in corso,manutenzione,sospeso,concluso',
            'priority' => 'required|in:bassa,media,alta',
            'project_manager_id' => 'required|exists:users,id',
            'team_leader_id' => 'required|exists:users,id',
            'scrum_master_id' => 'required|exists:users,id',
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