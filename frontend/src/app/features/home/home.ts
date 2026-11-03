import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SideBar } from '../side-bar/side-bar';

interface UserRole {
  id: number;
  alias: string;
}

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company_email?: string | null;
  hiring_date?: string | null;
  roles?: UserRole[];
}

@Component({
  imports: [CommonModule, SideBar],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
  standalone: true
})
export class Home implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef); // Forza il rendering dei dati nell'HTML

  nomeUtente = '';
  ruoloUtente = 'Utente';
  emailUtente = '';
  hiringDate = '';
  iniziali = '';

  modalePasswordAperta = false;

  mostraPasswordAttuale = false;
  mostraNuovaPassword = false;
  mostraConfermaPassword = false;

  apriModalePassword(): void {
    this.modalePasswordAperta = true;
  }

  chiudiModalePassword(): void {
    this.modalePasswordAperta = false;
  }

  ngOnInit(): void {
    this.caricaProfilo();
  }

  private caricaProfilo(): void {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.error('Token non trovato in localStorage');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    });

    this.http.get<UserProfile>('http://127.0.0.1:8000/api/user', { headers }).subscribe({
      next: (utente) => {
        console.log('Dati ricevuti con successo:', utente);

        // Popola il Nome
        this.nomeUtente = `${utente.first_name || ''} ${utente.last_name || ''}`.trim();

        // Popola la Mail
        this.emailUtente = utente.company_email || utente.email || 'N/D';

        // Popola la Data di Assunzione
        this.hiringDate = utente.hiring_date ? this.formatDate(utente.hiring_date) : 'N/D';

        // Popola i Ruoli
        if (utente.roles && utente.roles.length > 0) {
          this.ruoloUtente = utente.roles.map(r => r.alias).join(', ');
        } else {
          this.ruoloUtente = 'Utente';
        }

        // Popola le Iniziali (es. Giulia Neri -> GN)
        const fInitial = utente.first_name?.[0] || '';
        const lInitial = utente.last_name?.[0] || '';
        this.iniziali = (fInitial + lInitial).toUpperCase();

        // FORZA ANGULAR AD AGGIORNARE L'HTML IMMEDIATAMENTE
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Errore durante la chiamata API:', err);
      }
    });
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('it-IT');
  }
}