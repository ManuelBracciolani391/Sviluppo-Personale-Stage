import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AllocationService, AllocationKPI, Project, User } from '../../core/services/allocation';
import { SideBar } from '../side-bar/side-bar';

@Component({
  selector: 'app-allocazioni',
  standalone: true,
  imports: [CommonModule, FormsModule, SideBar],
  templateUrl: './allocazioni.html',
  styleUrls: ['./allocazioni.css'],
})
export class Allocazioni implements OnInit {
  activeTab: 'progetti' | 'timesheet' | 'corsi' = 'progetti';

  kpi: AllocationKPI | null = null;
  projects: Project[] = [];
  users: User[] = [];
  timesheetUsers: User[] = [];

  searchQuery: string = '';
  selectedRole: string = '';
  selectedStatus: string = '';
  prioritizedProjectId: number | null = null;
  isLegendExpanded: boolean = true;

  // Modali
  showAssignModal: boolean = false;
  showEditModal: boolean = false;
  showUserDetailModal: boolean = false;
  showNeedsModal: boolean = false;

  selectedUserForModal: User | null = null;
  selectedProjectForModal: Project | null = null;
  selectedUserDetail: User | null = null;
  selectedProjectForNeeds: Project | null = null;

  // Form Dati
  formStartDate: string = '';
  formRoleId: number = 1;
  formWorkAllocation: number = 100;

  // Modifica / Eliminazione
  editModeView: 'details' | 'confirm_delete' = 'details';
  modalActionType: 'delete' | 'conclude' = 'delete';
  formEndWorkDate: string = '';

  // Necessità
  newNeedRole: string = 'Frontend';
  showAddNeedForm: boolean = false;
  needToDeleteId: number | null = null;

  // Feedback Toast
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';

  constructor(
    private allocationService: AllocationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  getRoleBadgeLabel(roleInput: any): string {
    if (!roleInput) return 'F';
    const mapIdToAlias: { [key: number]: string } = {
      1: 'F',
      2: 'B',
      3: 'D',
      4: 'FB',
      5: 'TL',
      6: 'PM',
      7: 'SM',
    };
    const mapTextToAlias: { [key: string]: string } = {
      frontend: 'F',
      backend: 'B',
      fullstack: 'FB',
      designer: 'D',
      'team leader': 'TL',
      'project manager': 'PM',
      'scrum master': 'SM',
    };
    if (typeof roleInput === 'number' && mapIdToAlias[roleInput]) return mapIdToAlias[roleInput];
    if (typeof roleInput === 'string') {
      const lower = roleInput.trim().toLowerCase();
      if (mapTextToAlias[lower]) return mapTextToAlias[lower];
      return roleInput.substring(0, 2).toUpperCase();
    }
    if (roleInput?.id && mapIdToAlias[roleInput.id]) return mapIdToAlias[roleInput.id];
    if (roleInput?.alias)
      return mapTextToAlias[roleInput.alias.toLowerCase()] || roleInput.alias.toUpperCase();
    return 'F';
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

  getProjectLogo(proj: Project | null | undefined): string {
    if (!proj) return 'img/icone/lampadina-progetto.png';
    const storage = proj?.filestorage as any;
    const url = storage?.url;
    if (
      url &&
      typeof url === 'string' &&
      url.trim() !== '' &&
      !url.includes('avatar') &&
      !url.includes('user')
    ) {
      return url;
    }
    return 'img/icone/lampadina-progetto.png';
  }

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

  loadData(): void {
    const filters = {
      search: this.searchQuery,
      role_alias: this.selectedRole,
      project_status: this.selectedStatus,
      prioritize_project_id: this.prioritizedProjectId || undefined,
    };

    this.allocationService.getAllocations(filters).subscribe({
      next: (res) => {
        if (!res || res.success !== false) {
          this.kpi = res.kpi || null;
          this.projects = res.projects || [];
          this.users = res.users || [];
          this.applyUserSorting();
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Errore caricamento allocazioni', err);
        this.showToast('Errore nel caricamento dei dati', 'error');
      },
    });
  }

  onSearchInputChange(val: string): void {
    this.searchQuery = val;
    this.onFilterChange();
  }

  onFilterChange(): void {
    if (this.activeTab === 'progetti') {
      this.loadData();
    } else if (this.activeTab === 'timesheet') {
      this.loadTimesheetData();
    }
  }

  applyUserSorting(): void {
    this.users.sort((a, b) => {
      if (this.prioritizedProjectId) {
        const aAssigned = this.getUserAllocationForProject(a, this.prioritizedProjectId) ? 1 : 0;
        const bAssigned = this.getUserAllocationForProject(b, this.prioritizedProjectId) ? 1 : 0;
        if (aAssigned !== bAssigned) return bAssigned - aAssigned;
      }
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  loadTimesheetData(): void {
    this.allocationService.getTimesheetIndex(this.searchQuery).subscribe({
      next: (res: any) => {
        // Sincronizziamo i dati del timesheet usando la stessa struttura di utenti/progetti
        this.timesheetUsers = res.users || res.data || res || [];
        this.timesheetUsers.sort((a: any, b: any) => {
          const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Errore caricamento timesheet', err);
        this.showToast('Errore nel caricamento del timesheet', 'error');
      },
    });
  }

  onProjectHeaderClick(projectId: number): void {
    this.prioritizedProjectId = this.prioritizedProjectId === projectId ? null : projectId;
    this.applyUserSorting();
    this.cdr.detectChanges();
  }

  onToggleDifficulty(projectId: number, userId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.allocationService.toggleDifficulty(projectId, userId).subscribe({
      next: () => {
        this.refreshActiveView();
        this.showToast('Difficoltà aggiornata con successo', 'success');
      },
      error: () => this.showToast('Impossibile aggiornare la difficoltà', 'error'),
    });
  }

  getUserAllocationForProject(user: User, projectId: number) {
    return user.projects?.find((p) => p.id === projectId);
  }

  getProjectOpenNeedsCount(project: Project): number {
    return project.needs?.length || 0;
  }

  private getTodayIso(): string {
    return new Date().toISOString().split('T')[0];
  }

  private parseDateForInput(dateStr: string): string {
    if (!dateStr) return this.getTodayIso();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  private formatIsoDate(dateStr: string): string {
    if (!dateStr) return this.getTodayIso();
    return dateStr;
  }

  onCellClick(user: User, project: Project): void {
    const existingAllocation = this.getUserAllocationForProject(user, project.id);
    this.selectedUserForModal = user;
    this.selectedProjectForModal = project;

    if (existingAllocation) {
      this.editModeView = 'details';
      const pivotData = existingAllocation.pivot || (existingAllocation as any);
      this.formStartDate = pivotData?.startwork_date
        ? this.parseDateForInput(pivotData.startwork_date)
        : this.getTodayIso();
      this.formRoleId = pivotData?.assignmentrole_id ? Number(pivotData.assignmentrole_id) : 1;
      this.showEditModal = true;
    } else {
      this.formStartDate = this.getTodayIso();
      this.formRoleId = 1;
      this.showAssignModal = true;
    }
  }

  onUserClick(user: User): void {
    this.selectedUserDetail = user;
    this.showUserDetailModal = true;
  }

  onOpenNeedsModal(project: Project): void {
    this.selectedProjectForNeeds = project;
    this.showAddNeedForm = false;
    this.needToDeleteId = null;
    this.showNeedsModal = true;
  }

  confirmAssignment(): void {
    if (!this.selectedUserForModal || !this.selectedProjectForModal) return;
    const roleId = Number(this.formRoleId) || 1;
    const data = {
      user_id: Number(this.selectedUserForModal.id),
      project_id: Number(this.selectedProjectForModal.id),
      assignmentrole_id: roleId,
      startwork_date: this.formatIsoDate(this.formStartDate),
      work_allocation: Number(this.formWorkAllocation || 100),
    };

    this.allocationService.assignResource(data).subscribe({
      next: () => {
        this.showAssignModal = false;
        this.showToast('Risorsa assegnata al progetto', 'success');
        this.refreshActiveView();
      },
      error: () => this.showToast("Errore durante l'assegnazione", 'error'),
    });
  }

  confirmUpdateAllocation(): void {
    if (!this.selectedUserForModal || !this.selectedProjectForModal) return;
    const roleId = Number(this.formRoleId) || 1;
    const data = {
      assignmentrole_id: roleId,
      startwork_date: this.formatIsoDate(this.formStartDate),
      work_allocation: 100,
    };

    this.allocationService
      .updateAllocation(this.selectedProjectForModal.id, this.selectedUserForModal.id, data)
      .subscribe({
        next: () => {
          this.showEditModal = false;
          this.showToast('Allocazione aggiornata', 'success');
          this.refreshActiveView();
        },
        error: () => this.showToast('Errore aggiornamento allocazione', 'error'),
      });
  }

  confirmTerminateAllocation(): void {
    if (!this.selectedUserForModal || !this.selectedProjectForModal) return;
    this.allocationService
      .terminateAllocation(
        this.selectedProjectForModal.id,
        this.selectedUserForModal.id,
        this.modalActionType,
        this.formEndWorkDate ? this.formatIsoDate(this.formEndWorkDate) : undefined,
      )
      .subscribe({
        next: () => {
          this.showEditModal = false;
          this.showToast('Collaborazione conclusa / rimossa', 'success');
          this.refreshActiveView();
        },
        error: () => this.showToast('Errore terminazione collaborazione', 'error'),
      });
  }

  refreshActiveView(): void {
    if (this.activeTab === 'timesheet') {
      this.loadTimesheetData();
    } else {
      this.loadData();
    }
  }

  addProjectNeed(): void {
    if (!this.selectedProjectForNeeds) return;
    this.allocationService.addNeed(this.selectedProjectForNeeds.id, this.newNeedRole).subscribe({
      next: () => {
        this.showToast('Necessità aggiunta con successo', 'success');
        this.loadData();
        this.showAddNeedForm = false;
        this.showNeedsModal = false;
      },
      error: () => this.showToast('Errore aggiunta necessità', 'error'),
    });
  }

  removeProjectNeed(needId: number): void {
    this.allocationService.removeNeed(needId).subscribe({
      next: () => {
        this.showToast('Necessità rimossa', 'success');
        this.loadData();
        this.needToDeleteId = null;
        this.showNeedsModal = false;
      },
      error: () => this.showToast('Errore rimozione necessità', 'error'),
    });
  }

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
