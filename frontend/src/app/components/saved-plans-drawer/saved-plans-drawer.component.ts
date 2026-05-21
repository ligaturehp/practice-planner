import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiAuthService } from '../../services/api-auth.service';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-saved-plans-drawer',
  imports: [DatePipe, FormsModule],
  templateUrl: './saved-plans-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedPlansDrawerComponent {
  readonly planner = inject(PlannerStateService);
  readonly api = inject(ApiAuthService);
  planName = 'Guest weekly plan';
  status = '';

  constructor() {
    effect(() => {
      if (this.api.currentUser()) {
        this.refreshCloudPlans();
      }
    });
  }

  savePlan(): void {
    const name = this.planName.trim() || 'Untitled weekly plan';
    const state = this.planner.state();

    if (!this.api.currentUser()) {
      this.planner.saveLocalPlan(name);
      this.status = 'Saved in this browser. Create an account to keep plans across devices.';
      return;
    }

    this.api.createPlan(name, state).subscribe({
      next: (plan) => {
        this.api.cloudPlans.update((plans) => [plan, ...plans.filter((item) => item.id !== plan.id)]);
        this.status = 'Plan saved to your account.';
      },
      error: () => {
        this.status = 'Cloud save failed. Check the API connection or try again.';
      },
    });
  }

  refreshCloudPlans(): void {
    this.api.listPlans().subscribe({
      next: () => {
        this.status = '';
      },
      error: () => {
        this.status = 'Could not load account plans.';
      },
    });
  }

  deleteCloudPlan(planId: string): void {
    this.api.deletePlan(planId).subscribe({
      next: () => {
        this.status = 'Plan deleted.';
      },
      error: () => {
        this.status = 'Could not delete that plan.';
      },
    });
  }
}
