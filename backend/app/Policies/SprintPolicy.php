<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\User;
use App\Services\Scrum\SprintAccess;

class SprintPolicy
{
    public function __construct(private SprintAccess $access)
    {
    }

    // Lettura della tabella: adatta alla vostra regola (es. membri del progetto).
    public function view(User $user, Sprint $sprint): bool
    {
        return true;
    }

    // Creazione sprint: Admin o Scrum Master / Team Leader / Project Manager del progetto.
    public function create(User $user, Project $project): bool
    {
        if ($user->roles->contains('alias', 'Admin')) {
            return true;
        }
        return $this->access->canManageProject($user, $project);
    }

    // Modifica celle, daily, team, flag, chiusura: Admin o Scrum Master / Team Leader / Project Manager.
    public function manage(User $user, Sprint $sprint): bool
    {
        return $this->access->canManage($user, $sprint);
    }
}