<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectMemberController extends Controller
{
 
    public function index($projectId)
    {
        $project = Project::with('users')->find($projectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $project->users
        ], 200);
    }

    public function store(Request $request, $projectId)
    {
        $project = Project::find($projectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        // Evitiamo duplicati usando syncWithoutDetaching o attach
        $project->users()->syncWithoutDetaching([$request->user_id]);

        return response()->json([
            'success' => true,
            'message' => 'Membro aggiunto con successo al progetto!',
            'data' => $project->load('users')
        ], 200);
    }

    public function destroy($projectId, $userId)
    {
        $project = Project::find($projectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto non trovato.'
            ], 404);
        }

        $project->users()->detach($userId);

        return response()->json([
            'success' => true,
            'message' => 'Membro rimosso con successo dal progetto!'
        ], 200);
    }
}
