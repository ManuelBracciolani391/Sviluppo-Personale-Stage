import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';

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
  imports: [CommonModule, NzButtonModule, NzTableModule, NzTagModule],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  activeTab = 'projects';

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
}
