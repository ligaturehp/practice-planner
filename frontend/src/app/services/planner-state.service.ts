import { computed, Injectable, signal } from '@angular/core';
import { createGrid, createId, createInitialState, rowLabelsForSport } from '../data/planner-defaults';
import { BlockLabelPreset, DayId, SavedPlan, Sport, TemplateId, TrainingBlock } from '../models/planner.models';
import { DesktopPlanStorageService } from './desktop-plan-storage.service';
import { ApiAuthService } from './api-auth.service';
import { ApiPlanStorageService } from './api-plan-storage.service';
import { PlannerCalculationsService } from './planner-calculations.service';

@Injectable({ providedIn: 'root' })
export class PlannerStateService {
  readonly state = signal(createInitialState());
  readonly savedPlans = signal<SavedPlan[]>([]);

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

  constructor(
    private readonly calculations: PlannerCalculationsService,
    private readonly storage: DesktopPlanStorageService,
    private readonly apiStorage: ApiPlanStorageService,
    readonly auth: ApiAuthService,
  ) {
    void this.bootstrapAccount();
  }

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

  toggleLabelConfig(): void {
    this.state.update((state) => ({ ...state, labelConfigOpen: !state.labelConfigOpen }));
  }

  upsertBlockLabelPreset(input: Omit<BlockLabelPreset, 'id'> & { id?: string }): BlockLabelPreset {
    const preset: BlockLabelPreset = {
      ...input,
      id: input.id || createId('preset'),
      label: input.label.trim() || 'Untitled label',
      tags: [...input.tags],
      exposures: [...input.exposures],
    };

    this.state.update((state) => {
      const exists = state.blockLabelPresets.some((item) => item.id === preset.id);
      return {
        ...state,
        blockLabelPresets: exists
          ? state.blockLabelPresets.map((item) => (item.id === preset.id ? preset : item))
          : [...state.blockLabelPresets, preset],
      };
    });

    return preset;
  }

  removeBlockLabelPreset(presetId: string): void {
    this.state.update((state) => ({
      ...state,
      blockLabelPresets: state.blockLabelPresets.filter((preset) => preset.id !== presetId),
    }));
  }

  toggleSavedPlans(): void {
    this.state.update((state) => ({ ...state, savedPlansOpen: !state.savedPlansOpen }));
  }

  async refreshSavedPlans(): Promise<void> {
    this.savedPlans.set(await this.activeStorage().listPlans());
  }

  async savePlan(name = 'Weekly plan'): Promise<SavedPlan> {
    const plan = await this.activeStorage().savePlan(name, this.state());
    const plans = [plan, ...this.savedPlans()].slice(0, 12);
    this.savedPlans.set(plans);
    return plan;
  }

  loadPlan(plan: SavedPlan): void {
    const loaded = structuredClone(plan.state);
    this.state.set({
      ...loaded,
      blockLabelPresets: loaded.blockLabelPresets || createInitialState().blockLabelPresets,
      blockDialogOpen: false,
      labelConfigOpen: false,
      savedPlansOpen: false,
    });
  }

  async deletePlan(planId: string): Promise<void> {
    await this.activeStorage().deletePlan(planId);
    const plans = this.savedPlans().filter((plan) => plan.id !== planId);
    this.savedPlans.set(plans);
  }

  print(): void {
    window.print();
  }

  async bootstrapAccount(): Promise<void> {
    await this.auth.bootstrap();
    await this.refreshSavedPlans();
  }

  async login(email: string, password: string): Promise<void> {
    await this.auth.login(email, password);
    await this.refreshSavedPlans();
  }

  async register(email: string, password: string): Promise<void> {
    await this.auth.register(email, password);
    await this.refreshSavedPlans();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.refreshSavedPlans();
  }

  private activeStorage(): Pick<DesktopPlanStorageService, 'listPlans' | 'savePlan' | 'deletePlan'> {
    return this.auth.status() === 'signed-in' ? this.apiStorage : this.storage;
  }

}
