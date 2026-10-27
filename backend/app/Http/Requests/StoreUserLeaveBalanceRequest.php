<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserLeaveBalanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Temporaneo: nessuna autenticazione disponibile.
        return true;
    }

    protected function prepareForValidation(): void
    {
        $month = $this->input('reference_month');

        // Accetta sia YYYY-MM sia YYYY-MM-DD.
        if (
            is_string($month)
            && preg_match('/^\d{4}-\d{2}$/', $month)
        ) {
            $this->merge([
                'reference_month' => $month . '-01',
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'leave_type' => [
                'required',
                Rule::in(['ferie', 'permesso', 'rol']),
            ],

            'reference_month' => [
                'required',
                'date_format:Y-m-d',
                'date',
            ],

            'remaining_hours' => [
                'required',
                'numeric',
                'min:0',
                'max:999999.99',
            ],

            'accrued_hours' => [
                'sometimes',
                'numeric',
                'min:0',
                'max:999999.99',
            ],

            'monthly_accrual' => [
                'sometimes',
                'numeric',
                'min:0',
                'max:999999.99',
            ],
        ];
    }
}
