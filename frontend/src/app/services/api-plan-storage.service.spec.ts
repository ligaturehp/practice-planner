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
    const req = http.expectOne('http://127.0.0.1:8092/api/plans');
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
          lock_version: 3,
          created_at: '2026-05-24T00:00:00Z',
          updated_at: '2026-05-24T01:00:00Z',
        },
      ],
    });

    const plans = await request;
    expect(plans.length).toBe(1);
    expect(plans[0].id).toBe('plan-1');
    expect(plans[0].updatedAt).toBe('2026-05-24T01:00:00Z');
    expect(plans[0].lockVersion).toBe(3);
  });

  it('saves account plans through the API with credentials', async () => {
    const state = createInitialState();
    const request = service.savePlan('Week 1', state);

    const csrf = http.expectOne('http://127.0.0.1:8092/api/auth/csrf');
    expect(csrf.request.method).toBe('GET');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/plans');
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
        lock_version: 1,
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T01:00:00Z',
      },
    });

    const saved = await request;
    expect(saved.id).toBe('plan-1');
    expect(saved.name).toBe('Week 1');
    expect(saved.lockVersion).toBe(1);
  });

  it('updates account plans with the current lock version', async () => {
    const state = createInitialState();
    const request = service.savePlan('Week 1', state, {
      id: 'plan-1',
      lockVersion: 4,
    });

    const csrf = http.expectOne('http://127.0.0.1:8092/api/auth/csrf');
    csrf.flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/plans/plan-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body.lock_version).toBe(4);
    req.flush({
      plan: {
        id: 'plan-1',
        name: 'Week 1',
        sport: 'football',
        template: 'gameFriday',
        plan_json: state,
        lock_version: 5,
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T01:00:00Z',
      },
    });

    const saved = await request;
    expect(saved.lockVersion).toBe(5);
  });

  it('deletes account plans with credentials', async () => {
    const request = service.deletePlan('plan-1');
    const csrf = http.expectOne('http://127.0.0.1:8092/api/auth/csrf');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/plans/plan-1');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await request;
  });

  it('lists, restores, and duplicates account plan versions', async () => {
    const versionsRequest = service.listPlanVersions('plan-1');
    const versionsReq = http.expectOne('http://127.0.0.1:8092/api/plans/plan-1/versions');
    expect(versionsReq.request.method).toBe('GET');
    expect(versionsReq.request.withCredentials).toBe(true);
    versionsReq.flush({
      versions: [
        {
          id: 'version-1',
          plan_id: 'plan-1',
          name: 'Week 1',
          sport: 'football',
          template: 'gameFriday',
          plan_json: createInitialState(),
          lock_version: 1,
          created_at: '2026-05-24T00:00:00Z',
        },
      ],
    });
    const versions = await versionsRequest;
    expect(versions[0].lockVersion).toBe(1);

    const restoreRequest = service.restorePlanVersion('plan-1', 'version-1');
    http.expectOne('http://127.0.0.1:8092/api/auth/csrf').flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const restoreReq = http.expectOne('http://127.0.0.1:8092/api/plans/plan-1/versions/version-1/restore');
    expect(restoreReq.request.method).toBe('POST');
    expect(restoreReq.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    restoreReq.flush({
      plan: {
        id: 'plan-1',
        name: 'Week 1',
        sport: 'football',
        template: 'gameFriday',
        plan_json: createInitialState(),
        lock_version: 2,
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T01:00:00Z',
      },
    });
    expect((await restoreRequest).lockVersion).toBe(2);

    const duplicateRequest = service.duplicatePlan('plan-1', 'Week 2');
    http.expectOne('http://127.0.0.1:8092/api/auth/csrf').flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const duplicateReq = http.expectOne('http://127.0.0.1:8092/api/plans/plan-1/duplicate');
    expect(duplicateReq.request.method).toBe('POST');
    expect(duplicateReq.request.body.name).toBe('Week 2');
    duplicateReq.flush({
      plan: {
        id: 'plan-2',
        name: 'Week 2',
        sport: 'football',
        template: 'gameFriday',
        plan_json: createInitialState(),
        lock_version: 1,
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T01:00:00Z',
      },
    });
    expect((await duplicateRequest).id).toBe('plan-2');
  });

  it('creates share links with CSRF and builds a public URL', async () => {
    const request = service.createShareLink('plan-1');
    http.expectOne('http://127.0.0.1:8092/api/auth/csrf').flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/plans/plan-1/share-links');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush({
      share: {
        id: 'share-1',
        plan_id: 'plan-1',
        token: 'share-token',
        created_at: '2026-05-24T00:00:00Z',
      },
    });

    const share = await request;
    expect(share.planId).toBe('plan-1');
    expect(share.url).toBe('http://127.0.0.1:8092/api/shared-plans/share-token');
  });

  it('builds CSV export URLs for account plans', () => {
    expect(service.exportCSVUrl('plan-1')).toBe('http://127.0.0.1:8092/api/plans/plan-1/export.csv');
  });
});
