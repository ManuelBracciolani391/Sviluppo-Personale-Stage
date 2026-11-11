import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  role: string;
}

export interface ProjectUserPivot {
  assignmentrole_id: number;
  startwork_date: string;
  endwork_date?: string;
  work_allocation: number;
  is_difficult: boolean;
}

export interface Project {
  id: number;
  name: string;
  status: string;
  filestorage?: { url: string };
  users_count?: number; // <-- AGGIUNTO QUI PER EVITARE L'ERRORE DI TYPESCRIPT
  users?: User[];
  needs?: ProjectNeed[];
  pivot?: ProjectUserPivot;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  filestorage?: { url: string };
  projects?: Project[];
  roles?: any[];
  pivot?: ProjectUserPivot;
}

export interface AllocationIndexResponse {
  success: boolean;
  kpi: AllocationKPI;
  projects: Project[];
  users: User[];
}

@Injectable({
  providedIn: 'root',
})
export class AllocationService {
  private apiUrl = 'http://localhost:8000/api/allocations';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  getAllocations(filters?: {
    search?: string;
    role_alias?: string;
    project_status?: string;
    prioritize_project_id?: number;
  }): Observable<AllocationIndexResponse> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.role_alias) params = params.set('role_alias', filters.role_alias);
    if (filters?.project_status) params = params.set('project_status', filters.project_status);
    if (filters?.prioritize_project_id)
      params = params.set('prioritize_project_id', filters.prioritize_project_id.toString());

    return this.http.get<AllocationIndexResponse>(this.apiUrl, {
      headers: this.getHeaders(),
      params,
    });
  }

  getTimesheetIndex(search?: string): Observable<any> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.apiUrl}/timesheet`, { headers: this.getHeaders(), params });
  }

  toggleTimesheet(userId: number, timesheetProjectId: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/timesheet/toggle`,
      { user_id: userId, timesheet_project_id: timesheetProjectId },
      { headers: this.getHeaders() },
    );
  }

  toggleDifficulty(projectId: number, userId: number): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/project/${projectId}/user/${userId}/toggle-difficulty`,
      {},
      { headers: this.getHeaders() },
    );
  }

  assignResource(data: {
    user_id: number;
    project_id: number;
    assignmentrole_id: number;
    startwork_date: string;
    work_allocation: number;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/assign`, data, { headers: this.getHeaders() });
  }

  updateAllocation(
    projectId: number,
    userId: number,
    data: { assignmentrole_id: number; startwork_date: string; work_allocation: number },
  ): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/project/${projectId}/user/${userId}`, data, {
      headers: this.getHeaders(),
    });
  }

  terminateAllocation(
    projectId: number,
    userId: number,
    action: 'delete' | 'conclude',
    endworkDate?: string,
  ): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/project/${projectId}/user/${userId}/terminate`, {
      headers: this.getHeaders(),
      body: { action, endwork_date: endworkDate },
    });
  }

  addNeed(projectId: number, role: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/project/${projectId}/needs`,
      { role },
      { headers: this.getHeaders() },
    );
  }

  removeNeed(needId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/needs/${needId}`, { headers: this.getHeaders() });
  }
}
