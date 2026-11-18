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

type LeaveType = 'ferie' | 'permesso' | 'rol';

interface LeaveBalanceApi {
  id: number;
  user_id: number;
  leave_type: LeaveType;
  contract_type?: string | null;
  balance_unit?: string | null;
  reference_month: string;
  remaining_hours: number | string;
  accrued_hours: number | string;
  monthly_accrual: number | string;
}

interface MeseFerie {
  nome: string;
  numero: number;
  maturate: number;
  godute: number;
  saldo: number;
  rateo: number;
  balanceId: number | null;
}

interface LeaveHistoryItem {
  id?: number;
  action?: string;
  field_name?: string;
  old_value?: number | string | null;
  new_value?: number | string | null;
  revision?: number | null;
  created_at?: string;
  undone_at?: string | null;
  [key: string]: unknown;
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
          .filter((valore): valore is string => valore === 'Junior' || valore === 'Senior')
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

  private primoGiornoMese(data: string): string {
    if (!data) return `${this.oggi().substring(0, 7)}-01`;
    return `${data.substring(0, 7)}-01`;
  }

  private numeroValore(valore: number | string | null | undefined): number {
    const numero = Number(valore ?? 0);
    return Number.isFinite(numero) ? numero : 0;
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

      const competenzaSalvata = incarichi[0]?.pivot?.expertise ?? '';
      const competenzaValida =
        competenzaSalvata === 'Junior' || competenzaSalvata === 'Senior' ? competenzaSalvata : '';

      const genereSalvato = dati.gender ?? '';
      const genereValido =
        genereSalvato === 'male' || genereSalvato === 'female' ? genereSalvato : '';

      this.modalitaModifica = true;
      this.utenteInModifica = utente;

      this.form = {
        first_name: dati.first_name ?? '',
        last_name: dati.last_name ?? '',
        gender: genereValido,
        birth_date: (dati.birth_date ?? '').substring(0, 10),
        email: dati.email ?? '',
        azure_email: dati.azure_email ?? '',
        company_email: dati.company_email ?? '',
        hiring_date: (dati.hiring_date ?? '').substring(0, 10),
        contract_start_date: contratto?.contract_start_date?.substring(0, 10) ?? '',
        contract_end_date: contratto?.contract_end_date?.substring(0, 10) ?? '',
        contract_type: contratto?.contract_type ?? '',
        weekly_hours: Number(contratto?.weekly_hours ?? 40),
        role_id: dati.roles?.[0]?.id ?? null,
        assignment_role_id: incarichi[0]?.id ?? null,
        expertise: competenzaValida,
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

  get distribuzioneBloccata(): boolean {
    return Number(this.form.weekly_hours) === 40;
  }

  private creaGiorniDefault(ore: number): GiornoLavorativo[] {
    if (Number(ore) === 40) {
      return this.giorniItaliani.map((nome) => ({
        nome,
        inizio: '09:00',
        fine: '18:00',
        ore: 8,
        nonLavorativo: false,
      }));
    }

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

    if (fine > '15:00') minuti -= 60;

    return Math.max(0, minuti / 60);
  }

  aggiornaOreSettimanali(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valore = Number(input.value);

    if (!Number.isFinite(valore) || valore < 1 || valore > 40) return;

    this.oreSettimanali = valore;
    this.form.weekly_hours = valore;

    if (valore === 40) {
      this.giorniLavorativi = this.creaGiorniDefault(40);
      this.cdr.detectChanges();
      return;
    }

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

    this.cdr.detectChanges();
  }

  aggiornaGiorno(indice: number, campo: 'inizio' | 'fine', event: Event): void {
    if (this.distribuzioneBloccata) {
      this.giorniLavorativi = this.creaGiorniDefault(40);
      this.cdr.detectChanges();
      return;
    }

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
    if (this.distribuzioneBloccata) {
      this.giorniLavorativi = this.creaGiorniDefault(40);
      this.cdr.detectChanges();
      return;
    }

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

    if (Number(this.oreSettimanali) === 40) return;
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
    if (Number(this.form.weekly_hours) === 40) {
      return this.giorniApi.map((giorno) => ({
        day_of_week: giorno,
        is_working_day: true,
        start_time: '09:00',
        end_time: '18:00',
      }));
    }

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

    const oreContratto = Number(this.oreSettimanali);

    if (!Number.isFinite(oreContratto) || oreContratto < 1 || oreContratto > 40) {
      this.errore = 'Le ore settimanali devono essere comprese tra 1 e 40.';
      this.schedaNuovoUtente = 'contratto';
      return;
    }

    this.form.weekly_hours = oreContratto;

    if (this.form.gender !== 'male' && this.form.gender !== 'female') {
      this.form.gender = '';
    }

    if (this.form.expertise !== 'Junior' && this.form.expertise !== 'Senior') {
      this.form.expertise = '';
    }

    if (oreContratto === 40) {
      this.giorniLavorativi = this.creaGiorniDefault(40);
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
        weekly_hours: oreContratto,
      },
      working_days: this.preparaWorkingDays(),
    };

    this.salvataggio = true;
    this.cdr.detectChanges();

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
      this.schedaNuovoUtente = 'contratto';
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
  // FERIE, PERMESSI E R.O.L.
  // =========================================

  modaleFeriePermessiAperta = false;
  utenteFeriePermessi: Utente | null = null;
  schedaFeriePermessi: LeaveType = 'ferie';

  caricamentoSaldi = false;
  salvataggioSaldi = false;

  annoFerie = new Date().getFullYear();
  unitaFerie: 'giorni' | 'ore' = 'giorni';

  dataPermessi = this.primoGiornoMese(this.oggi());
  oreResiduePermessi = 0;
  rateoPermessi = 0;
  maturatePermessi = 0;

  dataRol = this.primoGiornoMese(this.oggi());
  oreResidueRol = 0;
  oreMaturateRol = 0;
  rateoRol = 0;

  saldiLeave: LeaveBalanceApi[] = [];

  mesiFerie: MeseFerie[] = [
    { nome: 'Gennaio', numero: 1, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Febbraio', numero: 2, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Marzo', numero: 3, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Aprile', numero: 4, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Maggio', numero: 5, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Giugno', numero: 6, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Luglio', numero: 7, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Agosto', numero: 8, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Settembre', numero: 9, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Ottobre', numero: 10, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Novembre', numero: 11, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
    { nome: 'Dicembre', numero: 12, maturate: 0, godute: 0, saldo: 0, rateo: 0, balanceId: null },
  ];

  // Storico e annullamento/ripristino
  storicoAperto = false;
  caricamentoStorico = false;
  storicoSaldi: LeaveHistoryItem[] = [];
  canUndo = false;
  canRedo = false;
  balanceStoricoId: number | null = null;

  private get leaveBalancesUrl(): string | null {
    if (!this.utenteFeriePermessi) return null;
    return `${this.apiUrl}/${this.utenteFeriePermessi.id}/leave-balances`;
  }

  async apriModaleFeriePermessi(): Promise<void> {
    if (!this.selectedUser) return;

    this.utenteFeriePermessi = this.selectedUser;
    this.schedaFeriePermessi = 'ferie';
    this.modaleFeriePermessiAperta = true;
    this.closeUserMenu();
    this.errore = '';
    this.annoFerie = new Date().getFullYear();
    this.dataPermessi = this.primoGiornoMese(this.oggi());
    this.dataRol = this.primoGiornoMese(this.oggi());
    this.storicoAperto = false;
    this.storicoSaldi = [];
    this.canUndo = false;
    this.canRedo = false;

    await Promise.all([this.caricaSaldiLeave(), this.caricaUnitaContrattoUtente()]);

    this.cdr.detectChanges();
  }

  cambiaSchedaFeriePermessi(scheda: LeaveType): void {
    this.schedaFeriePermessi = scheda;
    this.storicoAperto = false;
    this.storicoSaldi = [];
    this.aggiornaStoricoSaldoAttivo();
  }

  chiudiModaleFeriePermessi(): void {
    if (this.salvataggioSaldi) return;

    this.modaleFeriePermessiAperta = false;
    this.utenteFeriePermessi = null;
    this.saldiLeave = [];
    this.storicoSaldi = [];
    this.storicoAperto = false;
    this.balanceStoricoId = null;
    this.canUndo = false;
    this.canRedo = false;
  }

  async caricaSaldiLeave(): Promise<void> {
    const url = this.leaveBalancesUrl;
    if (!url) return;

    this.caricamentoSaldi = true;
    this.errore = '';
    this.cdr.detectChanges();

    try {
      const risposta: any = await firstValueFrom(
        this.http.get(`${url}?year=${this.annoFerie}&per_page=100`),
      );

      const elenco = Array.isArray(risposta.data)
        ? risposta.data
        : Array.isArray(risposta.data?.data)
          ? risposta.data.data
          : [];

      this.saldiLeave = elenco as LeaveBalanceApi[];
      this.ricostruisciMesiFerie();
      this.caricaValoriPermessi();
      this.caricaValoriRol();
      this.aggiornaStoricoSaldoAttivo();
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile caricare i saldi di ferie, permessi e R.O.L.');
    } finally {
      this.caricamentoSaldi = false;
      this.cdr.detectChanges();
    }
  }

  private ricostruisciMesiFerie(): void {
    this.mesiFerie = this.mesiFerie.map((mese) => {
      const riferimento = `${this.annoFerie}-${String(mese.numero).padStart(2, '0')}`;
      const saldo = this.saldiLeave.find(
        (item) =>
          item.leave_type === 'ferie' &&
          (item.reference_month ?? '').substring(0, 7) === riferimento,
      );

      return {
        ...mese,
        maturate: this.numeroValore(saldo?.accrued_hours),
        godute: 0,
        saldo: this.numeroValore(saldo?.remaining_hours),
        rateo: this.numeroValore(saldo?.monthly_accrual),
        balanceId: saldo?.id ?? null,
      };
    });

    const saldoFerie = this.saldiLeave.find((item) => item.leave_type === 'ferie');

    if (saldoFerie?.balance_unit === 'giorni' || saldoFerie?.balance_unit === 'ore') {
      this.unitaFerie = saldoFerie.balance_unit;
    }
  }

  private caricaValoriPermessi(): void {
    const mese = this.primoGiornoMese(this.dataPermessi).substring(0, 7);
    const saldo = this.saldiLeave.find(
      (item) =>
        item.leave_type === 'permesso' && (item.reference_month ?? '').substring(0, 7) === mese,
    );

    this.oreResiduePermessi = this.numeroValore(saldo?.remaining_hours);
    this.maturatePermessi = this.numeroValore(saldo?.accrued_hours);
    this.rateoPermessi = this.numeroValore(saldo?.monthly_accrual);
  }

  private caricaValoriRol(): void {
    const mese = this.primoGiornoMese(this.dataRol).substring(0, 7);
    const saldo = this.saldiLeave.find(
      (item) => item.leave_type === 'rol' && (item.reference_month ?? '').substring(0, 7) === mese,
    );

    this.oreResidueRol = this.numeroValore(saldo?.remaining_hours);
    this.oreMaturateRol = this.numeroValore(saldo?.accrued_hours);
    this.rateoRol = this.numeroValore(saldo?.monthly_accrual);
  }

  private async caricaUnitaContrattoUtente(): Promise<void> {
    if (!this.utenteFeriePermessi) return;

    try {
      const risposta: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/${this.utenteFeriePermessi.id}`),
      );

      const dati: ApiUser = risposta.data ?? risposta;
      const contratto =
        dati.latest_contract ??
        (dati.contracts?.length
          ? [...dati.contracts].sort((a, b) =>
              b.contract_start_date.localeCompare(a.contract_start_date),
            )[0]
          : undefined);

      if (!contratto) return;

      const ore = Number(contratto.weekly_hours ?? 0);
      this.unitaFerie = ore >= 40 ? 'giorni' : 'ore';

      // Se esistono già saldi salvati, prevale l'unità determinata dal backend.
      const saldoEsistente = this.saldiLeave.find((item) => item.leave_type === 'ferie');

      if (saldoEsistente?.balance_unit === 'giorni' || saldoEsistente?.balance_unit === 'ore') {
        this.unitaFerie = saldoEsistente.balance_unit;
      }

      this.cdr.detectChanges();
    } catch {
      // Il caricamento del contratto è solo necessario per mostrare l'unità
      // quando non esistono ancora saldi ferie.
    }
  }

  cambiaAnnoFerie(direzione: number): void {
    const nuovoAnno = this.annoFerie + direzione;

    if (nuovoAnno < 2000 || nuovoAnno > 2100) return;

    this.annoFerie = nuovoAnno;
    this.storicoAperto = false;
    this.caricaSaldiLeave();
  }

  aggiornaDataPermessi(): void {
    this.dataPermessi = this.primoGiornoMese(this.dataPermessi);
    this.caricaValoriPermessi();
    this.aggiornaStoricoSaldoAttivo();
  }

  aggiornaDataRol(): void {
    this.dataRol = this.primoGiornoMese(this.dataRol);
    this.caricaValoriRol();
    this.aggiornaStoricoSaldoAttivo();
  }

  get saldoTotaleFerie(): number {
    return Number(this.mesiFerie.reduce((totale, mese) => totale + mese.saldo, 0).toFixed(2));
  }

  get rateoFerieMedio(): number {
    const valori = this.mesiFerie.map((mese) => mese.rateo).filter((valore) => valore > 0);

    if (!valori.length) return 0;

    return Number(
      (valori.reduce((totale, valore) => totale + valore, 0) / valori.length).toFixed(2),
    );
  }

  private saldoPerTipoEMese(tipo: LeaveType, riferimento: string): LeaveBalanceApi | undefined {
    const mese = riferimento.substring(0, 7);

    return this.saldiLeave.find(
      (item) => item.leave_type === tipo && (item.reference_month ?? '').substring(0, 7) === mese,
    );
  }

  private async salvaRecordSaldo(
    tipo: LeaveType,
    riferimento: string,
    remaining: number,
    accrued: number,
    monthlyAccrual: number,
  ): Promise<void> {
    const baseUrl = this.leaveBalancesUrl;
    if (!baseUrl) throw new Error('Utente non selezionato.');

    const referenceMonth = this.primoGiornoMese(riferimento);
    const esistente = this.saldoPerTipoEMese(tipo, referenceMonth);

    const payload = {
      leave_type: tipo,
      reference_month: referenceMonth,
      remaining_hours: Number(remaining.toFixed(2)),
      accrued_hours: Number(accrued.toFixed(2)),
      monthly_accrual: Number(monthlyAccrual.toFixed(2)),
    };

    if (esistente) {
      await firstValueFrom(this.http.put(`${baseUrl}/${esistente.id}`, payload));
    } else {
      await firstValueFrom(this.http.post(baseUrl, payload));
    }
  }

  async salvaFerie(): Promise<void> {
    if (!this.utenteFeriePermessi) return;

    this.salvataggioSaldi = true;
    this.errore = '';
    this.cdr.detectChanges();

    try {
      for (const mese of this.mesiFerie) {
        const riferimento = `${this.annoFerie}-${String(mese.numero).padStart(2, '0')}-01`;

        await this.salvaRecordSaldo('ferie', riferimento, mese.saldo, mese.maturate, mese.rateo);
      }

      await this.caricaSaldiLeave();
      this.errore = '';
    } catch (error) {
      this.gestisciErrore(error, 'Errore durante il salvataggio delle ferie.');
    } finally {
      this.salvataggioSaldi = false;
      this.cdr.detectChanges();
    }
  }

  async salvaPermessi(): Promise<void> {
    if (!this.utenteFeriePermessi) return;

    if (!this.dataPermessi) {
      this.errore = 'Seleziona il mese di riferimento dei permessi.';
      return;
    }

    this.salvataggioSaldi = true;
    this.errore = '';
    this.cdr.detectChanges();

    try {
      await this.salvaRecordSaldo(
        'permesso',
        this.dataPermessi,
        this.oreResiduePermessi,
        this.maturatePermessi,
        this.rateoPermessi,
      );

      await this.caricaSaldiLeave();
      this.errore = '';
    } catch (error) {
      this.gestisciErrore(error, 'Errore durante il salvataggio dei permessi.');
    } finally {
      this.salvataggioSaldi = false;
      this.cdr.detectChanges();
    }
  }

  async salvaRol(): Promise<void> {
    if (!this.utenteFeriePermessi) return;

    if (!this.dataRol) {
      this.errore = 'Seleziona il mese di riferimento dei R.O.L.';
      return;
    }

    this.salvataggioSaldi = true;
    this.errore = '';
    this.cdr.detectChanges();

    try {
      await this.salvaRecordSaldo(
        'rol',
        this.dataRol,
        this.oreResidueRol,
        this.oreMaturateRol,
        this.rateoRol,
      );

      await this.caricaSaldiLeave();
      this.errore = '';
    } catch (error) {
      this.gestisciErrore(error, 'Errore durante il salvataggio dei R.O.L.');
    } finally {
      this.salvataggioSaldi = false;
      this.cdr.detectChanges();
    }
  }

  async salvaSchedaFeriePermessi(): Promise<void> {
    if (this.schedaFeriePermessi === 'ferie') {
      await this.salvaFerie();
    } else if (this.schedaFeriePermessi === 'permesso') {
      await this.salvaPermessi();
    } else {
      await this.salvaRol();
    }
  }

  // =========================================
  // STORICO, UNDO E REDO
  // =========================================

  private getSaldoIdAttivo(): number | null {
    if (this.schedaFeriePermessi === 'ferie') {
      const saldiAnno = this.saldiLeave
        .filter(
          (item) =>
            item.leave_type === 'ferie' &&
            (item.reference_month ?? '').substring(0, 4) === String(this.annoFerie),
        )
        .sort((a, b) => b.reference_month.localeCompare(a.reference_month));

      return saldiAnno[0]?.id ?? null;
    }

    const riferimento = this.schedaFeriePermessi === 'permesso' ? this.dataPermessi : this.dataRol;

    return this.saldoPerTipoEMese(this.schedaFeriePermessi, riferimento)?.id ?? null;
  }

  private aggiornaStoricoSaldoAttivo(): void {
    const id = this.getSaldoIdAttivo();

    if (id === this.balanceStoricoId) return;

    this.balanceStoricoId = id;
    this.canUndo = false;
    this.canRedo = false;
    this.storicoSaldi = [];

    if (this.storicoAperto && id) {
      this.caricaStorico();
    }
  }

  async caricaStorico(): Promise<void> {
    const baseUrl = this.leaveBalancesUrl;
    const balanceId = this.getSaldoIdAttivo();

    if (!baseUrl || !balanceId) {
      this.storicoSaldi = [];
      this.canUndo = false;
      this.canRedo = false;
      this.balanceStoricoId = null;
      this.storicoAperto = true;
      return;
    }

    this.balanceStoricoId = balanceId;
    this.storicoAperto = true;
    this.caricamentoStorico = true;

    try {
      const risposta: any = await firstValueFrom(this.http.get(`${baseUrl}/${balanceId}/history`));

      const elenco =
        risposta.history ??
        risposta.data?.history ??
        (Array.isArray(risposta.data) ? risposta.data : []);

      this.storicoSaldi = Array.isArray(elenco) ? elenco : [];

      const stato = risposta.state ?? risposta.data?.state ?? risposta;

      this.canUndo = Boolean(stato.can_undo ?? risposta.can_undo ?? false);
      this.canRedo = Boolean(stato.can_redo ?? risposta.can_redo ?? false);

      this.cdr.detectChanges();
    } catch (error) {
      this.gestisciErrore(error, 'Impossibile caricare lo storico del saldo.');
    } finally {
      this.caricamentoStorico = false;
      this.cdr.detectChanges();
    }
  }

  async eseguiUndo(): Promise<void> {
    await this.eseguiPassaggioStorico('undo');
  }

  async eseguiRedo(): Promise<void> {
    await this.eseguiPassaggioStorico('redo');
  }

  private async eseguiPassaggioStorico(azione: 'undo' | 'redo'): Promise<void> {
    const baseUrl = this.leaveBalancesUrl;
    const balanceId = this.getSaldoIdAttivo();

    if (!baseUrl || !balanceId) {
      this.errore = 'Non è presente uno storico per il saldo selezionato.';
      return;
    }

    this.salvataggioSaldi = true;
    this.errore = '';

    try {
      await firstValueFrom(this.http.post(`${baseUrl}/${balanceId}/${azione}`, {}));

      await this.caricaSaldiLeave();

      this.balanceStoricoId = balanceId;
      await this.caricaStorico();
    } catch (error) {
      this.gestisciErrore(
        error,
        azione === 'undo'
          ? 'Impossibile annullare l’ultima modifica.'
          : 'Impossibile ripristinare la modifica.',
      );
    } finally {
      this.salvataggioSaldi = false;
      this.cdr.detectChanges();
    }
  }

  descrizioneAzioneStorico(item: LeaveHistoryItem): string {
    if (item.action === 'created') return 'Creazione saldo';
    if (item.action === 'updated') return 'Modifica saldo';
    if (item.action === 'deleted') return 'Eliminazione saldo';
    if (item.action === 'operation') return 'Operazione';

    return item.action ?? item.field_name ?? 'Modifica';
  }

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
