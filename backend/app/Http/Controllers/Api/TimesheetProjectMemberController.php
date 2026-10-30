<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimesheetProject;
use App\Models\User;
use Illuminate\Http\Request;

class TimesheetProjectMemberController extends Controller
{
    
    public function index($timesheetProjectId)
    {
        $project = TimesheetProject::with('users')->find($timesheetProjectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $project->users
        ], 200);
    }

    
    public function store(Request $request, $timesheetProjectId)
    {
        $project = TimesheetProject::find($timesheetProjectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        
        if (!$project->users()->where('user_id', $validated['user_id'])->exists()) {
            $project->users()->attach($validated['user_id']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Utente aggiunto al progetto timesheet con successo!',
            'data' => $project->load('users')
        ], 200);
    }

    
    public function destroy($timesheetProjectId, $userId)
    {
        $project = TimesheetProject::find($timesheetProjectId);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Progetto timesheet non trovato.'
            ], 404);
        }

        $project->users()->detach($userId);

        return response()->json([
            'success' => true,
            'message' => 'Utente rimosso dal progetto timesheet con successo!',
            'data' => $project->load('users')
        ], 200);
    }
}