<?php

namespace App\Services\Scrum;

use App\Models\Sprint;
use Carbon\Carbon;

class SprintTotalsService
{
    /**
     * Dati della griglia Scrum/Fatturazione: celle, totali per utente, per giorno e generale.
     * Fatturazione "simulata": sui giorni futuri, se billing_value è vuoto vale la capacity;
     * sui giorni passati o odierni, se è vuoto vale 0.
     * Il confronto con le ore effettive (Azure DevOps) non è ancora implementato (azure_hours = null).
     */
    public function grid(Sprint $sprint): array
    {
        $today = today();
        $days = collect($sprint->workingDays())->map(fn($d) => $d->toDateString())->values();

        $dailies = $sprint->dailies()->get()->keyBy(fn($d) => $d->date->toDateString());
        $capacities = $sprint->capacities()->with('user')->get();

        $billingOf = function ($cap, string $date) use ($today): float {
            if ($cap->billing_value !== null) {
                return (float) $cap->billing_value;
            }

            return Carbon::parse($date)->gt($today) ? (float) $cap->value : 0.0;
        };

        $dayTotals = $days->mapWithKeys(fn($d) => [$d => ['capacity' => 0.0, 'billing' => 0.0]])->all();

        $users = $capacities->groupBy('user_id')->map(function ($rows) use ($days, $billingOf, &$dayTotals) {
            $byDate = $rows->keyBy(fn($c) => $c->date->toDateString());
            $cells = [];
            $capacityTotal = 0.0;
            $billingTotal = 0.0;

            foreach ($days as $d) {
                $cap = $byDate[$d] ?? null;

                if (!$cap) {
                    $cells[$d] = null;
                    continue;
                }

                $billing = $billingOf($cap, $d);

                $cells[$d] = [
                    'capacity_id' => $cap->id,
                    'value' => (float) $cap->value,
                    'billing_value' => $cap->billing_value !== null ? (float) $cap->billing_value : null,
                    'note' => $cap->note,
                ];

                $capacityTotal += (float) $cap->value;
                $billingTotal += $billing;
                $dayTotals[$d]['capacity'] += (float) $cap->value;
                $dayTotals[$d]['billing'] += $billing;
            }

            return [
                'user' => $rows->first()->user,
                'days' => $cells,
                'capacity_total' => $capacityTotal,
                'billing_total' => $billingTotal,
                'azure_hours' => null,
            ];
        })->values();

        return [
            'sprint' => $sprint,
            'days' => $days->map(fn($d) => [
                'date' => $d,
                'daily' => isset($dailies[$d])
                    ? ['status' => $dailies[$d]->status, 'note' => $dailies[$d]->note]
                    : null,
            ])->all(),
            'users' => $users,
            'day_totals' => $dayTotals,
            'totals' => [
                'capacity' => (float) $users->sum('capacity_total'),
                'billing' => (float) $users->sum('billing_total'),
            ],
        ];
    }
}