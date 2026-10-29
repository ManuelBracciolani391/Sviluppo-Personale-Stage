<?php

namespace App\Services\Scrum;

use App\Enums\DailyStatus;
use App\Models\Capacity;
use App\Models\Sprint;
use App\Models\SprintDaily;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SprintDailyService
{
    public function __construct(
        private CapacityService $capacities,
        private SprintAccess $access,
    ) {
    }

    /**
     * Cambia lo stato della daily di un giorno.
     * Se lo stato diventa "done" e chi clicca è lo Scrum Master dello sprint (non Team Leader, Project Manager o Admin: per loro la daily viene solo flaggata), la durata della daily
     * (default 30 minuti) viene aggiunta alla sua capacity di quel giorno. L'accredito è reversibile:
     * se lo stato cambia, i minuti accreditati vengono tolti prima di applicare il nuovo stato.
     *
     * L'accredito rispetta il limite di ore giornaliere (somma su tutti gli sprint di tutti i progetti):
     * se lo superasse, l'operazione viene rifiutata e la daily resta nello stato precedente.
     */
    public function setStatus(Sprint $sprint, string $date, DailyStatus $status, ?string $note, User $actor): SprintDaily
    {
        if ($sprint->is_concluded) {
            throw ValidationException::withMessages(['sprint' => 'Lo sprint è concluso.']);
        }

        return DB::transaction(function () use ($sprint, $date, $status, $note, $actor) {
            $daily = SprintDaily::where('sprint_id', $sprint->id)
                ->whereDate('date', $date)
                ->lockForUpdate()
                ->firstOrFail();

            if ($daily->status === $status) {
                $daily->update(['note' => $note ?? $daily->note]); // idempotente: nessun nuovo accredito
                return $daily;
            }

            // Storno dell'accredito precedente.
            if ($daily->credited_minutes > 0 && $daily->credited_user_id) {
                $cap = Capacity::where('sprint_id', $sprint->id)
                    ->where('user_id', $daily->credited_user_id)
                    ->whereDate('date', $date)
                    ->lockForUpdate()
                    ->first();

                if ($cap) {
                    $cap->update(['value' => max(0, (float) $cap->value - $daily->credited_minutes / 60)]);
                }

                $daily->credited_minutes = 0;
                $daily->credited_user_id = null;
            }

            // Nuovo accredito.
            if ($status === DailyStatus::Done && $this->access->isScrumMaster($actor, $sprint)) {
                $day = $daily->date->toDateString();
                $hours = $sprint->daily_duration / 60;

                // Ore già impegnate dall'utente quel giorno su tutti gli sprint (dopo lo storno).
                $used = $this->capacities->usedHours($actor->id, [$day])[$day]['value'];

                if ($used + $hours > $this->capacities->maxDailyHours()) {
                    throw ValidationException::withMessages([
                        'status' => sprintf(
                            'Il %s hai già %s ore assegnate: non è possibile aggiungere la daily (%d minuti) senza superare il limite giornaliero.',
                            $daily->date->format('d/m/Y'),
                            rtrim(rtrim(number_format($used, 2, ',', ''), '0'), ','),
                            $sprint->daily_duration,
                        ),
                    ]);
                }

                $cap = Capacity::firstOrCreate(
                    ['sprint_id' => $sprint->id, 'user_id' => $actor->id, 'date' => $day],
                    ['value' => 0],
                );
                $cap->update(['value' => (float) $cap->value + $hours]);

                $daily->credited_minutes = $sprint->daily_duration;
                $daily->credited_user_id = $actor->id;
            }

            $daily->status = $status;
            if ($note !== null) {
                $daily->note = $note;
            }
            $daily->save();

            return $daily;
        });
    }
}