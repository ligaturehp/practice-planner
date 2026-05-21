import { Injectable } from '@angular/core';
import { DAY_IDS, ROW_BLOCK_CATEGORIES } from '../data/planner-defaults';
import { DayId, PlannerState, TrainingBlock, WorkloadBand, WorkloadLabel } from '../models/planner.models';

const LEVEL_WORDS: Record<string, WorkloadBand> = {
  rest: 'neutral',
  easy: 'low',
  low: 'low',
  none: 'low',
  recovery: 'low',
  moderate: 'medium',
  medium: 'medium',
  build: 'medium',
  limited: 'medium',
  fast: 'high',
  high: 'high',
  contact: 'high',
  'full contact': 'high',
  max: 'max',
  game: 'max',
  'game contact': 'max',
};

const LEVEL_SCORES: Record<WorkloadBand, number> = {
  neutral: 0,
  low: 1,
  medium: 2,
  high: 3,
  max: 4,
};

@Injectable({ providedIn: 'root' })
export class PlannerCalculationsService {
  getBlockAu(block: Pick<TrainingBlock, 'minutes' | 'demand'>): number {
    return Number(block.minutes) * Number(block.demand);
  }

  getDayAu(state: Pick<PlannerState, 'blocks'>, dayId: DayId): number {
    return state.blocks[dayId].reduce((sum, block) => sum + this.getBlockAu(block), 0);
  }

  classifyCell(value: string): WorkloadBand {
    const normalized = value.trim().toLowerCase();
    const directMatch = LEVEL_WORDS[normalized];

    if (directMatch) return directMatch;
    if (normalized.includes('game')) return 'max';
    if (normalized.includes('full') || normalized.includes('high')) return 'high';
    if (normalized.includes('moderate') || normalized.includes('medium')) return 'medium';
    if (normalized.includes('low') || normalized.includes('easy') || normalized.includes('recovery')) return 'low';
    return 'neutral';
  }

  getDayKeywordScore(state: Pick<PlannerState, 'grid'>, dayId: DayId): number {
    return state.grid[dayId].reduce((sum, value) => sum + LEVEL_SCORES[this.classifyCell(value)], 0);
  }

  getDayEvaluationScore(state: Pick<PlannerState, 'blocks' | 'grid'>, dayId: DayId): number {
    const dayAu = this.getDayAu(state, dayId);
    const keywordScore = this.getDayKeywordScore(state, dayId);

    if (dayAu > 0) {
      return 10000 + dayAu + keywordScore * 2;
    }

    return keywordScore * 20;
  }

  getDayLevels(state: Pick<PlannerState, 'blocks' | 'grid'>): Record<DayId, WorkloadLabel> {
    const totals = DAY_IDS.map((id) => ({ id, score: this.getDayEvaluationScore(state, id) }));
    const nonZero = totals.filter((item) => item.score > 0).sort((a, b) => a.score - b.score);

    if (nonZero.length === 0) {
      return Object.fromEntries(DAY_IDS.map((id) => [id, 'Low'])) as Record<DayId, WorkloadLabel>;
    }

    return Object.fromEntries(
      totals.map((item) => {
        if (item.score === 0) return [item.id, 'Low'];

        const rank = nonZero.findIndex((entry) => entry.id === item.id);
        const percentile = (rank + 1) / nonZero.length;

        if (percentile <= 1 / 3) return [item.id, 'Low'];
        if (percentile <= 2 / 3) return [item.id, 'Medium'];
        return [item.id, 'High'];
      }),
    ) as Record<DayId, WorkloadLabel>;
  }

  getBlocksForGridCell(state: Pick<PlannerState, 'blocks'>, dayId: DayId, label: string): TrainingBlock[] {
    const categories = ROW_BLOCK_CATEGORIES[label] || [];
    return state.blocks[dayId].filter((block) => categories.includes(block.category));
  }

  getBlockCellAuLevels(state: Pick<PlannerState, 'blocks' | 'rowLabels'>): Record<string, Exclude<WorkloadBand, 'max' | 'neutral'>> {
    const cellTotals: { key: string; total: number }[] = [];

    state.rowLabels.forEach((label) => {
      DAY_IDS.forEach((dayId) => {
        const total = this.getBlocksForGridCell(state, dayId, label).reduce((sum, block) => sum + this.getBlockAu(block), 0);

        if (total > 0) {
          cellTotals.push({ key: `${dayId}:${label}`, total });
        }
      });
    });

    const sorted = [...cellTotals].sort((a, b) => a.total - b.total);

    return Object.fromEntries(
      cellTotals.map((cell) => {
        const rank = sorted.findIndex((entry) => entry.key === cell.key);
        const percentile = (rank + 1) / sorted.length;

        if (percentile <= 1 / 3) return [cell.key, 'low'];
        if (percentile <= 2 / 3) return [cell.key, 'medium'];
        return [cell.key, 'high'];
      }),
    );
  }

  countExposures(state: Pick<PlannerState, 'blocks'>): Record<string, number> {
    return Object.values(state.blocks)
      .flat()
      .flatMap((block) => block.exposures)
      .reduce<Record<string, number>>((counts, exposure) => {
        counts[exposure] = (counts[exposure] || 0) + 1;
        return counts;
      }, {});
  }

  getExposureWatch(state: Pick<PlannerState, 'blocks'>): string {
    const stacked = Object.entries(this.countExposures(state)).filter(([, count]) => count >= 2);
    return stacked.length ? `${stacked[0][0]} x${stacked[0][1]}` : 'Balanced';
  }
}
