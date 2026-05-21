import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiPlan, AuthUser, PlannerState, SavedPlan } from '../models/planner.models';

interface AuthResponse {
  user: AuthUser;
}

interface PlanResponse {
  plan: ApiPlan;
}

interface PlansResponse {
  plans: ApiPlan[];
}

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  readonly apiBaseUrl = environment.apiBaseUrl;
  readonly currentUser = signal<AuthUser | null>(null);
  readonly cloudPlans = signal<SavedPlan[]>([]);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/api/auth/login`, { email, password }, { withCredentials: true })
      .pipe(tap((response) => this.currentUser.set(response.user)));
  }

  register(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiBaseUrl}/api/auth/register`, { email, password }, { withCredentials: true })
      .pipe(tap((response) => this.currentUser.set(response.user)));
  }

  me(): Observable<AuthResponse> {
    return this.http.get<AuthResponse>(`${this.apiBaseUrl}/api/auth/me`, { withCredentials: true }).pipe(tap((response) => this.currentUser.set(response.user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiBaseUrl}/api/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.cloudPlans.set([]);
      }),
    );
  }

  listPlans(): Observable<SavedPlan[]> {
    return this.http.get<PlansResponse>(`${this.apiBaseUrl}/api/plans`, { withCredentials: true }).pipe(
      map((response) => response.plans.map((plan) => this.fromApiPlan(plan))),
      tap((plans) => this.cloudPlans.set(plans)),
    );
  }

  createPlan(name: string, state: PlannerState): Observable<SavedPlan> {
    return this.http
      .post<PlanResponse>(`${this.apiBaseUrl}/api/plans`, this.toPlanInput(name, state), { withCredentials: true })
      .pipe(map((response) => this.fromApiPlan(response.plan)));
  }

  updatePlan(planId: string, name: string, state: PlannerState): Observable<SavedPlan> {
    return this.http
      .put<PlanResponse>(`${this.apiBaseUrl}/api/plans/${planId}`, this.toPlanInput(name, state), { withCredentials: true })
      .pipe(map((response) => this.fromApiPlan(response.plan)));
  }

  deletePlan(planId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/api/plans/${planId}`, { withCredentials: true }).pipe(
      tap(() => {
        this.cloudPlans.update((plans) => plans.filter((plan) => plan.id !== planId));
      }),
    );
  }

  private toPlanInput(name: string, state: PlannerState): { name: string; sport: string; template: string; plan_json: PlannerState } {
    return {
      name,
      sport: state.sport,
      template: state.template,
      plan_json: this.stripTransientState(state),
    };
  }

  private fromApiPlan(plan: ApiPlan): SavedPlan {
    return {
      id: plan.id,
      name: plan.name,
      updatedAt: plan.updated_at,
      state: this.stripTransientState(plan.plan_json),
    };
  }

  private stripTransientState(state: PlannerState): PlannerState {
    return {
      ...structuredClone(state),
      blockDialogOpen: false,
      authPanelOpen: false,
      savedPlansOpen: false,
    };
  }
}
