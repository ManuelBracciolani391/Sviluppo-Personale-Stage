<?php

namespace App\Services\Scrum;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\SprintMetric;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SprintService
{
    public function __construct(
        private SprintMemberService $members,
        private SprintTotalsService $totals,
    ) {
    }

    /**
     * Crea lo sprint, le righe delle daily (una per giorno lavorativo) e, se indicati,
     * aggiunge gli utenti con le relative capacity.
     *
     * $data: teamcategory_id, start_date, end_date, [is_billing], [daily_duration], [user_ids]
     *
     * @return array{sprint: Sprint, reduced: array<int, array>}  "reduced" per utente: giorni con ore ridotte
     */
    public function create(Project $project, array $data): array
    {
        $start = Carbon::parse($data['start_date'])->startOfDay();
        $end = Carbon::parse($data['end_date'])->startOfDay();

        if ($end->lt($start)) {
            throw ValidationException::withMessages([
                'end_date' => 'La data di fine non può precedere quella di inizio.',
            ]);
        }

        return DB::transaction(function () use ($project, $data, $start, $end) {
            // Serializza la creazione di sprint dello stesso progetto (numerazione e sovrapposizioni).
            Project::whereKey($project->id)->lockForUpdate()->first();

            $overlap = Sprint::where('project_id', $project->id)
                ->whereDate('start_date', '<=', $end)
                ->whereDate('end_date', '>=', $start)
                ->exists();

            if ($overlap) {
                throw ValidationException::withMessages([
                    'start_date' => 'Le date si sovrappongono a un altro sprint dello stesso progetto.',
                ]);
            }

            // withTrashed: il numero di uno sprint eliminato non va riutilizzato (unique su project_id + number).
            $number = (int) Sprint::withTrashed()->where('project_id', $project->id)->max('number') + 1;
            $isPilot = !Sprint::withTrashed()->where('project_id', $project->id)->exists();

            $sprint = Sprint::create([
                'project_id' => $project->id,
                'teamcategory_id' => $data['teamcategory_id'],
                'number' => $number,
                'start_date' => $start,
                'end_date' => $end,
                'is_pilot' => $isPilot,
                'is_billing' => $data['is_billing'] ?? true,
                'daily_duration' => $data['daily_duration'] ?? config('scrum.daily_minutes'),
            ]);

            $sprint->dailies()->createMany(
                collect($sprint->workingDays())
                    ->map(fn($d) => ['date' => $d->toDateString()])
                    ->all()
            );

            $reduced = [];
            foreach (array_unique($data['user_ids'] ?? []) as $userId) {
                $result = $this->members->addUser($sprint, (int) $userId);
                if ($result['reduced']) {
                    $reduced[(int) $userId] = $result['reduced'];
                }
            }

            return ['sprint' => $sprint, 'reduced' => $reduced];
        });
    }

    /**
     * Chiude lo sprint: salva le fotografie dei totali in sprint_metrics e blocca le modifiche.
     * La velocity va aggiunta qui quando saranno disponibili gli story point (Azure DevOps).
     */
    public function close(Sprint $sprint): Sprint
    {
        if ($sprint->is_concluded) {
            throw ValidationException::withMessages(['sprint' => 'Lo sprint è già concluso.']);
        }

        return DB::transaction(function () use ($sprint) {
            $grid = $this->totals->grid($sprint);

            foreach ($grid['users'] as $row) {
                $this->saveMetric($sprint, $row['user']->id, 'user_total', $row['capacity_total'], $row['billing_total']);
            }

            $this->saveMetric($sprint, null, 'sprint_total', $grid['totals']['capacity'], $grid['totals']['billing']);

            $sprint->update(['is_concluded' => true, 'closed_at' => now()]);

            return $sprint;
        });
    }

    private function saveMetric(Sprint $sprint, ?int $userId, string $key, float $value, float $billing): void
    {
        // user_id e date sono NULL nelle metriche di sprint: l'unique del DB non le deduplica
        // (NULL è sempre diverso da NULL), quindi si usa updateOrCreate dentro la transazione.
        SprintMetric::updateOrCreate(
            ['sprint_id' => $sprint->id, 'user_id' => $userId, 'date' => null, 'key' => $key],
            ['value' => $value, 'billing_value' => $billing],
        );
    }
}