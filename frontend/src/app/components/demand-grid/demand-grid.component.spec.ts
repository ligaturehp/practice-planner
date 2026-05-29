import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ApiAuthService } from '../../services/api-auth.service';
import { ApiOrganizationService } from '../../services/api-organization.service';
import { ApiPlanStorageService } from '../../services/api-plan-storage.service';
import { DesktopPlanStorageService } from '../../services/desktop-plan-storage.service';
import { PlannerStateService } from '../../services/planner-state.service';
import { DemandGridComponent } from './demand-grid.component';

describe('DemandGridComponent', () => {
  let fixture: ComponentFixture<DemandGridComponent>;
  let planner: PlannerStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemandGridComponent],
      providers: [
        { provide: ApiAuthService, useValue: { status: vi.fn().mockReturnValue('signed-out'), bootstrap: vi.fn().mockResolvedValue(undefined) } },
        { provide: ApiOrganizationService, useValue: { listOrganizations: vi.fn().mockResolvedValue([]), createOrganization: vi.fn() } },
        { provide: ApiPlanStorageService, useValue: { listPlans: vi.fn().mockResolvedValue([]), savePlan: vi.fn(), deletePlan: vi.fn() } },
        { provide: DesktopPlanStorageService, useValue: { listPlans: vi.fn().mockResolvedValue([]), savePlan: vi.fn(), deletePlan: vi.fn() } },
      ],
    }).compileComponents();

    planner = TestBed.inject(PlannerStateService);
    fixture = TestBed.createComponent(DemandGridComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders compact intent and demand badges at rest', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCell = compiled.querySelector('tbody td') as HTMLElement;

    expect(firstCell.querySelector('.cell-intent-trigger')?.textContent).toContain('Rest');
    expect(firstCell.querySelector('.cell-demand-badge')?.textContent?.trim()).toBe('Off');
    expect(firstCell.querySelector('.cell-demand-button')).toBeNull();
    expect(compiled.querySelector('.selected-cell-tools')).toBeNull();
  });

  it('opens a custom active-cell editor with demand previews', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCell = compiled.querySelector('tbody td') as HTMLElement;
    (firstCell.querySelector('.cell-intent-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const optionLabels = Array.from(firstCell.querySelectorAll('.cell-option-button')).map((button) => button.textContent?.trim());
    const demandLabels = Array.from(firstCell.querySelectorAll('.cell-demand-button')).map((button) => button.textContent?.trim());

    expect(firstCell.querySelector('.cell-intent-input')).toBeTruthy();
    expect(optionLabels).toContain('MaxMax');
    expect(demandLabels).toEqual(['Off', 'Low', 'Moderate', 'High', 'Max']);
  });

  it('updates intent and inferred demand together', () => {
    fixture.componentInstance.updateIntent('mon', 0, 'Max');
    fixture.detectChanges();

    expect(planner.state().grid.mon[0]).toBe('Max');
    expect(planner.state().cellDemands.mon[0]).toBe(4);
  });

  it('updates inline demand without changing the intent text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCell = compiled.querySelector('tbody td') as HTMLElement;
    (firstCell.querySelector('.cell-intent-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    const maxButton = firstCell.querySelector('[data-demand-value="4"]') as HTMLButtonElement;

    maxButton.click();
    fixture.detectChanges();

    expect(planner.state().grid.sat[0]).toBe('Rest');
    expect(planner.state().cellDemands.sat[0]).toBe(4);
    expect(maxButton.classList.contains('is-active')).toBe(true);
  });

  it('collapses the active editor without selecting another cell', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const firstCell = compiled.querySelector('tbody td') as HTMLElement;
    (firstCell.querySelector('.cell-intent-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    (firstCell.querySelector('[data-demand-value="4"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (firstCell.querySelector('.cell-collapse-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(firstCell.querySelector('.cell-intent-input')).toBeNull();
    expect(firstCell.querySelector('.cell-intent-trigger')).toBeTruthy();
    expect(planner.state().grid.sat[0]).toBe('Rest');
    expect(planner.state().cellDemands.sat[0]).toBe(4);
    expect(planner.state().selectedDay).toBe('sat');
  });
});
