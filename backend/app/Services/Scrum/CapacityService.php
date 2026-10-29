<?php

namespace App\Services\Scrum;

use App\Models\Capacity;
use App\Models\Sprint;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CapacityService
{
    public function maxDailyHours(): float
    {
        return (float) config('scrum.max_daily_hours');
    }

    /**
     * Ore già allocate dall'utente nei giorni indicati, su TUTTI gli sprint di TUTTI i progetti.
     * Da chiamare dentro una transazione: le righe vengono bloccate per evitare race condition
     * tra due richieste che assegnano ore allo stesso utente contemporaneamente.
     *
     * @return array<string, array{value: float, billing: float}>  chiave = Y-m-d
     */
    public function usedHours(
        int $userId,
        iterable $dates,
        ?int $excludeSprintId = null,
        ?int $excludeCapacityId = null,
    ): array {
        $keys = collect($dates)
            ->map(fn($d) => Carbon::parse($d)->toDateString())
            ->unique()
            ->values();

        $rows = Capacity::query()
            ->where('user_id', $userId)
            ->whereIn('date', $keys)
            ->when($excludeSprintId, fn($q) => $q->where('sprint_id', '!=', $excludeSprintId))
            ->when($excludeCapacityId, fn($q) => $q->where('id', '!=', $excludeCapacityId))
            ->lockForUpdate()
            ->get(['id', 'date', 'value', 'billing_value']);

        $used = [];
        foreach ($keys as $k) {
            $used[$k] = ['value' => 0.0, 'billing' => 0.0];
        }
        foreach ($rows as $row) {
            $k = $row->date->toDateString();
            $used[$k]['value'] += (float) $row->value;
            $used[$k]['billing'] += (float) ($row->billing_value ?? 0);
        }

        return $used;
    }

    /**
     * Modifica manuale di una cella (Admin / Scrum Master).
     * Il limite di 8 ore si applica quando le ore AUMENTANO: abbassare un valore è sempre permesso.
     */
    public function setHours(
        Sprint $sprint,
        int $userId,
        CarbonInterface $date,
        ?float $value,
        ?float $billing,
    ): Capacity {
        if ($sprint->is_concluded) {
            throw ValidationException::withMessages([
                'sprint' => 'Lo sprint è concluso: le ore non sono più modificabili.',
            ]);
        }

        return DB::transaction(function () use ($sprint, $userId, $date, $value, $billing) {
            $capacity = Capacity::query()
                ->where('sprint_id', $sprint->id)
                ->where('user_id', $userId)
                ->whereDate('date', $date)
                ->lockForUpdate()
                ->first();

            if (!$capacity) {
                throw ValidationException::withMessages([
                    'date' => "L'utente non ha una capacity in questa data dello sprint.",
                ]);
            }

            $newValue = $value ?? (float) $capacity->value;
            $newBilling = $billing ?? (float) $capacity->billing_value;

            // billing_value non può essere inferiore a value.
            if ($newBilling < $newValue) {
                if ($billing !== null && $value === null) {
                    throw ValidationException::withMessages([
                        'billing_value' => 'Il valore di billing_value non può essere inferiore a value.',
                    ]);
                }

                $newBilling = $newValue;
            }

            $others = $this->usedHours(
                $userId,
                [$date],
            excludeCapacityId: $capacity->id
            )[$date->toDateString()];

            if ($value !== null) {
                $this->assertWithinCap(
                    $others['value'],
                    (float) $capacity->value,
                    $newValue,
                    'value',
                    $date
                );
            }

            if ($billing !== null || $newBilling !== (float) $capacity->billing_value) {
                $this->assertWithinCap(
                    $others['billing'],
                    (float) $capacity->billing_value,
                    $newBilling,
                    'billing_value',
                    $date
                );
            }

            $capacity->update([
                'value' => $newValue,
                'billing_value' => $newBilling,
            ]);

            return $capacity->refresh();
        });
    }

    private function assertWithinCap(float $others, float $old, float $new, string $field, CarbonInterface $date): void
    {
        $max = $this->maxDailyHours();

        if ($new > $old && $others + $new > $max) {
            $residual = max(0, $max - $others);

            throw ValidationException::withMessages([
                $field => sprintf(
                    'Il %s l\'utente ha già %s ore su altri sprint: puoi assegnarne al massimo %s.',
                    $date->format('d/m/Y'),
                    $this->fmt($others),
                    $this->fmt($residual),
                ),
            ]);
        }
    }

    private function fmt(float $hours): string
    {
        return rtrim(rtrim(number_format($hours, 2, ',', ''), '0'), ',');
    }
}