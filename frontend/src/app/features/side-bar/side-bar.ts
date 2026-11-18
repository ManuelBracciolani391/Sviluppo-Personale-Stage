import { Component, Input, OnInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface UserData {
  roles?: {
    alias: string;
  }[];
}

@Component({
  imports: [RouterLink],
  selector: 'app-side-bar',
  styleUrl: './side-bar.css',
  templateUrl: './side-bar.html',
})
export class SideBar implements OnInit {
  @Input() titoloPagina: string = '';

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  menuProfiloAperto = false;

  // Per sicurezza, inizialmente le impostazioni sono bloccate.
  isUser = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      return;
    }

    this.http.get<UserData>('http://127.0.0.1:8000/api/user').subscribe({
      next: (utente) => {
        console.log('Ruoli ricevuti dal backend:', utente.roles);

        this.isUser =
          utente.roles?.some((ruolo) => {
            const alias = ruolo.alias
              .trim()
              .toLowerCase()
              .replace(/[\s-]+/g, '_');

            return alias === 'user' || alias === 'team_leader' || alias === 'teamleader';
          }) ?? false;

        this.cdr.detectChanges();

        console.log('Impostazioni disabilitate:', this.isUser);
      },
    });
  }

  toggleMenuProfilo(): void {
    if (this.titoloPagina === 'Profilo') {
      this.menuProfiloAperto = !this.menuProfiloAperto;
    } else {
      this.menuProfiloAperto = false;
      this.router.navigate(['/profilo-utente/home']);
    }
  }
}
