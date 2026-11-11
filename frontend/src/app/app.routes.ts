import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { LoginComponent } from './features/login/login';
import { Home } from './features/home/home';
import { Impostazioni } from './features/impostazioni/impostazioni';
import { Allocazioni } from './features/allocazioni/allocazioni';

export const routes: Routes = [
  // Rotta pubblica di login
  { path: 'login', component: LoginComponent },

  // Rotta protetta per la home
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard],
  },

  // Rotta protetta per le impostazioni
  {
    path: 'impostazioni',
    component: Impostazioni,
    canActivate: [authGuard],
  },

  // Rotta protetta per la gestione delle allocazioni
  {
    path: 'allocazioni',
    component: Allocazioni,
    canActivate: [authGuard],
  },

  // Qualsiasi altra rotta non definita reindirizza al login
  { path: '**', redirectTo: 'login' },
];