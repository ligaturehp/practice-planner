import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlannerCalculationsService } from '../../services/planner-calculations.service';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-day-inspector',
  imports: [CommonModule, FormsModule],
  templateUrl: './day-inspector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayInspectorComponent {
  readonly planner = inject(PlannerStateService);
  private readonly calculations = inject(PlannerCalculationsService);

  blockAu(block: { minutes: number; demand: number }): number {
    return this.calculations.getBlockAu(block);
  }
}
