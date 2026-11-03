import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SideBar } from '../side-bar/side-bar';

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  hiring_date: string | null;
  roles: { id: number; alias: string }[];
}

@Component({
  imports: [SideBar],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private http = inject(HttpClient);

 nomeUtente = '';
  ruoloUtente = '';

  ngOnInit(): void {
    this.caricaProfilo();
  }

  private caricaProfilo(): void {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.error('Token di autenticazione non trovato.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.get<UserProfile>(
      'http://127.0.0.1:8000/api/user',
      { headers }
    ).subscribe({
      next: (utente) => {
        this.nomeUtente =
          `${utente.first_name}  ${utente.last_name}`;

        this.ruoloUtente =
          utente.roles?.map(ruolo => ruolo.alias).join(', ') || 'Utente';
      },
      error: (errore) => {
        console.error('Errore nel caricamento del profilo:', errore.status, errore.message);
      },
    });
  }
}