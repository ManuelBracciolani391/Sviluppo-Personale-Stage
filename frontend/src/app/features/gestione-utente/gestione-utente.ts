import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SideBar } from '../side-bar/side-bar';

interface Utente {
  id: number;
  nome: string;
  dataAssunzione: string;
  ruolo: string;
  incarico: string;
  competenza: string;
  visibilita: string;
  first_name?: string;
  last_name?: string;
  email?: string;
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

interface GiornoLavorativoApi {
  day_of_week: string;
  is_working_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

interface ContrattoApi {
  contract_start_date: string;
  contract_end_date?: string | null;
  contract_type?: string | null;
  weekly_hours: number;
  working_days?: GiornoLavorativoApi[];
}

interface Ruolo {
  id: number;
  alias: string;
}

interface Incarico {
  id: number;
  alias: string;
}

interface ApiUser {
  id: number;
  first_name: string;
  last_name: string;
  gender?: string | null;
  birth_date?: string | null;
  hiring_date?: string | null;
  resignation_date?: string | null;
  email: string;
  azure_email?: string | null;
  company_email?: string | null;
  is_intern: boolean;
  isAllocation_visible: boolean;
  roles?: Array<{ id: number; alias: string }>;
  assignment_roles?: Array<{
    id: number;
    alias: string;
    pivot?: { expertise?: string };
  }>;
  assignmentRoles?: Array<{
    id: number;
    alias: string;
    pivot?: { expertise?: string };
  }>;
  contracts?: ContrattoApi[];
  latest_contract?: ContrattoApi;
}

@Component({
  selector: 'app-gestione-utente',
  standalone: true,
  imports: [CommonModule, FormsModule, SideBar],
  templateUrl: './gestione-utente.html',
  styleUrl: './gestione-utente.css',
})
export class GestioneUtente implements OnInit {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/users';
  private browser: boolean;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.browser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.browser) return;

    this.caricaUtenti();
    this.caricaUtentiDisabilitati();
    this.caricaOpzioni();
  }

  // =========================================
  // DATI E STATO DELLA PAGINA
  // =========================================

  utenti: Utente[] = [];
  utentiDisabilitati: UtenteDisabilitato[] = [];

  ruoliDisponibili: Ruolo[] = [];
  incarichiDisponibili: Incarico[] = [];

  caricamento = false;
  caricamentoDisabilitati = false;
  salvataggio = false;
  errore = '';

  paginaCorrente = 1;
  ultimaPagina = 1;

  paginaDisabilitati = 1;
  ultimaPaginaDisabilitati = 1;

  utentiDisabilitatiAperti = false;

  // =========================================
  // FORM UTENTE
  // =========================================

  form = {
    first_name: '',
    last_name: '',
    gender: '',
    birth_date: '',
    email: '',
    azure_email: '',
    company_email: '',
    hiring_date: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_type: '',
    weekly_hours: 20,
    role_id: null as number | null,
    assignment_role_id: null as number | null,
    expertise: '',
    isAllocation_visible: true,
    is_intern: true,
  };

  private resetForm(): void {
    this.form = {
      first_name: '',
      last_name: '',
      gender: '',
      birth_date: '',
      email: '',
      azure_email: '',
      company_email: '',
      hiring_date: '',
      contract_start_date: '',
      contract_end_date: '',
      contract_type: '',
      weekly_hours: 20,
      role_id: this.ruoliDisponibili[0]?.id ?? null,
      assignment_role_id: this.incarichiDisponibili[0]?.id ?? null,
      expertise: '',
      isAllocation_visible: true,
      is_intern: true,
    };

    this.oreSettimanali = 20;
    this.giorniLavorativi = this.creaGiorniDefault(20);
  }

  // =========================================
  // CARICAMENTO DATI API
  // =========================================

  async caricaUtenti(pagina = 1): Promise<void> {
    this.caricamento = true;
    this.errore = '';
    this.cdr.detectChanges();

    try {
      const risposta: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/index?page=${pagina}`),
      );

      const elenco: ApiUser[] = risposta.data ?? [];

      this.utenti = elenco.map((utente) => this.mappaUtente(utente));

      this.paginaCorrente = risposta.current_page ?? 1;
      this.ultimaPagina = risposta.last_page ?? 1;

      this.cdr.detectChanges();
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile caricare gli utenti.');
      this.cdr.detectChanges();
    } finally {
      this.caricamento = false;
      this.cdr.detectChanges();
    }
  }

  async caricaUtentiDisabilitati(pagina = 1): Promise<void> {
    this.caricamentoDisabilitati = true;
    this.cdr.detectChanges();

    try {
      const risposta: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/disabled?page=${pagina}`),
      );

      const elenco = risposta.data ?? [];

      this.utentiDisabilitati = elenco.map((utente: any) => ({
        id: utente.id,
        nome: `${utente.first_name ?? ''} ${utente.last_name ?? ''}`.trim(),
        dataAssunzione: this.formattaData(utente.hiring_date),
        dataDimissione: this.formattaData(utente.resignation_date ?? utente.deleted_at),
      }));

      this.paginaDisabilitati = risposta.current_page ?? 1;
      this.ultimaPaginaDisabilitati = risposta.last_page ?? 1;

      this.cdr.detectChanges();
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile caricare gli utenti disabilitati.');
      this.cdr.detectChanges();
    } finally {
      this.caricamentoDisabilitati = false;
      this.cdr.detectChanges();
    }
  }

  async caricaOpzioni(): Promise<void> {
    try {
      const risposta: any = await firstValueFrom(this.http.get(`${this.apiUrl}/options`));

      this.ruoliDisponibili = risposta.roles ?? [];
      this.incarichiDisponibili = risposta.assignment_roles ?? [];

      if (!this.form.role_id && this.ruoliDisponibili.length) {
        this.form.role_id = this.ruoliDisponibili[0].id;
      }

      if (!this.form.assignment_role_id && this.incarichiDisponibili.length) {
        this.form.assignment_role_id = this.incarichiDisponibili[0].id;
      }

      this.cdr.detectChanges();
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile caricare l’elenco dei ruoli e degli incarichi.');
      this.cdr.detectChanges();
    }
  }

  private mappaUtente(utente: ApiUser): Utente {
    const incarichi = utente.assignment_roles ?? utente.assignmentRoles ?? [];

    return {
      id: utente.id,
      nome: `${utente.first_name ?? ''} ${utente.last_name ?? ''}`.trim(),
      dataAssunzione: this.formattaData(utente.hiring_date),
      ruolo: utente.roles?.map((r) => r.alias).join(', ') ?? '',
      incarico: incarichi.map((r) => r.alias).join(', ') || '',
      competenza:
        incarichi
          .map((r) => r.pivot?.expertise)
          .filter(Boolean)
          .join(', ') || '',
      visibilita: utente.isAllocation_visible ? 'Sì' : 'No',
      first_name: utente.first_name,
      last_name: utente.last_name,
      email: utente.email,
    };
  }

  // =========================================
  // DATE
  // =========================================

  private formattaData(data?: string | null): string {
    if (!data) return '';

    const soloData = data.substring(0, 10);
    const parti = soloData.split('-');

    if (parti.length !== 3) return soloData;

    return `${parti[2]}/${parti[1]}/${parti[0]}`;
  }

  private oggi(): string {
    const data = new Date();
    const anno = data.getFullYear();
    const mese = String(data.getMonth() + 1).padStart(2, '0');
    const giorno = String(data.getDate()).padStart(2, '0');

    return `${anno}-${mese}-${giorno}`;
  }

  // =========================================
  // MENU AZIONI UTENTE
  // =========================================

  selectedUser: Utente | null = null;
  menuPosition = { top: 0, left: 0 };

  toggleUserMenu(utente: Utente, event: MouseEvent): void {
    event.stopPropagation();

    if (this.selectedUser?.id === utente.id) {
      this.closeUserMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    this.selectedUser = utente;
    this.menuPosition = {
      top: rect.top,
      left: rect.right - 150,
    };
  }

  closeUserMenu(): void {
    this.selectedUser = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeUserMenu();
  }

  toggleUtentiDisabilitati(): void {
    this.utentiDisabilitatiAperti = !this.utentiDisabilitatiAperti;

    if (this.utentiDisabilitatiAperti && !this.utentiDisabilitati.length) {
      this.caricaUtentiDisabilitati();
    }
  }

  // =========================================
  // PAGINAZIONE
  // =========================================

  cambiaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.ultimaPagina) return;
    this.caricaUtenti(pagina);
  }

  cambiaPaginaDisabilitati(pagina: number): void {
    if (pagina < 1 || pagina > this.ultimaPaginaDisabilitati) return;
    this.caricaUtentiDisabilitati(pagina);
  }

  // Numeri delle pagine degli utenti attivi
  get pagineUtenti(): number[] {
    return Array.from({ length: this.ultimaPagina }, (_, indice) => indice + 1);
  }

  // Numeri delle pagine degli utenti disabilitati
  get pagineUtentiDisabilitati(): number[] {
    return Array.from({ length: this.ultimaPaginaDisabilitati }, (_, indice) => indice + 1);
  }

  // =========================================
  // MODALE NUOVO / MODIFICA UTENTE
  // =========================================

  modaleNuovoUtenteAperta = false;
  schedaNuovoUtente: 'anagrafica' | 'contratto' = 'anagrafica';
  modalitaModifica = false;
  utenteInModifica: Utente | null = null;

  apriModaleNuovoUtente(): void {
    this.modalitaModifica = false;
    this.utenteInModifica = null;
    this.resetForm();
    this.errore = '';
    this.modaleNuovoUtenteAperta = true;
    this.schedaNuovoUtente = 'anagrafica';
  }

  chiudiModaleNuovoUtente(): void {
    if (this.salvataggio) return;
    this.modaleNuovoUtenteAperta = false;
  }

  cambiaSchedaNuovoUtente(scheda: 'anagrafica' | 'contratto'): void {
    this.schedaNuovoUtente = scheda;
  }

  async apriModificaUtente(utente: Utente): Promise<void> {
    this.closeUserMenu();
    this.errore = '';

    try {
      const dettaglio: any = await firstValueFrom(this.http.get(`${this.apiUrl}/${utente.id}`));

      const dati: ApiUser = dettaglio.data ?? dettaglio;
      const incarichi = dati.assignment_roles ?? dati.assignmentRoles ?? [];

      const contratto =
        dati.latest_contract ??
        (dati.contracts?.length
          ? [...dati.contracts].sort((a, b) =>
              b.contract_start_date.localeCompare(a.contract_start_date),
            )[0]
          : undefined);

      this.modalitaModifica = true;
      this.utenteInModifica = utente;

      this.form = {
        first_name: dati.first_name ?? '',
        last_name: dati.last_name ?? '',
        gender: dati.gender ?? '',
        birth_date: (dati.birth_date ?? '').substring(0, 10),
        email: dati.email ?? '',
        azure_email: dati.azure_email ?? '',
        company_email: dati.company_email ?? '',
        hiring_date: (dati.hiring_date ?? '').substring(0, 10),
        contract_start_date: contratto?.contract_start_date?.substring(0, 10) ?? '',
        contract_end_date: contratto?.contract_end_date?.substring(0, 10) ?? '',
        contract_type: contratto?.contract_type ?? '',
        weekly_hours: contratto?.weekly_hours ?? 40,
        role_id: dati.roles?.[0]?.id ?? null,
        assignment_role_id: incarichi[0]?.id ?? null,
        expertise: incarichi[0]?.pivot?.expertise ?? '',
        isAllocation_visible: !!dati.isAllocation_visible,
        is_intern: !!dati.is_intern,
      };

      this.oreSettimanali = this.form.weekly_hours;
      this.caricaOrariContratto(contratto?.working_days);

      this.modaleNuovoUtenteAperta = true;
      this.schedaNuovoUtente = 'anagrafica';
      this.cdr.detectChanges();
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile recuperare i dati dell’utente.');
      this.cdr.detectChanges();
    }
  }

  // =========================================
  // ORARI CONTRATTO
  // =========================================

  oreSettimanali = 20;

  private readonly giorniItaliani = ['LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ'];

  private readonly giorniApi = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  giorniLavorativi: GiornoLavorativo[] = this.creaGiorniDefault(20);

  private creaGiorniDefault(ore: number): GiornoLavorativo[] {
    const oreGiornaliere = ore / 5;

    return this.giorniItaliani.map((nome) => ({
      nome,
      inizio: '09:00',
      fine: this.aggiungiOre('09:00', oreGiornaliere),
      ore: oreGiornaliere,
      nonLavorativo: false,
    }));
  }

  private aggiungiOre(orario: string, ore: number): string {
    const [h, m] = orario.split(':').map(Number);
    const minuti = h * 60 + m + Math.round(ore * 60);

    return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(
      2,
      '0',
    )}`;
  }

  private calcolaOreEffettive(inizio: string, fine: string): number {
    if (!inizio || !fine || fine <= inizio) return 0;

    const [h1, m1] = inizio.split(':').map(Number);
    const [h2, m2] = fine.split(':').map(Number);

    let minuti = h2 * 60 + m2 - (h1 * 60 + m1);

    // Il backend sottrae un'ora di pausa se l'orario finale supera le 15:00.
    if (fine > '15:00') minuti -= 60;

    return Math.max(0, minuti / 60);
  }

  aggiornaOreSettimanali(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valore = Number(input.value);

    if (!Number.isFinite(valore) || valore < 1 || valore > 40) return;

    this.oreSettimanali = valore;
    this.form.weekly_hours = valore;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno) => {
      if (giorno.nonLavorativo) {
        return { ...giorno, ore: 0 };
      }

      const oreGiornaliere = valore / 5;
      const fine = this.aggiungiOre('09:00', oreGiornaliere);

      return {
        ...giorno,
        inizio: '09:00',
        fine,
        ore: this.calcolaOreEffettive('09:00', fine),
      };
    });
  }

  aggiornaGiorno(indice: number, campo: 'inizio' | 'fine', event: Event): void {
    const input = event.target as HTMLInputElement;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno, i) => {
      if (i !== indice) return giorno;

      const aggiornato = { ...giorno, [campo]: input.value };

      return {
        ...aggiornato,
        ore: aggiornato.nonLavorativo
          ? 0
          : this.calcolaOreEffettive(aggiornato.inizio, aggiornato.fine),
      };
    });
  }

  cambiaGiornoNonLavorativo(indice: number, event: Event): void {
    const input = event.target as HTMLInputElement;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno, i) =>
      i === indice
        ? {
            ...giorno,
            nonLavorativo: input.checked,
            ore: input.checked ? 0 : this.calcolaOreEffettive(giorno.inizio, giorno.fine),
          }
        : giorno,
    );
  }

  get totaleOre(): number {
    return Number(
      this.giorniLavorativi
        .reduce((totale, giorno) => totale + (giorno.nonLavorativo ? 0 : giorno.ore), 0)
        .toFixed(2),
    );
  }

  private caricaOrariContratto(giorni?: GiornoLavorativoApi[]): void {
    this.giorniLavorativi = this.creaGiorniDefault(this.oreSettimanali);

    if (!giorni?.length) return;

    this.giorniLavorativi = this.giorniLavorativi.map((giorno, indice) => {
      const dato = giorni.find((g) => g.day_of_week === this.giorniApi[indice]);

      if (!dato) return giorno;

      const inizio = dato.start_time?.substring(0, 5) ?? '09:00';
      const fine = dato.end_time?.substring(0, 5) ?? '13:00';

      return {
        ...giorno,
        inizio,
        fine,
        nonLavorativo: !dato.is_working_day,
        ore: dato.is_working_day ? this.calcolaOreEffettive(inizio, fine) : 0,
      };
    });
  }

  private preparaWorkingDays(): GiornoLavorativoApi[] {
    return this.giorniLavorativi.map((giorno, indice) => ({
      day_of_week: this.giorniApi[indice],
      is_working_day: !giorno.nonLavorativo,
      start_time: giorno.nonLavorativo ? null : giorno.inizio,
      end_time: giorno.nonLavorativo ? null : giorno.fine,
    }));
  }

  // =========================================
  // SALVATAGGIO / MODIFICA UTENTE
  // =========================================

  modaleConfermaAperta = false;

  async salvaNuovoUtente(): Promise<void> {
    this.errore = '';

    if (!this.form.first_name.trim() || !this.form.last_name.trim()) {
      this.errore = 'Inserisci nome e cognome.';
      this.schedaNuovoUtente = 'anagrafica';
      return;
    }

    if (!this.form.email.trim()) {
      this.errore = 'Inserisci l’email di accesso.';
      this.schedaNuovoUtente = 'anagrafica';
      return;
    }

    if (!this.form.role_id || !this.form.assignment_role_id) {
      this.errore = 'Seleziona un ruolo e un incarico.';
      this.schedaNuovoUtente = 'contratto';
      return;
    }

    if (!this.form.hiring_date || !this.form.contract_start_date) {
      this.errore = 'Inserisci la data di assunzione e di inizio contratto.';
      this.schedaNuovoUtente = 'contratto';
      return;
    }

    if (this.form.weekly_hours < 1 || this.form.weekly_hours > 40) {
      this.errore = 'Le ore settimanali devono essere comprese tra 1 e 40.';
      this.schedaNuovoUtente = 'contratto';
      return;
    }

    if (this.form.weekly_hours < 40 && this.totaleOre !== this.form.weekly_hours) {
      this.errore = `La distribuzione oraria deve totalizzare ${this.form.weekly_hours} ore. Attualmente: ${this.totaleOre}.`;
      this.schedaNuovoUtente = 'contratto';
      return;
    }

    const payload = {
      first_name: this.form.first_name.trim(),
      last_name: this.form.last_name.trim(),
      gender: this.form.gender || null,
      birth_date: this.form.birth_date || null,
      hiring_date: this.form.hiring_date,
      email: this.form.email.trim(),
      azure_email: this.form.azure_email || null,
      company_email: this.form.company_email || null,
      is_intern: this.form.is_intern,
      isAllocation_visible: this.form.isAllocation_visible,
      roles: [this.form.role_id],
      assignment_roles: [
        {
          id: this.form.assignment_role_id,
          expertise: this.form.expertise || null,
        },
      ],
      contract: {
        contract_start_date: this.form.contract_start_date,
        contract_end_date: this.form.contract_end_date || null,
        contract_type: this.form.contract_type || null,
        weekly_hours: this.form.weekly_hours,
      },
      working_days: this.form.weekly_hours < 40 ? this.preparaWorkingDays() : [],
    };

    this.salvataggio = true;

    try {
      if (this.modalitaModifica && this.utenteInModifica) {
        await firstValueFrom(this.http.put(`${this.apiUrl}/${this.utenteInModifica.id}`, payload));
      } else {
        await firstValueFrom(this.http.post(`${this.apiUrl}/store`, payload));
      }

      this.modaleNuovoUtenteAperta = false;
      this.modaleConfermaAperta = true;

      await this.caricaUtenti(this.paginaCorrente);
    } catch (error) {
      this.gestisciErrore(
        error,
        this.modalitaModifica
          ? 'Errore durante la modifica dell’utente.'
          : 'Errore durante la creazione dell’utente.',
      );
    } finally {
      this.salvataggio = false;
      this.cdr.detectChanges();
    }
  }

  chiudiModaleConferma(): void {
    this.modaleConfermaAperta = false;
    this.resetForm();
  }

  // =========================================
  // DISABILITAZIONE UTENTE
  // =========================================

  modaleDisabilitaAperta = false;
  modaleDisabilitaDettagliAperta = false;
  modaleUtenteDisabilitatoAperta = false;
  utenteDaDisabilitare: Utente | null = null;

  dataDimissioni = '';

  apriModaleDisabilita(utente: Utente): void {
    this.utenteDaDisabilitare = utente;
    this.dataDimissioni = this.oggi();
    this.errore = '';
    this.modaleDisabilitaAperta = true;
  }

  chiudiModaleDisabilita(): void {
    this.modaleDisabilitaAperta = false;
    this.utenteDaDisabilitare = null;
    this.dataDimissioni = '';
  }

  confermaDisabilitazione(): void {
    this.modaleDisabilitaAperta = false;
    this.modaleDisabilitaDettagliAperta = true;
  }

  async disabilitaUtenteDefinitivamente(): Promise<void> {
    if (!this.utenteDaDisabilitare) return;

    const dataDimissioni = this.dataDimissioni || this.oggi();

    this.salvataggio = true;
    this.errore = '';

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${this.utenteDaDisabilitare.id}`, {
          body: { resignation_date: dataDimissioni },
        }),
      );

      this.modaleDisabilitaDettagliAperta = false;
      this.modaleUtenteDisabilitatoAperta = true;

      await this.caricaUtenti(this.paginaCorrente);
      await this.caricaUtentiDisabilitati(this.paginaDisabilitati);
    } catch (error) {
      this.gestisciErrore(
        error,
        'Impossibile disabilitare l’utente. Controlla la data di dimissioni.',
      );
    } finally {
      this.salvataggio = false;
      this.cdr.detectChanges();
    }
  }

  chiudiModaleUtenteDisabilitato(): void {
    this.modaleUtenteDisabilitatoAperta = false;
    this.utenteDaDisabilitare = null;
    this.dataDimissioni = '';
  }

  // =========================================
  // RIABILITAZIONE UTENTE
  // =========================================

  modaleRiabilitaAperta = false;
  modaleUtenteRiabilitatoAperta = false;
  utenteDaRiabilitare: UtenteDisabilitato | null = null;

  apriModaleRiabilita(utente: UtenteDisabilitato): void {
    this.utenteDaRiabilitare = utente;
    this.modaleRiabilitaAperta = true;
  }

  chiudiModaleRiabilita(): void {
    this.modaleRiabilitaAperta = false;
    this.utenteDaRiabilitare = null;
  }

  async confermaRiabilitazione(): Promise<void> {
    if (!this.utenteDaRiabilitare) return;

    this.salvataggio = true;

    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/${this.utenteDaRiabilitare.id}/restore`, {}),
      );

      this.modaleRiabilitaAperta = false;
      this.modaleUtenteRiabilitatoAperta = true;

      await this.caricaUtenti(this.paginaCorrente);
      await this.caricaUtentiDisabilitati(this.paginaDisabilitati);
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile riabilitare l’utente.');
    } finally {
      this.salvataggio = false;
      this.cdr.detectChanges();
    }
  }

  chiudiModaleUtenteRiabilitato(): void {
    this.modaleUtenteRiabilitatoAperta = false;
    this.utenteDaRiabilitare = null;
  }

  // =========================================
  // FERIE E PERMESSI - UI ESISTENTE
  // =========================================

  modaleFeriePermessiAperta = false;
  utenteFeriePermessi: Utente | null = null;
  schedaFeriePermessi: 'ferie' | 'permessi' | 'rol' = 'ferie';

  apriModaleFeriePermessi(): void {
    if (!this.selectedUser) return;

    this.utenteFeriePermessi = this.selectedUser;
    this.schedaFeriePermessi = 'ferie';
    this.modaleFeriePermessiAperta = true;
    this.closeUserMenu();
  }

  cambiaSchedaFeriePermessi(scheda: 'ferie' | 'permessi' | 'rol'): void {
    this.schedaFeriePermessi = scheda;
  }

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

  // =========================================
  // GESTIONE ERRORI API
  // =========================================

  private gestisciErrore(error: unknown, messaggio: string): void {
    console.error(error);

    if (error instanceof HttpErrorResponse) {
      const errors = error.error?.errors;

      if (errors) {
        const primoErrore = Object.values(errors).flat()[0];
        this.errore = String(primoErrore);
        return;
      }

      this.errore =
        error.error?.message ??
        (error.status === 401
          ? 'Sessione scaduta. Effettua nuovamente il login.'
          : error.status === 403
            ? 'Non hai i permessi necessari per gestire gli utenti.'
            : messaggio);

      return;
    }

    this.errore = messaggio;
  }

  // =========================================
  // ORDINAMENTO E FILTRI TABELLA UTENTI
  // =========================================

  campoOrdinamento: 'nome' | 'dataAssunzione' | null = null;

  direzioneOrdinamento: 'asc' | 'desc' = 'asc';

  filtroAperto: 'ruolo' | 'incarico' | 'competenza' | 'visibilita' | null = null;

  filtri = {
    ruolo: '',
    incarico: '',
    competenza: '',
    visibilita: '',
  };

  ordinaPer(campo: 'nome' | 'dataAssunzione'): void {
    if (this.campoOrdinamento === campo) {
      this.direzioneOrdinamento = this.direzioneOrdinamento === 'asc' ? 'desc' : 'asc';
    } else {
      this.campoOrdinamento = campo;
      this.direzioneOrdinamento = 'asc';
    }

    this.utenti = [...this.utenti].sort((a, b) => {
      let confronto = 0;

      if (campo === 'nome') {
        confronto = (a.last_name ?? '').localeCompare(b.last_name ?? '', 'it', {
          sensitivity: 'base',
        });
      } else {
        const dataA = this.convertiDataPerOrdinamento(a.dataAssunzione);
        const dataB = this.convertiDataPerOrdinamento(b.dataAssunzione);
        confronto = dataA - dataB;
      }

      return this.direzioneOrdinamento === 'asc' ? confronto : -confronto;
    });
  }

  private convertiDataPerOrdinamento(data: string): number {
    const [giorno, mese, anno] = data.split('/').map(Number);

    if (!giorno || !mese || !anno) return 0;

    return new Date(anno, mese - 1, giorno).getTime();
  }

  toggleFiltro(campo: 'ruolo' | 'incarico' | 'competenza' | 'visibilita'): void {
    this.filtroAperto = this.filtroAperto === campo ? null : campo;
  }

  applicaFiltro(campo: 'ruolo' | 'incarico' | 'competenza' | 'visibilita', event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.filtri[campo] = select.value;
    this.filtroAperto = null;
  }

  opzioniFiltro(campo: 'ruolo' | 'incarico' | 'competenza' | 'visibilita'): string[] {
    return [
      ...new Set(
        this.utenti.map((utente) => utente[campo].trim()).filter((valore) => valore !== ''),
      ),
    ].sort((a, b) => a.localeCompare(b, 'it'));
  }

  get utentiFiltrati(): Utente[] {
    return this.utenti.filter((utente) => {
      return (
        (!this.filtri.ruolo || utente.ruolo === this.filtri.ruolo) &&
        (!this.filtri.incarico || utente.incarico === this.filtri.incarico) &&
        (!this.filtri.competenza || utente.competenza === this.filtri.competenza) &&
        (!this.filtri.visibilita || utente.visibilita === this.filtri.visibilita)
      );
    });
  }
}
