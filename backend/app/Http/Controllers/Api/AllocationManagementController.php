<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Project;
use App\Models\TimesheetProject;
use App\Models\Necessity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AllocationManagementController extends Controller
{
    public function index(Request $request)
    {
        $totalUsers = User::count();
        $allocatedUsersCount = User::has('projects')->count();
        $unallocatedUsersCount = User::doesntHave('projects')->count();
        
        $overloadedUsersCount = User::whereHas('projects', function($q) {
            $q->whereIn('status', ['in_corso', 'manutenzione']);
        }, '>=', 3)->count();

        $difficultyCount = DB::table('project_user')->where('is_difficult', true)->count();
        $openNeedsCount = Necessity::count();

        $projectsQuery = Project::with(['filestorage', 'users', 'needs']);
        if ($request->filled('project_status')) {
            $projectsQuery->where('status', $request->input('project_status'));
        }
        $projects = $projectsQuery->get();

        $projects->each(function ($project) {
            if ($project->filestorage && is_string($project->filestorage->url)) {
                if (str_contains(strtolower($project->filestorage->url), 'avatar') || str_contains(strtolower($project->filestorage->url), 'user')) {
                    $project->setRelation('filestorage', null);
                }
            }
        });

        $usersQuery = User::with(['filestorage', 'projects', 'roles', 'assignmentRoles']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $usersQuery->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        if ($request->filled('role_alias')) {
            $roleAlias = $request->input('role_alias');
            $usersQuery->whereHas('roles', function($q) use ($roleAlias) {
                $q->where('alias', $roleAlias);
            });
        }

        $usersQuery->orderBy('last_name')->orderBy('first_name');
        $users = $usersQuery->get();

        return response()->json([
            'success' => true,
            'kpi' => [
                'last_update' => Carbon::now()->format('d F Y H:i'),
                'allocated_resources' => "{$allocatedUsersCount} su {$totalUsers}",
                'unallocated_resources' => $unallocatedUsersCount,
                'overloaded_resources' => $overloadedUsersCount,
                'difficulty_allocations' => $difficultyCount,
                'open_needs' => $openNeedsCount,
            ],
            'projects' => $projects,
            'users' => $users,
        ], 200);
    }

    public function timesheetIndex(Request $request)
    {
        $timesheetProjects = TimesheetProject::with(['filestorage', 'users'])->get();
        
        $timesheetProjects->each(function ($project) {
            if ($project->filestorage && is_string($project->filestorage->url)) {
                if (str_contains(strtolower($project->filestorage->url), 'avatar') || str_contains(strtolower($project->filestorage->url), 'user')) {
                    $project->setRelation('filestorage', null);
                }
            }
        });

        $usersQuery = User::with(['filestorage', 'timesheetProjects', 'roles']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $usersQuery->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        $users = $usersQuery->orderBy('last_name')->orderBy('first_name')->get();

        return response()->json([
            'success' => true,
            'timesheet_projects' => $timesheetProjects,
            'users' => $users,
        ], 200);
    }

    public function storeTimesheetAllocation(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'timesheet_project_id' => 'required|exists:timesheet_projects,id',
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
            'startwork_date' => 'required|date',
        ]);

        $timesheetProject = TimesheetProject::findOrFail($validated['timesheet_project_id']);

        $timesheetProject->users()->syncWithoutDetaching([
            $validated['user_id'] => [
                'assignmentrole_id' => $validated['assignmentrole_id'],
                'startwork_date' => $validated['startwork_date'],
            ]
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Risorsa allocata nel timesheet.',
            'data' => $timesheetProject->load('users')
        ], 200);
    }

    public function terminateTimesheetAllocation(Request $request, $timesheetProjectId, $userId)
    {
        $timesheetProject = TimesheetProject::findOrFail($timesheetProjectId);
        $timesheetProject->users()->detach($userId);

        return response()->json([
            'success' => true,
            'message' => 'Rimossa dal timesheet.'
        ], 200);
    }

    public function userDetail(User $user)
    {
        $user->load(['filestorage', 'projects', 'roles', 'assignmentRoles']);
        return response()->json(['success' => true, 'data' => ['user' => $user]], 200);
    }

    public function projectDetail(Project $project)
    {
        $project->load(['filestorage', 'users', 'needs']);
        return response()->json(['success' => true, 'data' => $project], 200);
    }

    public function storeAllocation(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_id' => 'required|exists:projects,id',
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
            'startwork_date' => 'required|date',
            'work_allocation' => 'required|integer|min:0|max:100',
        ]);

        $project = Project::findOrFail($validated['project_id']);
        $project->users()->syncWithoutDetaching([
            $validated['user_id'] => [
                'assignmentrole_id' => $validated['assignmentrole_id'],
                'startwork_date' => $validated['startwork_date'],
                'work_allocation' => $validated['work_allocation'],
            ]
        ]);

        return response()->json(['success' => true, 'data' => $project->load('users')], 200);
    }

    public function updateAllocation(Request $request, $projectId, $userId)
    {
        $validated = $request->validate([
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
            'startwork_date' => 'required|date',
            'work_allocation' => 'required|integer|min:0|max:100',
        ]);

        $project = Project::findOrFail($projectId);
        $project->users()->updateExistingPivot($userId, [
            'assignmentrole_id' => $validated['assignmentrole_id'],
            'startwork_date' => $validated['startwork_date'],
            'work_allocation' => $validated['work_allocation'],
        ]);

        return response()->json(['success' => true, 'data' => $project->load('users')], 200);
    }

    public function terminateAllocation(Request $request, $projectId, $userId)
    {
        $validated = $request->validate([
            'action' => 'required|in:delete,conclude',
            'endwork_date' => 'required_if:action,conclude|nullable|date',
        ]);

        $project = Project::findOrFail($projectId);
        if ($validated['action'] === 'delete') {
            $project->users()->detach($userId);
        } else {
            $project->users()->updateExistingPivot($userId, ['endwork_date' => $validated['endwork_date']]);
        }

        return response()->json(['success' => true], 200);
    }

    public function toggleDifficulty($projectId, $userId)
    {
        $project = Project::findOrFail($projectId);
        $userPivot = $project->users()->where('user_id', $userId)->first();
        $newDifficulty = !(bool) $userPivot->pivot->is_difficult;

        $project->users()->updateExistingPivot($userId, ['is_difficult' => $newDifficulty]);
        return response()->json(['success' => true, 'is_difficult' => $newDifficulty], 200);
    }

    public function storeNeed(Request $request, Project $project)
    {
        $need = $project->needs()->create(['role' => $request->input('role')]);
        return response()->json(['success' => true, 'data' => $need], 201);
    }

    public function destroyNeed(Necessity $need)
    {
        $need->delete();
        return response()->json(['success' => true], 200);
    }
}