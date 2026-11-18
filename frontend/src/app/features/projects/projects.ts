import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { SideBar } from '../side-bar/side-bar';
import { FormsModule } from '@angular/forms';
import { ProjectsService } from './projects.service';

interface Project {
  id: number;
  name: string;
  projectManager: string;
  projectManagerId: number | null;
  teamLeader: string;
  teamLeaderId: number | null;
  scrumMaster: string;
  scrumMasterId: number | null;
  status: string;
  priority: string;
  deliveryPlan: string;
  daily: string;
  sprintReview: string;

  // Dati originali del backend che ci serviranno successivamente
  isAzure: boolean;
  isUxUi: boolean;
  azureProjectName: string | null;
  azureTeamName: string | null;
  bugCountUrl: string | null;
  pbiWithoutFeatureUrl: string | null;
  pbiPastFeatureUrl: string | null;
  description: string | null;
  note: string | null;
  startDate: string | null;
  endDate: string | null;
}

@Component({
  selector: 'app-projects',
  imports: [CommonModule, NzButtonModule, NzTableModule, NzTagModule, SideBar, FormsModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  activeTab = 'projects';

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  projectSearch = '';
  showProjectSearch = false;
  filteredProjects: Project[] = [];

  private platformId = inject(PLATFORM_ID);

  constructor(
    private projectsService: ProjectsService,
    private cdr: ChangeDetectorRef,
  ) {}

  filterProjects(): void {
    const search = this.projectSearch.trim().toLowerCase();

    if (!search) {
      this.filteredProjects = [...this.projects];
      return;
    }

    this.filteredProjects = this.projects.filter((project) =>
      project.name.toLowerCase().includes(search),
    );
  }

  toggleProjectSearch(): void {
    this.showProjectSearch = !this.showProjectSearch;

    if (!this.showProjectSearch) {
      this.projectSearch = '';
    }
  }

  sortProjects(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredProjects = [...this.filteredProjects].sort((a: any, b: any) => {
      if (column === 'status') {
        const statusOrder = ['In corso', 'In manutenzione', 'Concluso', 'Sospeso'];

        const valueA = statusOrder.indexOf(a.status);
        const valueB = statusOrder.indexOf(b.status);

        const comparison = valueA - valueB;

        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      if (column === 'priority') {
        const priorityOrder = ['Bassa', 'Media', 'Alta'];

        const valueA = priorityOrder.indexOf(a.priority);
        const valueB = priorityOrder.indexOf(b.priority);

        const comparison = valueA - valueB;

        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      const valueA = String(a[column] ?? '').toLowerCase();
      const valueB = String(b[column] ?? '').toLowerCase();

      const comparison = valueA.localeCompare(valueB, 'it');

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  loadProjects(): void {
    console.log('LOAD PROJECTS - chiamata effettuata');
    this.projectsService.getProjects().subscribe({
      next: (response) => {
        console.log('Progetti ricevuti dal backend:', response);

        this.projects = response.data.map((project: any) => this.mapProject(project));

        this.filteredProjects = [...this.projects];

        console.log('PROJECTS ARRAY:', this.projects);

        this.projectManagers = this.projects
          .filter((project) => project.projectManagerId !== null && project.projectManager !== '-')
          .map((project) => ({
            id: project.projectManagerId!,
            name: project.projectManager,
          }))
          .filter(
            (manager, index, self) => index === self.findIndex((item) => item.id === manager.id),
          );

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Errore nel caricamento dei progetti:', error);
      },
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProjects();
    }
  }

  // =========================================================
  // MENU AZIONI PROGETTO
  // =========================================================

  selectedProject: Project | null = null;
  editingProject: Project | null = null;

  menuPosition = {
    top: 0,
    left: 0,
  };

  toggleProjectMenu(project: Project, event: MouseEvent): void {
    event.stopPropagation();

    // Se il menu del progetto cliccato è già aperto, lo chiudiamo
    if (this.selectedProject === project) {
      this.closeProjectMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();

    this.selectedProject = project;

    this.menuPosition = {
      top: rect.bottom + 5,
      left: rect.right - 180,
    };
  }

  closeProjectMenu(): void {
    this.selectedProject = null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.closeProjectMenu();

    if (!this.showProjectSearch) {
      return;
    }

    const target = event.target as HTMLElement;

    if (!target.closest('.project-search-input')) {
      this.showProjectSearch = false;
      this.projectSearch = '';
      this.filterProjects();
    }
  }

  private mapProject(project: any): Project {
    return {
      id: project.id,

      name: project.alias,

      projectManager: project.project_manager
        ? `${project.project_manager.first_name} ${project.project_manager.last_name}`
        : '-',

      projectManagerId: project.project_manager_id ?? null,

      teamLeaderId: project.team_leader_id ?? null,

      teamLeader: project.team_leader
        ? `${project.team_leader.first_name} ${project.team_leader.last_name}`
        : '-',

      scrumMasterId: project.scrum_master_id ?? null,

      scrumMaster: project.scrum_master
        ? `${project.scrum_master.first_name} ${project.scrum_master.last_name}`
        : '-',

      status: this.formatStatus(project.status),

      priority: this.formatPriority(project.priority),

      deliveryPlan: project.delivery_plan ?? '-',

      daily: project.is_daily ? '✓' : '×',

      // Per ora il backend non ci fornisce uno sprint review direttamente utilizzabile
      sprintReview: '-',

      isAzure: project.is_azure,
      isUxUi: project.is_ux_ui,
      azureProjectName: project.azure_project_name,
      azureTeamName: project.azure_team_name,
      bugCountUrl: project.bug_count_url,
      pbiWithoutFeatureUrl: project.pbi_without_feature_url,
      pbiPastFeatureUrl: project.pbi_past_feature_url,
      description: project.description,
      note: project.note,
      startDate: project.start_date,
      endDate: project.end_date,
    };
  }

  private formatStatus(status: string): string {
    switch (status) {
      case 'in corso':
        return 'In corso';

      case 'manutenzione':
        return 'In manutenzione';

      case 'concluso':
        return 'Concluso';

      case 'sospeso':
        return 'Sospeso';

      default:
        return status;
    }
  }

  private formatPriority(priority: string): string {
    switch (priority) {
      case 'alta':
        return 'Alta';

      case 'media':
        return 'Media';

      case 'bassa':
        return 'Bassa';

      default:
        return priority;
    }
  }

  // Dati di esempio.
  // In seguito verranno sostituiti dai dati provenienti da Laravel.
  projects: Project[] = [];

  projectManagers: { id: number; name: string }[] = [];

  getStatusColor(status: string): string {
    switch (status) {
      case 'In corso':
        return 'processing';

      case 'In manutenzione':
        return 'warning';

      case 'Concluso':
        return 'success';

      case 'Sospeso':
        return 'error';

      default:
        return 'default';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Alta':
        return 'red';

      case 'Media':
        return 'orange';

      case 'Bassa':
        return 'green';

      default:
        return 'default';
    }
  }

  getPriorityImage(priority: string): string {
    switch (priority) {
      case 'Alta':
        return '/img/projects/alta.png';

      case 'Media':
        return '/img/projects/media.png';

      case 'Bassa':
        return '/img/projects/bassa.png';

      default:
        return '/img/projects/media.png';
    }
  }

  showNewProjectModal = false;
  showProjectCreatedModal = false;
  isEditMode = false;

  showNoteModal = false;
  selectedNoteProject: Project | null = null;

  noteText = '';

  showCsvModal = false;
  selectedCsvProject: Project | null = null;

  activeCsvTab = 'uploaded';

  showDeleteModal = false;
  selectedDeleteProject: Project | null = null;

  newProject: {
    name: string;
    projectManager: string;
    projectManagerId: number | null;
    startDate: string;
    daily: boolean;
    azure: boolean;
    uxUi: boolean;
    status: string;
    priority: string;
    azureProjectName: string;
    azureTeamName: string;
    bugLink: string;
    pbiNoFeatureLink: string;
    pbiPassedFeatureLink: string;
    description: string;
  } = {
    name: '',
    projectManager: '',
    projectManagerId: null,
    startDate: '',
    daily: false,
    azure: false,
    uxUi: false,
    status: '',
    priority: '',
    azureProjectName: '',
    azureTeamName: '',
    bugLink: '',
    pbiNoFeatureLink: '',
    pbiPassedFeatureLink: '',
    description: '',
  };

  // ... projects ...

  openNewProjectModal(): void {
    this.isEditMode = false;

    this.newProject = {
      name: '',
      projectManager: '',
      projectManagerId: null,
      startDate: '',
      daily: false,
      azure: false,
      uxUi: false,
      status: '',
      priority: '',
      azureProjectName: '',
      azureTeamName: '',
      bugLink: '',
      pbiNoFeatureLink: '',
      pbiPassedFeatureLink: '',
      description: '',
    };

    this.showNewProjectModal = true;
  }

  openEditProjectModal(project: Project | null): void {
    if (!project) return;

    this.isEditMode = true;
    this.editingProject = project;

    this.newProject = {
      name: project.name,
      projectManager: project.projectManager,
      projectManagerId: project.projectManagerId,
      startDate: project.startDate ? project.startDate.substring(0, 10) : '',
      daily: project.daily === '✓',
      azure: project.isAzure,
      uxUi: project.isUxUi,
      status: project.status,
      priority: project.priority,
      azureProjectName: project.azureProjectName ?? '',
      azureTeamName: project.azureTeamName ?? '',
      bugLink: project.bugCountUrl ?? '',
      pbiNoFeatureLink: project.pbiWithoutFeatureUrl ?? '',
      pbiPassedFeatureLink: project.pbiPastFeatureUrl ?? '',
      description: project.description ?? '',
    };

    this.showNewProjectModal = true;
    this.closeProjectMenu();
  }

  saveProject(): void {
    if (this.isEditMode) {
      this.updateProject();
      return;
    }

    this.saveNewProject();
  }

  updateProject(): void {
    if (!this.editingProject) {
      console.error('Nessun progetto selezionato per la modifica.');
      return;
    }

    const projectData = {
      alias: this.newProject.name,
      project_manager_id: this.newProject.projectManagerId,
      description: this.newProject.description || null,
      is_daily: this.newProject.daily,
      is_azure: this.newProject.azure,
      is_ux_ui: this.newProject.uxUi,
      status: this.newProject.status.toLowerCase(),
      priority: this.newProject.priority.toLowerCase(),
      azure_project_name: this.newProject.azureProjectName || null,
      azure_team_name: this.newProject.azureTeamName || null,
      bug_count_url: this.newProject.bugLink || null,
      pbi_without_feature_url: this.newProject.pbiNoFeatureLink || null,
      pbi_past_feature_url: this.newProject.pbiPassedFeatureLink || null,
      start_date: this.newProject.startDate || null,
    };

    console.log('Dati progetto da modificare:', projectData);

    this.projectsService.updateProject(this.editingProject.id, projectData).subscribe({
      next: (response) => {
        console.log('Progetto modificato:', response);

        this.showNewProjectModal = false;
        this.isEditMode = false;
        this.editingProject = null;

        this.loadProjects();
      },
      error: (error) => {
        console.error('Errore nella modifica del progetto:', error);
      },
    });
  }

  closeNewProjectModal(): void {
    this.showNewProjectModal = false;
    this.isEditMode = false;
    this.editingProject = null;
  }

  saveNewProject(): void {
    const projectData = {
      alias: this.newProject.name,
      project_manager_id: this.newProject.projectManagerId,
      description: this.newProject.description || null,

      is_daily: this.newProject.daily,
      is_azure: this.newProject.azure,
      is_ux_ui: this.newProject.uxUi,

      status: this.newProject.status.toLowerCase(),
      priority: this.newProject.priority.toLowerCase(),

      azure_project_name: this.newProject.azureProjectName || null,
      azure_team_name: this.newProject.azureTeamName || null,

      bug_count_url: this.newProject.bugLink || null,
      pbi_without_feature_url: this.newProject.pbiNoFeatureLink || null,
      pbi_past_feature_url: this.newProject.pbiPassedFeatureLink || null,

      start_date: this.newProject.startDate || null,
    };

    console.log('Dati progetto da inviare:', projectData);

    this.projectsService.createProject(projectData).subscribe({
      next: (response) => {
        console.log('Progetto creato:', response);

        console.log('CHIUDO LA MODALE');

        //this.showNewProjectModal = false;
        this.closeNewProjectModal();
        this.showProjectCreatedModal = true;

        this.cdr.detectChanges();

        this.loadProjects();
      },

      error: (error) => {
        console.error('Errore nella creazione del progetto:', error);
      },
    });
  }

  closeProjectCreatedModal(): void {
    this.showProjectCreatedModal = false;
  }

  openNoteModal(project: Project | null): void {
    if (!project) {
      return;
    }

    this.selectedNoteProject = project;
    this.noteText = project.note ?? '';
    this.showNoteModal = true;

    this.closeProjectMenu();
  }

  closeNoteModal(): void {
    this.showNoteModal = false;
    this.selectedNoteProject = null;
    this.noteText = '';
  }

  openCsvModal(project: Project | null): void {
    if (!project) {
      return;
    }

    this.selectedCsvProject = project;
    this.activeCsvTab = 'uploaded';
    this.showCsvModal = true;

    this.closeProjectMenu();
  }

  closeCsvModal(): void {
    this.showCsvModal = false;
    this.selectedCsvProject = null;
  }

  openDeleteModal(project: Project | null): void {
    if (!project) {
      return;
    }

    this.selectedDeleteProject = project;
    this.showDeleteModal = true;

    this.closeProjectMenu();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedDeleteProject = null;
  }

  confirmDeleteProject(): void {
    if (!this.selectedDeleteProject) {
      return;
    }

    const projectId = this.selectedDeleteProject.id;

    console.log('Eliminazione progetto:', projectId);

    this.projectsService.deleteProject(projectId).subscribe({
      next: (response) => {
        console.log('Progetto eliminato:', response);

        this.showDeleteModal = false;
        this.selectedDeleteProject = null;

        this.loadProjects();
      },

      error: (error) => {
        console.error('Errore nell’eliminazione del progetto:', error);
      },
    });
  }

  saveNote(): void {
    if (!this.selectedNoteProject) {
      return;
    }

    const projectId = this.selectedNoteProject.id;

    const projectData = {
      note: this.noteText || null,
    };

    console.log('Nota da salvare:', projectData);

    this.projectsService.updateProject(projectId, projectData).subscribe({
      next: (response) => {
        console.log('Nota salvata:', response);

        this.closeNoteModal();
        this.loadProjects();
      },

      error: (error) => {
        console.error('Errore nel salvataggio della nota:', error);
      },
    });
  }

  csvItems = Array.from({ length: 88 }, (_, index) => ({
    name: `SPRINT ${index + 1}`,
    sprintPilot: false,
  }));
}
