<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        //return app()->environment('local');
        return $this->user()?->can('manage-users') ?? false;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:20'],
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
                'string',
                'max:255',
            ],

            'working_days' => [
                'nullable',
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

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $hours = $this->input('contract.weekly_hours');

                if (!is_numeric($hours) || (int) $hours >= 40) {
                    return;
                }

                $workingDays = $this->input('working_days', []);

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
                    }
                }
            },
        ];
    }
}