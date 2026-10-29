<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\FileStorage;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
   
    public function index()
    {
        $projects = Project::with(['projectManager', 'teamLeader', 'scrumMaster', 'filestorage', 'users'])->get();

        return response()->json([
            'success' => true,
            'data' => $projects
        ], 200);
    }

    
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'alias' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_daily' => 'boolean',
            'is_azure' => 'boolean',
            'is_ux_ui' => 'boolean',
            'status' => 'nullable|string',
            'azure_project_name' => 'nullable|string',
            'project_manager_id' => 'nullable|exists:users,id',
            'team_leader_id' => 'nullable|exists:users,id',
            'scrum_master_id' => 'nullable|exists:users,id',
            'delivery_plan' => 'nullable|string',
            'sprintreview_id' => 'nullable|integer',
            'azure_team_name' => 'nullable|string',
            'bug_count_url' => 'nullable|url',
            'note' => 'nullable|string',
            'priority' => 'nullable|string',
            'pbi_without_feature_url' => 'nullable|url',
            'pbi_past_feature_url' => 'nullable|url',
            'is_timesheet' => 'boolean',
            'is_course' => 'boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'filestorage_id' => 'nullable|exists:file_storages,id',
        ]);

        $project = Project::create($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Progetto creato con successo!',
            'data' => $project
        ], 201);
    }

    public function show($id)
    {
        $project = Project::with(['projectManager', 'teamLeader', 'scrumMaster', 'filestorage', 'users'])->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $project
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $validatedData = $request->validate([
            'alias' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'is_daily' => 'boolean',
            'is_azure' => 'boolean',
            'is_ux_ui' => 'boolean',
            'status' => 'nullable|string',
            'azure_project_name' => 'nullable|string',
            'project_manager_id' => 'nullable|exists:users,id',
            'team_leader_id' => 'nullable|exists:users,id',
            'scrum_master_id' => 'nullable|exists:users,id',
            'delivery_plan' => 'nullable|string',
            'sprintreview_id' => 'nullable|integer',
            'azure_team_name' => 'nullable|string',
            'bug_count_url' => 'nullable|url',
            'note' => 'nullable|string',
            'priority' => 'nullable|string',
            'pbi_without_feature_url' => 'nullable|url',
            'pbi_past_feature_url' => 'nullable|url',
            'is_timesheet' => 'boolean',
            'is_course' => 'boolean',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'filestorage_id' => 'nullable|exists:file_storages,id',
        ]);

        $project->update($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Progetto aggiornato con successo!',
            'data' => $project
        ], 200);
    }

    public function destroy($id)
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Progetto eliminato con successo (cestinato).'
        ], 200);
    }

    public function restore($id)
    {
        $project = Project::onlyTrashed()->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto eliminato non trovato o non inesistente.'
            ], 404);
        }

        $project->restore();

        return response()->json([
            'success' => true,
            'message' => 'Progetto ripristinato con successo!',
            'data' => $project
        ], 200);
    }

    public function uploadFile(Request $request, $id)
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('project_files', 'public');

            // Mappato correttamente sui campi del modello FileStorage
            $fileStorage = FileStorage::create([
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'extension' => $file->getClientOriginalExtension(),
                'type' => $file->getClientMimeType(),
            ]);

            $project->filestorage_id = $fileStorage->id;
            $project->save();

            return response()->json([
                'success' => true,
                'message' => 'File caricato e associato con successo!',
                'data' => [
                    'project' => $project->load('filestorage')
                ]
            ], 200);
        }

        return response()->json([
            'success' => false,
            'message' => 'Nessun file inviato.'
        ], 400);
    }
}