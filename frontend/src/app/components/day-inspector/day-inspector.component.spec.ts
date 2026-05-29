import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiAuthService } from '../../services/api-auth.service';
import { ApiOrganizationService } from '../../services/api-organization.service';
import { ApiPlanStorageService } from '../../services/api-plan-storage.service';
import { ApiUserPreferencesService } from '../../services/api-user-preferences.service';
import { DesktopPlanStorageService } from '../../services/desktop-plan-storage.service';
import { PlannerStateService } from '../../services/planner-state.service';
import { DayInspectorComponent } from './day-inspector.component';

describe('DayInspectorComponent', () => {
  let fixture: ComponentFixture<DayInspectorComponent>;
  let planner: PlannerStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayInspectorComponent],
      providers: [
        {
          provide: ApiAuthService,
          useValue: {
            status: vi.fn().mockReturnValue('signed-out'),
            bootstrap: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ApiOrganizationService,
          useValue: {
            listOrganizations: vi.fn().mockResolvedValue([]),
            createOrganization: vi.fn(),
          },
        },
        {
          provide: ApiPlanStorageService,
          useValue: {
            listPlans: vi.fn().mockResolvedValue([]),
            savePlan: vi.fn(),
            deletePlan: vi.fn(),
          },
        },
        {
          provide: ApiUserPreferencesService,
          useValue: { getPreferences: vi.fn(), updateWeekOrder: vi.fn() },
        },
        {
          provide: DesktopPlanStorageService,
          useValue: {
            listPlans: vi.fn().mockResolvedValue([]),
            savePlan: vi.fn(),
            deletePlan: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    planner = TestBed.inject(PlannerStateService);
    fixture = TestBed.createComponent(DayInspectorComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('does not render the drawer until opened', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.planning-drawer')).toBeNull();
  });

  it('renders day details and updates structured day context', () => {
    planner.openInspector();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#blockPanelTitle')?.textContent).toContain('Planning Details');
    expect(compiled.textContent).toContain('Day Brief');
    expect(compiled.textContent).toContain('Primary objective');

    const objective = compiled.querySelector(
      'textarea[placeholder^="What has"]',
    ) as HTMLTextAreaElement;
    objective.value = 'Win the install period';
    objective.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const readiness = compiled.querySelector('select') as HTMLSelectElement;
    readiness.value = 'protect';
    readiness.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(planner.selectedDay()).toEqual(
      expect.objectContaining({
        objective: 'Win the install period',
        readiness: 'protect',
      }),
    );
  });

  it('keeps block creation and close actions wired', () => {
    const openBlockDialog = vi.spyOn(planner, 'openBlockDialog');
    planner.openInspector();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.add-block-action .primary-button') as HTMLButtonElement).click();
    expect(openBlockDialog).toHaveBeenCalled();

    (compiled.querySelector('.drawer-title-actions .text-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(planner.state().inspectorOpen).toBe(false);
  });
});
