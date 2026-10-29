<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CapacitySeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $users = DB::table('users')
            ->whereIn('email', [
                'luca.verdi@example.com',
                'giulia.neri@example.com',
                'andrea.costa@example.com',
            ])
            ->pluck('id', 'email');

        $projects = DB::table('projects')
            ->whereIn('alias', ['Portale Clienti', 'API Aziendali'])
            ->pluck('id', 'alias');

        if (
            !$users->has('luca.verdi@example.com')
            || !$users->has('giulia.neri@example.com')
            || !$users->has('andrea.costa@example.com')
        ) {
            throw new \RuntimeException(
                'Uno o più utenti non sono presenti. Esegui prima UserSeeder.'
            );
        }

        if (
            !$projects->has('Portale Clienti')
            || !$projects->has('API Aziendali')
        ) {
            throw new \RuntimeException(
                'Uno o più progetti non sono presenti. Esegui prima ProjectSeeder.'
            );
        }

        $sprints = DB::table('sprints')
            ->whereIn('project_id', $projects->values())
            ->get()
            ->keyBy(fn($sprint) => $sprint->project_id . '-' . $sprint->number);

        // Una riga per utente, sprint e giorno (unique su sprint_id + user_id + date).
        $capacities = [
            [
                'email' => 'luca.verdi@example.com',
                'project' => 'Portale Clienti',
                'sprint_number' => 1,
                'date' => '2026-01-12',
                'value' => 6.00,
                'billing_value' => 6.00,
            ],
            [
                'email' => 'giulia.neri@example.com',
                'project' => 'Portale Clienti',
                'sprint_number' => 1,
                'date' => '2026-01-12',
                'value' => 5.50,
                'billing_value' => 5.50,
            ],
            [
                'email' => 'luca.verdi@example.com',
                'project' => 'API Aziendali',
                'sprint_number' => 1,
                'date' => '2026-02-02',
                'value' => 6.00,
                'billing_value' => 5.00,
            ],
            [
                'email' => 'andrea.costa@example.com',
                'project' => 'API Aziendali',
                'sprint_number' => 1,
                'date' => '2026-02-02',
                'value' => 4.00,
                'billing_value' => null,
            ],
        ];

        // Stato della daily per sprint e giorno (non più per utente).
        $dailies = [
            ['project' => 'Portale Clienti', 'sprint_number' => 1, 'date' => '2026-01-12', 'status' => 'done'],
            ['project' => 'API Aziendali', 'sprint_number' => 1, 'date' => '2026-02-02', 'status' => 'done'],
        ];

        // Controllo del limite giornaliero (somma su tutti i progetti dello stesso utente).
        $max = (float) config('scrum.max_daily_hours', 8);
        $valueTotals = [];
        $billingTotals = [];

        foreach ($capacities as $capacity) {
            $key = $capacity['email'] . '|' . $capacity['date'];
            $valueTotals[$key] = ($valueTotals[$key] ?? 0) + $capacity['value'];
            $billingTotals[$key] = ($billingTotals[$key] ?? 0) + ($capacity['billing_value'] ?? 0);

            if ($valueTotals[$key] > $max || $billingTotals[$key] > $max) {
                throw new \RuntimeException(
                    "L'utente {$capacity['email']} supera {$max} ore il {$capacity['date']}."
                );
            }
        }

        foreach ($capacities as $capacity) {
            $userId = $users[$capacity['email']];
            $projectId = $projects[$capacity['project']];
            $sprint = $sprints->get($projectId . '-' . $capacity['sprint_number']);

            if (!$sprint) {
                throw new \RuntimeException(
                    "Sprint {$capacity['sprint_number']} non trovato per "
                    . "il progetto '{$capacity['project']}'. Esegui prima SprintSeeder."
                );
            }

            $date = substr($capacity['date'], 0, 10);
            if ($date < substr($sprint->start_date, 0, 10) || $date > substr($sprint->end_date, 0, 10)) {
                throw new \RuntimeException(
                    "La data {$date} non rientra nello sprint {$capacity['sprint_number']} "
                    . "del progetto '{$capacity['project']}'."
                );
            }

            DB::table('capacities')->updateOrInsert(
                [
                    'user_id' => $userId,
                    'sprint_id' => $sprint->id,
                    'date' => $date,
                ],
                [
                    'value' => $capacity['value'],
                    'billing_value' => $capacity['billing_value'],
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }

        foreach ($dailies as $daily) {
            $sprint = $sprints->get($projects[$daily['project']] . '-' . $daily['sprint_number']);

            if (!$sprint) {
                throw new \RuntimeException(
                    "Sprint {$daily['sprint_number']} non trovato per "
                    . "il progetto '{$daily['project']}'. Esegui prima SprintSeeder."
                );
            }

            DB::table('sprint_dailies')->updateOrInsert(
                [
                    'sprint_id' => $sprint->id,
                    'date' => $daily['date'],
                ],
                [
                    'status' => $daily['status'],
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }
}