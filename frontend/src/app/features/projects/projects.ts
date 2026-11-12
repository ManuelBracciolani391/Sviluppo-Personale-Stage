import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { SideBar } from '../side-bar/side-bar';
import { FormsModule } from '@angular/forms';

interface Project {
  name: string;
  projectManager: string;
  teamLeader: string;
  scrumMaster: string;
  status: string;
  priority: string;
  deliveryPlan: string;
  daily: string;
  sprintReview: string;
}

@Component({
  selector: 'app-projects',
  imports: [CommonModule, NzButtonModule, NzTableModule, NzTagModule, SideBar, FormsModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  activeTab = 'projects';

  // =========================================================
  // MENU AZIONI PROGETTO
  // =========================================================

  selectedProject: Project | null = null;

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

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeProjectMenu();
  }

  // Dati di esempio.
  // In seguito verranno sostituiti dai dati provenienti da Laravel.
  projects: Project[] = [
    {
      name: 'Sviluppo personale',
      projectManager: 'Francesco Di Natale',
      teamLeader: 'Rory Cannata',
      scrumMaster: 'Francesco Di Natale',
      status: 'In corso',
      priority: 'Alta',
      deliveryPlan: 'View plan',
      daily: '✓',
      sprintReview: '10/10/2026',
    },

    {
      name: 'GAIA',
      projectManager: 'Oriana Costantino\nGiuseppe Manzella',
      teamLeader: 'Gaetano Carfi',
      scrumMaster: 'Giuseppe Bertolone',
      status: 'In corso',
      priority: 'Alta',
      deliveryPlan: '-',
      daily: '×',
      sprintReview: '-',
    },

    {
      name: 'Ribera',
      projectManager: 'Oriana Costantino',
      teamLeader: 'Gabriele Leotta',
      scrumMaster: '-',
      status: 'In corso',
      priority: 'Alta',
      deliveryPlan: 'View plan',
      daily: '✓',
      sprintReview: '10/10/2026',
    },

    {
      name: 'Iole',
      projectManager: 'Alfredo Torre\nGiuseppe Manzella',
      teamLeader: '-',
      scrumMaster: 'Francesco Di Natale',
      status: 'In manutenzione',
      priority: 'Media',
      deliveryPlan: '-',
      daily: '✓',
      sprintReview: '10/10/2026',
    },

    {
      name: 'CFMT',
      projectManager: 'Giuseppe Manzella',
      teamLeader: '-',
      scrumMaster: 'Francesco Di Natale',
      status: 'In manutenzione',
      priority: 'Media',
      deliveryPlan: 'View plan',
      daily: '✓',
      sprintReview: '10/10/2026',
    },

    {
      name: 'NAR',
      projectManager: 'Alfredo Torre\nDaniel Indelicato\nGiuseppe Manzella',
      teamLeader: 'Daria Gilletti',
      scrumMaster: 'Francesco Di Natale',
      status: 'Concluso',
      priority: 'Media',
      deliveryPlan: 'View plan',
      daily: '✓',
      sprintReview: '10/10/2026',
    },

    {
      name: 'Popcorn',
      projectManager: 'Vincenzo Vitale\nGiuseppe Manzella',
      teamLeader: 'Michele Lo Giudice',
      scrumMaster: 'Michele Lo Giudice',
      status: 'Concluso',
      priority: 'Bassa',
      deliveryPlan: '-',
      daily: '×',
      sprintReview: '-',
    },

    {
      name: 'Indire',
      projectManager: 'Giuseppe Manzella',
      teamLeader: '-',
      scrumMaster: 'Francesco Di Natale',
      status: 'Sospeso',
      priority: 'Bassa',
      deliveryPlan: '-',
      daily: '×',
      sprintReview: '-',
    },
  ];

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

  newProject = {
    name: '',
    projectManager: '',
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
    if (!project) {
      return;
    }

    this.isEditMode = true;

    this.newProject = {
      name: project.name,
      projectManager: project.projectManager,
      startDate: '',
      daily: project.daily === '✓',
      azure: false,
      uxUi: false,
      status: project.status,
      priority: project.priority,
      azureProjectName: '',
      azureTeamName: '',
      bugLink: '',
      pbiNoFeatureLink: '',
      pbiPassedFeatureLink: '',
      description: '',
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
    console.log('Modifica progetto:', this.newProject);

    this.showNewProjectModal = false;
    this.isEditMode = false;
  }

  closeNewProjectModal(): void {
    this.showNewProjectModal = false;
    this.isEditMode = false;
  }

  saveNewProject(): void {
    // Chiude la modale "Nuovo progetto"
    this.showNewProjectModal = false;

    // Mostra la modale di conferma
    this.showProjectCreatedModal = true;
  }

  closeProjectCreatedModal(): void {
    this.showProjectCreatedModal = false;
  }

  openNoteModal(project: Project | null): void {
    if (!project) {
      return;
    }

    this.selectedNoteProject = project;
    this.noteText = '';
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
    // Per ora chiudiamo semplicemente la modale.
    // In seguito qui verrà effettuata la cancellazione tramite Laravel.

    this.showDeleteModal = false;
    this.selectedDeleteProject = null;
  }

  saveNote(): void {
    // Per ora chiudiamo semplicemente la modale.
    // In seguito qui salveremo la nota nel backend Laravel.

    this.showNoteModal = false;
    this.selectedNoteProject = null;
    this.noteText = '';
  }

  csvItems = Array.from({ length: 88 }, (_, index) => ({
    name: `SPRINT ${index + 1}`,
    sprintPilot: false,
  }));
}
