import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlockDialogComponent } from '../block-dialog/block-dialog.component';
import { DayInspectorComponent } from '../day-inspector/day-inspector.component';
import { DemandGridComponent } from '../demand-grid/demand-grid.component';
import { SavedPlansDrawerComponent } from '../saved-plans-drawer/saved-plans-drawer.component';
import { Sport, TemplateId } from '../../models/planner.models';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-planner-shell',
  imports: [FormsModule, DemandGridComponent, DayInspectorComponent, BlockDialogComponent, SavedPlansDrawerComponent],
  templateUrl: './planner-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerShellComponent {
  readonly planner = inject(PlannerStateService);

  setSport(value: string): void {
    this.planner.setSport(value as Sport);
  }

  setTemplate(value: string): void {
    this.planner.setTemplate(value as TemplateId);
  }
}
