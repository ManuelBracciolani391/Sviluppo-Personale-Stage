<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimesheetProject;
use App\Models\FileStorage;
use Illuminate\Http\Request;

class TimesheetProjectController extends Controller
{
    
    public function index()
    {
        $projects = TimesheetProject::with(['filestorage', 'users'])->get();

        return response()->json([
            'success' => true,
            'data' => $projects
        ], 200);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'azure_project_name' => 'nullable|string|max:255',
            'azure_team_name' => 'nullable|string|max:255',
            'bug_count_url' => 'nullable|url|max:255',
            'pbi_with_feature_url' => 'nullable|url|max:255',
            'pbi_without_feature_url' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:250',
            'note' => 'nullable|string|max:1000', // Aggiunto per completare i dettagli
            'filestorage_id' => 'nullable|exists:filestorage,id',
        ]);

        $project = TimesheetProject::create($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Progetto timesheet creato con successo!',
            'data' => $project->load(['filestorage', 'users'])
        ], 201);
    }

    public function show($id)
    {
        $project = TimesheetProject::with(['filestorage', 'users'])->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $project
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $project = TimesheetProject::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        $validatedData = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'azure_project_name' => 'nullable|string|max:255',
            'azure_team_name' => 'nullable|string|max:255',
            'bug_count_url' => 'nullable|url|max:255',
            'pbi_with_feature_url' => 'nullable|url|max:255',
            'pbi_without_feature_url' => 'nullable|url|max:255',
            'description' => 'nullable|string|max:250',
            'note' => 'nullable|string|max:1000', // Aggiunto per completare i dettagli
            'filestorage_id' => 'nullable|exists:filestorage,id',
        ]);

        $project->update($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Progetto timesheet aggiornato con successo!',
            'data' => $project->load(['filestorage', 'users'])
        ], 200);
    }

    public function destroy($id)
    {
        $project = TimesheetProject::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Progetto timesheet eliminato con successo.'
        ], 200);
    }

    public function uploadLogo(Request $request, $id)
    {
        $project = TimesheetProject::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        $request->validate([
            'file' => 'required|file|image|max:10240', // Max 10MB, solo immagini per il logo
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('timesheet_logos', 'public');

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
                'message' => 'Logo caricato e associato con successo!',
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

    public function updateNote(Request $request, $id)
    {
        $project = TimesheetProject::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        $validatedData = $request->validate([
            'note' => 'nullable|string|max:1000',
        ]);

        $project->note = $validatedData['note'] ?? null;
        $project->save();

        return response()->json([
            'success' => true,
            'message' => 'Nota aggiornata con successo!',
            'data' => $project
        ], 200);
    }
}