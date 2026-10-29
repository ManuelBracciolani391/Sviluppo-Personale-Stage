<?php

namespace App\Services\Scrum;

use App\Models\AssignmentRole;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\Sprint;
use App\Models\User;
use Carbon\CarbonInterface;

/**
 * Chi può fare cosa nello Scrum.
 *  - Admin: ruolo di permesso globale (tabella roles).
 *  - Scrum Master / Team Leader / Project Manager: ruolo dell'utente nel progetto
 *    (project_user.assignmentrole_id -> assignmentroles), con assegnazione attiva nel periodo.
 */
class SprintAccess
{
    public function isAdmin(User $user): bool
    {
        $aliases = (array) config('scrum.roles.admin');
        if (!$aliases) {
            return false;
        }

        [$sql, $bindings] = $this->lowerIn('roles.alias', $aliases);

        return $user->roles()->whereRaw($sql, $bindings)->exists();
    }

    // Lo Scrum Master del progetto dello sprint (assegnazione attiva durante lo sprint).
    public function isScrumMaster(User $user, Sprint $sprint): bool
    {
        return $this->hasProjectRole(
            $user,
            $sprint->project_id,
            (array) config('scrum.roles.scrum_master'),
            $sprint->start_date,
            $sprint->end_date,
        );
    }

    // Può cliccare la daily e modificare ore, team, flag e chiusura dello sprint.
    public function canManage(User $user, Sprint $sprint): bool
    {
        return $this->isAdmin($user)
            || $this->hasProjectRole($user, $sprint->project_id, $this->managementAliases(), $sprint->start_date, $sprint->end_date);
    }

    // Può creare sprint nel progetto (assegnazione attiva oggi).
    public function canManageProject(User $user, Project $project): bool
    {
        return $this->isAdmin($user)
            || $this->hasProjectRole($user, $project->id, $this->managementAliases());
    }

    public function hasProjectRole(
        User $user,
        int $projectId,
        array $aliases,
        ?CarbonInterface $from = null,
        ?CarbonInterface $to = null,
    ): bool {
        if (!$aliases) {
            return false;
        }

        $from ??= today();
        $to ??= $from;

        [$sql, $bindings] = $this->lowerIn('alias', $aliases);

        return ProjectUser::query()
            ->where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->whereDate('startwork_date', '<=', $to)
            ->where(fn($q) => $q
                ->whereNull('endwork_date')
                ->orWhereDate('endwork_date', '>=', $from))
            ->whereIn('assignmentrole_id', AssignmentRole::query()->whereRaw($sql, $bindings)->select('id'))
            ->exists();
    }

    private function managementAliases(): array
    {
        return array_merge(
            (array) config('scrum.roles.scrum_master'),
            (array) config('scrum.roles.managers'),
        );
    }

    /** @return array{0: string, 1: array<int, string>} */
    private function lowerIn(string $column, array $aliases): array
    {
        $lower = array_map('mb_strtolower', array_values($aliases));

        return ["LOWER($column) IN (" . implode(',', array_fill(0, count($lower), '?')) . ')', $lower];
    }
}