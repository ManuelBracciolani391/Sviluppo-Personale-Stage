<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\PasswordReset;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember' => 'nullable|boolean',
        ]);

        // Includere anche gli utenti soft-deleted con withTrashed()
        $user = User::withTrashed()->where('email', $request->email)->first();

        
        if (!$user || !\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Le credenziali non sono corrette.'],
            ]);
        }

        // Controllo utenti disabilitati
        if ($user->deleted_at !== null && $user->resignation_date !== null) {
            throw ValidationException::withMessages([
                'email' => ['Il tuo account è disabilitato. Impossibile effettuare il login.'],
            ]);
        }

        // Gestione Remember Me e generazione token (14 giorni o 1 giorno)
        $remember = $request->boolean('remember');
        $expiresAt = $remember ? now()->addDays(14) : now()->addDay();

        $tokenResult = $user->createToken('auth_token', ['*'], $expiresAt);
        
        return response()->json([
            'message' => 'Login effettuato con successo',
            'access_token' => $tokenResult->plainTextToken,
            'token_type' => 'Bearer',
            'remember' => $remember,
            'expires_at' => $tokenResult->accessToken->expires_at,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout effettuato con successo'
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $status = Password::broker()->sendResetLink(
            $request->only('email')
        );

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => 'Se l\'email esiste, riceverai le istruzioni per il reset.'], 200)
            : response()->json(['message' => 'Errore durante l\'invio dell\'email di reset.'], 400);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email|exists:users,email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->save();

                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => 'Password aggiornata con successo!'], 200)
            : response()->json(['message' => 'Impossibile resettare la password. Token non valido o scaduto.'], 400);
    }
}