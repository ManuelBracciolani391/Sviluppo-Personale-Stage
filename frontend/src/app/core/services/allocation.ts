import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/* =========================================================
   TIPI COMUNI
========================================================= */

export interface AssignmentRole {
  id: number;
  alias: string;
  description?: string | null;
}

/* =========================================================
   TIPI: ALLOCAZIONI PROGETTI NORMALI
========================================================= */

export interface AllocationKPI {
  last_update: string;
  allocated_resources: string;
  unallocated_resources: number;
  overloaded_resources: number;
  difficulty_allocations: number;
  open_needs: number;
}

export interface ProjectNeed {
  id: number;
  project_id: number;
  assignmentrole_id: number;
  assignment_role?: AssignmentRole | null;
}

export interface ProjectUserPivot {
  assignmentrole_id: number;
  startwork_date: string;
  endwork_date?: string | null;
  work_allocation: number;
  is_difficult: boolean;
}

export interface Project {
  id: number;
  alias: string;
  name?: string;
  status: string;
  is_timesheet?: boolean;
  is_course?: boolean;
  filestorage?: {
    url: string;
  } | null;
  users_count?: number;
  users?: User[];
  needs?: ProjectNeed[];
  pivot?: ProjectUserPivot;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  filestorage?: {
    url: string;
  } | null;
  projects?: Project[];
  roles?: unknown[];
  assignmentRoles?: AssignmentRole[];
  assignment_roles?: AssignmentRole[];
  pivot?: ProjectUserPivot;
}

/* =========================================================
   RISPOSTA ALLOCAZIONI
========================================================= */

export interface AllocationIndexResponse {
  success: boolean;
  kpi: AllocationKPI;
  projects: Project[];
  users: User[];
  assignment_roles: AssignmentRole[];
}

/* =========================================================
   TIPI: TIMESHEET
========================================================= */

export interface TimesheetUserPivot {
  start_date: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TimesheetProject {
  id: number;
  name: string;
  description?: string | null;
  note?: string | null;
  filestorage?: {
    url: string;
  } | null;
  users?: TimesheetUser[];
  pivot?: TimesheetUserPivot;
}

export interface TimesheetUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  filestorage?: {
    url: string;
  } | null;
  timesheet_projects?: TimesheetProject[];
  roles?: unknown[];
  pivot?: TimesheetUserPivot;
}

export interface TimesheetIndexResponse {
  success: boolean;
  timesheet_projects: TimesheetProject[];
  users: TimesheetUser[];
}

export interface TimesheetMemberResponse {
  success: boolean;
  message?: string;
  data?: TimesheetProject;
}

/* =========================================================
   SERVICE
========================================================= */

@Injectable({
  providedIn: 'root',
})
export class AllocationService {
  private apiUrl = 'http://localhost:8000/api/allocations';

  private timesheetProjectsUrl = 'http://localhost:8000/api/timesheet-projects';

  constructor(private http: HttpClient) {}

  /* =======================================================
     HEADERS
  ======================================================= */

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('access_token');

      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  /* =======================================================
     PROGETTI NORMALI
  ======================================================= */

  getAllocations(filters?: {
    search?: string;
    role_alias?: string;
    project_status?: string;
    prioritize_project_id?: number;
  }): Observable<AllocationIndexResponse> {
    let params = new HttpParams();

    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    if (filters?.role_alias) {
      params = params.set('role_alias', filters.role_alias);
    }

    if (filters?.project_status) {
      params = params.set('project_status', filters.project_status);
    }

    if (filters?.prioritize_project_id) {
      params = params.set('prioritize_project_id', filters.prioritize_project_id.toString());
    }

    return this.http.get<AllocationIndexResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getUserDetail(userId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/user/${userId}`, {
      headers: this.getHeaders(),
    });
  }

  getProjectDetail(projectId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/project/${projectId}`, {
      headers: this.getHeaders(),
    });
  }

  assignResource(data: {
    user_id: number;
    project_id: number;
    assignmentrole_id: number;
    startwork_date: string;
    work_allocation: number;
  }): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/assign`, data, {
      headers: this.getHeaders(),
    });
  }

  updateAllocation(
    projectId: number,
    userId: number,
    data: {
      assignmentrole_id: number;
      startwork_date: string;
      work_allocation: number;
    },
  ): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/project/${projectId}/user/${userId}`, data, {
      headers: this.getHeaders(),
    });
  }

  terminateAllocation(
    projectId: number,
    userId: number,
    action: 'delete' | 'conclude',
    endworkDate?: string,
  ): Observable<unknown> {
    return this.http.delete<unknown>(
      `${this.apiUrl}/project/${projectId}/user/${userId}/terminate`,
      {
        headers: this.getHeaders(),
        body: {
          action,
          endwork_date: endworkDate,
        },
      },
    );
  }

  toggleDifficulty(projectId: number, userId: number): Observable<unknown> {
    return this.http.patch<unknown>(
      `${this.apiUrl}/project/${projectId}/user/${userId}/toggle-difficulty`,
      {},
      { headers: this.getHeaders() },
    );
  }

  addNeed(projectId: number, assignmentroleId: number): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiUrl}/project/${projectId}/needs`,
      { assignmentrole_id: assignmentroleId },
      { headers: this.getHeaders() },
    );
  }

  removeNeed(needId: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/needs/${needId}`, {
      headers: this.getHeaders(),
    });
  }

  /* =======================================================
     TIMESHEET: LETTURA
  ======================================================= */

  getTimesheetIndex(search?: string): Observable<TimesheetIndexResponse> {
    let params = new HttpParams();

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<TimesheetIndexResponse>(`${this.apiUrl}/timesheet`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /* =======================================================
     TIMESHEET: AGGIUNTA MEMBRO
  ======================================================= */

  addTimesheetMember(
    timesheetProjectId: number,
    userId: number,
    startDate: string,
  ): Observable<TimesheetMemberResponse> {
    return this.http.post<TimesheetMemberResponse>(
      `${this.timesheetProjectsUrl}/${timesheetProjectId}/members`,
      {
        user_id: userId,
        start_date: startDate,
      },
      { headers: this.getHeaders() },
    );
  }

  /* =======================================================
     TIMESHEET: RIMOZIONE MEMBRO
  ======================================================= */

  removeTimesheetMember(
    timesheetProjectId: number,
    userId: number,
  ): Observable<TimesheetMemberResponse> {
    return this.http.delete<TimesheetMemberResponse>(
      `${this.timesheetProjectsUrl}/${timesheetProjectId}/members/${userId}`,
      { headers: this.getHeaders() },
    );
  }
}
