import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiPlan,
  ApiPlanShare,
  ApiPlanVersion,
  PlannerState,
  PlanShare,
  PlanVersion,
  SavedPlan,
} from '../models/planner.models';
import { ApiAuthService } from './api-auth.service';

@Injectable({ providedIn: 'root' })
export class ApiPlanStorageService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: ApiAuthService,
  ) {}

  async listPlans(): Promise<SavedPlan[]> {
    const response = await firstValueFrom(
      this.http.get<{ plans: ApiPlan[] }>(this.url('/api/plans'), { withCredentials: true }),
    );
    return response.plans.map((plan) => this.fromApiPlan(plan));
  }

  async savePlan(
    name: string,
    state: PlannerState,
    remotePlan?: { id: string; lockVersion?: number },
  ): Promise<SavedPlan> {
    const cleanState = this.stripTransientState(state);
    const csrfToken = await this.auth.csrfToken();
    const body = {
      name,
      sport: cleanState.sport,
      template: cleanState.template,
      plan_json: cleanState,
      ...(remotePlan?.lockVersion ? { lock_version: remotePlan.lockVersion } : {}),
    };
    const request = remotePlan?.id
      ? this.http.put<{ plan: ApiPlan }>(
          this.url(`/api/plans/${encodeURIComponent(remotePlan.id)}`),
          body,
          {
            headers: { 'X-CSRF-Token': csrfToken },
            withCredentials: true,
          },
        )
      : this.http.post<{ plan: ApiPlan }>(this.url('/api/plans'), body, {
          headers: { 'X-CSRF-Token': csrfToken },
          withCredentials: true,
        });
    const response = await firstValueFrom(request);
    return this.fromApiPlan(response.plan);
  }

  async deletePlan(planId: string): Promise<void> {
    const csrfToken = await this.auth.csrfToken();
    await firstValueFrom(
      this.http.delete(this.url(`/api/plans/${encodeURIComponent(planId)}`), {
        headers: { 'X-CSRF-Token': csrfToken },
        withCredentials: true,
      }),
    );
  }

  async listPlanVersions(planId: string): Promise<PlanVersion[]> {
    const response = await firstValueFrom(
      this.http.get<{ versions: ApiPlanVersion[] }>(
        this.url(`/api/plans/${encodeURIComponent(planId)}/versions`),
        {
          withCredentials: true,
        },
      ),
    );
    return response.versions.map((version) => this.fromApiPlanVersion(version));
  }

  async restorePlanVersion(planId: string, versionId: string): Promise<SavedPlan> {
    const csrfToken = await this.auth.csrfToken();
    const response = await firstValueFrom(
      this.http.post<{ plan: ApiPlan }>(
        this.url(
          `/api/plans/${encodeURIComponent(planId)}/versions/${encodeURIComponent(versionId)}/restore`,
        ),
        {},
        { headers: { 'X-CSRF-Token': csrfToken }, withCredentials: true },
      ),
    );
    return this.fromApiPlan(response.plan);
  }

  async duplicatePlan(planId: string, name: string): Promise<SavedPlan> {
    const csrfToken = await this.auth.csrfToken();
    const response = await firstValueFrom(
      this.http.post<{ plan: ApiPlan }>(
        this.url(`/api/plans/${encodeURIComponent(planId)}/duplicate`),
        { name },
        { headers: { 'X-CSRF-Token': csrfToken }, withCredentials: true },
      ),
    );
    return this.fromApiPlan(response.plan);
  }

  async createShareLink(planId: string): Promise<PlanShare> {
    const csrfToken = await this.auth.csrfToken();
    const response = await firstValueFrom(
      this.http.post<{ share: ApiPlanShare }>(
        this.url(`/api/plans/${encodeURIComponent(planId)}/share-links`),
        {},
        { headers: { 'X-CSRF-Token': csrfToken }, withCredentials: true },
      ),
    );
    return this.fromApiPlanShare(response.share);
  }

  exportCSVUrl(planId: string): string {
    return this.url(`/api/plans/${encodeURIComponent(planId)}/export.csv`);
  }

  private fromApiPlan(plan: ApiPlan): SavedPlan {
    return {
      id: plan.id,
      name: plan.name,
      updatedAt: plan.updated_at,
      lockVersion: plan.lock_version,
      state: plan.plan_json,
    };
  }

  private fromApiPlanVersion(version: ApiPlanVersion): PlanVersion {
    return {
      id: version.id,
      planId: version.plan_id,
      name: version.name,
      updatedAt: version.created_at,
      lockVersion: version.lock_version,
      state: version.plan_json,
    };
  }

  private fromApiPlanShare(share: ApiPlanShare): PlanShare {
    return {
      id: share.id,
      planId: share.plan_id,
      token: share.token,
      url: this.url(`/api/shared-plans/${encodeURIComponent(share.token)}`),
      createdAt: share.created_at,
    };
  }

  private stripTransientState(state: PlannerState): PlannerState {
    return {
      ...structuredClone(state),
      blockDialogOpen: false,
      labelConfigOpen: false,
      inspectorOpen: false,
      savedPlansOpen: false,
    };
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
