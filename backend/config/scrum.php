<?php

return [
    // Ore lavorative massime per utente al giorno, sommate su tutti gli sprint di tutti i progetti.
    'max_daily_hours' => 8,

    // Ore assegnate (sia capacity sia fatturazione) quando un utente viene aggiunto a uno sprint.
    'default_hours' => 8,

    // Durata predefinita della daily, in minuti.
    'daily_minutes' => 30,

    // Alias dei ruoli (confronto case-insensitive). VERIFICA che coincidano con i valori reali nel DB.
    'roles' => [
        // Ruolo di permesso globale: colonna `alias` della tabella `roles`.
        'admin' => ['admin'],

        // Ruoli di progetto: colonna `alias` della tabella `assignmentroles`.
        'scrum_master' => ['scrum master'],
        'managers' => ['team leader', 'project manager'],
    ],
];