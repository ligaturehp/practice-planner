import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-saved-plans-drawer',
  imports: [DatePipe, FormsModule],
  templateUrl: './saved-plans-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedPlansDrawerComponent {
  readonly planner = inject(PlannerStateService);
  planName = 'Weekly plan';
  status = '';
  email = '';
  password = '';
  authMode: 'login' | 'register' = 'login';

  async savePlan(): Promise<void> {
    const name = this.planName.trim() || 'Untitled weekly plan';
    await this.planner.savePlan(name);
    this.status = this.planner.auth.status() === 'signed-in' ? 'Plan saved to your account.' : 'Guest draft saved in this browser.';
  }

  async deletePlan(planId: string): Promise<void> {
    await this.planner.deletePlan(planId);
    this.status = 'Plan deleted.';
  }

  async submitAccount(): Promise<void> {
    const email = this.email.trim();
    const password = this.password;
    if (this.authMode === 'register') {
      await this.planner.register(email, password);
      this.status = 'Account created. Plans now save to your account.';
    } else {
      await this.planner.login(email, password);
      this.status = 'Signed in. Account plans loaded.';
    }
    this.password = '';
  }

  async logout(): Promise<void> {
    await this.planner.logout();
    this.status = 'Signed out. Guest drafts are saved in this browser.';
  }
}
