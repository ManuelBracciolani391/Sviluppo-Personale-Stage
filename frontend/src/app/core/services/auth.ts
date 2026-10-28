import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
  remember: boolean;
  expires_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  login(credentials: {
    email: string;
    password: string;
    remember: boolean;
  }): Observable<LoginResponse> {
    // Supponendo tu usi HttpClient:
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials);
  }
}
