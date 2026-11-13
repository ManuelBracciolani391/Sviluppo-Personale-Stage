import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SideBar } from '../side-bar/side-bar';

interface UserRole {
  id: number;
  alias: string;
}

interface FileStorage {
  id: number;
  path: string;
  name: string;
  extension: string;
  type: string;
}

interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company_email?: string | null;
  hiring_date?: string | null;
  roles?: UserRole[];
  filestorage?: FileStorage | null;
}

@Component({
  imports: [CommonModule, SideBar],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
  standalone: true,
})
export class Home implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  nomeUtente = '';
  ruoloUtente = 'Utente';
  emailUtente = '';
  hiringDate = '';
  iniziali = '';
  avatarUrl: string | null = null;

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
    // Il profilo viene caricato soltanto nel browser.
    if (isPlatformBrowser(this.platformId)) {
      this.caricaProfilo();
    }
  }

  private caricaProfilo(): void {
    // Protezione aggiuntiva per evitare accessi a localStorage sul server.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      console.error('Token non trovato in localStorage');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    });

    this.http.get<UserProfile>('http://127.0.0.1:8000/api/user', { headers }).subscribe({
      next: (utente) => {
        console.log('Dati utente ricevuti:', utente);

        this.nomeUtente = `${utente.first_name || ''} ${utente.last_name || ''}`.trim();
        this.emailUtente = utente.company_email || utente.email || 'N/D';
        this.hiringDate = utente.hiring_date ? this.formatDate(utente.hiring_date) : 'N/D';

        if (utente.roles && utente.roles.length > 0) {
          this.ruoloUtente = utente.roles.map((r) => r.alias).join(', ');
        } else {
          this.ruoloUtente = 'Utente';
        }

        // Gestione dell'avatar tramite filestorage
        if (utente.filestorage && utente.filestorage.path && utente.filestorage.name) {
          this.avatarUrl = `http://127.0.0.1:8000/storage/${utente.filestorage.path}/${utente.filestorage.name}.${utente.filestorage.extension}`;
        } else {
          this.avatarUrl = null;
        }

        // Fallback per le iniziali nel caso non ci sia l'immagine o non si carichi
        const fInitial = utente.first_name?.[0] || '';
        const lInitial = utente.last_name?.[0] || '';
        this.iniziali = (fInitial + lInitial).toUpperCase();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Errore durante la chiamata API:', err);
      },
    });
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('it-IT');
  }
}
