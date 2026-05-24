import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createInitialState } from '../data/planner-defaults';
import { ApiPlanStorageService } from './api-plan-storage.service';

describe('ApiPlanStorageService', () => {
  let service: ApiPlanStorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiPlanStorageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists account plans with credentials and maps API dates', async () => {
    const request = service.listPlans();
    const req = http.expectOne('http://localhost:8080/api/plans');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      plans: [
        {
          id: 'plan-1',
          name: 'Week 1',
          sport: 'football',
          template: 'gameFriday',
          plan_json: createInitialState(),
          created_at: '2026-05-24T00:00:00Z',
          updated_at: '2026-05-24T01:00:00Z',
        },
      ],
    });

    const plans = await request;
    expect(plans.length).toBe(1);
    expect(plans[0].id).toBe('plan-1');
    expect(plans[0].updatedAt).toBe('2026-05-24T01:00:00Z');
  });

  it('saves account plans through the API with credentials', async () => {
    const state = createInitialState();
    const request = service.savePlan('Week 1', state);

    const csrf = http.expectOne('http://localhost:8080/api/auth/csrf');
    expect(csrf.request.method).toBe('GET');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://localhost:8080/api/plans');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    expect(req.request.body.name).toBe('Week 1');
    expect(req.request.body.sport).toBe('football');
    expect(req.request.body.template).toBe('gameFriday');
    expect(req.request.body.plan_json.savedPlansOpen).toBe(false);
    req.flush({
      plan: {
        id: 'plan-1',
        name: 'Week 1',
        sport: 'football',
        template: 'gameFriday',
        plan_json: state,
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T01:00:00Z',
      },
    });

    const saved = await request;
    expect(saved.id).toBe('plan-1');
    expect(saved.name).toBe('Week 1');
  });

  it('deletes account plans with credentials', async () => {
    const request = service.deletePlan('plan-1');
    const csrf = http.expectOne('http://localhost:8080/api/auth/csrf');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://localhost:8080/api/plans/plan-1');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await request;
  });
});
