<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\Scrum\SprintService;
use App\Services\Scrum\SprintTotalsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SprintController extends Controller
{
    public function __construct(
        private SprintService $sprints,
        private SprintTotalsService $totals,
    ) {
    }

    // Elenco per la select "Seleziona Sprint".
    public function index(Project $project): JsonResponse
    {
        return response()->json(
            Sprint::forProject($project->id)->orderByDesc('number')->get()
        );
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('create', [Sprint::class, $project]);

        $data = $request->validate([
            'teamcategory_id' => ['required', 'exists:teamcategories,id'],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'is_billing' => ['sometimes', 'boolean'],
            'daily_duration' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:480'], // minuti; se assente: 30
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', Rule::exists('users', 'id')->whereNull('deleted_at')],
        ]);

        $result = $this->sprints->create($project, $data);

        return response()->json([
            'sprint' => $result['sprint'],
            'reduced' => $result['reduced'], // utenti con ore ridotte per il limite giornaliero
        ], 201);
    }

    // Dati della griglia (vista User e Scrum/Admin).
    public function show(Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        return response()->json($this->totals->grid($sprint));
    }

    // Flag planning/estimate/review e Team Assessment.
    public function update(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        $data = $request->validate([
            'is_planningdone' => ['sometimes', 'boolean'],
            'is_estimatedone' => ['sometimes', 'boolean'],
            'is_reviewdone' => ['sometimes', 'boolean'],
            'team_assessment' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:10'],
        ]);

        $sprint->update($data);

        return response()->json($sprint);
    }

    public function close(Sprint $sprint): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        return response()->json($this->sprints->close($sprint));
    }

    // --- NUOVO METODO PER IL CARICAMENTO DEL CSV ---
    public function uploadCsv(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'], // Max 10MB
            'is_pilot' => ['sometimes', 'boolean'],
            'is_billing' => ['sometimes', 'boolean'],
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            
            // Salvataggio del file nella cartella pubblica storage/app/public/sprint_csvs
            $path = $file->store('sprint_csvs', 'public');

            // Aggiorniamo le flag e impostiamo has_csv a true
            $sprint->update([
                'has_csv' => true,
                'is_pilot' => $data['is_pilot'] ?? $sprint->is_pilot,
                'is_billing' => $data['is_billing'] ?? $sprint->is_billing,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'File CSV caricato e sprint aggiornato con successo!',
                'data' => [
                    'sprint' => $sprint,
                    'file_url' => Storage::url($path)
                ]
            ], 200);
        }

        return response()->json([
            'success' => false,
            'message' => 'Nessun file inviato.'
        ], 400);
    }
}