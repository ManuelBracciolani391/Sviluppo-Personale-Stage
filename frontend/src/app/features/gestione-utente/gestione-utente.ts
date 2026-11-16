import { Component, HostListener } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';

interface Utente {
  id: number;
  nome: string;
  dataAssunzione: string;
  ruolo: string;
  incarico: string;
  competenza: string;
  visibilita: string;
}

@Component({
  selector: 'app-gestione-utente',
  imports: [SideBar],
  templateUrl: './gestione-utente.html',
  styleUrl: './gestione-utente.css',
})
export class GestioneUtente {
  // Utente che ha il menu aperto
  selectedUser: Utente | null = null;

  // Coordinate del menu nella finestra del browser
  menuPosition = {
    top: 0,
    left: 0,
  };

  // Apertura e chiusura del menu
  toggleUserMenu(utente: Utente, event: MouseEvent): void {
    event.stopPropagation();

    // Se clicco nuovamente sullo stesso utente, chiudo il menu
    if (this.selectedUser?.id === utente.id) {
      this.closeUserMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    const menuWidth = 150;

    this.selectedUser = utente;

    this.menuPosition = {
      top: rect.top,
      left: rect.right - menuWidth,
    };
  }

  // Chiusura del menu
  closeUserMenu(): void {
    this.selectedUser = null;
  }

  // Chiusura quando clicco fuori dal menu
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeUserMenu();
  }

  utenti: Utente[] = [
    {
      id: 1,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      ruolo: 'Admin',
      incarico: 'Sviluppatore Full-stack',
      competenza: '',
      visibilita: 'Si',
    },
    {
      id: 2,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      ruolo: 'Project Manager',
      incarico: 'Sviluppatore Front-end',
      competenza: 'Senior',
      visibilita: 'Si',
    },
    {
      id: 3,
      nome: 'Letizia Giammarcoro',
      dataAssunzione: '28/05/2003',
      ruolo: 'Team Leader',
      incarico: 'Sviluppatore Back-end',
      competenza: 'Senior',
      visibilita: 'Si',
    },
    {
      id: 4,
      nome: 'Ibrahimia Diallo',
      dataAssunzione: '28/05/2003',
      ruolo: 'User',
      incarico: 'UX-UI Designer',
      competenza: 'Senior',
      visibilita: 'Si',
    },
    {
      id: 5,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      ruolo: 'User',
      incarico: 'Scrum Master',
      competenza: 'Junior',
      visibilita: 'Si',
    },
    {
      id: 6,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      ruolo: 'User',
      incarico: 'Project Manager',
      competenza: 'Junior',
      visibilita: 'Si',
    },
    {
      id: 7,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      ruolo: 'User',
      incarico: 'Team Leader',
      competenza: 'Junior',
      visibilita: 'Si',
    },
    {
      id: 8,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      ruolo: 'User',
      incarico: 'Team Leader',
      competenza: 'Junior',
      visibilita: 'Si',
    },
  ];

  // Apertura e chiusura della sezione utenti disabilitati
  utentiDisabilitatiAperti = false;

  // Elenco utenti disabilitati
  utentiDisabilitati: UtenteDisabilitato[] = [
    {
      id: 1,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      dataDimissione: '28/05/2003',
    },
    {
      id: 2,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      dataDimissione: '28/05/2003',
    },
    {
      id: 3,
      nome: 'Letizia Giammarcoro',
      dataAssunzione: '28/05/2003',
      dataDimissione: '28/05/2003',
    },
    {
      id: 4,
      nome: 'Ibrahimia Diallo',
      dataAssunzione: '28/05/2003',
      dataDimissione: '28/05/2003',
    },
    {
      id: 5,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      dataDimissione: '28/05/2003',
    },
    {
      id: 6,
      nome: 'Giuseppe Bertolone',
      dataAssunzione: '28/05/2003',
      dataDimissione: '28/05/2003',
    },
  ];

  // Gestione apertura e chiusura
  toggleUtentiDisabilitati(): void {
    this.utentiDisabilitatiAperti = !this.utentiDisabilitatiAperti;
  }

  // =========================================
  // MODALE NUOVO UTENTE
  // =========================================

  modaleNuovoUtenteAperta = false;

  schedaNuovoUtente: 'anagrafica' | 'contratto' = 'anagrafica';

  apriModaleNuovoUtente(): void {
    this.modalitaModifica = false;
    this.utenteInModifica = null;

    this.modaleNuovoUtenteAperta = true;
    this.schedaNuovoUtente = 'anagrafica';
  }

  chiudiModaleNuovoUtente(): void {
    this.modaleNuovoUtenteAperta = false;
  }

  cambiaSchedaNuovoUtente(scheda: 'anagrafica' | 'contratto'): void {
    this.schedaNuovoUtente = scheda;
  }

  // =========================================
  // DATI SCHEDA CONTRATTO
  // =========================================

  oreSettimanali = 20;

  giorniLavorativi: GiornoLavorativo[] = [
    { nome: 'LUNEDÌ', inizio: '09:00', fine: '13:00', ore: 4, nonLavorativo: false },
    { nome: 'MARTEDÌ', inizio: '09:00', fine: '13:00', ore: 4, nonLavorativo: false },
    { nome: 'MERCOLEDÌ', inizio: '09:00', fine: '13:00', ore: 4, nonLavorativo: false },
    { nome: 'GIOVEDÌ', inizio: '09:00', fine: '13:00', ore: 4, nonLavorativo: false },
    { nome: 'VENERDÌ', inizio: '09:00', fine: '13:00', ore: 4, nonLavorativo: false },
  ];

  aggiornaOreSettimanali(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valore = Number(input.value);

    if (!Number.isFinite(valore) || valore < 0 || valore > 40) {
      return;
    }

    this.oreSettimanali = valore;

    const oreGiornaliere = valore / 5;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno) => {
      const inizio = '09:00';
      const oraInizio = 9;
      const oraFine = Math.min(oraInizio + oreGiornaliere, 24);

      return {
        ...giorno,
        inizio,
        fine: `${String(Math.floor(oraFine)).padStart(2, '0')}:${String(
          Math.round((oraFine % 1) * 60),
        ).padStart(2, '0')}`,
        ore: giorno.nonLavorativo ? 0 : oreGiornaliere,
      };
    });
  }

  aggiornaGiorno(indice: number, campo: 'inizio' | 'fine', event: Event): void {
    const input = event.target as HTMLInputElement;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno, i) =>
      i === indice ? { ...giorno, [campo]: input.value } : giorno,
    );
  }

  cambiaGiornoNonLavorativo(indice: number, event: Event): void {
    const input = event.target as HTMLInputElement;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno, i) =>
      i === indice
        ? {
            ...giorno,
            nonLavorativo: input.checked,
            ore: input.checked ? 0 : this.oreSettimanali / 5,
          }
        : giorno,
    );
  }

  get totaleOre(): number {
    return this.giorniLavorativi.reduce(
      (totale, giorno) => totale + (giorno.nonLavorativo ? 0 : giorno.ore),
      0,
    );
  }

  // =========================================
  // MODALE CONFERMA CREAZIONE UTENTE
  // =========================================

  modaleConfermaAperta = false;

  salvaNuovoUtente(): void {
    // Chiude la modale di inserimento
    this.chiudiModaleNuovoUtente();

    // Apre la conferma
    this.modaleConfermaAperta = true;
  }

  chiudiModaleConferma(): void {
    this.modaleConfermaAperta = false;
  }

  // MODALE GESTIONE FERIE E PERMESSI
  modaleFeriePermessiAperta = false;

  utenteFeriePermessi: Utente | null = null;

  schedaFeriePermessi: 'ferie' | 'permessi' | 'rol' = 'ferie';

  // APERTURA MODALE FERIE E PERMESSI
  apriModaleFeriePermessi(): void {
    if (!this.selectedUser) {
      return;
    }

    this.utenteFeriePermessi = this.selectedUser;
    this.schedaFeriePermessi = 'ferie';
    this.modaleFeriePermessiAperta = true;

    this.closeUserMenu();
  }

  // CAMBIO SCHEDA
  cambiaSchedaFeriePermessi(scheda: 'ferie' | 'permessi' | 'rol'): void {
    this.schedaFeriePermessi = scheda;
  }

  // CHIUSURA MODALE
  chiudiModaleFeriePermessi(): void {
    this.modaleFeriePermessiAperta = false;
    this.utenteFeriePermessi = null;
  }

  mesiFerie = [
    { nome: 'Gennaio', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Febbraio', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Marzo', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Aprile', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Maggio', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Giugno', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Luglio', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Agosto', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Settembre', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Ottobre', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Novembre', maturate: 0, godute: 0, saldo: 0 },
    { nome: 'Dicembre', maturate: 0, godute: 0, saldo: 0 },
  ];

  // MODALE CONFERMA RIABILITAZIONE
  modaleRiabilitaAperta = false;

  // MODALE OPERAZIONE COMPLETATA
  modaleUtenteRiabilitatoAperta = false;

  // Utente selezionato
  utenteDaRiabilitare: UtenteDisabilitato | null = null;

  // APRE LA MODALE DI CONFERMA
  apriModaleRiabilita(utente: UtenteDisabilitato): void {
    this.utenteDaRiabilitare = utente;
    this.modaleRiabilitaAperta = true;
  }

  // CHIUDE LA MODALE DI CONFERMA
  chiudiModaleRiabilita(): void {
    this.modaleRiabilitaAperta = false;
    this.utenteDaRiabilitare = null;
  }

  // CONFERMA LA RIABILITAZIONE
  confermaRiabilitazione(): void {
    // Qui collegheremo la logica effettiva di riabilitazione.

    this.modaleRiabilitaAperta = false;
    this.modaleUtenteRiabilitatoAperta = true;
  }

  // MODALE CONFERMA DISABILITAZIONE
  modaleDisabilitaAperta = false;

  utenteDaDisabilitare: Utente | null = null;

  // MODALE UTENTE DISABILITATO
  modaleUtenteDisabilitatoAperta = false;

  // APRE LA MODALE DI CONFERMA
  apriModaleDisabilita(utente: Utente): void {
    this.utenteDaDisabilitare = utente;
    this.modaleDisabilitaAperta = true;
  }

  modaleDisabilitaDettagliAperta = false;

  // CHIUDE LA MODALE DI CONFERMA
  chiudiModaleDisabilita(): void {
    this.modaleDisabilitaAperta = false;
    this.utenteDaDisabilitare = null;
  }

  // APRE LA SECONDA MODALE
  confermaDisabilitazione(): void {
    this.modaleDisabilitaAperta = false;
    this.modaleDisabilitaDettagliAperta = true;
  }

  disabilitaUtenteDefinitivamente(): void {
    this.modaleDisabilitaDettagliAperta = false;
    this.modaleUtenteDisabilitatoAperta = true;
  }

  chiudiModaleUtenteDisabilitato(): void {
    this.modaleUtenteDisabilitatoAperta = false;
    this.utenteDaDisabilitare = null;
  }

  // CHIUDE LA MODALE DI SUCCESSO
  chiudiModaleUtenteRiabilitato(): void {
    this.modaleUtenteRiabilitatoAperta = false;
    this.utenteDaRiabilitare = null;
  }

  // MODALITÀ DELLA MODALE UTENTE
  modalitaModifica = false;

  // UTENTE SELEZIONATO DA MODIFICARE
  utenteInModifica: Utente | null = null;

  // APERTURA MODALE MODIFICA UTENTE
  apriModificaUtente(utente: Utente): void {
    this.modalitaModifica = true;
    this.utenteInModifica = utente;

    this.modaleNuovoUtenteAperta = true;
    this.schedaNuovoUtente = 'anagrafica';
  }
}

interface UtenteDisabilitato {
  id: number;
  nome: string;
  dataAssunzione: string;
  dataDimissione: string;
}

interface GiornoLavorativo {
  nome: string;
  inizio: string;
  fine: string;
  ore: number;
  nonLavorativo: boolean;
}
