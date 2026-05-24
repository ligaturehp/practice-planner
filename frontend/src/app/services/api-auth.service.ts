import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiUser } from '../models/planner.models';

type AuthStatus = 'checking' | 'signed-out' | 'signed-in' | 'error';

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  readonly user = signal<ApiUser | null>(null);
  readonly status = signal<AuthStatus>('checking');
  readonly error = signal('');

  constructor(private readonly http: HttpClient) {}

  async bootstrap(): Promise<void> {
    this.status.set('checking');
    this.error.set('');
    try {
      const response = await firstValueFrom(
        this.http.get<{ user: ApiUser }>(this.url('/api/auth/me'), { withCredentials: true }),
      );
      this.user.set(response.user);
      this.status.set('signed-in');
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.user.set(null);
        this.status.set('signed-out');
        return;
      }
      this.user.set(null);
      this.status.set('error');
      this.error.set('Could not check account status.');
    }
  }

  async register(email: string, password: string): Promise<void> {
    await this.authenticate('/api/auth/register', email, password);
  }

  async login(email: string, password: string): Promise<void> {
    await this.authenticate('/api/auth/login', email, password);
  }

  async logout(): Promise<void> {
    this.error.set('');
    const csrfToken = await this.csrfToken();
    await firstValueFrom(
      this.http.post(this.url('/api/auth/logout'), {}, {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true,
      }),
    );
    this.user.set(null);
    this.status.set('signed-out');
  }

  async csrfToken(): Promise<string> {
    const response = await firstValueFrom(
      this.http.get<{ csrf_token: string }>(this.url('/api/auth/csrf'), { withCredentials: true }),
    );
    return response.csrf_token;
  }

  private async authenticate(path: string, email: string, password: string): Promise<void> {
    this.status.set('checking');
    this.error.set('');
    try {
      const response = await firstValueFrom(
        this.http.post<{ user: ApiUser }>(
          this.url(path),
          { email, password },
          { withCredentials: true },
        ),
      );
      this.user.set(response.user);
      this.status.set('signed-in');
    } catch {
      this.user.set(null);
      this.status.set('signed-out');
      this.error.set('Check the email and password, then try again.');
      throw new Error('authentication failed');
    }
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
