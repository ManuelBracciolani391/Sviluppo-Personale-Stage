<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

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

}