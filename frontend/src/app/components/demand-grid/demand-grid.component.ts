import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cellIntentOptions, demandForCellIntent } from '../../data/planner-defaults';
import { DayId, WorkloadBand } from '../../models/planner.models';
import { PlannerCalculationsService } from '../../services/planner-calculations.service';
import { PlannerStateService } from '../../services/planner-state.service';

@Component({
  selector: 'app-demand-grid',
  imports: [CommonModule, FormsModule],
  templateUrl: './demand-grid.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandGridComponent {
  readonly planner = inject(PlannerStateService);
  readonly demandOptions = [
    { value: 0, label: 'Off' },
    { value: 1, label: 'Low' },
    { value: 2, label: 'Moderate' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Max' },
  ];
  private readonly calculations = inject(PlannerCalculationsService);
  selectedCell: { dayId: DayId; rowIndex: number } | null = null;
  intentDraft = '';

  levelClass(value: string, demand: number, blockLevel?: string): string {
    return `level-${blockLevel || this.calculations.classifyCellDemand(demand) || this.calculations.classifyCell(value)}`;
  }

  selectCell(dayId: DayId, rowIndex: number): void {
    if (!this.isSelectedCell(dayId, rowIndex)) {
      this.intentDraft = this.planner.state().grid[dayId][rowIndex];
    }
    this.selectedCell = { dayId, rowIndex };
    this.planner.selectDay(dayId);
  }

  isSelectedCell(dayId: DayId, rowIndex: number): boolean {
    return this.selectedCell?.dayId === dayId && this.selectedCell.rowIndex === rowIndex;
  }

  updateIntent(dayId: DayId, rowIndex: number, value: string): void {
    this.selectCell(dayId, rowIndex);
    this.commitIntent(dayId, rowIndex, value);
  }

  updateIntentDraft(value: string): void {
    this.intentDraft = value;
  }

  commitIntent(dayId: DayId, rowIndex: number, value: string): void {
    const cleanValue = value.trim() || '-';
    this.intentDraft = cleanValue;
    if (this.planner.state().grid[dayId][rowIndex] === cleanValue) {
      return;
    }
    this.planner.updateCell(dayId, rowIndex, cleanValue);
    this.planner.updateCellDemand(dayId, rowIndex, demandForCellIntent(cleanValue, this.planner.state().rowLabels[rowIndex]));
  }

  collapseCell(dayId: DayId, rowIndex: number): void {
    this.commitIntent(dayId, rowIndex, this.intentDraft);
    this.selectedCell = null;
  }

  demandBand(demand: number): WorkloadBand {
    return this.calculations.classifyCellDemand(demand);
  }

  demandLabel(demand: number): string {
    return this.demandOptions.find((option) => option.value === demand)?.label || 'Off';
  }

  demandForIntent(value: string, label: string): number {
    return demandForCellIntent(value, label);
  }

  updateCellDemand(dayId: DayId, rowIndex: number, demand: number): void {
    this.selectCell(dayId, rowIndex);
    this.planner.updateCellDemand(dayId, rowIndex, demand);
  }

  intentOptions(label: string): string[] {
    return cellIntentOptions(label);
  }

  filteredIntentOptions(label: string): string[] {
    const query = this.intentDraft.trim().toLowerCase();
    const options = this.intentOptions(label);
    const currentValue =
      this.selectedCell && this.planner.state().grid[this.selectedCell.dayId][this.selectedCell.rowIndex].trim().toLowerCase();
    if (!query || query === currentValue) return options;
    return options.filter((option) => option.toLowerCase().includes(query));
  }

  cellBlocks(dayId: DayId, label: string) {
    return this.calculations.getBlocksForGridCell(this.planner.state(), dayId, label);
  }

  dayAu(dayId: DayId): number {
    return this.calculations.getDayAu(this.planner.state(), dayId);
  }

  blockAu(block: { minutes: number; demand: number }): number {
    return this.calculations.getBlockAu(block);
  }

  totalBlockAu(blocks: { minutes: number; demand: number }[]): number {
    return blocks.reduce((sum, block) => sum + this.blockAu(block), 0);
  }
}
