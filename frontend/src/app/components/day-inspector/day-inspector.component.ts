import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BlockLabelPreset, WorkloadLabel } from '../../models/planner.models';
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

  editingPresetId = '';
  labelName = '';
  labelCategory = 'Speed';
  labelLevel: WorkloadLabel = 'Medium';
  labelMinutes = 20;
  labelDemand = 5;

  blockAu(block: { minutes: number; demand: number }): number {
    return this.calculations.getBlockAu(block);
  }

  presetAu(preset: Pick<BlockLabelPreset, 'minutes' | 'demand'>): number {
    return this.calculations.getBlockAu(preset);
  }

  editPreset(preset: BlockLabelPreset): void {
    this.editingPresetId = preset.id;
    this.labelName = preset.label;
    this.labelCategory = preset.category;
    this.labelLevel = preset.level;
    this.labelMinutes = preset.minutes;
    this.labelDemand = preset.demand;
  }

  resetPresetForm(): void {
    this.editingPresetId = '';
    this.labelName = '';
    this.labelCategory = 'Speed';
    this.labelLevel = 'Medium';
    this.labelMinutes = 20;
    this.labelDemand = 5;
  }

  savePreset(): void {
    const existing = this.planner.state().blockLabelPresets.find((preset) => preset.id === this.editingPresetId);
    this.planner.upsertBlockLabelPreset({
      id: this.editingPresetId || undefined,
      label: this.labelName,
      category: this.labelCategory,
      level: this.labelLevel,
      minutes: Number(this.labelMinutes),
      demand: Number(this.labelDemand),
      tags: existing?.tags || [],
      exposures: existing?.exposures || [],
      notes: existing?.notes || '',
    });
    this.resetPresetForm();
  }
}
