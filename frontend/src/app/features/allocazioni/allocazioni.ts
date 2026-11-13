import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  PLATFORM_ID,
  inject,
} from '@angular/core';

import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AllocationService,
  AllocationKPI,
  AssignmentRole,
  Project,
  User,
  TimesheetProject,
  TimesheetUser,
} from '../../core/services/allocation';

import { SideBar } from '../side-bar/side-bar';

@Component({
  selector: 'app-allocazioni',
  standalone: true,
  imports: [CommonModule, FormsModule, SideBar],
  templateUrl: './allocazioni.html',
  styleUrls: ['./allocazioni.css'],
})
export class Allocazioni implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  activeTab: 'progetti' | 'timesheet' | 'corsi' = 'progetti';

  /* =========================================================
     DATI PROGETTI NORMALI
  ========================================================= */

  kpi: AllocationKPI | null = null;

  projects: Project[] = [];
  users: User[] = [];

  assignmentRoles: AssignmentRole[] = [];

  /* =========================================================
     DATI TIMESHEET
  ========================================================= */

  timesheetProjects: TimesheetProject[] = [];
  timesheetUsers: TimesheetUser[] = [];

  timesheetBusyKey: string | null = null;

  /* =========================================================
     FILTRI
  ========================================================= */

  searchQuery: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';

  prioritizedProjectId: number | null = null;

  isLegendExpanded: boolean = true;

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private allocationsRequestId = 0;
  private timesheetRequestId = 0;

  /* =========================================================
     MODALI
  ========================================================= */

  showAssignModal: boolean = false;
  showEditModal: boolean = false;
  showUserDetailModal: boolean = false;
  showNeedsModal: boolean = false;

  showTimesheetAssignModal: boolean = false;
  showTimesheetMemberModal: boolean = false;
  showTimesheetProjectModal: boolean = false;

  selectedUserForModal: User | null = null;
  selectedProjectForModal: Project | null = null;

  selectedUserDetail: User | null = null;
  selectedProjectForNeeds: Project | null = null;

  selectedNeedsProjectId: number | null = null;

  selectedTimesheetProjectForModal: TimesheetProject | null = null;
  selectedTimesheetUserId: number | null = null;

  selectedTimesheetUserDetail: TimesheetUser | null = null;
  selectedTimesheetProjectDetail: TimesheetProject | null = null;

  isSavingTimesheetMember: boolean = false;

  /* =========================================================
     FORM ALLOCAZIONE
  ========================================================= */

  formStartDate: string = '';
  formRoleId: number | null = null;
  formWorkAllocation: number = 100;

  isSavingAllocation: boolean = false;

  /* =========================================================
     FORM TIMESHEET
  ========================================================= */

  timesheetStartDate: string = '';

  /* =========================================================
     MODIFICA / ELIMINAZIONE
  ========================================================= */

  editModeView: 'details' | 'confirm_delete' = 'details';

  modalActionType: 'delete' | 'conclude' = 'delete';

  formEndWorkDate: string = '';

  /* =========================================================
     NECESSITÀ
  ========================================================= */

  newNeedRole: number | null = null;

  showAddNeedForm: boolean = false;

  needToDeleteId: number | null = null;

  isSavingNeed: boolean = false;

  /* =========================================================
     FEEDBACK TOAST
  ========================================================= */

  toastMessage: string | null = null;

  toastType: 'success' | 'error' = 'success';

  /* =========================================================
     COSTRUTTORE
  ========================================================= */

  constructor(
    private allocationService: AllocationService,
    private cdr: ChangeDetectorRef,
  ) {}

  /* =========================================================
     CICLO DI VITA
  ========================================================= */

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.allocationsRequestId++;
    this.timesheetRequestId++;
  }

  /* =========================================================
     INCARICHI DINAMICI
  ========================================================= */

  getDefaultAssignmentRoleId(): number | null {
    if (!this.assignmentRoles.length) {
      return null;
    }

    return this.assignmentRoles[0].id;
  }

  getAssignmentRoleById(roleId: number | null | undefined): AssignmentRole | undefined {
    if (roleId === null || roleId === undefined) {
      return undefined;
    }

    return this.assignmentRoles.find((role) => role.id === Number(roleId));
  }

  getRoleBadgeLabel(roleInput: any): string {
    if (!roleInput) {
      return '';
    }

    let alias = '';

    if (typeof roleInput === 'number') {
      alias = this.getAssignmentRoleById(roleInput)?.alias || '';
    } else if (typeof roleInput === 'string') {
      alias = roleInput;
    } else if (typeof roleInput === 'object') {
      if (roleInput.alias) {
        alias = roleInput.alias;
      } else if (roleInput.id) {
        alias = this.getAssignmentRoleById(Number(roleInput.id))?.alias || '';
      }
    }

    const normalized = alias.trim().toLowerCase();

    const aliases: { [key: string]: string } = {
      'sviluppatore front-end': 'F',
      'sviluppatore backend': 'B',
      'sviluppatore back-end': 'B',
      'sviluppatore full-stack': 'FB',
      'ux-ui designer': 'D',
      'scrum master': 'SM',
      'project manager': 'PM',
      'team leader': 'TL',
    };

    return aliases[normalized] || (alias ? alias.substring(0, 2).toUpperCase() : '');
  }

  getRoleBadgeClass(roleInput: any): string {
    const label = this.getRoleBadgeLabel(roleInput);

    switch (label) {
      case 'F':
        return 'bg-frontend';
      case 'B':
        return 'bg-backend';
      case 'FB':
        return 'bg-fullstack';
      case 'D':
        return 'bg-designer';
      case 'TL':
        return 'bg-teamleader';
      case 'PM':
        return 'bg-pm';
      case 'SM':
        return 'bg-sm';
      default:
        return 'bg-frontend';
    }
  }

  /* =========================================================
     LOGHI PROGETTI
  ========================================================= */

  getProjectLogo(proj: Project | TimesheetProject | null | undefined): string {
    if (!proj) {
      return 'img/icone/lampadina-progetto.png';
    }

    const url = proj.filestorage?.url;

    if (
      url &&
      typeof url === 'string' &&
      url.trim() !== '' &&
      !url.toLowerCase().includes('avatar') &&
      !url.toLowerCase().includes('user')
    ) {
      return url;
    }

    return 'img/icone/lampadina-progetto.png';
  }

  /* =========================================================
     CAMBIO TAB
  ========================================================= */

  switchTab(tab: 'progetti' | 'timesheet' | 'corsi'): void {
    this.activeTab = tab;

    if (tab === 'progetti') {
      this.loadData();
    } else if (tab === 'timesheet') {
      this.loadTimesheetData();
    }
  }

  toggleLegend(): void {
    this.isLegendExpanded = !this.isLegendExpanded;
  }

  /* =========================================================
     CARICAMENTO PROGETTI NORMALI
  ========================================================= */

  loadData(): void {
    if (!this.isBrowser) {
      return;
    }

    const requestId = ++this.allocationsRequestId;

    const filters = {
      search: this.searchQuery,
      role_alias: this.selectedRole,
      project_status: this.selectedStatus,
      prioritize_project_id: this.prioritizedProjectId || undefined,
    };

    this.allocationService.getAllocations(filters).subscribe({
      next: (res) => {
        if (requestId !== this.allocationsRequestId) {
          return;
        }

        if (!res || res.success === false) {
          return;
        }

        this.kpi = res.kpi || null;
        this.projects = res.projects || [];
        this.users = res.users || [];
        this.assignmentRoles = res.assignment_roles || [];

        if (
          this.selectedRole &&
          !this.assignmentRoles.some((role) => role.alias === this.selectedRole)
        ) {
          this.selectedRole = '';
        }

        if (!this.formRoleId || !this.assignmentRoles.some((role) => role.id === this.formRoleId)) {
          this.formRoleId = this.getDefaultAssignmentRoleId();
        }

        if (
          !this.newNeedRole ||
          !this.assignmentRoles.some((role) => role.id === this.newNeedRole)
        ) {
          this.newNeedRole = this.getDefaultAssignmentRoleId();
        }

        this.applyUserSorting();

        this.cdr.detectChanges();
      },

      error: (err) => {
        if (requestId !== this.allocationsRequestId) {
          return;
        }

        console.error('Errore caricamento allocazioni', err);
        this.showToast('Errore nel caricamento dei dati', 'error');
      },
    });
  }

  /* =========================================================
     RICERCA E FILTRI
  ========================================================= */

  onSearchInputChange(val: string): void {
    this.searchQuery = val;

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.onFilterChange();
    }, 300);
  }

  onFilterChange(): void {
    if (this.activeTab === 'progetti') {
      this.loadData();
    } else if (this.activeTab === 'timesheet') {
      this.loadTimesheetData();
    }
  }

  /* =========================================================
     ORDINAMENTO UTENTI
  ========================================================= */

  applyUserSorting(): void {
    this.users.sort((a, b) => {
      if (this.prioritizedProjectId) {
        const aAssigned = this.getUserAllocationForProject(a, this.prioritizedProjectId) ? 1 : 0;
        const bAssigned = this.getUserAllocationForProject(b, this.prioritizedProjectId) ? 1 : 0;

        if (aAssigned !== bAssigned) {
          return bAssigned - aAssigned;
        }
      }

      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();

      return nameA.localeCompare(nameB);
    });
  }

  /* =========================================================
     CARICAMENTO TIMESHEET
  ========================================================= */

  loadTimesheetData(): void {
    if (!this.isBrowser) {
      return;
    }

    const requestId = ++this.timesheetRequestId;

    this.allocationService.getTimesheetIndex(this.searchQuery).subscribe({
      next: (res) => {
        if (requestId !== this.timesheetRequestId) {
          return;
        }

        this.timesheetProjects = res.timesheet_projects || [];
        this.timesheetUsers = res.users || [];

        this.timesheetUsers.sort((a, b) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();

          return nameA.localeCompare(nameB);
        });

        this.cdr.detectChanges();
      },

      error: (err) => {
        if (requestId !== this.timesheetRequestId) {
          return;
        }

        console.error('Errore caricamento timesheet', err);
        this.showToast('Errore nel caricamento del timesheet', 'error');
      },
    });
  }

  /* =========================================================
     ASSOCIAZIONI TIMESHEET
  ========================================================= */

  getTimesheetAllocation(user: TimesheetUser, projectId: number): TimesheetProject | undefined {
    return user.timesheet_projects?.find((project) => project.id === projectId);
  }

  /**
   * Gestisce il clic sulla cella Timesheet.
   * Se la risorsa è già associata apre il dettaglio.
   * Se non è associata apre il modulo di assegnazione.
   */
  onTimesheetCellClick(user: TimesheetUser, project: TimesheetProject): void {
    if (this.timesheetBusyKey !== null || this.isSavingTimesheetMember) {
      return;
    }

    const existingAllocation = this.getTimesheetAllocation(user, project.id);

    if (!existingAllocation) {
      this.openTimesheetAssignModal(user, project);
      return;
    }

    this.selectedTimesheetUserDetail = user;
    this.selectedTimesheetProjectDetail = project;
    this.showTimesheetMemberModal = true;
  }

  /**
   * Apre la modale per aggiungere una risorsa al Timesheet.
   */
  openTimesheetAssignModal(user: TimesheetUser, project: TimesheetProject): void {
    if (this.timesheetBusyKey !== null || this.isSavingTimesheetMember) {
      return;
    }

    this.selectedTimesheetProjectForModal = project;
    this.selectedTimesheetUserId = user.id;
    this.timesheetStartDate = this.getTodayIso();
    this.showTimesheetAssignModal = true;
  }

  /**
   * Chiude la modale di assegnazione.
   */
  closeTimesheetAssignModal(): void {
    if (this.isSavingTimesheetMember) {
      return;
    }

    this.showTimesheetAssignModal = false;
    this.selectedTimesheetProjectForModal = null;
    this.selectedTimesheetUserId = null;
    this.timesheetStartDate = '';
  }

  /**
   * Conferma l'aggiunta della risorsa al Timesheet.
   */
  confirmTimesheetAssignment(): void {
    const project = this.selectedTimesheetProjectForModal;
    const userId = this.selectedTimesheetUserId;
    const startDate = this.formatIsoDate(this.timesheetStartDate);

    if (!project || userId === null || userId <= 0 || this.isSavingTimesheetMember) {
      return;
    }

    if (!startDate) {
      this.showToast('Seleziona la data di inizio', 'error');
      return;
    }

    const selectedUser = this.timesheetUsers.find((user) => user.id === userId);

    if (!selectedUser) {
      this.showToast('La risorsa selezionata non è più disponibile', 'error');
      return;
    }

    if (this.getTimesheetAllocation(selectedUser, project.id)) {
      this.showToast('Questa risorsa è già associata al Timesheet', 'error');
      return;
    }

    this.isSavingTimesheetMember = true;
    this.timesheetBusyKey = `${project.id}-${userId}`;

    this.allocationService.addTimesheetMember(project.id, userId, startDate).subscribe({
      next: () => {
        this.isSavingTimesheetMember = false;
        this.timesheetBusyKey = null;
        this.showTimesheetAssignModal = false;
        this.selectedTimesheetProjectForModal = null;
        this.selectedTimesheetUserId = null;
        this.timesheetStartDate = '';

        this.showToast('Utente aggiunto al progetto Timesheet', 'success');

        this.loadTimesheetData();
      },

      error: (err) => {
        console.error('Errore aggiunta membro Timesheet', err);

        this.isSavingTimesheetMember = false;
        this.timesheetBusyKey = null;

        this.showToast('Impossibile aggiungere la risorsa al Timesheet', 'error');

        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Chiude il dettaglio dell'associazione Timesheet.
   */
  closeTimesheetMemberModal(): void {
    if (this.timesheetBusyKey !== null) {
      return;
    }

    this.showTimesheetMemberModal = false;
    this.selectedTimesheetUserDetail = null;
    this.selectedTimesheetProjectDetail = null;
  }

  /**
   * Rimuove la risorsa dal progetto Timesheet.
   * La rimozione avviene soltanto dopo il clic esplicito sul pulsante.
   */
  removeSelectedTimesheetMember(): void {
    const user = this.selectedTimesheetUserDetail;
    const project = this.selectedTimesheetProjectDetail;

    if (!user || !project || this.timesheetBusyKey !== null) {
      return;
    }

    const busyKey = `${project.id}-${user.id}`;

    this.timesheetBusyKey = busyKey;

    this.allocationService.removeTimesheetMember(project.id, user.id).subscribe({
      next: () => {
        this.timesheetBusyKey = null;
        this.showTimesheetMemberModal = false;
        this.selectedTimesheetUserDetail = null;
        this.selectedTimesheetProjectDetail = null;

        this.showToast('Utente rimosso dal progetto Timesheet', 'success');

        this.loadTimesheetData();
      },

      error: (err) => {
        console.error('Errore rimozione associazione Timesheet', err);

        this.timesheetBusyKey = null;

        this.showToast('Impossibile rimuovere l’associazione Timesheet', 'error');

        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Restituisce la data di inizio dell'associazione.
   */
  getTimesheetStartDate(user: TimesheetUser, projectId: number): string {
    const allocation = this.getTimesheetAllocation(user, projectId);
    const startDate = allocation?.pivot?.start_date;

    if (!startDate) {
      return 'Non disponibile';
    }

    const normalizedDate = this.parseDateForInput(startDate);
    const parts = normalizedDate.split('-');

    if (parts.length !== 3) {
      return startDate;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /* =========================================================
     INTESTAZIONE PROGETTI
  ========================================================= */

  onProjectHeaderClick(projectId: number): void {
    this.prioritizedProjectId = this.prioritizedProjectId === projectId ? null : projectId;

    this.applyUserSorting();

    this.cdr.detectChanges();
  }

  /**
   * Apre la modale con la descrizione del progetto Timesheet.
   */
  onTimesheetProjectHeaderClick(project: TimesheetProject): void {
    this.selectedTimesheetProjectDetail = project;
    this.showTimesheetProjectModal = true;
  }

  /**
   * Chiude la modale descrittiva del progetto Timesheet.
   */
  closeTimesheetProjectModal(): void {
    this.showTimesheetProjectModal = false;
    this.selectedTimesheetProjectDetail = null;
  }

  /* =========================================================
     DIFFICOLTÀ
  ========================================================= */

  /**
   * Verifica se un valore di difficoltà è attivo.
   * Gestisce sia true che 1, come restituiti dal backend.
   */
  private isDifficultyActive(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  /**
   * Restituisce true se almeno una risorsa allocata
   * sul progetto presenta una difficoltà segnalata.
   */
  hasProjectDifficulty(project: Project): boolean {
    return (
      project.users?.some((user) => this.isDifficultyActive(user.pivot?.is_difficult)) ?? false
    );
  }

  onToggleDifficulty(projectId: number, userId: number, event: MouseEvent): void {
    event.stopPropagation();

    this.allocationService.toggleDifficulty(projectId, userId).subscribe({
      next: () => {
        this.refreshActiveView();
        this.showToast('Difficoltà aggiornata con successo', 'success');
      },

      error: (err) => {
        console.error('Errore aggiornamento difficoltà', err);
        this.showToast('Impossibile aggiornare la difficoltà', 'error');
      },
    });
  }

  /* =========================================================
     RICERCA ALLOCAZIONI
  ========================================================= */

  getUserAllocationForProject(user: User, projectId: number): Project | undefined {
    return user.projects?.find((project) => project.id === projectId);
  }

  getProjectOpenNeedsCount(project: Project): number {
    return project.needs?.length || 0;
  }

  getUserDifficultyCount(user: User): number {
    return (
      user.projects?.filter((project) => this.isDifficultyActive(project.pivot?.is_difficult))
        .length || 0
    );
  }

  /* =========================================================
     DATE
  ========================================================= */

  private getTodayIso(): string {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDateForInput(dateStr: string): string {
    if (!dateStr) {
      return this.getTodayIso();
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const parts = dateStr.split(/[-/]/);

    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return dateStr;
  }

  private formatIsoDate(dateStr: string): string {
    if (!dateStr) {
      return this.getTodayIso();
    }

    return dateStr;
  }

  /* =========================================================
     APERTURA MODALE ASSEGNAZIONE / MODIFICA
  ========================================================= */

  onCellClick(user: User, project: Project): void {
    if (this.isSavingAllocation) {
      return;
    }

    const existingAllocation = this.getUserAllocationForProject(user, project.id);

    this.selectedUserForModal = user;
    this.selectedProjectForModal = project;
    this.formWorkAllocation = 100;

    if (existingAllocation) {
      this.editModeView = 'details';

      const pivotData = existingAllocation.pivot;

      this.formStartDate = pivotData?.startwork_date
        ? this.parseDateForInput(pivotData.startwork_date)
        : this.getTodayIso();

      this.formRoleId = pivotData?.assignmentrole_id
        ? Number(pivotData.assignmentrole_id)
        : this.getDefaultAssignmentRoleId();

      this.formWorkAllocation =
        pivotData?.work_allocation !== null && pivotData?.work_allocation !== undefined
          ? Number(pivotData.work_allocation)
          : 100;

      this.showEditModal = true;
    } else {
      this.formStartDate = this.getTodayIso();
      this.formRoleId = this.getDefaultAssignmentRoleId();
      this.formWorkAllocation = 100;

      this.showAssignModal = true;
    }
  }

  /* =========================================================
     DETTAGLIO UTENTE
  ========================================================= */

  onUserClick(user: User): void {
    this.selectedUserDetail = user;
    this.showUserDetailModal = true;
  }

  /* =========================================================
     MODALE NECESSITÀ
  ========================================================= */

  onOpenAllNeedsModal(): void {
    if (!this.projects.length) {
      this.showToast('Non ci sono progetti disponibili', 'error');
      return;
    }

    this.selectedProjectForNeeds = null;
    this.selectedNeedsProjectId = null;
    this.showAddNeedForm = false;
    this.needToDeleteId = null;
    this.newNeedRole = this.getDefaultAssignmentRoleId();
    this.showNeedsModal = true;
  }

  onNeedsProjectChange(projectId: number | string | null): void {
    this.selectedNeedsProjectId = projectId === null || projectId === '' ? null : Number(projectId);

    this.selectedProjectForNeeds =
      this.projects.find((project) => project.id === this.selectedNeedsProjectId) || null;

    this.showAddNeedForm = false;
    this.needToDeleteId = null;
    this.newNeedRole = this.getDefaultAssignmentRoleId();
  }

  onOpenNeedsModal(project: Project): void {
    this.selectedProjectForNeeds = project;
    this.selectedNeedsProjectId = project.id;
    this.showAddNeedForm = false;
    this.needToDeleteId = null;
    this.newNeedRole = this.getDefaultAssignmentRoleId();
    this.showNeedsModal = true;
  }

  /* =========================================================
     CONFERMA ASSEGNAZIONE
  ========================================================= */

  confirmAssignment(): void {
    if (!this.selectedUserForModal || !this.selectedProjectForModal || this.isSavingAllocation) {
      return;
    }

    const roleId = Number(this.formRoleId);
    const workAllocation = Number(this.formWorkAllocation);

    if (!Number.isInteger(roleId) || !this.assignmentRoles.some((role) => role.id === roleId)) {
      this.showToast('Seleziona un incarico valido', 'error');
      return;
    }

    if (!Number.isFinite(workAllocation) || workAllocation < 0 || workAllocation > 100) {
      this.showToast('La percentuale deve essere compresa tra 0 e 100', 'error');
      return;
    }

    const data = {
      user_id: Number(this.selectedUserForModal.id),
      project_id: Number(this.selectedProjectForModal.id),
      assignmentrole_id: roleId,
      startwork_date: this.formatIsoDate(this.formStartDate),
      work_allocation: workAllocation,
    };

    this.isSavingAllocation = true;

    this.allocationService.assignResource(data).subscribe({
      next: () => {
        this.isSavingAllocation = false;
        this.showAssignModal = false;

        this.showToast('Risorsa assegnata al progetto', 'success');

        this.refreshActiveView();
      },

      error: (err) => {
        console.error('Errore durante assegnazione', err);

        this.isSavingAllocation = false;

        this.showToast("Errore durante l'assegnazione", 'error');

        this.cdr.detectChanges();
      },
    });
  }

  /* =========================================================
     CONFERMA MODIFICA ALLOCAZIONE
  ========================================================= */

  confirmUpdateAllocation(): void {
    if (!this.selectedUserForModal || !this.selectedProjectForModal || this.isSavingAllocation) {
      return;
    }

    const roleId = Number(this.formRoleId);
    const workAllocation = Number(this.formWorkAllocation);

    if (!Number.isInteger(roleId) || !this.assignmentRoles.some((role) => role.id === roleId)) {
      this.showToast('Seleziona un incarico valido', 'error');
      return;
    }

    if (!Number.isFinite(workAllocation) || workAllocation < 0 || workAllocation > 100) {
      this.showToast('La percentuale deve essere compresa tra 0 e 100', 'error');
      return;
    }

    const data = {
      assignmentrole_id: roleId,
      startwork_date: this.formatIsoDate(this.formStartDate),
      work_allocation: workAllocation,
    };

    this.isSavingAllocation = true;

    this.allocationService
      .updateAllocation(this.selectedProjectForModal.id, this.selectedUserForModal.id, data)
      .subscribe({
        next: () => {
          this.isSavingAllocation = false;
          this.showEditModal = false;

          this.showToast('Allocazione aggiornata', 'success');

          this.refreshActiveView();
        },

        error: (err) => {
          console.error('Errore aggiornamento allocazione', err);

          this.isSavingAllocation = false;

          this.showToast('Errore aggiornamento allocazione', 'error');

          this.cdr.detectChanges();
        },
      });
  }

  /* =========================================================
     ELIMINAZIONE / CONCLUSIONE ALLOCAZIONE
  ========================================================= */

  confirmTerminateAllocation(): void {
    if (!this.selectedUserForModal || !this.selectedProjectForModal || this.isSavingAllocation) {
      return;
    }

    this.isSavingAllocation = true;

    this.allocationService
      .terminateAllocation(
        this.selectedProjectForModal.id,
        this.selectedUserForModal.id,
        this.modalActionType,
        this.formEndWorkDate ? this.formatIsoDate(this.formEndWorkDate) : undefined,
      )
      .subscribe({
        next: () => {
          this.isSavingAllocation = false;
          this.showEditModal = false;

          this.showToast('Collaborazione conclusa / rimossa', 'success');

          this.refreshActiveView();
        },

        error: (err) => {
          console.error('Errore terminazione collaborazione', err);

          this.isSavingAllocation = false;

          this.showToast('Errore terminazione collaborazione', 'error');

          this.cdr.detectChanges();
        },
      });
  }

  /* =========================================================
     AGGIORNAMENTO VISTA
  ========================================================= */

  refreshActiveView(): void {
    if (this.activeTab === 'timesheet') {
      this.loadTimesheetData();
    } else if (this.activeTab === 'progetti') {
      this.loadData();
    }
  }

  /* =========================================================
     AGGIUNTA NECESSITÀ
  ========================================================= */

  addProjectNeed(): void {
    if (!this.selectedProjectForNeeds || this.isSavingNeed) {
      return;
    }

    const assignmentRoleId = Number(this.newNeedRole);

    if (
      !Number.isInteger(assignmentRoleId) ||
      !this.assignmentRoles.some((role) => role.id === assignmentRoleId)
    ) {
      this.showToast('Seleziona un incarico valido', 'error');
      return;
    }

    this.isSavingNeed = true;

    this.allocationService.addNeed(this.selectedProjectForNeeds.id, assignmentRoleId).subscribe({
      next: () => {
        this.isSavingNeed = false;

        this.showToast('Necessità aggiunta con successo', 'success');

        this.showAddNeedForm = false;
        this.showNeedsModal = false;

        this.loadData();
      },

      error: (err) => {
        console.error('Errore aggiunta necessità', err);

        this.isSavingNeed = false;

        this.showToast(err?.error?.message || 'Errore aggiunta necessità', 'error');

        this.cdr.detectChanges();
      },
    });
  }

  /* =========================================================
     RIMOZIONE NECESSITÀ
  ========================================================= */

  removeProjectNeed(needId: number): void {
    if (this.isSavingNeed) {
      return;
    }

    this.isSavingNeed = true;

    this.allocationService.removeNeed(needId).subscribe({
      next: () => {
        this.isSavingNeed = false;

        this.showToast('Necessità rimossa', 'success');

        this.needToDeleteId = null;
        this.showNeedsModal = false;

        this.loadData();
      },

      error: (err) => {
        console.error('Errore rimozione necessità', err);

        this.isSavingNeed = false;

        this.showToast('Errore rimozione necessità', 'error');

        this.cdr.detectChanges();
      },
    });
  }

  /* =========================================================
     TOAST
  ========================================================= */

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;

    this.cdr.detectChanges();

    setTimeout(() => {
      this.toastMessage = null;
      this.cdr.detectChanges();
    }, 3500);
  }
}
