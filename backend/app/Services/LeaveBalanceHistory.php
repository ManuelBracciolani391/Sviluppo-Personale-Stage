<?php

namespace App\Services;

use App\Models\LeaveAuditLog;
use App\Models\User;
use App\Models\UserLeaveBalance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LeaveBalanceHistory
{
    public const HEAD = 'operation';

    private const NUMERIC = ['remaining_hours', 'accrued_hours', 'monthly_accrual'];

    public function snapshot(?UserLeaveBalance $balance): ?array
    {
        if (!$balance) {
            return null;
        }

        return [
            'leave_type' => $balance->leave_type,
            'contract_type' => $balance->contract_type,
            'balance_unit' => $balance->balance_unit,
            'reference_month' => $balance->reference_month?->toDateString(),
            'remaining_hours' => $balance->remaining_hours,
            'accrued_hours' => $balance->accrued_hours,
            'monthly_accrual' => $balance->monthly_accrual,
        ];
    }

    public function sameState(?array $a, ?array $b): bool
    {
        if ($a === null || $b === null) {
            return $a === $b;
        }

        foreach ($a as $key => $value) {
            $other = $b[$key] ?? null;

            if (in_array($key, self::NUMERIC, true)) {
                if ((float) $value !== (float) $other) {
                    return false;
                }
            } elseif ($value !== $other) {
                return false;
            }
        }

        return true;
    }

    /**
     * Registra una nuova modifica nello stack. Da chiamare dentro la transazione.
     * Restituisce l'operation_id da passare alle righe di audit per campo.
     */
    public function record(
        int $adminId,
        int $userId,
        int $balanceId,
        string $action,
        ?array $before,
        ?array $after
    ): string {
        // Una nuova modifica chiude il ramo redo
        LeaveAuditLog::query()
            ->where('balance_id', $balanceId)
            ->where('field_name', self::HEAD)
            ->whereNotNull('undone_at')
            ->whereNull('discarded_at')
            ->update(['discarded_at' => now()]);

        $revision = (int) LeaveAuditLog::query()
            ->where('balance_id', $balanceId)
            ->where('field_name', self::HEAD)
            ->max('revision') + 1;

        $operationId = (string) Str::uuid();
        $month = ($after ?? $before)['reference_month'];

        LeaveAuditLog::create([
            'user_id' => $userId,
            'admin_id' => $adminId,
            'balance_id' => $balanceId,
            'leave_type' => ($after ?? $before)['leave_type'],
            'reference_month' => $month,
            'field_name' => self::HEAD,
            'operation_id' => $operationId,
            'revision' => $revision,
            'action' => $action,
            'before_data' => $before,
            'after_data' => $after,
        ]);

        return $operationId;
    }

    public function state(int $userId, int $balanceId): array
    {
        $heads = fn() => LeaveAuditLog::query()
            ->where('user_id', $userId)
            ->where('balance_id', $balanceId)
            ->where('field_name', self::HEAD)
            ->whereNull('discarded_at');

        return [
            'can_undo' => $heads()->whereNull('undone_at')->exists(),
            'can_redo' => $heads()->whereNotNull('undone_at')->exists(),
        ];
    }

    public function undo(User $user, int $balanceId, int $adminId): ?UserLeaveBalance
    {
        return $this->step($user, $balanceId, $adminId, 'undo');
    }

    public function redo(User $user, int $balanceId, int $adminId): ?UserLeaveBalance
    {
        return $this->step($user, $balanceId, $adminId, 'redo');
    }

    private function step(
        User $user,
        int $balanceId,
        int $adminId,
        string $direction
    ): ?UserLeaveBalance {
        return DB::transaction(function () use ($user, $balanceId, $adminId, $direction) {
            $head = LeaveAuditLog::query()
                ->where('user_id', $user->id)
                ->where('balance_id', $balanceId)
                ->where('field_name', self::HEAD)
                ->whereNull('discarded_at')
                ->when(
                    $direction === 'undo',
                    fn($q) => $q->whereNull('undone_at')->orderByDesc('revision'),
                    fn($q) => $q->whereNotNull('undone_at')->orderBy('revision')
                )
                ->lockForUpdate()
                ->first();

            if (!$head) {
                abort(409, $direction === 'undo'
                    ? 'Nessuna modifica da annullare.'
                    : 'Nessuna modifica da ripristinare.');
            }

            $expected = $direction === 'undo' ? $head->after_data : $head->before_data;
            $target = $direction === 'undo' ? $head->before_data : $head->after_data;

            $existing = UserLeaveBalance::query()
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->find($balanceId);

            $current = $this->snapshot($existing);

            if (!$this->sameState($current, $expected)) {
                abort(409, 'Il contatore è stato modificato fuori dalla cronologia: impossibile procedere.');
            }

            $result = $this->apply($user, $balanceId, $existing, $target);

            $operationId = (string) Str::uuid();
            $this->writeFieldLogs($adminId, $user->id, $balanceId, $operationId, $direction, $current, $target);

            $head->undone_at = $direction === 'undo' ? now() : null;
            $head->undone_by = $direction === 'undo' ? $adminId : null;
            $head->save();

            return $result;
        });
    }

    private function apply(
        User $user,
        int $balanceId,
        ?UserLeaveBalance $existing,
        ?array $state
    ): ?UserLeaveBalance {
        if ($state === null) {
            $existing?->delete();

            return null;
        }

        $duplicate = $user->leaveBalances()
            ->where('leave_type', $state['leave_type'])
            ->whereDate('reference_month', $state['reference_month'])
            ->where('id', '<>', $balanceId)
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'reference_month' => [
                    'Esiste già un contatore per questa tipologia e questo mese: impossibile ripristinare.',
                ],
            ]);
        }

        $balance = $existing ?? new UserLeaveBalance();
        $balance->forceFill($state + ['user_id' => $user->id, 'id' => $balanceId])->save();

        return $balance->fresh();
    }

    private function writeFieldLogs(
        int $adminId,
        int $userId,
        int $balanceId,
        string $operationId,
        string $action,
        ?array $from,
        ?array $to
    ): void {
        $ref = $to ?? $from;

        foreach (self::NUMERIC as $field) {
            $old = $from[$field] ?? null;
            $new = $to[$field] ?? null;

            if ($old !== null && $new !== null && (float) $old === (float) $new) {
                continue;
            }

            LeaveAuditLog::create([
                'user_id' => $userId,
                'admin_id' => $adminId,
                'balance_id' => $balanceId,
                'leave_type' => $ref['leave_type'],
                'reference_month' => $ref['reference_month'],
                'field_name' => $field,
                'old_value' => $old,
                'new_value' => $new,
                'operation_id' => $operationId,
                'action' => $action,
            ]);
        }
    }
}