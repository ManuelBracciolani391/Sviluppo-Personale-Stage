<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Carbon\Carbon;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-users') ?? false;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],

            'gender' => [
                'nullable',
                Rule::in(['male', 'female']),
            ],

            'birth_date' => ['nullable', 'date'],
            'hiring_date' => ['nullable', 'date'],
            'is_intern' => ['required', 'boolean'],
            'isAllocation_visible' => ['nullable', 'boolean'],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->whereNull('deleted_at'),
            ],

            'azure_email' => ['nullable', 'email', 'max:255'],
            'company_email' => ['nullable', 'email', 'max:255'],

            'contract' => ['required', 'array'],

            'contract.contract_start_date' => [
                'required',
                'date',
            ],

            'contract.contract_end_date' => [
                'nullable',
                'date',
                'after_or_equal:contract.contract_start_date',
            ],

            'contract.contract_type' => [
                'nullable',
                'string',
                'max:255',
            ],

            'contract.weekly_hours' => [
                'required',
                'integer',
                'min:1',
                'max:40',
            ],

            'roles' => ['sometimes', 'array'],

            'roles.*' => [
                'integer',
                'distinct',
                'exists:roles,id',
            ],

            'assignment_roles' => ['sometimes', 'array'],

            'assignment_roles.*.id' => [
                'required',
                'integer',
                'distinct',
                'exists:assignmentroles,id',
            ],

            'assignment_roles.*.expertise' => [
                'nullable',
                Rule::in(['Junior', 'Senior']),
            ],

            'working_days' => [
                'required',
                'array',
            ],

            'working_days.*.day_of_week' => [
                'required',
                Rule::in([
                    'monday',
                    'tuesday',
                    'wednesday',
                    'thursday',
                    'friday',
                ]),
                'distinct',
            ],

            'working_days.*.is_working_day' => [
                'required',
                'boolean',
            ],

            'working_days.*.start_time' => [
                'nullable',
                'date_format:H:i',
            ],

            'working_days.*.end_time' => [
                'nullable',
                'date_format:H:i',
                'after:working_days.*.start_time',
            ],
        ];
    }

    /**
     * Messaggi personalizzati di validazione.
     */
    public function messages(): array
    {
        return [
            'contract.contract_end_date.after_or_equal' =>
                'La data di fine contratto non può essere precedente alla data di inizio contratto.',

            'contract.contract_end_date.date' =>
                'La data di fine contratto non è valida.',

            'contract.contract_start_date.required' =>
                'La data di inizio contratto è obbligatoria.',

            'contract.contract_start_date.date' =>
                'La data di inizio contratto non è valida.',

            'hiring_date.date' =>
                'La data di assunzione non è valida.',

            'working_days.*.end_time.after' =>
                'L’orario di fine deve essere successivo all’orario di inizio.',
        ];
    }

    /**
     * Validazioni aggiuntive.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {

                // Non eseguiamo controlli aggiuntivi
                // se i dati di base non sono validi.
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /*
                |--------------------------------------------------------------------------
                | VALIDAZIONE DATA ASSUNZIONE / FINE CONTRATTO
                |--------------------------------------------------------------------------
                */

                $hiringDate = $this->input('hiring_date');

                $contractEndDate = $this->input(
                    'contract.contract_end_date'
                );

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

                /*
                |--------------------------------------------------------------------------
                | VALIDAZIONE DISTRIBUZIONE ORARIA
                |--------------------------------------------------------------------------
                */

                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $hours = $this->input('contract.weekly_hours');

                if (!is_numeric($hours)) {
                    return;
                }

                $workingDays = $this->input('working_days', []);

                /*
                |--------------------------------------------------------------------------
                | CONTRATTO DA 40 ORE
                |--------------------------------------------------------------------------
                |
                | Lunedì-venerdì:
                | 09:00-18:00
                |
                */

                if ((int) $hours === 40) {

                    $giorniRichiesti = [
                        'monday',
                        'tuesday',
                        'wednesday',
                        'thursday',
                        'friday',
                    ];

                    if (
                        !is_array($workingDays) ||
                        count($workingDays) !== 5
                    ) {
                        $validator->errors()->add(
                            'working_days',
                            'Per un contratto da 40 ore devono essere presenti tutti e cinque i giorni lavorativi.'
                        );

                        return;
                    }

                    $giorniRicevuti = [];

                    foreach ($workingDays as $index => $day) {

                        if (!is_array($day)) {
                            continue;
                        }

                        $giorno = $day['day_of_week'] ?? null;

                        if ($giorno) {
                            $giorniRicevuti[] = $giorno;
                        }

                        if (!($day['is_working_day'] ?? false)) {
                            $validator->errors()->add(
                                "working_days.$index.is_working_day",
                                'Per un contratto da 40 ore tutti i giorni dal lunedì al venerdì devono essere lavorativi.'
                            );
                        }

                        if (
                            ($day['start_time'] ?? null)
                            !== '09:00'
                        ) {
                            $validator->errors()->add(
                                "working_days.$index.start_time",
                                'Per un contratto da 40 ore l’orario di inizio deve essere 09:00.'
                            );
                        }

                        if (
                            ($day['end_time'] ?? null)
                            !== '18:00'
                        ) {
                            $validator->errors()->add(
                                "working_days.$index.end_time",
                                'Per un contratto da 40 ore l’orario di fine deve essere 18:00.'
                            );
                        }
                    }

                    sort($giorniRicevuti);

                    $giorniAttesi = $giorniRichiesti;

                    sort($giorniAttesi);

                    if ($giorniRicevuti !== $giorniAttesi) {
                        $validator->errors()->add(
                            'working_days',
                            'La distribuzione deve comprendere esattamente dal lunedì al venerdì.'
                        );
                    }

                    return;
                }

                /*
                |--------------------------------------------------------------------------
                | CONTRATTI INFERIORI A 40 ORE
                |--------------------------------------------------------------------------
                */

                if ((int) $hours < 40) {

                    $totaleMinuti = 0;

                    foreach ($workingDays as $index => $day) {

                        if (!is_array($day)) {
                            continue;
                        }

                        if (!($day['is_working_day'] ?? false)) {
                            continue;
                        }

                        $start = $day['start_time'] ?? null;
                        $end = $day['end_time'] ?? null;

                        if (!$start || !$end) {
                            $validator->errors()->add(
                                "working_days.$index.start_time",
                                'Gli orari di inizio e fine sono obbligatori per un giorno lavorativo.'
                            );

                            continue;
                        }

                        if ($end <= $start) {
                            $validator->errors()->add(
                                "working_days.$index.end_time",
                                'L’orario di fine deve essere successivo all’orario di inizio.'
                            );

                            continue;
                        }

                        [$startHour, $startMinute] = array_map(
                            'intval',
                            explode(':', $start)
                        );

                        [$endHour, $endMinute] = array_map(
                            'intval',
                            explode(':', $end)
                        );

                        $minutiGiornalieri =
                            ($endHour * 60 + $endMinute)
                            - ($startHour * 60 + $startMinute);

                        // Pausa di un'ora se l'orario di fine
                        // supera le 15:00.
                        if ($end > '15:00') {
                            $minutiGiornalieri -= 60;
                        }

                        $totaleMinuti += max(
                            0,
                            $minutiGiornalieri
                        );
                    }

                    if ($validator->errors()->isNotEmpty()) {
                        return;
                    }

                    $minutiContratto = (int) $hours * 60;

                    if ($totaleMinuti > $minutiContratto) {

                        $oreDistribuite = round(
                            $totaleMinuti / 60,
                            2
                        );

                        $validator->errors()->add(
                            'working_days',
                            "La distribuzione oraria è di {$oreDistribuite} ore, ma il contratto prevede {$hours} ore settimanali. Riduci le ore distribuite."
                        );
                    }
                }
            },
        ];
    }
}
