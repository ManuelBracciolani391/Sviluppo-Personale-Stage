<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Project;
use App\Models\TimesheetProject;
use App\Models\Necessity;
use App\Models\AssignmentRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class AllocationManagementController extends Controller
{
    /**
     * Restituisce la data di riferimento per le assegnazioni.
     */
    private function referenceDate(): string
    {
        return Carbon::today()->toDateString();
    }

    /**
     * Verifica che un progetto appartenga alla gestione
     * dei progetti normali e non sia Timesheet o corso.
     */
    private function normalProjectsQuery()
    {
        return Project::query()
            ->where('is_timesheet', false)
            ->where('is_course', false);
    }

    /**
     * =========================================================
     * INDICE GESTIONE ALLOCAZIONI
     * =========================================================
     */
    public function index(Request $request)
    {
        $today = $this->referenceDate();

        /*
         * Catalogo completo degli incarichi disponibili.
         * Utilizzato dalle modali di assegnazione e necessità.
         */
        $assignmentRoles = AssignmentRole::query()
            ->orderBy('alias')
            ->get([
                'id',
                'alias',
            ]);

        /*
         * Utenti visibili nella Gestione allocazioni.
         */
        $visibleUsersQuery = User::query()
            ->where('isAllocation_visible', true);

        $totalUsers = (clone $visibleUsersQuery)->count();

        /*
         * Query base delle assegnazioni attive.
         *
         * Condizioni:
         * - progetto normale;
         * - utente visibile e non eliminato;
         * - assegnazione non eliminata logicamente;
         * - data di inizio <= oggi;
         * - data di fine assente oppure >= oggi.
         */
        $activeAllocations = DB::table('project_user')
            ->join('projects', 'projects.id', '=', 'project_user.project_id')
            ->join('users', 'users.id', '=', 'project_user.user_id')
            ->whereNull('project_user.deleted_at')
            ->whereNull('users.deleted_at')
            ->where('users.isAllocation_visible', true)
            ->where('projects.is_timesheet', false)
            ->where('projects.is_course', false)
            ->whereDate('project_user.startwork_date', '<=', $today)
            ->where(function ($query) use ($today) {
                $query->whereNull('project_user.endwork_date')
                    ->orWhereDate('project_user.endwork_date', '>=', $today);
            });

        /*
         * RUOLI ATTIVI PER IL FILTRO ANGULAR.
         *
         * Questa query è indipendente dai filtri di ricerca,
         * stato progetto e ruolo selezionato.
         *
         * Vengono restituiti soltanto gli incarichi realmente
         * presenti nelle assegnazioni attive dei progetti normali.
         */
        $activeAssignmentRoleIds = (clone $activeAllocations)
            ->whereNotNull('project_user.assignmentrole_id')
            ->select('project_user.assignmentrole_id')
            ->distinct()
            ->pluck('project_user.assignmentrole_id');

        $activeAssignmentRoles = AssignmentRole::query()
            ->whereIn('id', $activeAssignmentRoleIds)
            ->orderBy('alias')
            ->get([
                'id',
                'alias',
            ]);

        /*
         * KPI: utenti allocati.
         */
        $allocatedUsersCount = (clone $activeAllocations)
            ->distinct('project_user.user_id')
            ->count('project_user.user_id');

        /*
         * KPI: utenti non allocati.
         */
        $unallocatedUsersCount = max(
            0,
            $totalUsers - $allocatedUsersCount
        );

        /*
         * KPI: utenti con almeno tre assegnazioni attive.
         */
        $overloadedUsersCount = (clone $activeAllocations)
            ->select('project_user.user_id')
            ->groupBy('project_user.user_id')
            ->havingRaw('COUNT(DISTINCT project_user.project_id) >= 3')
            ->get()
            ->count();

        /*
         * KPI: assegnazioni attive considerate difficili.
         */
        $difficultyCount = (clone $activeAllocations)
            ->where('project_user.is_difficult', true)
            ->count();

        /*
         * KPI: necessità associate esclusivamente ai progetti normali.
         */
        $openNeedsCount = Necessity::whereHas(
            'project',
            function ($query) {
                $query->where('is_timesheet', false)
                    ->where('is_course', false);
            }
        )->count();

        /*
         * PROGETTI NORMALI.
         *
         * I membri restituiti sono soltanto quelli con assegnazione
         * attiva alla data odierna.
         */
        $projectsQuery = $this->normalProjectsQuery()
            ->with([
                'filestorage',
                'users' => function ($query) use ($today) {
                    $query->wherePivotNull('deleted_at')
                        ->wherePivot('startwork_date', '<=', $today)
                        ->where(function ($pivotQuery) use ($today) {
                            $pivotQuery->whereNull('project_user.endwork_date')
                                ->orWhereDate(
                                    'project_user.endwork_date',
                                    '>=',
                                    $today
                                );
                        });
                },
                'needs.assignmentRole',
            ]);

        /*
         * Filtro per stato progetto.
         */
        if ($request->filled('project_status')) {
            $status = mb_strtolower(
                str_replace('_', ' ', trim($request->input('project_status')))
            );

            $projectsQuery->whereRaw(
                "LOWER(REPLACE(projects.status, '_', ' ')) = ?",
                [$status]
            );
        }

        $projects = $projectsQuery->get();

        /*
         * Evita di mostrare immagini utente come loghi progetto.
         */
        $projects->each(function ($project) {
            if (
                $project->filestorage &&
                is_string($project->filestorage->url)
            ) {
                $url = strtolower($project->filestorage->url);

                if (
                    str_contains($url, 'avatar') ||
                    str_contains($url, 'user')
                ) {
                    $project->setRelation('filestorage', null);
                }
            }
        });

        /*
         * UTENTI VISIBILI.
         *
         * Vengono caricate esclusivamente le assegnazioni attive
         * ai progetti normali.
         */
        $usersQuery = User::with([
            'filestorage',
            'projects' => function ($query) use ($today) {
                $query->where('is_timesheet', false)
                    ->where('is_course', false)
                    ->wherePivotNull('deleted_at')
                    ->wherePivot('startwork_date', '<=', $today)
                    ->where(function ($pivotQuery) use ($today) {
                        $pivotQuery->whereNull('project_user.endwork_date')
                            ->orWhereDate(
                                'project_user.endwork_date',
                                '>=',
                                $today
                            );
                    });
            },
            'roles',
            'assignmentRoles',
        ])->where('isAllocation_visible', true);

        /*
         * Filtro per nome e cognome.
         */
        if ($request->filled('search')) {
            $search = $request->input('search');

            $usersQuery->where(function ($query) use ($search) {
                $query->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhereRaw(
                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                        ["%{$search}%"]
                    );
            });
        }

        /*
         * Filtro incarico.
         *
         * Controlla direttamente project_user, così vengono
         * considerati soltanto gli incarichi delle assegnazioni
         * attive ai progetti normali.
         *
         * Non utilizza la relazione assignmentRoles, che potrebbe
         * comprendere associazioni storiche.
         */
        if ($request->filled('role_alias')) {
            $roleAlias = $request->input('role_alias');

            $usersQuery->whereExists(function ($query) use ($roleAlias, $today) {
                $query->select(DB::raw(1))
                    ->from('project_user')
                    ->join(
                        'assignmentroles',
                        'assignmentroles.id',
                        '=',
                        'project_user.assignmentrole_id'
                    )
                    ->join(
                        'projects',
                        'projects.id',
                        '=',
                        'project_user.project_id'
                    )
                    ->whereColumn('project_user.user_id', 'users.id')
                    ->where('assignmentroles.alias', $roleAlias)
                    ->whereNull('project_user.deleted_at')
                    ->where('projects.is_timesheet', false)
                    ->where('projects.is_course', false)
                    ->whereDate('project_user.startwork_date', '<=', $today)
                    ->where(function ($dateQuery) use ($today) {
                        $dateQuery->whereNull('project_user.endwork_date')
                            ->orWhereDate(
                                'project_user.endwork_date',
                                '>=',
                                $today
                            );
                    });
            });
        }

        $users = $usersQuery
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        /*
         * RISPOSTA API.
         *
         * assignment_roles:
         * catalogo completo per le modali.
         *
         * active_assignment_roles:
         * soltanto gli incarichi presenti nelle allocazioni attive,
         * per il filtro Ruolo.
         */
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

            'assignment_roles' => $assignmentRoles,
            'active_assignment_roles' => $activeAssignmentRoles,
        ], 200);
    }

    /**
     * =========================================================
     * INDICE TIMESHEET
     * =========================================================
     *
     * Utilizza esclusivamente:
     * - timesheet_projects
     * - timesheet_project_user
     *
     * Non utilizza project_user.
     */
    public function timesheetIndex(Request $request)
    {
        $timesheetProjects = TimesheetProject::with([
            'filestorage',
            'users',
        ])
            ->orderBy('name')
            ->get();

        /*
         * Evita di mostrare immagini utente come loghi progetto.
         */
        $timesheetProjects->each(function ($project) {
            if (
                $project->filestorage &&
                is_string($project->filestorage->url)
            ) {
                $url = strtolower($project->filestorage->url);

                if (
                    str_contains($url, 'avatar') ||
                    str_contains($url, 'user')
                ) {
                    $project->setRelation('filestorage', null);
                }
            }
        });

        /*
         * Gli utenti Timesheet utilizzano esclusivamente
         * la relazione timesheetProjects.
         */
        $usersQuery = User::with([
            'filestorage',
            'timesheetProjects',
            'roles',
        ])->where('isAllocation_visible', true);

        if ($request->filled('search')) {
            $search = $request->input('search');

            $usersQuery->where(function ($query) use ($search) {
                $query->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhereRaw(
                        "CONCAT(first_name, ' ', last_name) LIKE ?",
                        ["%{$search}%"]
                    );
            });
        }

        $users = $usersQuery
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json([
            'success' => true,
            'timesheet_projects' => $timesheetProjects,
            'users' => $users,
        ], 200);
    }

    /**
     * =========================================================
     * DETTAGLIO UTENTE
     * =========================================================
     */
    public function userDetail(User $user)
    {
        abort_unless($user->isAllocation_visible, 404);

        $today = $this->referenceDate();

        $user->load([
            'filestorage',
            'projects' => function ($query) use ($today) {
                $query->where('is_timesheet', false)
                    ->where('is_course', false)
                    ->wherePivotNull('deleted_at')
                    ->wherePivot('startwork_date', '<=', $today)
                    ->where(function ($pivotQuery) use ($today) {
                        $pivotQuery->whereNull('project_user.endwork_date')
                            ->orWhereDate(
                                'project_user.endwork_date',
                                '>=',
                                $today
                            );
                    });
            },
            'roles',
            'assignmentRoles',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
            ],
        ], 200);
    }

    /**
     * =========================================================
     * DETTAGLIO PROGETTO
     * =========================================================
     */
    public function projectDetail(Project $project)
    {
        abort_if(
            $project->is_timesheet || $project->is_course,
            404
        );

        $today = $this->referenceDate();

        $project->load([
            'filestorage',
            'users' => function ($query) use ($today) {
                $query->wherePivotNull('deleted_at')
                    ->wherePivot('startwork_date', '<=', $today)
                    ->where(function ($pivotQuery) use ($today) {
                        $pivotQuery->whereNull('project_user.endwork_date')
                            ->orWhereDate(
                                'project_user.endwork_date',
                                '>=',
                                $today
                            );
                    });
            },
            'needs.assignmentRole',
        ]);

        return response()->json([
            'success' => true,
            'data' => $project,
        ], 200);
    }

    /**
     * =========================================================
     * ASSEGNAZIONE RISORSA A PROGETTO NORMALE
     * =========================================================
     */
    public function storeAllocation(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_id' => 'required|exists:projects,id',
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
            'startwork_date' => 'required|date',
            'work_allocation' => 'required|integer|min:0|max:100',
        ]);

        $project = $this->normalProjectsQuery()
            ->findOrFail($validated['project_id']);

        $user = User::where('isAllocation_visible', true)
            ->findOrFail($validated['user_id']);

        $now = now();

        DB::transaction(function () use ($validated, $project, $user, $now) {
            /*
             * Se esiste una vecchia associazione eliminata logicamente,
             * viene riattivata invece di creare una seconda riga.
             */
            $pivot = DB::table('project_user')
                ->where('project_id', $project->id)
                ->where('user_id', $user->id)
                ->first();

            $data = [
                'assignmentrole_id' => $validated['assignmentrole_id'],
                'startwork_date' => $validated['startwork_date'],
                'endwork_date' => null,
                'work_allocation' => $validated['work_allocation'],
                'deleted_at' => null,
                'updated_at' => $now,
            ];

            if ($pivot) {
                DB::table('project_user')
                    ->where('id', $pivot->id)
                    ->update($data);
            } else {
                DB::table('project_user')->insert(array_merge(
                    $data,
                    [
                        'project_id' => $project->id,
                        'user_id' => $user->id,
                        'is_difficult' => false,
                        'created_at' => $now,
                    ]
                ));
            }

            /*
             * SODDISFAZIONE AUTOMATICA DELLA NECESSITÀ.
             *
             * Dopo aver assegnato la risorsa, cerchiamo una necessità
             * dello stesso progetto e dello stesso incarico.
             *
             * Un'assegnazione soddisfa una sola necessità.
             */
            $need = $project->needs()
                ->where(
                    'assignmentrole_id',
                    $validated['assignmentrole_id']
                )
                ->lockForUpdate()
                ->first();

            if ($need) {
                $need->delete();
            }
        });

        return response()->json([
            'success' => true,
            'data' => $project->load('users', 'needs.assignmentRole'),
        ], 200);
    }

    /**
     * =========================================================
     * MODIFICA ALLOCAZIONE
     * =========================================================
     */
    public function updateAllocation(
        Request $request,
        $projectId,
        $userId
    ) {
        $validated = $request->validate([
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
            'startwork_date' => 'required|date',
            'work_allocation' => 'required|integer|min:0|max:100',
        ]);

        $project = $this->normalProjectsQuery()->findOrFail($projectId);

        $pivot = DB::table('project_user')
            ->where('project_id', $project->id)
            ->where('user_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$pivot) {
            return response()->json([
                'success' => false,
                'message' => 'L’utente non risulta assegnato a questo progetto.',
            ], 404);
        }

        DB::table('project_user')
            ->where('id', $pivot->id)
            ->update([
                'assignmentrole_id' => $validated['assignmentrole_id'],
                'startwork_date' => $validated['startwork_date'],
                'work_allocation' => $validated['work_allocation'],
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $project->load('users'),
        ], 200);
    }

    /**
     * =========================================================
     * ELIMINAZIONE O CONCLUSIONE ALLOCAZIONE
     * =========================================================
     */
    public function terminateAllocation(
        Request $request,
        $projectId,
        $userId
    ) {
        $validated = $request->validate([
            'action' => 'required|in:delete,conclude',
            'endwork_date' => 'required_if:action,conclude|nullable|date',
        ]);

        $project = $this->normalProjectsQuery()->findOrFail($projectId);

        $pivot = DB::table('project_user')
            ->where('project_id', $project->id)
            ->where('user_id', $userId)
            ->whereNull('deleted_at')
            ->first();

        if (!$pivot) {
            return response()->json([
                'success' => false,
                'message' => 'L’utente non risulta assegnato a questo progetto.',
            ], 404);
        }

        if ($validated['action'] === 'delete') {
            /*
             * Cancellazione logica: conserviamo la riga pivot.
             */
            DB::table('project_user')
                ->where('id', $pivot->id)
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);
        } else {
            DB::table('project_user')
                ->where('id', $pivot->id)
                ->update([
                    'endwork_date' => $validated['endwork_date'],
                    'updated_at' => now(),
                ]);
        }

        return response()->json([
            'success' => true,
            'message' => $validated['action'] === 'delete'
                ? 'Assegnazione eliminata.'
                : 'Collaborazione conclusa.',
        ], 200);
    }

    /**
     * =========================================================
     * TOGGLE DIFFICOLTÀ
     * =========================================================
     */
    public function toggleDifficulty($projectId, $userId)
    {
        $today = $this->referenceDate();

        $project = $this->normalProjectsQuery()->findOrFail($projectId);

        $pivot = DB::table('project_user')
            ->where('project_id', $project->id)
            ->where('user_id', $userId)
            ->whereNull('deleted_at')
            ->whereDate('startwork_date', '<=', $today)
            ->where(function ($query) use ($today) {
                $query->whereNull('endwork_date')
                    ->orWhereDate('endwork_date', '>=', $today);
            })
            ->first();

        if (!$pivot) {
            return response()->json([
                'success' => false,
                'message' => 'Non esiste un’assegnazione attiva per questo utente e progetto.',
            ], 404);
        }

        $newDifficulty = !(bool) $pivot->is_difficult;

        DB::table('project_user')
            ->where('id', $pivot->id)
            ->update([
                'is_difficult' => $newDifficulty,
                'updated_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'is_difficult' => $newDifficulty,
        ], 200);
    }

    /**
     * =========================================================
     * AGGIUNTA NECESSITÀ
     * =========================================================
     */
    public function storeNeed(Request $request, Project $project)
    {
        abort_if(
            $project->is_timesheet || $project->is_course,
            404
        );

        $validated = $request->validate([
            'assignmentrole_id' => 'required|exists:assignmentroles,id',
        ]);

        $duplicate = $project->needs()
            ->where(
                'assignmentrole_id',
                $validated['assignmentrole_id']
            )
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'assignmentrole_id' => [
                    'Questa necessità è già presente nel progetto.',
                ],
            ]);
        }

        $need = $project->needs()->create([
            'assignmentrole_id' => $validated['assignmentrole_id'],
        ]);

        $need->load('assignmentRole');

        return response()->json([
            'success' => true,
            'data' => $need,
        ], 201);
    }

    /**
     * =========================================================
     * ELIMINAZIONE NECESSITÀ
     * =========================================================
     */
    public function destroyNeed(Necessity $need)
    {
        abort_if(
            $need->project->is_timesheet || $need->project->is_course,
            404
        );

        $need->delete();

        return response()->json([
            'success' => true,
            'message' => 'Necessità eliminata.',
        ], 200);
    }
}
