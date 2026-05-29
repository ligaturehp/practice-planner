import { computed, Injectable, signal } from '@angular/core';
import {
  createCellDemands,
  createGrid,
  createId,
  createInitialState,
  orderedDays,
  rowLabelsForSport,
} from '../data/planner-defaults';
import {
  BlockLabelPreset,
  DayId,
  DayReadiness,
  Organization,
  PlanShare,
  PlanVersion,
  SavedPlan,
  Sport,
  TemplateId,
  TrainingBlock,
  UserPreferences,
  WeekOrder,
} from '../models/planner.models';
import { DesktopPlanStorageService } from './desktop-plan-storage.service';
import { ApiAuthService } from './api-auth.service';
import { ApiOrganizationService } from './api-organization.service';
import { ApiPlanStorageService } from './api-plan-storage.service';
import { ApiUserPreferencesService } from './api-user-preferences.service';
import { PlannerCalculationsService } from './planner-calculations.service';

@Injectable({ providedIn: 'root' })
export class PlannerStateService {
  readonly state = signal(createInitialState());
  readonly savedPlans = signal<SavedPlan[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly planVersions = signal<PlanVersion[]>([]);
  readonly planShares = signal<Record<string, PlanShare>>({});
  readonly userPreferences = signal<UserPreferences>({ weekOrder: 'mondayFirst', updatedAt: '' });
  readonly autosaveStatus = signal<'idle' | 'saving' | 'saved' | 'failed' | 'conflict'>('idle');
  readonly activeAccountPlan = signal<{ id: string; name: string; lockVersion?: number } | null>(
    null,
  );

  readonly dayLevels = computed(() => this.calculations.getDayLevels(this.state()));
  readonly blockCellAuLevels = computed(() => this.calculations.getBlockCellAuLevels(this.state()));
  readonly displayDays = computed(() =>
    orderedDays(this.state().days, this.userPreferences().weekOrder, this.state().template),
  );
  readonly selectedDay = computed(
    () => this.state().days.find((day) => day.id === this.state().selectedDay)!,
  );
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
    const totals = state.days.map((day) => ({
      ...day,
      au: this.calculations.getDayAu(state, day.id),
    }));
    const totalAu = totals.reduce((sum, day) => sum + day.au, 0);
    const peak = totals.reduce((current, day) => (day.au > current.au ? day : current), totals[0]);

    return {
      totalAu,
      peakDay: peak.au > 0 ? `${peak.label} ${peak.au}` : 'None',
      exposureWatch: this.calculations.getExposureWatch(state),
    };
  });

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressAutosave = false;

  constructor(
    private readonly calculations: PlannerCalculationsService,
    private readonly storage: DesktopPlanStorageService,
    private readonly apiStorage: ApiPlanStorageService,
    private readonly organizationsApi: ApiOrganizationService,
    private readonly userPreferencesApi: ApiUserPreferencesService,
    readonly auth: ApiAuthService,
  ) {
    void this.bootstrapAccount();
  }

  selectDay(dayId: DayId): void {
    this.state.update((state) => ({ ...state, selectedDay: dayId }));
  }

  setSport(sport: Sport): void {
    this.state.update((state) => ({ ...state, sport, rowLabels: rowLabelsForSport(sport) }));
    this.queueAutosave();
  }

  setTemplate(template: TemplateId): void {
    this.state.update((state) => ({
      ...state,
      template,
      grid: createGrid(template),
      cellDemands: createCellDemands(template, state.sport),
    }));
    this.queueAutosave();
  }

  updateCell(dayId: DayId, rowIndex: number, value: string): void {
    this.state.update((state) => ({
      ...state,
      grid: {
        ...state.grid,
        [dayId]: state.grid[dayId].map((cell, index) => (index === rowIndex ? value : cell)),
      },
    }));
    this.queueAutosave();
  }

  updateCellDemand(dayId: DayId, rowIndex: number, demand: number): void {
    const cleanDemand = Math.max(0, Math.min(4, Number(demand)));
    this.state.update((state) => ({
      ...state,
      cellDemands: {
        ...state.cellDemands,
        [dayId]: state.cellDemands[dayId].map((value, index) =>
          index === rowIndex ? cleanDemand : value,
        ),
      },
    }));
    this.queueAutosave();
  }

  updateDayFocus(value: string): void {
    const title = value.trim() || 'Untitled';

    this.updateSelectedDayDetails({ title });
  }

  updateSelectedDayDetails(
    patch: Partial<{
      title: string;
      objective: string;
      readiness: DayReadiness;
      constraints: string;
      notes: string;
    }>,
  ): void {
    this.state.update((state) => ({
      ...state,
      days: state.days.map((day) => (day.id === state.selectedDay ? { ...day, ...patch } : day)),
    }));
    this.queueAutosave();
  }

  addBlock(block: Omit<TrainingBlock, 'id'>): void {
    this.state.update((state) => ({
      ...state,
      blocks: {
        ...state.blocks,
        [state.selectedDay]: [
          ...state.blocks[state.selectedDay],
          { ...block, id: createId('block') },
        ],
      },
    }));
    this.queueAutosave();
  }

  removeBlock(blockId: string): void {
    this.state.update((state) => ({
      ...state,
      blocks: {
        ...state.blocks,
        [state.selectedDay]: state.blocks[state.selectedDay].filter(
          (block) => block.id !== blockId,
        ),
      },
    }));
    this.queueAutosave();
  }

  clearSelectedDay(): void {
    this.state.update((state) => ({
      ...state,
      blocks: {
        ...state.blocks,
        [state.selectedDay]: [],
      },
    }));
    this.queueAutosave();
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
    this.queueAutosave();

    return preset;
  }

  removeBlockLabelPreset(presetId: string): void {
    this.state.update((state) => ({
      ...state,
      blockLabelPresets: state.blockLabelPresets.filter((preset) => preset.id !== presetId),
    }));
    this.queueAutosave();
  }

  toggleSavedPlans(): void {
    this.state.update((state) => ({ ...state, savedPlansOpen: !state.savedPlansOpen }));
  }

  openInspector(): void {
    this.state.update((state) => ({ ...state, inspectorOpen: true }));
  }

  closeInspector(): void {
    this.state.update((state) => ({ ...state, inspectorOpen: false }));
  }

  async refreshSavedPlans(): Promise<void> {
    this.savedPlans.set(await this.activeStorage().listPlans());
  }

  async savePlan(name = 'Weekly plan'): Promise<SavedPlan> {
    const activeAccountPlan = this.auth.status() === 'signed-in' ? this.activeAccountPlan() : null;
    const plan =
      this.auth.status() === 'signed-in'
        ? await this.apiStorage.savePlan(name, this.state(), activeAccountPlan || undefined)
        : await this.storage.savePlan(name, this.state());
    this.rememberSavedPlan(plan);
    if (this.auth.status() === 'signed-in') {
      this.activeAccountPlan.set({ id: plan.id, name: plan.name, lockVersion: plan.lockVersion });
      this.autosaveStatus.set('saved');
    }
    return plan;
  }

  loadPlan(plan: SavedPlan): void {
    const loaded = this.normalizeLoadedState(structuredClone(plan.state));
    this.suppressAutosave = true;
    try {
      this.state.set({
        ...loaded,
        blockDialogOpen: false,
        labelConfigOpen: false,
        inspectorOpen: false,
        savedPlansOpen: false,
      });
      if (this.auth.status() === 'signed-in' && plan.lockVersion) {
        this.activeAccountPlan.set({ id: plan.id, name: plan.name, lockVersion: plan.lockVersion });
        this.autosaveStatus.set('saved');
      } else {
        this.activeAccountPlan.set(null);
        this.autosaveStatus.set('idle');
      }
    } finally {
      this.suppressAutosave = false;
    }
  }

  async deletePlan(planId: string): Promise<void> {
    await this.activeStorage().deletePlan(planId);
    const plans = this.savedPlans().filter((plan) => plan.id !== planId);
    this.savedPlans.set(plans);
    if (this.activeAccountPlan()?.id === planId) {
      this.activeAccountPlan.set(null);
      this.planVersions.set([]);
      this.autosaveStatus.set('idle');
    }
  }

  print(): void {
    window.print();
  }

  async bootstrapAccount(): Promise<void> {
    await this.auth.bootstrap();
    await this.refreshUserPreferences();
    await this.refreshOrganizations();
    await this.refreshSavedPlans();
  }

  async login(email: string, password: string): Promise<void> {
    await this.auth.login(email, password);
    await this.refreshUserPreferences();
    await this.refreshOrganizations();
    await this.refreshSavedPlans();
  }

  async register(email: string, password: string): Promise<void> {
    await this.auth.register(email, password);
    await this.refreshUserPreferences();
    await this.refreshOrganizations();
    await this.refreshSavedPlans();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.activeAccountPlan.set(null);
    this.planVersions.set([]);
    this.organizations.set([]);
    this.userPreferences.set({ weekOrder: 'mondayFirst', updatedAt: '' });
    this.autosaveStatus.set('idle');
    await this.refreshSavedPlans();
  }

  async refreshUserPreferences(): Promise<void> {
    if (this.auth.status() !== 'signed-in') {
      this.userPreferences.set({ weekOrder: 'mondayFirst', updatedAt: '' });
      return;
    }
    this.userPreferences.set(await this.userPreferencesApi.getPreferences());
  }

  async updateWeekOrder(weekOrder: WeekOrder): Promise<void> {
    if (this.auth.status() !== 'signed-in') {
      this.userPreferences.set({ weekOrder, updatedAt: '' });
      return;
    }
    this.userPreferences.set(await this.userPreferencesApi.updateWeekOrder(weekOrder));
  }

  async refreshOrganizations(): Promise<void> {
    if (this.auth.status() !== 'signed-in') {
      this.organizations.set([]);
      return;
    }
    this.organizations.set(await this.organizationsApi.listOrganizations());
  }

  async createOrganization(name: string): Promise<Organization> {
    const organization = await this.organizationsApi.createOrganization(name);
    this.organizations.set([...this.organizations(), organization]);
    return organization;
  }

  async refreshPlanVersions(planId: string): Promise<void> {
    if (this.auth.status() !== 'signed-in') {
      this.planVersions.set([]);
      return;
    }
    this.planVersions.set(await this.apiStorage.listPlanVersions(planId));
  }

  async restoreVersion(planId: string, versionId: string): Promise<SavedPlan> {
    const plan = await this.apiStorage.restorePlanVersion(planId, versionId);
    this.rememberSavedPlan(plan);
    this.loadPlan(plan);
    this.state.update((state) => ({ ...state, savedPlansOpen: true }));
    await this.refreshPlanVersions(plan.id);
    return plan;
  }

  async duplicatePlan(planId: string, name: string): Promise<SavedPlan> {
    const plan = await this.apiStorage.duplicatePlan(
      planId,
      name.trim() || 'Duplicated weekly plan',
    );
    this.rememberSavedPlan(plan);
    this.loadPlan(plan);
    this.state.update((state) => ({ ...state, savedPlansOpen: true }));
    await this.refreshPlanVersions(plan.id);
    return plan;
  }

  async createShareLink(planId: string): Promise<PlanShare> {
    const share = await this.apiStorage.createShareLink(planId);
    this.planShares.update((shares) => ({ ...shares, [planId]: share }));
    return share;
  }

  exportCSVUrl(planId: string): string {
    return this.apiStorage.exportCSVUrl(planId);
  }

  private activeStorage(): Pick<
    DesktopPlanStorageService,
    'listPlans' | 'savePlan' | 'deletePlan'
  > {
    return this.auth.status() === 'signed-in' ? this.apiStorage : this.storage;
  }

  private rememberSavedPlan(plan: SavedPlan): void {
    const plans = [plan, ...this.savedPlans().filter((saved) => saved.id !== plan.id)].slice(0, 12);
    this.savedPlans.set(plans);
  }

  private normalizeLoadedState(loaded: SavedPlan['state']): SavedPlan['state'] {
    const defaults = createInitialState();
    const defaultDays = new Map(defaults.days.map((day) => [day.id, day]));
    return {
      ...loaded,
      days: loaded.days.map((day) => ({
        ...defaultDays.get(day.id)!,
        ...day,
        objective: day.objective || '',
        readiness: day.readiness || 'standard',
        constraints: day.constraints || '',
        notes: day.notes || '',
      })),
      blockLabelPresets: loaded.blockLabelPresets || defaults.blockLabelPresets,
      cellDemands: loaded.cellDemands || createCellDemands(loaded.template, loaded.sport),
    };
  }

  private queueAutosave(): void {
    if (this.suppressAutosave || this.auth.status() !== 'signed-in' || !this.activeAccountPlan()) {
      return;
    }
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    this.autosaveStatus.set('saving');
    this.autosaveTimer = setTimeout(() => {
      void this.flushAutosave();
    }, 500);
  }

  private async flushAutosave(): Promise<void> {
    const activePlan = this.activeAccountPlan();
    if (!activePlan || this.auth.status() !== 'signed-in') {
      this.autosaveStatus.set('idle');
      return;
    }
    try {
      const saved = await this.apiStorage.savePlan(activePlan.name, this.state(), activePlan);
      this.activeAccountPlan.set({
        id: saved.id,
        name: saved.name,
        lockVersion: saved.lockVersion,
      });
      this.rememberSavedPlan(saved);
      this.autosaveStatus.set('saved');
    } catch (error) {
      this.autosaveStatus.set('failed');
    }
  }
}
