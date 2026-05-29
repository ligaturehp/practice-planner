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
  historyPlanId = '';
  organizationName = 'New team';

  async savePlan(): Promise<void> {
    const name = this.planName.trim() || 'Untitled weekly plan';
    await this.planner.savePlan(name);
    this.status = this.planner.auth.status() === 'signed-in' ? 'Plan saved to your account.' : 'Guest draft saved in this browser.';
  }

  async deletePlan(planId: string): Promise<void> {
    await this.planner.deletePlan(planId);
    this.status = 'Plan deleted.';
  }

  async showHistory(planId: string): Promise<void> {
    this.historyPlanId = this.historyPlanId === planId ? '' : planId;
    if (this.historyPlanId) {
      await this.planner.refreshPlanVersions(planId);
    }
  }

  async restoreVersion(planId: string, versionId: string): Promise<void> {
    await this.planner.restoreVersion(planId, versionId);
    this.status = 'Plan version restored.';
  }

  async duplicatePlan(planId: string, name: string): Promise<void> {
    await this.planner.duplicatePlan(planId, `${name} copy`);
    this.status = 'Plan duplicated.';
  }

  async createShareLink(planId: string): Promise<void> {
    await this.planner.createShareLink(planId);
    this.status = 'Share link created.';
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

  async createOrganization(): Promise<void> {
    const name = this.organizationName.trim() || 'New team';
    await this.planner.createOrganization(name);
    this.status = 'Team created.';
    this.organizationName = 'New team';
  }

  async logout(): Promise<void> {
    await this.planner.logout();
    this.status = 'Signed out. Guest drafts are saved in this browser.';
  }

  autosaveLabel(): string {
    switch (this.planner.autosaveStatus()) {
      case 'saving':
        return 'saving';
      case 'saved':
        return 'saved';
      case 'failed':
        return 'needs attention';
      case 'conflict':
        return 'reload needed';
      default:
        return 'idle';
    }
  }
}
