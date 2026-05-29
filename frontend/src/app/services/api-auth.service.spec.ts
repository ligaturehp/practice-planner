import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiAuthService } from './api-auth.service';

describe('ApiAuthService', () => {
  let service: ApiAuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiAuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('registers with credentials and stores the signed-in user', async () => {
    const request = service.register('coach@example.com', 'strong-password');

    const req = http.expectOne('http://127.0.0.1:8092/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({ email: 'coach@example.com', password: 'strong-password' });
    req.flush({ user: { id: 'user-1', email: 'coach@example.com', created_at: '2026-05-24T00:00:00Z' } });

    await request;
    expect(service.user()?.email).toBe('coach@example.com');
    expect(service.status()).toBe('signed-in');
  });

  it('bootstraps an existing session and handles signed-out responses', async () => {
    const signedIn = service.bootstrap();
    const me = http.expectOne('http://127.0.0.1:8092/api/auth/me');
    expect(me.request.method).toBe('GET');
    expect(me.request.withCredentials).toBe(true);
    me.flush({ user: { id: 'user-1', email: 'coach@example.com', created_at: '2026-05-24T00:00:00Z' } });
    await signedIn;
    expect(service.status()).toBe('signed-in');

    const signedOut = service.bootstrap();
    const nextMe = http.expectOne('http://127.0.0.1:8092/api/auth/me');
    nextMe.flush({ error: 'authentication required' }, { status: 401, statusText: 'Unauthorized' });
    await signedOut;
    expect(service.user()).toBeNull();
    expect(service.status()).toBe('signed-out');
  });

  it('logs out with credentials and clears account state', async () => {
    const login = service.login('coach@example.com', 'strong-password');
    http.expectOne('http://127.0.0.1:8092/api/auth/login').flush({
      user: { id: 'user-1', email: 'coach@example.com', created_at: '2026-05-24T00:00:00Z' },
    });
    await login;

    const logout = service.logout();
    const csrf = http.expectOne('http://127.0.0.1:8092/api/auth/csrf');
    expect(csrf.request.method).toBe('GET');
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ csrf_token: 'csrf-token' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = http.expectOne('http://127.0.0.1:8092/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('X-CSRF-Token')).toBe('csrf-token');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await logout;

    expect(service.user()).toBeNull();
    expect(service.status()).toBe('signed-out');
  });
});
