import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SideBar } from '../side-bar/side-bar';

interface UserData {
  roles?: {
    alias: string;
  }[];
}

@Component({
  imports: [RouterLink, SideBar],
  selector: 'app-impostazioni',
  standalone: true,
  templateUrl: './impostazioni.html',
  styleUrl: './impostazioni.css',
})
export class Impostazioni {
  private http = inject(HttpClient);

  isProjectManager = false;

  constructor() {
    this.http.get<UserData>('http://127.0.0.1:8000/api/user').subscribe({
      next: (utente) => {
        this.isProjectManager =
          utente.roles?.some((ruolo) => {
            const aliasNormalizzato = ruolo.alias
              .trim()
              .toLowerCase()
              .replace(/[\s-]+/g, '_');

            return aliasNormalizzato === 'project_manager';
          }) ?? false;

        console.log('Project Manager:', this.isProjectManager);
      },
      error: (errore) => {
        console.error('Errore nel recupero del ruolo:', errore);
      },
    });
  }
}
