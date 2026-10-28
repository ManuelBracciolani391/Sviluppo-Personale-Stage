<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserLeaveBalanceRequest;
use App\Http\Requests\UpdateUserLeaveBalanceRequest;
use App\Models\Contract;
use App\Models\LeaveAuditLog;
use App\Models\User;
use App\Models\UserLeaveBalance;
use App\Services\LeaveBalanceHistory;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserLeaveBalanceController extends Controller
{
    public function __construct(private LeaveBalanceHistory $history)
    {
    }

    public function index(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'leave_type' => ['sometimes', 'in:ferie,permesso,rol'],
            'year' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $user->leaveBalances();

        if (!empty($validated['leave_type'])) {
            $query->where('leave_type', $validated['leave_type']);
        }

        if (!empty($validated['year'])) {
            $query->whereYear('reference_month', $validated['year']);
        }

        return response()->json(
            $query->orderByDesc('reference_month')
                ->orderBy('leave_type')
                ->paginate($validated['per_page'] ?? 15)
        );
    }

    public function show(
        User $user,
        UserLeaveBalance $leaveBalance
    ): JsonResponse {
        $this->ensureBalanceBelongsToUser($user, $leaveBalance);

        return response()->json($leaveBalance);
    }

    public function store(
        StoreUserLeaveBalanceRequest $request,
        User $user
    ): JsonResponse {
        $validated = $request->validated();
        $adminId = (int) $request->user()->id;

        $referenceMonth = Carbon::parse(
            $validated['reference_month']
        )->startOfMonth();

        $this->ensureNoDuplicate(
            $user,
            $validated['leave_type'],
            $referenceMonth
        );

        $contractInfo = null;

        if ($validated['leave_type'] === 'ferie') {
            $contractInfo = $this->contractInfoForMonth(
                $user,
                $referenceMonth
            );
        }

        $balance = DB::transaction(function () use ($user, $adminId, $validated, $referenceMonth, $contractInfo) {
            $balance = UserLeaveBalance::create([
                'user_id' => $user->id,
                'leave_type' => $validated['leave_type'],
                'reference_month' => $referenceMonth->toDateString(),
                'contract_type' => $contractInfo['contract_type'] ?? null,
                'balance_unit' => $contractInfo['balance_unit'] ?? 'ore',
                'remaining_hours' => $validated['remaining_hours'],
                'accrued_hours' => $validated['accrued_hours'] ?? 0,
                'monthly_accrual' => $validated['monthly_accrual'] ?? 0,
            ]);

            $balance = $balance->fresh();

            $operationId = $this->history->record(
                adminId: $adminId,
                userId: $user->id,
                balanceId: $balance->id,
                action: 'create',
                before: null,
                after: $this->history->snapshot($balance)
            );

            $this->writeAuditLogs(
                adminId: $adminId,
                userId: $user->id,
                leaveType: $balance->leave_type,
                referenceMonth: $referenceMonth,
                oldValues: null,
                newValues: [
                    'remaining_hours' => $balance->remaining_hours,
                    'accrued_hours' => $balance->accrued_hours,
                    'monthly_accrual' => $balance->monthly_accrual,
                ],
                operationId: $operationId,
                balanceId: $balance->id,
                action: 'create'
            );

            return $balance;
        });

        return response()->json($balance, 201);
    }

    public function update(
        UpdateUserLeaveBalanceRequest $request,
        User $user,
        UserLeaveBalance $leaveBalance
    ): JsonResponse {
        $this->ensureBalanceBelongsToUser($user, $leaveBalance);

        $validated = $request->validated();
        $adminId = (int) $request->user()->id;

        $referenceMonth = Carbon::parse(
            $validated['reference_month']
        )->startOfMonth();

        $this->ensureNoDuplicate(
            $user,
            $validated['leave_type'],
            $referenceMonth,
            $leaveBalance->id
        );

        // Conserva lo snapshot contrattuale se il mese ferie non cambia.
        $sameHistoricalFerie =
            $leaveBalance->leave_type === 'ferie'
            && $validated['leave_type'] === 'ferie'
            && $leaveBalance->reference_month !== null
            && $leaveBalance->reference_month->format('Y-m')
            === $referenceMonth->format('Y-m')
            && !empty($leaveBalance->contract_type)
            && !empty($leaveBalance->balance_unit);

        $contractInfo = null;

        if (
            $validated['leave_type'] === 'ferie'
            && !$sameHistoricalFerie
        ) {
            $contractInfo = $this->contractInfoForMonth(
                $user,
                $referenceMonth
            );
        }

        $balance = DB::transaction(function () use ($user, $adminId, $validated, $referenceMonth, $leaveBalance, $contractInfo) {
            // Snapshot PRIMA di modificare il modello
            $before = $this->history->snapshot($leaveBalance);

            $oldValues = [
                'remaining_hours' => $leaveBalance->remaining_hours,
                'accrued_hours' => $leaveBalance->accrued_hours,
                'monthly_accrual' => $leaveBalance->monthly_accrual,
            ];

            $leaveBalance->leave_type = $validated['leave_type'];
            $leaveBalance->reference_month = $referenceMonth->toDateString();

            if ($validated['leave_type'] === 'ferie') {
                $leaveBalance->contract_type =
                    $contractInfo['contract_type']
                    ?? $leaveBalance->contract_type;

                $leaveBalance->balance_unit =
                    $contractInfo['balance_unit']
                    ?? $leaveBalance->balance_unit
                    ?? 'ore';
            } else {
                $leaveBalance->contract_type = null;
                $leaveBalance->balance_unit = 'ore';
            }

            $leaveBalance->remaining_hours = $validated['remaining_hours'];
            $leaveBalance->accrued_hours = $validated['accrued_hours'] ?? 0;
            $leaveBalance->monthly_accrual = $validated['monthly_accrual'] ?? 0;

            $leaveBalance->save();

            $fresh = $leaveBalance->fresh();
            $after = $this->history->snapshot($fresh);

            // Nessuna modifica reale: niente revisione nello stack
            if (!$this->history->sameState($before, $after)) {
                $operationId = $this->history->record(
                    adminId: $adminId,
                    userId: $user->id,
                    balanceId: $fresh->id,
                    action: 'update',
                    before: $before,
                    after: $after
                );

                $this->writeAuditLogs(
                    adminId: $adminId,
                    userId: $user->id,
                    leaveType: $fresh->leave_type,
                    referenceMonth: $referenceMonth,
                    oldValues: $oldValues,
                    newValues: [
                        'remaining_hours' => $fresh->remaining_hours,
                        'accrued_hours' => $fresh->accrued_hours,
                        'monthly_accrual' => $fresh->monthly_accrual,
                    ],
                    operationId: $operationId,
                    balanceId: $fresh->id,
                    action: 'update'
                );
            }

            return $fresh;
        });

        return response()->json($balance);
    }

    public function destroy(
        Request $request,
        User $user,
        UserLeaveBalance $leaveBalance
    ): JsonResponse {
        $this->ensureBalanceBelongsToUser($user, $leaveBalance);

        $adminId = (int) $request->user()->id;

        DB::transaction(function () use ($user, $adminId, $leaveBalance) {
            $before = $this->history->snapshot($leaveBalance);

            $operationId = $this->history->record(
                adminId: $adminId,
                userId: $user->id,
                balanceId: $leaveBalance->id,
                action: 'delete',
                before: $before,
                after: null
            );

            $this->writeAuditLogs(
                adminId: $adminId,
                userId: $user->id,
                leaveType: $leaveBalance->leave_type,
                referenceMonth: $leaveBalance->reference_month,
                oldValues: [
                    'remaining_hours' => $leaveBalance->remaining_hours,
                    'accrued_hours' => $leaveBalance->accrued_hours,
                    'monthly_accrual' => $leaveBalance->monthly_accrual,
                ],
                newValues: [
                    'remaining_hours' => null,
                    'accrued_hours' => null,
                    'monthly_accrual' => null,
                ],
                operationId: $operationId,
                balanceId: $leaveBalance->id,
                action: 'delete'
            );

            $leaveBalance->delete();
        });

        return response()->json([
            'message' => 'Contatore eliminato correttamente.',
        ]);
    }

    /**
     * Stato dell'undo/redo per un singolo record (per accendere/spegnere le icone).
     * $balanceId è un intero e non un model binding: il record potrebbe
     * essere stato eliminato da un undo.
     */
    public function history(User $user, int $balanceId): JsonResponse
    {
        return response()->json(
            $this->history->state($user->id, $balanceId)
        );
    }

    public function undo(
        Request $request,
        User $user,
        int $balanceId
    ): JsonResponse {
        $balance = $this->history->undo(
            $user,
            $balanceId,
            (int) $request->user()->id
        );

        return response()->json(array_merge(
            ['balance' => $balance],
            $this->history->state($user->id, $balanceId)
        ));
    }

    public function redo(
        Request $request,
        User $user,
        int $balanceId
    ): JsonResponse {
        $balance = $this->history->redo(
            $user,
            $balanceId,
            (int) $request->user()->id
        );

        return response()->json(array_merge(
            ['balance' => $balance],
            $this->history->state($user->id, $balanceId)
        ));
    }

    private function ensureBalanceBelongsToUser(
        User $user,
        UserLeaveBalance $leaveBalance
    ): void {
        abort_unless(
            $leaveBalance->user_id === $user->id,
            404,
            'Contatore non trovato per questo utente.'
        );
    }

    private function ensureNoDuplicate(
        User $user,
        string $leaveType,
        Carbon $referenceMonth,
        ?int $ignoreId = null
    ): void {
        $query = $user->leaveBalances()
            ->where('leave_type', $leaveType)
            ->whereDate(
                'reference_month',
                $referenceMonth->toDateString()
            );

        if ($ignoreId !== null) {
            $query->where('id', '<>', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'reference_month' => [
                    'Esiste già un contatore per questa tipologia e questo mese.',
                ],
            ]);
        }
    }

    private function contractInfoForMonth(
        User $user,
        Carbon $referenceMonth
    ): array {
        $monthStart = $referenceMonth->copy()->startOfMonth();
        $monthEnd = $referenceMonth->copy()->endOfMonth();

        $contract = Contract::query()
            ->where('user_id', $user->id)
            ->whereDate('contract_start_date', '<=', $monthEnd)
            ->where(function ($query) use ($monthStart) {
                $query->whereNull('contract_end_date')
                    ->orWhereDate('contract_end_date', '>=', $monthStart);
            })
            ->orderByDesc('contract_start_date')
            ->first();

        if (!$contract) {
            throw ValidationException::withMessages([
                'reference_month' => [
                    'Non esiste un contratto valido per il mese di riferimento delle ferie.',
                ],
            ]);
        }

        $contractType = $this->normalizeContractType($contract);

        return [
            'contract_type' => $contractType,
            'balance_unit' => $contractType === 'full-time'
                ? 'giorni'
                : 'ore',
        ];
    }

    private function normalizeContractType(Contract $contract): string
    {
        $type = strtolower(
            str_replace(
                ['_', ' '],
                '-',
                trim((string) $contract->contract_type)
            )
        );

        if (
            str_contains($type, 'part-time')
            || str_contains($type, 'parttime')
        ) {
            return 'part-time';
        }

        if (
            str_contains($type, 'full-time')
            || str_contains($type, 'fulltime')
        ) {
            return 'full-time';
        }

        return (int) $contract->weekly_hours >= 40
            ? 'full-time'
            : 'part-time';
    }

    private function writeAuditLogs(
        int $adminId,
        int $userId,
        string $leaveType,
        Carbon $referenceMonth,
        ?array $oldValues,
        array $newValues,
        ?string $operationId = null,
        ?int $balanceId = null,
        ?string $action = null
    ): void {
        foreach ([
            'remaining_hours',
            'accrued_hours',
            'monthly_accrual',
        ] as $field) {
            $oldValue = $oldValues[$field] ?? null;
            $newValue = $newValues[$field] ?? null;

            if (
                $oldValues !== null
                && $oldValue !== null
                && $newValue !== null
                && (float) $oldValue === (float) $newValue
            ) {
                continue;
            }

            LeaveAuditLog::create([
                'user_id' => $userId,
                'admin_id' => $adminId,
                'balance_id' => $balanceId,
                'leave_type' => $leaveType,
                'reference_month' => $referenceMonth->toDateString(),
                'field_name' => $field,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'operation_id' => $operationId,
                'action' => $action,
            ]);
        }
    }
}