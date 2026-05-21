import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiAuthService } from '../../services/api-auth.service';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-auth-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPanelComponent {
  readonly planner = inject(PlannerStateService);
  readonly api = inject(ApiAuthService);

  mode: 'login' | 'register' = 'login';
  email = '';
  password = '';
  status = 'Guest mode active. Sign in when the API is available.';

  submit(): void {
    const request = this.mode === 'login' ? this.api.login(this.email, this.password) : this.api.register(this.email, this.password);

    request.subscribe({
      next: () => {
        this.status = 'Signed in.';
        this.api.listPlans().subscribe();
        this.planner.closeAuthPanel();
      },
      error: () => {
        this.status = `Could not reach ${this.api.apiBaseUrl}. Guest mode remains available.`;
      },
    });
  }
}
