<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\FileStorage;
use App\Models\Assignmentrole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProjectController extends Controller
{
    private function checkProjectManagementAccess()
    {
        $user = auth()->user();

        if (!$user) {
            abort(response()->json([
                'success' => false,
                'message' => 'Utente non autenticato.'
            ], 401));
        }

        $isAdmin = $user->roles()->whereIn('alias', ['Admin', 'admin'])->exists();
        $isProjectManager = Project::where('project_manager_id', $user->id)->exists();

        if (!$isAdmin && !$isProjectManager) {
            abort(response()->json([
                'success' => false,
                'message' => 'Accesso negato: sezione riservata ad Admin e Project Manager.'
            ], 403));
        }
    }

    // Helper method per aggiungere l'URL del file storage
    private function appendFileStorageUrl($project)
    {
        if ($project && $project->filestorage) {
            $project->filestorage->url = asset('storage/' . $project->filestorage->path . '/' . $project->filestorage->name . '.' . $project->filestorage->extension);
        }
        return $project;
    }
    
    public function index(Request $request)
    {
        $this->checkProjectManagementAccess();

        $projectsQuery = Project::with([
            'projectManager', 
            'teamLeader', 
            'scrumMaster', 
            'filestorage', 
            'users', 
            'sprints' 
        ])
        ->where('is_timesheet', false)
        ->where('is_course', false);

        if ($request->filled('search')) {
            $search = strtolower($request->input('search'));
            $projectsQuery->whereRaw('LOWER(alias) LIKE ?', ["%{$search}%"]);
        }

        if ($request->filled('status')) {
            $projectsQuery->where('status', $request->input('status'));
        }

        if ($request->filled('priority')) {
            $projectsQuery->where('priority', $request->input('priority'));
        }

        if ($request->filled('project_manager')) {
            $pmName = strtolower($request->input('project_manager'));
            $projectsQuery->whereHas('projectManager', function ($q) use ($pmName) {
                $q->whereRaw('LOWER(first_name) LIKE ?', ["%{$pmName}%"])
                  ->orWhereRaw('LOWER(last_name) LIKE ?', ["%{$pmName}%"]);
            });
        }

        if ($request->filled('team_leader')) {
            $tlName = strtolower($request->input('team_leader'));
            $projectsQuery->whereHas('teamLeader', function ($q) use ($tlName) {
                $q->whereRaw('LOWER(first_name) LIKE ?', ["%{$tlName}%"])
                  ->orWhereRaw('LOWER(last_name) LIKE ?', ["%{$tlName}%"]);
            });
        }

        if ($request->filled('scrum_master')) {
            $smName = strtolower($request->input('scrum_master'));
            $projectsQuery->whereHas('scrumMaster', function ($q) use ($smName) {
                $q->whereRaw('LOWER(first_name) LIKE ?', ["%{$smName}%"])
                  ->orWhereRaw('LOWER(last_name) LIKE ?', ["%{$smName}%"]);
            });
        }

        $sortBy = $request->input('sort_by', 'id'); 
        $sortDirection = strtolower($request->input('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';

        $allowedSortFields = ['alias', 'status', 'priority', 'id', 'created_at', 'start_date'];
        
        if (in_array($sortBy, $allowedSortFields)) {
            $projectsQuery->orderBy($sortBy, $sortDirection);
        } else {
            $projectsQuery->orderBy('id', 'desc');
        }

        // --- APPLICHIAMO LA PAGINAZIONE A 10 ELEMENTI ---
        $projectsPaginator = $projectsQuery->paginate(10);

        // Mappiamo gli elementi all'interno della paginazione
        $projectsPaginator->getCollection()->transform(function ($project) {
            $this->appendFileStorageUrl($project);

            $hasMissingCsvs = $project->sprints->contains(function ($sprint) {
                return $sprint->requiresCsv() && !$sprint->has_csv;
            });

            return [
                'id' => $project->id,
                'alias' => $project->alias,
                'description' => $project->description,
                'status' => $project->status,
                'priority' => $project->priority,
                'note' => $project->note,
                'has_orange_dot' => !empty($project->note), 
                'has_red_dot' => $hasMissingCsvs,          
                'project_manager' => $project->projectManager,
                'team_leader' => $project->teamLeader,
                'scrum_master' => $project->scrumMaster,
                'filestorage' => $project->filestorage,
                'users' => $project->users,
                'sprints_count' => $project->sprints->count(),
                'missing_csv_count' => $project->sprints->filter(function ($sprint) {
                    return $sprint->requiresCsv() && !$sprint->has_csv;
                })->count(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $projectsPaginator,
            'projects_count' => $projectsPaginator->total(),
        ], 200);
    }

    public function store(Request $request)
    {
        $this->checkProjectManagementAccess();

        $validatedData = $request->validate([
            'alias' => 'required|string|max:255|unique:projects,alias',
            'description' => 'nullable|string',
            'is_daily' => 'boolean',
            'is_azure' => 'boolean',
            'is_ux_ui' => 'boolean',
            'status' => 'nullable|string',
            'azure_project_name' => 'nullable|string',
            'project_manager_id' => 'required|exists:users,id',
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
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'filestorage_id' => 'nullable|exists:filestorage,id',
            'work_allocation' => 'nullable|integer',
        ]);

        $project = Project::create($validatedData);

        if ($project->project_manager_id) {
            $pmRole = Assignmentrole::where('alias', 'Project Manager')->first();
            $roleId = $pmRole ? $pmRole->id : 6;

            $project->users()->syncWithoutDetaching([
                $project->project_manager_id => [
                    'assignmentrole_id' => $roleId,
                    'startwork_date' => $project->start_date ?? now(),
                    'endwork_date' => $project->end_date,
                    'work_allocation' => $request->input('work_allocation', null),
                ]
            ]);
        }

        $project->load(['filestorage', 'users']);
        $this->appendFileStorageUrl($project);

        return response()->json([
            'success' => true,
            'message' => 'Progetto creato con successo e Project Manager associato!',
            'data' => $project
        ], 201);
    }

    public function show($id)
    {
        $this->checkProjectManagementAccess();

        $project = Project::with(['projectManager', 'teamLeader', 'scrumMaster', 'filestorage', 'users'])->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $this->appendFileStorageUrl($project);

        return response()->json([
            'success' => true,
            'data' => $project
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $this->checkProjectManagementAccess();

        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $validatedData = $request->validate([
            'alias' => 'sometimes|required|string|max:255|unique:projects,alias,' . $id,
            'description' => 'nullable|string',
            'is_daily' => 'boolean',
            'is_azure' => 'boolean',
            'is_ux_ui' => 'boolean',
            'status' => 'nullable|string',
            'azure_project_name' => 'nullable|string',
            'project_manager_id' => 'required|exists:users,id',
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
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'filestorage_id' => 'nullable|exists:filestorage,id',
            'work_allocation' => 'nullable|integer',
        ]);

        $project->update($validatedData);

        if ($project->project_manager_id) {
            $pmRole = Assignmentrole::where('alias', 'Project Manager')->first();
            $roleId = $pmRole ? $pmRole->id : 6;

            $project->users()->syncWithoutDetaching([
                $project->project_manager_id => [
                    'assignmentrole_id' => $roleId,
                    'startwork_date' => $project->start_date ?? now(),
                    'endwork_date' => $project->end_date,
                    'work_allocation' => $request->input('work_allocation', null),
                ]
            ]);
        }

        $project->load(['filestorage', 'users']);
        $this->appendFileStorageUrl($project);

        return response()->json([
            'success' => true,
            'message' => 'Progetto aggiornato con successo!',
            'data' => $project
        ], 200);
    }

    public function destroy($id)
    {
        $this->checkProjectManagementAccess();

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
        $this->checkProjectManagementAccess();

        $project = Project::onlyTrashed()->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto eliminato non trovato.'
            ], 404);
        }

        $project->restore();
        $project->load(['filestorage', 'users']);
        $this->appendFileStorageUrl($project);

        return response()->json([
            'success' => true,
            'message' => 'Progetto ripristinato con successo!',
            'data' => $project
        ], 200);
    }

    public function uploadFile(Request $request, $id)
    {
        $this->checkProjectManagementAccess();

        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('project_files', 'public');

            $fileStorage = FileStorage::create([
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'extension' => $file->getClientOriginalExtension(),
                'type' => $file->getClientMimeType(),
            ]);

            $project->filestorage_id = $fileStorage->id;
            $project->save();

            $project->load('filestorage');
            $this->appendFileStorageUrl($project);

            return response()->json([
                'success' => true,
                'message' => 'File caricato e associato con successo!',
                'data' => [
                    'project' => $project,
                    'filestorage_url' => $project->filestorage->url ?? null
                ]
            ], 200);
        }

        return response()->json([
            'success' => false,
            'message' => 'Nessun file inviato.'
        ], 400);
    }

    public function getProjectCsvs($id)
    {
        $this->checkProjectManagementAccess();

        $project = Project::with('sprints')->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $csvCaricati = $project->sprints->filter(function ($sprint) {
            return $sprint->has_csv || !$sprint->requiresCsv();
        })->values();

        $csvMancanti = $project->sprints->filter(function ($sprint) {
            return $sprint->requiresCsv() && !$sprint->has_csv;
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'project_id' => $project->id,
                'project_alias' => $project->alias,
                'csv_caricati' => [
                    'count' => $csvCaricati->count(),
                    'items' => $csvCaricati
                ],
                'csv_mancanti' => [
                    'count' => $csvMancanti->count(),
                    'items' => $csvMancanti
                ]
            ]
        ], 200);
    }
}