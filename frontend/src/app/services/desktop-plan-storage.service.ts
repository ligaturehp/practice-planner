import { Injectable } from '@angular/core';
import { PlanService } from '../../../bindings/practiceplannerdesktop';
import { createId } from '../data/planner-defaults';
import { PlannerState, SavedPlan } from '../models/planner.models';

const FALLBACK_SAVED_PLANS_KEY = 'practice-planner.saved-plans';

@Injectable({ providedIn: 'root' })
export class DesktopPlanStorageService {
  async listPlans(): Promise<SavedPlan[]> {
    try {
      return ((await PlanService.ListPlans()) ?? []) as SavedPlan[];
    } catch {
      return this.loadFallbackPlans();
    }
  }

  async savePlan(name: string, state: PlannerState): Promise<SavedPlan> {
    const cleanState = this.stripTransientState(state);

    try {
      return (await PlanService.SavePlan(
        name,
        cleanState as unknown as Record<string, unknown>,
      )) as SavedPlan;
    } catch {
      return this.saveFallbackPlan(name, cleanState);
    }
  }

  async deletePlan(planId: string): Promise<void> {
    try {
      await PlanService.DeletePlan(planId);
    } catch {
      this.deleteFallbackPlan(planId);
    }
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

  private loadFallbackPlans(): SavedPlan[] {
    try {
      const raw = localStorage.getItem(FALLBACK_SAVED_PLANS_KEY);
      return raw ? (JSON.parse(raw) as SavedPlan[]) : [];
    } catch {
      return [];
    }
  }

  private saveFallbackPlan(name: string, state: PlannerState): SavedPlan {
    const plan: SavedPlan = {
      id: createId('plan'),
      name,
      updatedAt: new Date().toISOString(),
      state,
    };
    const plans = [plan, ...this.loadFallbackPlans()].slice(0, 12);
    localStorage.setItem(FALLBACK_SAVED_PLANS_KEY, JSON.stringify(plans));
    return plan;
  }

  private deleteFallbackPlan(planId: string): void {
    const plans = this.loadFallbackPlans().filter((plan) => plan.id !== planId);
    localStorage.setItem(FALLBACK_SAVED_PLANS_KEY, JSON.stringify(plans));
  }
}
