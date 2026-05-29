import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiOrganizationService } from './api-organization.service';

describe('ApiOrganizationService', () => {
  let service: ApiOrganizationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiOrganizationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists signed-in organizations with credentials', async () => {
    const request = service.listOrganizations();
    const req = http.expectOne('http://127.0.0.1:8092/api/organizations');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ organizations: [{ id: 'org-1', name: 'My Team', role: 'owner', created_at: '2026-05-24T00:00:00Z' }] });

    expect((await request)[0].name).toBe('My Team');
  });

  it('creates organizations with CSRF protection', async () => {
    const request = service.createOrganization('Varsity Staff');
    http.expectOne('http://127.0.0.1:8092/api/auth/csrf').flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/organizations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('Varsity Staff');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush({ organization: { id: 'org-2', name: 'Varsity Staff', role: 'owner', created_at: '2026-05-24T00:00:00Z' } });

    expect((await request).id).toBe('org-2');
  });
});
