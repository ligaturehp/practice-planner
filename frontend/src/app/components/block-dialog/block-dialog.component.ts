import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EXPOSURE_OPTIONS } from '../../data/planner-defaults';
import { BlockLabelPreset, WorkloadLabel } from '../../models/planner.models';
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

  name = '';
  category = 'Speed';
  level: WorkloadLabel = 'Medium';
  minutes = 18;
  demand = 8;
  tags = '';
  notes = '';
  selectedExposures = new Set<string>();

  onNameChange(value: string): void {
    this.name = value;
    const preset = this.planner.state().blockLabelPresets.find((item) => item.label.toLowerCase() === value.trim().toLowerCase());

    if (preset) {
      this.applyPreset(preset);
    }
  }

  applyPreset(preset: BlockLabelPreset): void {
    this.name = preset.label;
    this.category = preset.category;
    this.level = preset.level;
    this.minutes = preset.minutes;
    this.demand = preset.demand;
    this.tags = preset.tags.join(', ');
    this.notes = preset.notes;
    this.selectedExposures = new Set(preset.exposures);
  }

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
