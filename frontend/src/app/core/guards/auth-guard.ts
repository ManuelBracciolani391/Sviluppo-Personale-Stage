import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';

interface UserData {
  roles?: {
    alias: string;
  }[];
}

// Guard già esistente: lasciamo invariato il suo comportamento
export const authGuard: CanActivateFn = (route, state) => {
  return true;
};

// Controllo specifico per la pagina Gestione Utenti
export const projectManagerGuard: CanActivateFn = () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  return http.get<UserData>('http://127.0.0.1:8000/api/user').pipe(
    map((utente) => {
      const isProjectManager =
        utente.roles?.some((ruolo) => {
          const aliasNormalizzato = ruolo.alias
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, '_');

          return aliasNormalizzato === 'project_manager';
        }) ?? false;

      if (isProjectManager) {
        return router.createUrlTree(['/impostazioni']);
      }

      return true;
    }),
    catchError(() => of(router.createUrlTree(['/login']))),
  );
};
