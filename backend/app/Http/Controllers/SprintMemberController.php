<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Sprint;
use App\Models\User;
use App\Services\Scrum\SprintMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SprintMemberController extends Controller
{
    public function __construct(private SprintMemberService $members)
    {
    }

    public function store(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        $data = $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')->whereNull('deleted_at')],
        ]);

        return response()->json($this->members->addUser($sprint, $data['user_id']), 201);
    }

    public function destroy(Sprint $sprint, User $user): JsonResponse
    {
        Gate::authorize('manage', $sprint);

        return response()->json(['deleted' => $this->members->removeUser($sprint, $user->id)]);
    }
}