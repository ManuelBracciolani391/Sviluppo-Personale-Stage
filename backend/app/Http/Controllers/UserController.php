<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Models\Contract;
use App\Models\ContractWorkingDay;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class UserController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | LISTA UTENTI
    |--------------------------------------------------------------------------
    */

    public function index(Request $request): JsonResponse
    {
        $users = User::with([
            'roles',
            'assignmentRoles',
            'contracts' => function ($query) {
                $query->with('workingDays')
                    ->orderByDesc('contract_start_date');
            },
        ])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($users);
    }

    /*
    |--------------------------------------------------------------------------
    | DETTAGLIO UTENTE
    |--------------------------------------------------------------------------
    */

    public function show(User $user): JsonResponse
    {
        $user->load([
            'roles',
            'assignmentRoles',
            'filestorage',
            'contracts' => function ($query) {
                $query->with('workingDays')
                    ->orderByDesc('contract_start_date');
            },
        ]);

        return response()->json($user);
    }

    /*
    |--------------------------------------------------------------------------
    | CREAZIONE UTENTE
    |--------------------------------------------------------------------------
    */

    public function store(StoreUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $contractData = $validated['contract'];
        $weeklyHours = (int) $contractData['weekly_hours'];

        /*
        |--------------------------------------------------------------------------
        | VALIDAZIONE PART-TIME
        |--------------------------------------------------------------------------
        */

        if ($weeklyHours < 40) {
            $this->validatePartTimeWorkingDays(
                $validated['working_days'] ?? [],
                $weeklyHours
            );
        }

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                ...$this->userData($validated),
                'password' => Hash::make(Str::random(64)),
            ]);

            $contract = $user->contracts()->create(
                $this->contractData($validated['contract'])
            );

            $this->saveWorkingDays(
                $contract,
                (int) $validated['contract']['weekly_hours'],
                $validated['working_days'] ?? []
            );

            if (array_key_exists('roles', $validated)) {
                $user->roles()->sync($validated['roles'] ?? []);
            }

            if (array_key_exists('assignment_roles', $validated)) {
                $this->syncAssignmentRoles(
                    $user,
                    $validated['assignment_roles'] ?? []
                );
            }

            return $user;
        });

        $user->load([
            'roles',
            'assignmentRoles',
            'contracts.workingDays',
        ]);

        return response()->json($user, 201);
    }

    /*
    |--------------------------------------------------------------------------
    | MODIFICA UTENTE
    |--------------------------------------------------------------------------
    */

    public function update(
        UpdateUserRequest $request,
        User $user
    ): JsonResponse {
        $validated = $request->validated();

        /*
        |--------------------------------------------------------------------------
        | VALIDAZIONE CONTRATTO / PART-TIME
        |--------------------------------------------------------------------------
        */

        if (isset($validated['contract'])) {
            $weeklyHours = (int) $validated['contract']['weekly_hours'];

            if ($weeklyHours < 40) {
                $this->validatePartTimeWorkingDays(
                    $validated['working_days'] ?? [],
                    $weeklyHours
                );
            }
        }

        DB::transaction(function () use ($validated, $user) {

            $user->update(
                $this->userData($validated)
            );

            if (isset($validated['contract'])) {

                // Recupera il contratto più recente
                // oppure ne crea uno nuovo.
                $contract = $user->contracts()
                    ->orderByDesc('contract_start_date')
                    ->first();

                if (!$contract) {
                    $contract = $user->contracts()->create(
                        $this->contractData($validated['contract'])
                    );
                } else {
                    $contract->update(
                        $this->contractData($validated['contract'])
                    );
                }

                if (array_key_exists('working_days', $validated)) {
                    $this->saveWorkingDays(
                        $contract,
                        (int) $validated['contract']['weekly_hours'],
                        $validated['working_days']
                    );
                }
            }

            if (array_key_exists('roles', $validated)) {
                $user->roles()->sync(
                    $validated['roles'] ?? []
                );
            }

            if (array_key_exists('assignment_roles', $validated)) {
                $this->syncAssignmentRoles(
                    $user,
                    $validated['assignment_roles'] ?? []
                );
            }
        });

        $user->refresh()->load([
            'roles',
            'assignmentRoles',
            'contracts.workingDays',
        ]);

        return response()->json($user);
    }

    /*
    |--------------------------------------------------------------------------
    | DISABILITAZIONE UTENTE
    |--------------------------------------------------------------------------
    */

    public function destroy(
        Request $request,
        User $user
    ): JsonResponse {
        $validated = $request->validate([
            'resignation_date' => [
                'required',
                'date',
                'date_equals:' . now()->toDateString(),
            ],
        ]);

        $user->update([
            'resignation_date' => $validated['resignation_date'],
        ]);

        $user->delete();

        return response()->json([
            'message' => 'Utente disabilitato correttamente.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ALLOCATION LIST
    |--------------------------------------------------------------------------
    */

    public function listForAllocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'sort_by' => [
                'sometimes',
                Rule::in([
                    'first_name',
                    'last_name',
                    'hiring_date',
                ]),
            ],

            'sort_direction' => [
                'sometimes',
                Rule::in([
                    'asc',
                    'desc',
                ]),
            ],

            'role_alias' => [
                'sometimes',
                'string',
                'max:255',
            ],

            'assignment_role_alias' => [
                'sometimes',
                'string',
                'max:255',
            ],

            'expertise' => [
                'sometimes',
                'string',
                'max:255',
            ],

            'isAllocation_visible' => [
                'sometimes',
                Rule::in([
                    '0',
                    '1',
                ]),
            ],

            'per_page' => [
                'sometimes',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $query = User::query()
            ->select([
                'id',
                'first_name',
                'last_name',
                'hiring_date',
                'filestorage_id',
                'isAllocation_visible',
            ])
            ->with([
                'filestorage',
                'roles:id,alias',
                'assignmentRoles:id,alias',
            ]);

        /*
        |--------------------------------------------------------------------------
        | Filtro per ruolo
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['role_alias'])) {
            $query->whereHas(
                'roles',
                function (Builder $q) use ($validated) {
                    $q->where(
                        'alias',
                        $validated['role_alias']
                    );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Filtro per ruolo di assegnazione
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['assignment_role_alias'])) {
            $query->whereHas(
                'assignmentRoles',
                function (Builder $q) use ($validated) {
                    $q->where(
                        'alias',
                        $validated['assignment_role_alias']
                    );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Filtro per expertise
        |--------------------------------------------------------------------------
        */

        if (!empty($validated['expertise'])) {
            $query->whereHas(
                'assignmentRoles',
                function (Builder $q) use ($validated) {
                    $q->where(
                        'assignmentrole_user.expertise',
                        $validated['expertise']
                    );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Filtro per visibilità nell'allocazione
        |--------------------------------------------------------------------------
        */

        if (isset($validated['isAllocation_visible'])) {
            $query->where(
                'isAllocation_visible',
                (bool) $validated['isAllocation_visible']
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Ricerca e ordinamento
        |--------------------------------------------------------------------------
        */

        $query = $this->applyUserSearchAndSorting(
            $query,
            $validated,
            [
                'first_name',
                'last_name',
                'hiring_date',
            ]
        );

        $users = $query->paginate(
            $validated['per_page'] ?? 15
        );

        $users->getCollection()->transform(
            function (User $user) {
                return [
                    'id' => $user->id,

                    'image' => $user->filestorage,

                    'first_name' => $user->first_name,

                    'last_name' => $user->last_name,

                    'hiring_date' => $user->hiring_date?->format('Y-m-d'),

                    'roles' => $user->roles
                        ->pluck('alias')
                        ->values(),

                    'assignment_roles' => $user->assignmentRoles
                        ->map(function ($role) {
                            return [
                                'alias' => $role->alias,
                                'expertise' => $role->pivot->expertise,
                            ];
                        })
                        ->values(),

                    'isAllocation_visible' =>
                        $user->isAllocation_visible,
                ];
            }
        );

        return response()->json($users);
    }

    /*
    |--------------------------------------------------------------------------
    | LISTA UTENTI DISABILITATI
    |--------------------------------------------------------------------------
    */

    public function disabled(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],

            'sort_by' => [
                'sometimes',
                Rule::in([
                    'first_name',
                    'last_name',
                    'hiring_date',
                    'resignation_date',
                ]),
            ],

            'sort_direction' => [
                'sometimes',
                Rule::in([
                    'asc',
                    'desc',
                ]),
            ],

            'per_page' => [
                'sometimes',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $query = User::onlyTrashed()
            ->select([
                'id',
                'first_name',
                'last_name',
                'filestorage_id',
                'hiring_date',
                'resignation_date',
                'deleted_at',
            ])
            ->with('filestorage');

        /*
        |--------------------------------------------------------------------------
        | Ricerca e ordinamento
        |--------------------------------------------------------------------------
        */

        $query = $this->applyUserSearchAndSorting(
            $query,
            $validated,
            [
                'first_name',
                'last_name',
                'hiring_date',
                'resignation_date',
            ]
        );

        $users = $query->paginate(
            $validated['per_page'] ?? 15
        );

        $users->getCollection()->transform(
            function (User $user) {
                return [
                    'id' => $user->id,

                    'image' => $user->filestorage,

                    'first_name' => $user->first_name,

                    'last_name' => $user->last_name,

                    'hiring_date' =>
                        $user->hiring_date?->format('Y-m-d'),

                    'resignation_date' =>
                        $user->resignation_date?->format('Y-m-d'),

                    'deleted_at' =>
                        $user->deleted_at?->toISOString(),
                ];
            }
        );

        return response()->json($users);
    }

    /*
    |--------------------------------------------------------------------------
    | RIABILITAZIONE UTENTE
    |--------------------------------------------------------------------------
    */

    public function restore(string $id): JsonResponse
    {
        $user = User::onlyTrashed()
            ->findOrFail($id);

        $user->restore();

        return response()->json([
            'message' => 'Utente riabilitato correttamente.',

            'user' => [
                'id' => $user->id,

                'first_name' => $user->first_name,

                'last_name' => $user->last_name,

                'deleted_at' =>
                    $user->fresh()->deleted_at,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | METODO CONDIVISO: RICERCA E ORDINAMENTO
    |--------------------------------------------------------------------------
    */

    private function applyUserSearchAndSorting(
        Builder $query,
        array $validated,
        array $allowedSortFields = [
            'first_name',
            'last_name',
            'hiring_date',
        ]
    ): Builder {
        /*
        |--------------------------------------------------------------------------
        | Ricerca
        |--------------------------------------------------------------------------
        */

        $search = trim(
            $validated['search'] ?? ''
        );

        if ($search !== '') {
            $query->where(
                function (Builder $q) use ($search) {
                    $q->where(
                        'first_name',
                        'like',
                        "%{$search}%"
                    )
                        ->orWhere(
                            'last_name',
                            'like',
                            "%{$search}%"
                        )
                        ->orWhereRaw(
                            "CONCAT(first_name, ' ', last_name) LIKE ?",
                            ["%{$search}%"]
                        );
                }
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Ordinamento
        |--------------------------------------------------------------------------
        */

        $sortBy = $validated['sort_by'] ?? 'last_name';

        $sortDirection =
            $validated['sort_direction'] ?? 'asc';

        if (
            !in_array(
                $sortBy,
                $allowedSortFields,
                true
            )
        ) {
            $sortBy = 'last_name';
        }

        if (
            !in_array(
                $sortDirection,
                ['asc', 'desc'],
                true
            )
        ) {
            $sortDirection = 'asc';
        }

        $query->orderBy(
            $sortBy,
            $sortDirection
        );

        /*
        |--------------------------------------------------------------------------
        | Ordinamento secondario
        |--------------------------------------------------------------------------
        */

        if ($sortBy !== 'first_name') {
            $query->orderBy(
                'first_name',
                'asc'
            );
        }

        return $query;
    }

    /*
    |--------------------------------------------------------------------------
    | DATI UTENTE
    |--------------------------------------------------------------------------
    */

    private function userData(array $validated): array
    {
        return array_intersect_key(
            $validated,
            array_flip([
                'first_name',
                'last_name',
                'gender',
                'birth_date',
                'hiring_date',
                'resignation_date',
                'email',
                'azure_email',
                'company_email',
                'is_intern',
                'isAllocation_visible',
            ])
        );
    }

    /*
    |--------------------------------------------------------------------------
    | DATI CONTRATTO
    |--------------------------------------------------------------------------
    */

    private function contractData(array $contract): array
    {
        return array_intersect_key(
            $contract,
            array_flip([
                'contract_start_date',
                'contract_end_date',
                'contract_type',
                'weekly_hours',
            ])
        );
    }

    /*
    |--------------------------------------------------------------------------
    | GESTIONE GIORNI LAVORATIVI
    |--------------------------------------------------------------------------
    */

    private function saveWorkingDays(
        Contract $contract,
        int $weeklyHours,
        array $workingDays
    ): void {
        $days = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
        ];

        /*
        |--------------------------------------------------------------------------
        | Normalizza i nomi dei giorni ricevuti
        |--------------------------------------------------------------------------
        */

        $providedDays = collect($workingDays)->keyBy(
            fn($item) =>
                ucfirst(
                    strtolower(
                        $item['day_of_week']
                    )
                )
        );

        foreach ($days as $day) {

            /*
            |--------------------------------------------------------------------------
            | FULL-TIME
            |--------------------------------------------------------------------------
            */

            if ($weeklyHours === 40) {

                // Full-time:
                // lunedì-venerdì 09:00-18:00
                // weekend non lavorativo.

                $isWorkingDay = in_array(
                    $day,
                    [
                        'Monday',
                        'Tuesday',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                    ],
                    true
                );

                $values = [
                    'is_working_day' => $isWorkingDay,
                    'start_time' =>
                        $isWorkingDay
                        ? '09:00:00'
                        : null,
                    'end_time' =>
                        $isWorkingDay
                        ? '18:00:00'
                        : null,
                ];

            } else {

                /*
                |--------------------------------------------------------------------------
                | PART-TIME
                |--------------------------------------------------------------------------
                */

                // Sabato e domenica sono sempre
                // non lavorativi.

                if (
                    in_array(
                        $day,
                        ['Saturday', 'Sunday'],
                        true
                    )
                ) {

                    $values = [
                        'is_working_day' => false,
                        'start_time' => null,
                        'end_time' => null,
                    ];

                } else {

                    /*
                    |--------------------------------------------------------------------------
                    | LUNEDÌ-VENERDÌ
                    |--------------------------------------------------------------------------
                    */

                    $input = $providedDays->get(
                        $day,
                        []
                    );

                    $isWorkingDay = filter_var(
                        $input['is_working_day'] ?? false,
                        FILTER_VALIDATE_BOOLEAN
                    );

                    $values = [
                        'is_working_day' =>
                            $isWorkingDay,

                        'start_time' =>
                            $isWorkingDay
                            ? ($input['start_time'] ?? null)
                            : null,

                        'end_time' =>
                            $isWorkingDay
                            ? ($input['end_time'] ?? null)
                            : null,
                    ];
                }
            }

            ContractWorkingDay::updateOrCreate(
                [
                    'contract_id' => $contract->id,
                    'day_of_week' => $day,
                ],
                $values
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | SINCRONIZZAZIONE RUOLI DI ASSEGNAZIONE
    |--------------------------------------------------------------------------
    */

    private function syncAssignmentRoles(
        User $user,
        array $assignmentRoles
    ): void {
        $syncData = [];

        foreach ($assignmentRoles as $assignmentRole) {
            $syncData[$assignmentRole['id']] = [
                'expertise' =>
                    $assignmentRole['expertise'] ?? null,
            ];
        }

        $user->assignmentRoles()->sync(
            $syncData
        );
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDAZIONE PART-TIME
    |--------------------------------------------------------------------------
    */

    private function validatePartTimeWorkingDays(
        array $workingDays,
        int $weeklyHours
    ): void {
        $totalMinutes = 0;

        /*
        |--------------------------------------------------------------------------
        | Giorni ammessi
        |--------------------------------------------------------------------------
        */

        $allowedDays = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
        ];

        $seenDays = [];

        foreach ($workingDays as $day) {

            $dayName = ucfirst(
                strtolower(
                    $day['day_of_week'] ?? ''
                )
            );

            /*
            |--------------------------------------------------------------------------
            | Sabato e domenica non configurabili
            |--------------------------------------------------------------------------
            */

            if (
                !in_array(
                    $dayName,
                    $allowedDays,
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'working_days' => [
                        "Puoi configurare soltanto i giorni dal lunedì al venerdì.",
                    ],
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Giorno duplicato
            |--------------------------------------------------------------------------
            */

            if (
                in_array(
                    $dayName,
                    $seenDays,
                    true
                )
            ) {
                throw ValidationException::withMessages([
                    'working_days' => [
                        "Il giorno {$dayName} è duplicato.",
                    ],
                ]);
            }

            $seenDays[] = $dayName;

            /*
            |--------------------------------------------------------------------------
            | Dati del giorno
            |--------------------------------------------------------------------------
            */

            $isWorkingDay = filter_var(
                $day['is_working_day'] ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

            $startTime =
                $day['start_time'] ?? null;

            $endTime =
                $day['end_time'] ?? null;

            /*
            |--------------------------------------------------------------------------
            | Giorno NON lavorativo
            |--------------------------------------------------------------------------
            */

            if (!$isWorkingDay) {

                if (
                    $startTime !== null ||
                    $endTime !== null
                ) {
                    throw ValidationException::withMessages([
                        'working_days' => [
                            "Il giorno {$dayName} non è lavorativo: gli orari devono essere null.",
                        ],
                    ]);
                }

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Giorno lavorativo
            |--------------------------------------------------------------------------
            */

            if (!$startTime || !$endTime) {
                throw ValidationException::withMessages([
                    'working_days' => [
                        "Per {$dayName} devi specificare entrambi gli orari.",
                    ],
                ]);
            }

            $start = Carbon::parse(
                $startTime
            );

            $end = Carbon::parse(
                $endTime
            );

            /*
            |--------------------------------------------------------------------------
            | Fine successiva all'inizio
            |--------------------------------------------------------------------------
            */

            if ($end->lessThanOrEqualTo($start)) {
                throw ValidationException::withMessages([
                    'working_days' => [
                        "L'orario di fine di {$dayName} deve essere successivo all'orario di inizio.",
                    ],
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Calcolo ore effettive
            |--------------------------------------------------------------------------
            */

            $minutes =
                $this->calculateWorkingMinutes(
                    $startTime,
                    $endTime
                );

            /*
            |--------------------------------------------------------------------------
            | Massimo 8 ore effettive al giorno
            |--------------------------------------------------------------------------
            */

            if ($minutes > 8 * 60) {
                throw ValidationException::withMessages([
                    'working_days' => [
                        "{$dayName} supera il limite di 8 ore lavorative.",
                    ],
                ]);
            }

            $totalMinutes += $minutes;
        }

        /*
        |--------------------------------------------------------------------------
        | Totale settimanale
        |--------------------------------------------------------------------------
        |
        | Il totale deve essere ESATTAMENTE uguale
        | alle ore previste dal contratto.
        |
        */

        if ($totalMinutes !== $weeklyHours * 60) {
            throw ValidationException::withMessages([
                'working_days' => [
                    "Il totale delle ore lavorative settimanali deve essere esattamente di {$weeklyHours} ore.",
                ],
            ]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | CALCOLO MINUTI LAVORATIVI
    |--------------------------------------------------------------------------
    */

    private function calculateWorkingMinutes(
        string $startTime,
        string $endTime
    ): int {
        $start = Carbon::parse(
            $startTime
        );

        $end = Carbon::parse(
            $endTime
        );

        $minutes =
            $start->diffInMinutes($end);

        /*
        |--------------------------------------------------------------------------
        | Regola B:
        | sottrai 60 minuti se l'orario di fine
        | supera le 15:00
        |--------------------------------------------------------------------------
        */

        if ($end->format('H:i') > '15:00') {
            $minutes -= 60;
        }

        return max(
            0,
            $minutes
        );
    }
}
