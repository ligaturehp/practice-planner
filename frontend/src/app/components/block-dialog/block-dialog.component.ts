import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EXPOSURE_OPTIONS } from '../../data/planner-defaults';
import { WorkloadLabel } from '../../models/planner.models';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-block-dialog',
  imports: [CommonModule, FormsModule],
  templateUrl: './block-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockDialogComponent {
  readonly planner = inject(PlannerStateService);
  readonly exposureOptions = EXPOSURE_OPTIONS;

  name = 'Max velocity exposure';
  category = 'Speed';
  level: WorkloadLabel = 'Medium';
  minutes = 18;
  demand = 8;
  tags = 'max speed, full rest, field space';
  notes = 'Build full recovery between reps. Keep volume low if contact is high later in the week.';
  selectedExposures = new Set<string>(['Max sprint count']);

  toggleExposure(exposure: string, checked: boolean): void {
    if (checked) {
      this.selectedExposures.add(exposure);
    } else {
      this.selectedExposures.delete(exposure);
    }
  }

  isExposureSelected(exposure: string): boolean {
    return this.selectedExposures.has(exposure);
  }

  addBlock(): void {
    this.planner.addBlock({
      name: this.name,
      category: this.category,
      level: this.level,
      minutes: Number(this.minutes),
      demand: Number(this.demand),
      tags: this.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      exposures: [...this.selectedExposures],
      notes: this.notes,
    });

    this.planner.closeBlockDialog();
  }
}
