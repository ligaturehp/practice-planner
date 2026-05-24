import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiPlan, PlannerState, SavedPlan } from '../models/planner.models';
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

  async savePlan(name: string, state: PlannerState): Promise<SavedPlan> {
    const cleanState = this.stripTransientState(state);
    const csrfToken = await this.auth.csrfToken();
    const response = await firstValueFrom(
      this.http.post<{ plan: ApiPlan }>(
        this.url('/api/plans'),
        {
          name,
          sport: cleanState.sport,
          template: cleanState.template,
          plan_json: cleanState,
        },
        { headers: { 'X-CSRF-Token': csrfToken }, withCredentials: true },
      ),
    );
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

  private fromApiPlan(plan: ApiPlan): SavedPlan {
    return {
      id: plan.id,
      name: plan.name,
      updatedAt: plan.updated_at,
      state: plan.plan_json,
    };
  }

  private stripTransientState(state: PlannerState): PlannerState {
    return {
      ...structuredClone(state),
      blockDialogOpen: false,
      labelConfigOpen: false,
      savedPlansOpen: false,
    };
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }
}
