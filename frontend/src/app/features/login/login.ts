import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
  standalone: true,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Gestione degli errori o dello stato di caricamento
  errorMessage = '';
  isLoading = false;

  // Definizione del form con le validazioni
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false],
  });

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        // Salva il token restituito da Laravel
        localStorage.setItem('access_token', response.access_token);
        // Login riuscito: reindirizza alla home protetta
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = 'Credenziali non valide o errore del server.';
        console.error('Errore di login', err);
      },
    });
  }
}
