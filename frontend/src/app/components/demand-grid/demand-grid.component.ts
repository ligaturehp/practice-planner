import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DayId } from '../../models/planner.models';
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
  private readonly calculations = inject(PlannerCalculationsService);

  levelClass(value: string, blockLevel?: string): string {
    return `level-${blockLevel || this.calculations.classifyCell(value)}`;
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
