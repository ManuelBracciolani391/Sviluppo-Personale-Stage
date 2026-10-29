<?php

namespace Database\Seeders;

use App\Models\AssignmentRole;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class ProjectUserSeeder extends Seeder
{
    public function run(): void
    {
        $projects = Project::whereIn('id', [1, 2])->get();

        if ($projects->count() !== 2) {
            throw new RuntimeException(
                'I progetti con ID 1 e 2 devono esistere.'
            );
        }

        $users = User::whereIn('id', [1, 2])->get();

        if ($users->count() !== 2) {
            throw new RuntimeException(
                'Gli utenti con ID 1 e 2 devono esistere.'
            );
        }

        $assignmentRole = AssignmentRole::query()->first();

        if (!$assignmentRole) {
            throw new RuntimeException(
                'Non esistono ruoli nella tabella assignmentroles.'
            );
        }

        foreach ($projects as $project) {
            foreach ($users as $user) {
                $membership = ProjectUser::withTrashed()
                    ->firstOrNew([
                        'project_id' => $project->id,
                        'user_id' => $user->id,
                    ]);

                $membership->assignmentrole_id = $assignmentRole->id;
                $membership->startwork_date = '2026-01-01';
                $membership->endwork_date = null;
                $membership->work_allocation = 100;

                // Ripristina un'associazione eventualmente eliminata.
                $membership->deleted_at = null;

                $membership->save();
            }
        }

        $this->command->info(
            'Utenti 1 e 2 associati ai progetti 1 e 2.'
        );
    }
}
