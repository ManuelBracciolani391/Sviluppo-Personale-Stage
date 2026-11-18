import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { LoginComponent } from './features/login/login';
import { Home } from './features/home/home';
import { Impostazioni } from './features/impostazioni/impostazioni';
import { Projects } from './features/projects/projects';
import { GestioneUtente } from './features/gestione-utente/gestione-utente';
import { Allocazioni } from './features/allocazioni/allocazioni';

export const routes: Routes = [
  // Rotta pubblica di login
  { path: 'login', component: LoginComponent },

  // Rotta protetta per la home
  {
    path: 'profilo-utente/home',
    component: Home,
    canActivate: [authGuard],
  },

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
  {
    path: 'projects',
    component: Projects,
  },

  {
    path: 'gestione-utente',
    component: GestioneUtente,
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
