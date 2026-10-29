<?php

namespace App\Services\Scrum;

use App\Models\Capacity;
use App\Models\ProjectUser;
use App\Models\Sprint;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SprintMemberService
{
    public function __construct(private CapacityService $capacities)
    {
    }

    /**
     * Aggiunge un utente allo sprint creando una capacity per ogni giorno lavorativo
     * (default 8 di capacity e 8 di fatturazione). Se l'utente ha già ore su altri sprint
     * nello stesso giorno, assegna solo quanto resta fino al massimo giornaliero.
     *
     * @return array{created: int, reduced: array<string, array{value: float, billing_value: float}>}
     *         "reduced" elenca i giorni in cui le ore sono state ridotte per rispettare il limite
     */
    public function addUser(Sprint $sprint, int $userId, ?CarbonInterface $from = null): array
    {
        $this->assertOpen($sprint);

        // Il team dello sprint è un sottoinsieme dei membri del progetto (pivot project_user):
        // l'assegnazione deve essere attiva in almeno un giorno dello sprint.
        $isMember = ProjectUser::query()
            ->where('project_id', $sprint->project_id)
            ->where('user_id', $userId)
            ->whereDate('startwork_date', '<=', $sprint->end_date)
            ->where(fn($q) => $q
                ->whereNull('endwork_date')
                ->orWhereDate('endwork_date', '>=', $sprint->start_date))
            ->exists();

        if (!$isMember) {
            throw ValidationException::withMessages([
                'user_id' => "L'utente non fa parte del progetto.",
            ]);
        }

        return DB::transaction(function () use ($sprint, $userId, $from) {
            $days = collect($sprint->workingDays())
                ->when($from, fn($c) => $c->filter(fn($d) => $d->gte($from->copy()->startOfDay())))
                ->values();

            if ($days->isEmpty()) {
                throw ValidationException::withMessages([
                    'user_id' => 'Nessun giorno lavorativo disponibile in questo sprint.',
                ]);
            }

            $keys = $days->map(fn($d) => $d->toDateString());

            // Anche le righe eliminate (soft delete): vanno ripristinate per non violare l'unique.
            $existing = Capacity::withTrashed()
                ->where('sprint_id', $sprint->id)
                ->where('user_id', $userId)
                ->whereIn('date', $keys)
                ->get()
                ->keyBy(fn($c) => $c->date->toDateString());

            $used = $this->capacities->usedHours($userId, $keys, excludeSprintId: $sprint->id);

            $max = $this->capacities->maxDailyHours();
            $default = (float) config('scrum.default_hours');

            $created = 0;
            $reduced = [];

            foreach ($keys as $k) {

                $row = $existing[$k] ?? null;
                if ($row && !$row->trashed()) {
                    continue; // già presente
                }

                $value = min($default, max(0, $max - $used[$k]['value']));
                $billing = min($default, max(0, $max - $used[$k]['billing']));

                if ($value < $default || $billing < $default) {
                    $reduced[$k] = ['value' => $value, 'billing_value' => $billing];
                }

                if ($row) {
                    $row->restore();
                    $row->update(['value' => $value, 'billing_value' => $billing]);
                } else {
                    Capacity::create([
                        'sprint_id' => $sprint->id,
                        'user_id' => $userId,
                        'date' => $k,
                        'value' => $value,
                        'billing_value' => $billing,
                    ]);
                }

                $created++;
            }

            return ['created' => $created, 'reduced' => $reduced];
        });
    }

    /**
     * Rimuove l'utente dallo sprint: elimina le capacity da oggi in poi
     * (se lo sprint non è ancora iniziato, tutte). Lo storico passato resta.
     */
    public function removeUser(Sprint $sprint, int $userId): int
    {
        $this->assertOpen($sprint);

        return Capacity::query()
            ->where('sprint_id', $sprint->id)
            ->where('user_id', $userId)
            ->whereDate('date', '>=', today())
            ->delete();
    }

    private function assertOpen(Sprint $sprint): void
    {
        if ($sprint->is_concluded) {
            throw ValidationException::withMessages([
                'sprint' => 'Lo sprint è concluso: non è possibile modificare il team.',
            ]);
        }
    }
}