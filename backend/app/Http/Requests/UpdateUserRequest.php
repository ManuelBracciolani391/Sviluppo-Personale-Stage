<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Carbon\Carbon;

class UpdateUserRequest extends StoreUserRequest
{
    public function rules(): array
    {
        $rules = parent::rules();

        $user = $this->route('user');

        $rules['email'] = [
            'required',
            'email',
            'max:255',
            Rule::unique('users', 'email')
                ->ignore($user?->id)
                ->whereNull('deleted_at'),
        ];

        return $rules;
    }

    /**
     * Validazioni aggiuntive per la modifica utente.
     */
    public function after(): array
    {
        $callbacks = parent::after();

        $callbacks[] = function (Validator $validator): void {

            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $user = $this->route('user');

            /*
            |--------------------------------------------------------------------------
            | RECUPERA DATA ASSUNZIONE
            |--------------------------------------------------------------------------
            |
            | Usa quella inviata dalla form.
            | Se non è presente, utilizza quella già salvata.
            |
            */

            $hiringDate = $this->input('hiring_date')
                ?? $user?->hiring_date;

            /*
            |--------------------------------------------------------------------------
            | RECUPERA DATA FINE CONTRATTO
            |--------------------------------------------------------------------------
            */

            $contractEndDate = $this->input(
                'contract.contract_end_date'
            );

            if (
                $contractEndDate === null &&
                $user !== null
            ) {
                $contract = $user->contracts()
                    ->orderByDesc('contract_start_date')
                    ->first();

                $contractEndDate =
                    $contract?->contract_end_date;
            }

            /*
            |--------------------------------------------------------------------------
            | CONTROLLO DATE
            |--------------------------------------------------------------------------
            */

            if (
                !empty($hiringDate) &&
                !empty($contractEndDate)
            ) {
                if (
                    Carbon::parse($contractEndDate)
                        ->startOfDay()
                        ->lt(
                            Carbon::parse($hiringDate)
                                ->startOfDay()
                        )
                ) {
                    $validator->errors()->add(
                        'contract.contract_end_date',
                        'La data di fine contratto non può essere precedente alla data di assunzione.'
                    );
                }
            }
        };

        return $callbacks;
    }
}
