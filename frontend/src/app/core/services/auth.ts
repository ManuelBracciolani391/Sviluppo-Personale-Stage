import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}
  login(credentials: { email: string; password: string }) {
    // Supponendo tu usi HttpClient:
    return this.http.post('tuo-endpoint-api', credentials);
  }
}
