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

        // Validazione dei campi della pivot, con work_allocation opzionale e senza limiti bloccanti
        $validatedData = $request->validate([
            'user_id' => 'required|exists:users,id',
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
            'startwork_date' => 'required|date',
            'endwork_date' => 'nullable|date|after_or_equal:startwork_date',
            'work_allocation' => 'nullable|integer', // Nessun limite min/max o blocco 100%
        ]);

        $userId = $validatedData['user_id'];

        // Salvataggio diretto nella tabella pivot senza alcun controllo di superamento allocazione
        $project->users()->syncWithoutDetaching([
            $userId => [
                'assignmentrole_id' => $validatedData['assignmentrole_id'],
                'startwork_date' => $validatedData['startwork_date'],
                'endwork_date' => $validatedData['endwork_date'] ?? null,
                'work_allocation' => $validatedData['work_allocation'] ?? null,
            ]
        ]);

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