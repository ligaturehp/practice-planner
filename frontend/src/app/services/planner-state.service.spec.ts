import { TestBed } from '@angular/core/testing';
import { createInitialState } from '../data/planner-defaults';
import { ApiAuthService } from './api-auth.service';
import { ApiOrganizationService } from './api-organization.service';
import { ApiPlanStorageService } from './api-plan-storage.service';
import { DesktopPlanStorageService } from './desktop-plan-storage.service';
import { PlannerStateService } from './planner-state.service';
import { vi } from 'vitest';

describe('PlannerStateService autosave', () => {
  let service: PlannerStateService;
  let apiStorage: Pick<ApiPlanStorageService, 'listPlans' | 'savePlan' | 'deletePlan'>;
  let auth: {
    status: ReturnType<typeof vi.fn>;
    bootstrap: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useRealTimers();
    apiStorage = {
      listPlans: vi.fn().mockResolvedValue([]),
      savePlan: vi.fn(async (name, state, remotePlan) => ({
        id: remotePlan?.id || 'plan-1',
        name,
        updatedAt: '2026-05-24T00:00:00Z',
        lockVersion: (remotePlan?.lockVersion || 0) + 1,
        state: structuredClone(state),
      })),
      deletePlan: vi.fn(),
    };

    auth = {
      status: vi.fn().mockReturnValue('signed-in'),
      bootstrap: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiPlanStorageService, useValue: apiStorage },
        { provide: ApiOrganizationService, useValue: { listOrganizations: vi.fn().mockResolvedValue([]), createOrganization: vi.fn() } },
        { provide: ApiAuthService, useValue: auth },
        { provide: DesktopPlanStorageService, useValue: { listPlans: vi.fn(), savePlan: vi.fn(), deletePlan: vi.fn() } },
      ],
    });

    service = TestBed.inject(PlannerStateService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('autosaves signed-in changes after an account plan has been saved', async () => {
    vi.useFakeTimers();
    const saved = await service.savePlan('Week 1');
    expect(saved.lockVersion).toBe(1);
    vi.mocked(apiStorage.savePlan).mockClear();

    service.updateDayFocus('Install polish');
    await vi.advanceTimersByTimeAsync(650);

    expect(apiStorage.savePlan).toHaveBeenCalledWith(
      'Week 1',
      expect.objectContaining({ days: expect.any(Array) }),
      { id: 'plan-1', name: 'Week 1', lockVersion: 1 },
    );
    expect(service.autosaveStatus()).toBe('saved');
    expect(service.activeAccountPlan()?.lockVersion).toBe(2);
  });

  it('does not autosave before a signed-in account plan is saved or loaded', async () => {
    vi.useFakeTimers();
    service.updateCell('mon', 0, 'Build');
    await vi.advanceTimersByTimeAsync(650);

    expect(apiStorage.savePlan).not.toHaveBeenCalled();
    expect(service.autosaveStatus()).toBe('idle');
  });

  it('updates planning-cell labels and demand scores separately', () => {
    service.updateCell('mon', 0, 'Tempo');
    service.updateCellDemand('mon', 0, 3);

    expect(service.state().grid.mon[0]).toBe('Tempo');
    expect(service.state().cellDemands.mon[0]).toBe(3);
  });

  it('keeps the day inspector collapsed until opened', () => {
    expect(service.state().inspectorOpen).toBe(false);

    service.openInspector();
    expect(service.state().inspectorOpen).toBe(true);

    service.closeInspector();
    expect(service.state().inspectorOpen).toBe(false);
  });

  it('sets the active account plan when loading a server-backed plan', () => {
    const state = createInitialState();
    service.loadPlan({
      id: 'plan-1',
      name: 'Week 1',
      updatedAt: '2026-05-24T00:00:00Z',
      lockVersion: 7,
      state,
    });

    expect(service.activeAccountPlan()).toEqual({ id: 'plan-1', name: 'Week 1', lockVersion: 7 });
  });
});
