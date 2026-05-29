import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Organization } from '../models/planner.models';
import { ApiAuthService } from './api-auth.service';

@Injectable({ providedIn: 'root' })
export class ApiOrganizationService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: ApiAuthService,
  ) {}

  async listOrganizations(): Promise<Organization[]> {
    const response = await firstValueFrom(
      this.http.get<{ organizations: Organization[] }>(this.url('/api/organizations'), { withCredentials: true }),
    );
    return response.organizations;
  }

  async createOrganization(name: string): Promise<Organization> {
    const csrfToken = await this.auth.csrfToken();
    const response = await firstValueFrom(
      this.http.post<{ organization: Organization }>(
        this.url('/api/organizations'),
        { name },
        { headers: { 'X-CSRF-Token': csrfToken }, withCredentials: true },
      ),
    );
    return response.organization;
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
