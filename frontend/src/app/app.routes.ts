import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { LoginComponent } from './features/login/login';
import { Home } from './features/home/home';
import { Impostazioni } from './features/impostazioni/impostazioni';
import { Projects } from './features/projects/projects';
import { GestioneUtente } from './features/gestione-utente/gestione-utente';

export const routes: Routes = [
  // Rotta pubblica di login
  { path: 'login', component: LoginComponent },

  // Rotta protetta (richiede il token della guard)
  {
    path: 'home',
    component: Home,
    canActivate: [authGuard],
  },

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

  // Qualsiasi altra rotta non definita reindirizza al login
  { path: '**', redirectTo: 'login' },
];
