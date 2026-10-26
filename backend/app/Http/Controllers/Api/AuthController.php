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

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Le credenziali non sono corrette.'],
            ]);
        }

        $user = User::where('email', $request->email)->first();

        // Gestione remember me e scadenza token (14 giorni se true, 1 giorno se false)
        $remember = $request->boolean('remember');
        $expiresAt = $remember ? now()->addDays(14) : now()->addDay();

        $tokenResult = $user->createToken('auth_token', ['*'], $expiresAt);
        $token = $tokenResult->plainTextToken;

        return response()->json([
            'message' => 'Login effettuato con successo',
            'access_token' => $token,
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