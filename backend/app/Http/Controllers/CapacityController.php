<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Sprint;
use App\Models\User;
use App\Services\Scrum\CapacityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CapacityController extends Controller
{
    public function __construct(private CapacityService $capacities)
    {
    }

    // Modifica di una cella (utente + giorno) dalla vista Scrum/Admin.
    public function update(Request $request, Sprint $sprint, User $user, string $date): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        $max = (float) config('scrum.max_daily_hours');

        $data = $request->validate([
            'value' => ['sometimes', 'required', 'numeric', 'min:0', "max:$max"],
            'billing_value' => ['sometimes', 'required', 'numeric', 'min:0', "max:$max"],
        ]);

        $capacity = $this->capacities->setHours(
            $sprint,
            $user->id,
            Carbon::createFromFormat('Y-m-d', $date)->startOfDay(),
            isset($data['value']) ? (float) $data['value'] : null,
            isset($data['billing_value']) ? (float) $data['billing_value'] : null,
        );

        return response()->json($capacity);
    }
}