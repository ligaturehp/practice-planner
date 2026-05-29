import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeekOrder } from '../../models/planner.models';
import { PlannerStateService } from '../../services/planner-state.service';

type ProfileSection = 'account' | 'teams' | 'plans' | 'preferences';

@Component({
  selector: 'app-saved-plans-drawer',
  imports: [DatePipe, FormsModule],
  templateUrl: './saved-plans-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedPlansDrawerComponent {
  readonly planner = inject(PlannerStateService);
  readonly profileSections: { id: ProfileSection; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'teams', label: 'Teams' },
    { id: 'plans', label: 'Plans' },
    { id: 'preferences', label: 'Preferences' },
  ];
  readonly weekOrderOptions: { value: WeekOrder; label: string; description: string }[] = [
    { value: 'mondayFirst', label: 'Monday first', description: 'Mon Tue Wed Thu Fri Sat Sun' },
    { value: 'sundayFirst', label: 'Sunday first', description: 'Sun Mon Tue Wed Thu Fri Sat' },
    { value: 'gameDayLast', label: 'Game day last', description: 'Build the week toward game day' },
  ];
  planName = 'Weekly plan';
  status = '';
  email = '';
  password = '';
  authMode: 'login' | 'register' = 'login';
  activeSection = signal<ProfileSection>('plans');
  historyPlanId = '';
  organizationName = 'New team';

  setActiveSection(section: ProfileSection): void {
    this.activeSection.set(section);
  }

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
      this.activeSection.set('preferences');
    } else {
      await this.planner.login(email, password);
      this.status = 'Signed in. Account plans loaded.';
      this.activeSection.set('plans');
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
    this.activeSection.set('account');
  }

  async updateWeekOrder(value: WeekOrder): Promise<void> {
    await this.planner.updateWeekOrder(value);
    this.status = 'Week order preference saved.';
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
