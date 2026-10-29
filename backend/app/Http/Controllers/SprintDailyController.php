<?php

namespace App\Http\Controllers;

use App\Enums\DailyStatus;
use App\Http\Controllers\Controller;
use App\Models\Sprint;
use App\Services\Scrum\SprintDailyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SprintDailyController extends Controller
{
    public function __construct(private SprintDailyService $dailies)
    {
    }

    public function update(Request $request, Sprint $sprint, string $date): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        $data = $request->validate([
            'status' => ['required', Rule::enum(DailyStatus::class)],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $daily = $this->dailies->setStatus(
            $sprint,
            $date,
            DailyStatus::from($data['status']),
            $data['note'] ?? null,
            $request->user(),
        );

        return response()->json($daily);
    }
}