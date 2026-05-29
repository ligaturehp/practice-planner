import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiUserPreferencesService } from './api-user-preferences.service';

describe('ApiUserPreferencesService', () => {
  let service: ApiUserPreferencesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiUserPreferencesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads signed-in user preferences with credentials', async () => {
    const request = service.getPreferences();
    const req = http.expectOne('http://127.0.0.1:8092/api/profile/preferences');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ preferences: { week_order: 'mondayFirst', updated_at: '2026-05-29T00:00:00Z' } });

    expect((await request).weekOrder).toBe('mondayFirst');
  });

  it('updates week order with CSRF protection', async () => {
    const request = service.updateWeekOrder('sundayFirst');
    http.expectOne('http://127.0.0.1:8092/api/auth/csrf').flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/profile/preferences');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.week_order).toBe('sundayFirst');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush({ preferences: { week_order: 'sundayFirst', updated_at: '2026-05-29T00:00:00Z' } });

    expect((await request).weekOrder).toBe('sundayFirst');
  });
});
