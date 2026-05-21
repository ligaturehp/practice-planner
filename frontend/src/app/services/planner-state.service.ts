import { computed, Injectable, signal } from '@angular/core';
import { createGrid, createId, createInitialState, rowLabelsForSport } from '../data/planner-defaults';
import { DayId, SavedPlan, Sport, TemplateId, TrainingBlock } from '../models/planner.models';
import { PlannerCalculationsService } from './planner-calculations.service';

const SAVED_PLANS_KEY = 'practice-planner.saved-plans';

@Injectable({ providedIn: 'root' })
export class PlannerStateService {
  readonly state = signal(createInitialState());
  readonly savedPlans = signal<SavedPlan[]>(this.loadSavedPlans());

  readonly dayLevels = computed(() => this.calculations.getDayLevels(this.state()));
  readonly blockCellAuLevels = computed(() => this.calculations.getBlockCellAuLevels(this.state()));
  readonly selectedDay = computed(() => this.state().days.find((day) => day.id === this.state().selectedDay)!);
  readonly selectedBlocks = computed(() => this.state().blocks[this.state().selectedDay]);

  readonly selectedDaySummary = computed(() => {
    const state = this.state();
    const selectedDay = state.selectedDay;

    return {
      day: this.selectedDay(),
      au: this.calculations.getDayAu(state, selectedDay),
      level: this.dayLevels()[selectedDay],
      blockCount: state.blocks[selectedDay].length,
      exposureCount: new Set(state.blocks[selectedDay].flatMap((block) => block.exposures)).size,
    };
  });

  readonly weekSummary = computed(() => {
    const state = this.state();
    const totals = state.days.map((day) => ({ ...day, au: this.calculations.getDayAu(state, day.id) }));
    const totalAu = totals.reduce((sum, day) => sum + day.au, 0);
    const peak = totals.reduce((current, day) => (day.au > current.au ? day : current), totals[0]);

    return {
      totalAu,
      peakDay: peak.au > 0 ? `${peak.label} ${peak.au}` : 'None',
      exposureWatch: this.calculations.getExposureWatch(state),
    };
  });

  constructor(private readonly calculations: PlannerCalculationsService) {}

  selectDay(dayId: DayId): void {
    this.state.update((state) => ({ ...state, selectedDay: dayId }));
  }

  setSport(sport: Sport): void {
    this.state.update((state) => ({ ...state, sport, rowLabels: rowLabelsForSport(sport) }));
  }

  setTemplate(template: TemplateId): void {
    this.state.update((state) => ({ ...state, template, grid: createGrid(template) }));
  }

  updateCell(dayId: DayId, rowIndex: number, value: string): void {
    this.state.update((state) => ({
      ...state,
      grid: {
        ...state.grid,
        [dayId]: state.grid[dayId].map((cell, index) => (index === rowIndex ? value : cell)),
      },
    }));
  }

  updateDayFocus(value: string): void {
    const title = value.trim() || 'Untitled';

    this.state.update((state) => ({
      ...state,
      days: state.days.map((day) => (day.id === state.selectedDay ? { ...day, title } : day)),
    }));
  }

  addBlock(block: Omit<TrainingBlock, 'id'>): void {
    this.state.update((state) => ({
      ...state,
      blocks: {
        ...state.blocks,
        [state.selectedDay]: [...state.blocks[state.selectedDay], { ...block, id: createId('block') }],
      },
    }));
  }

  removeBlock(blockId: string): void {
    this.state.update((state) => ({
      ...state,
      blocks: {
        ...state.blocks,
        [state.selectedDay]: state.blocks[state.selectedDay].filter((block) => block.id !== blockId),
      },
    }));
  }

  clearSelectedDay(): void {
    this.state.update((state) => ({
      ...state,
      blocks: {
        ...state.blocks,
        [state.selectedDay]: [],
      },
    }));
  }

  openBlockDialog(): void {
    this.state.update((state) => ({ ...state, blockDialogOpen: true }));
  }

  closeBlockDialog(): void {
    this.state.update((state) => ({ ...state, blockDialogOpen: false }));
  }

  openAuthPanel(): void {
    this.state.update((state) => ({ ...state, authPanelOpen: true }));
  }

  closeAuthPanel(): void {
    this.state.update((state) => ({ ...state, authPanelOpen: false }));
  }

  toggleSavedPlans(): void {
    this.state.update((state) => ({ ...state, savedPlansOpen: !state.savedPlansOpen }));
  }

  saveLocalPlan(name = 'Guest plan'): void {
    const plan: SavedPlan = {
      id: createId('plan'),
      name,
      updatedAt: new Date().toISOString(),
      state: structuredClone(this.state()),
    };
    const plans = [plan, ...this.savedPlans()].slice(0, 12);
    this.savedPlans.set(plans);
    this.persistSavedPlans(plans);
  }

  loadPlan(plan: SavedPlan): void {
    this.state.set(structuredClone({ ...plan.state, blockDialogOpen: false, authPanelOpen: false }));
  }

  deletePlan(planId: string): void {
    const plans = this.savedPlans().filter((plan) => plan.id !== planId);
    this.savedPlans.set(plans);
    this.persistSavedPlans(plans);
  }

  print(): void {
    window.print();
  }

  private loadSavedPlans(): SavedPlan[] {
    try {
      const raw = localStorage.getItem(SAVED_PLANS_KEY);
      return raw ? (JSON.parse(raw) as SavedPlan[]) : [];
    } catch {
      return [];
    }
  }

  private persistSavedPlans(plans: SavedPlan[]): void {
    localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans));
  }
}
