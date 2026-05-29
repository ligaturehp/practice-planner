import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiUserPreferences, UserPreferences, WeekOrder } from '../models/planner.models';
import { ApiAuthService } from './api-auth.service';

@Injectable({ providedIn: 'root' })
export class ApiUserPreferencesService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: ApiAuthService,
  ) {}

  async getPreferences(): Promise<UserPreferences> {
    const response = await firstValueFrom(
      this.http.get<{ preferences: ApiUserPreferences }>(this.url('/api/profile/preferences'), { withCredentials: true }),
    );
    return this.fromApiPreferences(response.preferences);
  }

  async updateWeekOrder(weekOrder: WeekOrder): Promise<UserPreferences> {
    const csrfToken = await this.auth.csrfToken();
    const response = await firstValueFrom(
      this.http.put<{ preferences: ApiUserPreferences }>(
        this.url('/api/profile/preferences'),
        { week_order: weekOrder },
        { headers: { 'X-CSRF-Token': csrfToken }, withCredentials: true },
      ),
    );
    return this.fromApiPreferences(response.preferences);
  }

  private fromApiPreferences(preferences: ApiUserPreferences): UserPreferences {
    return {
      weekOrder: preferences.week_order,
      updatedAt: preferences.updated_at,
    };
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
