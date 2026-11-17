import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Evita l'accesso a localStorage durante SSR
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const apiUrl = 'http://127.0.0.1:8000/api';

  // Non aggiunge il token alle richieste esterne alla nostra API
  if (!req.url.startsWith(`${apiUrl}/`)) {
    return next(req);
  }

  // Il login non richiede ancora un token
  if (req.url === `${apiUrl}/login`) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');

  if (!token) {
    return next(req);
  }

  const authenticatedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest);
};
