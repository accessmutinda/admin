import { CompaniesApiService } from '../../features/management/companies/companies-api.service';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { API_BASE, MeProfile } from './auth-api';

const companyUser: MeProfile = {
  id: 'person-1',
  email: 'person@example.com',
  display_name: 'Person Name',
  platform_roles: ['CA'],
  platform_permissions: [],
  available_contexts: ['company'],
  company_id: 'company-1',
  company_entry_state: 'ready',
  can_select_workspace: false,
};
const authenticated = {
  state: 'authenticated',
  access: 'access-token',
  expires_in: 300,
  server_time: new Date().toISOString(),
  idle_expires_at: new Date(Date.now() + 1800000).toISOString(),
};

describe('CareVerity API authentication', () => {
  let auth: AuthService;
  let fetchMock: ReturnType<
    typeof vi.fn<(url: string, options?: RequestInit) => Promise<Response>>
  >;
  let profile: MeProfile;
  let loginResponse: object;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('cv_session', JSON.stringify({ user: companyUser }));
    document.cookie = 'csrftoken=test-csrf; path=/';
    profile = { ...companyUser };
    loginResponse = authenticated;
    fetchMock = vi.fn(async (url: string, _options?: RequestInit) => {
      const path = url.replace(API_BASE, '');
      const bodies: Record<string, unknown> = {
        '/auth/csrf': { csrf: 'set', csrf_token: 'test-csrf' },
        '/auth/login': loginResponse,
        '/auth/state': { state: 'signed_out' },
        '/auth/refresh': authenticated,
        '/me': profile,
        '/me/company': {
          company_id: 'company-1',
          name: 'Example Care',
          company_entry_state: 'ready',
        },
        '/auth/mfa/enrol': {
          device_id: 'device-1',
          secret: 'ABCDEF',
          otpauth_url: 'otpauth://totp/CareVerity',
        },
        '/auth/mfa/confirm': {
          state: 'password_change_required',
          reason: 'initial_password',
          password_policy: { min_length: 10 },
        },
        '/auth/mfa/verify': authenticated,
        '/auth/activity': authenticated,
        '/auth/invitations/server-token/accept': {
          membership_id: 'membership-1',
          company_id: 'company-1',
        },
        '/auth/password/change': { state: 'signed_out' },
        '/me/workspaces': {
          results: [{ id: 'company-1', code: 'CARE', name: 'Example Care', lifecycle: 'active' }],
          next: null,
        },
        '/platform/companies': {
          id: 'company-2',
          code: 'NEW',
          lifecycle: 'pending_setup',
          initial_admin_invitation: { id: 'invite-1', state: 'pending', delivery_state: 'queued' },
          request_id: 'request-1',
        },
        '/me/workspaces/select': { company_id: 'company-1' },
      };
      if (path === '/auth/logout') return new Response(null, { status: 204 });
      if (!(path in bodies)) throw new Error(`Unexpected request: ${url}`);
      return Response.json(bodies[path]);
    });
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('opens account setup while onboarding and reports password-only sign-in accurately', async () => {
    profile = {
      ...companyUser,
      platform_roles: ['CW'],
      home_path: '/account/security',
      authentication: { mfa_required: false, mfa_verified_at: new Date().toISOString() },
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.nextRoute()).toBe('/account/security');
    expect(auth.currentUser()?.mfaEnabled).toBe(false);
  });

  it('opens the server-authorised staff portal after sign-in', async () => {
    profile = { ...companyUser, platform_roles: ['CW'], home_path: '/staff-portal/dashboard' };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.nextRoute()).toBe('/staff-portal/dashboard');
  });

  it('sends CSRF and credentials, loads /me and enters the assigned company without persisting a token', async () => {
    await firstValueFrom(auth.signIn(' person@example.com ', 'password'));
    expect(fetchMock.mock.calls[0][0]).toBe('https://care.neuraledge.co.ke/api/v1/auth/csrf');
    const options = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/login`,
    )![1] as RequestInit;
    expect(options.credentials).toBe('include');
    expect(options.headers).toMatchObject({ 'X-CSRFToken': 'test-csrf' });
    expect(JSON.parse(options.body as string)).toEqual({
      email: 'person@example.com',
      password: 'password',
    });
    const me = fetchMock.mock.calls.find((call) => call[0] === `${API_BASE}/me`)![1] as RequestInit;
    expect(me.headers).toMatchObject({ Authorization: 'Bearer access-token' });
    expect(auth.nextRoute()).toBe('/manage/rota/overview');
    expect(auth.session()?.workspaceId).toBe('company-1');
    expect(auth.hasRole('CA')).toBe(true);
    expect(localStorage.getItem('cv_session')).toBeNull();
  });

  it('uses the API CSRF response token without a frontend cookie', async () => {
    document.cookie = 'csrftoken=; Max-Age=0; path=/';
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    const options = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/login`,
    )![1] as RequestInit;
    expect(options.headers).toMatchObject({ 'X-CSRFToken': 'test-csrf' });
  });

  it('rejects a cross-origin CSRF response without a token even with a local cookie', async () => {
    fetchMock.mockResolvedValue(Response.json({ csrf: 'set' }));
    await expect(firstValueFrom(auth.signIn('person@example.com', 'password'))).rejects.toThrow(
      'The API must return csrf_token from /auth/csrf for cross-origin sign-in.',
    );
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/login`)).toBe(false);
  });

  it('sends CSRF and If-Match on bodyless deletes', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      url.endsWith('/evidence/file-1')
        ? Promise.resolve(new Response(null, { status: 204 }))
        : original(url, options),
    );
    await auth.api('/companies/company-1/evidence/file-1', undefined, 'DELETE', {
      'If-Match': '"v2"',
    });
    const options = fetchMock.mock.calls.find((call) =>
      call[0].endsWith('/evidence/file-1'),
    )![1] as RequestInit;
    expect(options.method).toBe('DELETE');
    expect(options.credentials).toBe('include');
    expect(options.headers).toMatchObject({
      'X-CSRFToken': 'test-csrf',
      'If-Match': '"v2"',
      Authorization: 'Bearer access-token',
    });
    expect(options.body).toBeUndefined();
  });
  it('preserves multipart upload boundaries and returns authorised binary downloads', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      url.endsWith('/evidence')
        ? Promise.resolve(Response.json({ id: 'file-1' }))
        : url.endsWith('/evidence/file-1')
          ? Promise.resolve(
              new Response('saved bytes', { headers: { 'Content-Type': 'application/pdf' } }),
            )
          : original(url, options),
    );
    const body = new FormData();
    body.set('kind', 'insurance_certificate');
    await auth.api('/companies/company-1/evidence', body, 'POST');
    const options = fetchMock.mock.calls.find((call) =>
      call[0].endsWith('/evidence'),
    )![1] as RequestInit;
    expect(options.body).toBe(body);
    expect(options.headers).not.toHaveProperty('Content-Type');
    expect(options.headers).toMatchObject({ 'X-CSRFToken': 'test-csrf' });
    const file = await auth.api<Blob>(
      '/companies/company-1/evidence/file-1',
      undefined,
      undefined,
      undefined,
      'blob',
    );
    expect(await file.text()).toBe('saved bytes');
  });

  it('follows MFA enrolment, password gate, and session revocation on password change', async () => {
    loginResponse = { state: 'mfa_enrolment_required', challenge_id: 'challenge-1' };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.nextRoute()).toBe('/auth/mfa');
    await firstValueFrom(auth.enrolMfa());
    expect(auth.enrolment()?.secret).toBe('ABCDEF');
    await firstValueFrom(auth.verifyMfa('123456'));
    const confirm = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/mfa/confirm`,
    )![1] as RequestInit;
    expect(JSON.parse(confirm.body as string)).toEqual({ device_id: 'device-1', code: '123456' });
    expect(auth.nextRoute()).toBe('/auth/change-password');
    expect(auth.minPasswordLength()).toBe(10);
    expect(auth.enrolment()).toBeNull();
    await firstValueFrom(auth.resetPassword('old-password', 'new-password', 'new-password'));
    expect(auth.nextRoute()).toBe('/auth/sign-in');
  });

  it('verifies an existing authenticator with the pending cookie', async () => {
    loginResponse = { state: 'mfa_required' };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    await firstValueFrom(auth.verifyMfa('654321'));
    expect(auth.isAuthenticated()).toBe(true);
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/mfa/verify`)).toBe(
      true,
    );
  });

  it('surfaces credential errors and server field validation without creating a session', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/csrf')
        ? Response.json({ csrf: 'set', csrf_token: 'test-csrf' })
        : Response.json(
            { code: 'invalid_credentials', detail: 'Sign-in failed.' },
            { status: 401 },
          ),
    );
    await expect(firstValueFrom(auth.signIn('person@example.com', 'wrong'))).rejects.toThrow(
      'Sign-in failed.',
    );
    expect(auth.isAuthenticated()).toBe(false);
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/csrf')
        ? Response.json({ csrf: 'set', csrf_token: 'test-csrf' })
        : Response.json(
            { code: 'validation_error', field_errors: { new_password: ['Too common.'] } },
            { status: 400 },
          ),
    );
    await expect(firstValueFrom(auth.resetPassword('old', 'password'))).rejects.toThrow(
      'Too common.',
    );
  });

  it('restores from cookies through one refresh shared by initialization calls', async () => {
    await Promise.all([auth.initialize(), auth.initialize()]);
    expect(auth.isAuthenticated()).toBe(true);
    expect(
      fetchMock.mock.calls.filter((call) => call[0] === `${API_BASE}/auth/refresh`),
    ).toHaveLength(1);
    const refresh = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/refresh`,
    )![1] as RequestInit;
    expect(JSON.parse(refresh.body as string)).toEqual({ continue_session: false });
  });

  it('does not accept a previously stored local session', () => {
    expect(localStorage.getItem('cv_session')).toBeNull();
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('restricts workspace selection to Super Admin and records selection on the server', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    await expect(auth.selectWorkspace('other-company')).rejects.toThrow('Super Admin');
    profile = {
      ...companyUser,
      platform_roles: ['PO'],
      company_entry_state: 'platform',
      can_select_workspace: true,
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.nextRoute()).toBe('/manage/companies');
    await auth.loadWorkspaces();
    expect(auth.workspaces()).toHaveLength(1);
    await auth.selectWorkspace('company-1');
    expect(auth.session()?.workspaceId).toBe('company-1');
  });

  it('shows blocked company states without offering a workspace picker', async () => {
    profile = { ...companyUser, company_entry_state: 'suspended' };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.nextRoute()).toBe('/access-denied');
    expect(auth.needsWorkspace()).toBe(false);
  });

  it('rotates an expired token once for concurrent requests without extending idle time', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    vi.setSystemTime(Date.now() + 295000);
    await Promise.all([auth.api('/me'), auth.api('/me')]);
    expect(
      fetchMock.mock.calls.filter((call) => call[0] === `${API_BASE}/auth/refresh`),
    ).toHaveLength(1);
    const options = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/refresh`,
    )![1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual({ continue_session: false });
  });

  it('revokes server cookies on logout and immediately clears local authentication', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    auth.signOut();
    expect(auth.isAuthenticated()).toBe(false);
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/logout`)).toBe(true),
    );
  });
  it('reports real user activity without sending a body and throttles it to once a minute', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown'));
    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.filter((call) => call[0] === `${API_BASE}/auth/activity`),
      ).toHaveLength(1),
    );
    const options = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/activity`,
    )![1] as RequestInit;
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
  });

  it('clears an idle session without refreshing it to extend the deadline', async () => {
    loginResponse = {
      ...authenticated,
      idle_expires_at: new Date(Date.now() + 10000).toISOString(),
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    await vi.advanceTimersByTimeAsync(15000);
    expect(auth.isAuthenticated()).toBe(false);
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/refresh`)).toBe(false);
    expect(auth.sessionError()).toContain('Your session has ended');
  });

  it('warns two minutes before the server deadline and requires an explicit decision to extend it', async () => {
    loginResponse = {
      ...authenticated,
      expires_in: 3600,
      server_time: new Date().toISOString(),
      idle_expires_at: new Date(Date.now() + 1800000).toISOString(),
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    vi.setSystemTime(Date.now() + 1679000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(auth.sessionWarning()).toBe(true);
    expect(auth.sessionSecondsRemaining()).toBe(120);
    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/activity`)).toBe(
      false,
    );
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/refresh`)).toBe(false);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) =>
      url.endsWith('/auth/refresh')
        ? Response.json({
            ...authenticated,
            server_time: new Date().toISOString(),
            idle_expires_at: new Date(Date.now() + 1800000).toISOString(),
          })
        : original(url, options),
    );
    await auth.continueSession();
    const refresh = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/refresh`,
    )![1]!;
    expect(JSON.parse(refresh.body as string)).toEqual({ continue_session: true });
    expect(auth.sessionSecondsRemaining()).toBe(1800);
    expect(auth.sessionWarning()).toBe(false);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('keeps the prompt available for retry after a connection failure', async () => {
    loginResponse = {
      ...authenticated,
      server_time: new Date().toISOString(),
      idle_expires_at: new Date(Date.now() + 120000).toISOString(),
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) => {
      if (url.endsWith('/auth/refresh')) throw new Error('Offline');
      return original(url, options);
    });
    await auth.continueSession();
    expect(auth.sessionWarning()).toBe(true);
    expect(auth.continuingSession()).toBe(false);
    expect(auth.sessionContinuationError()).toContain('Check your connection');
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('expires after an ignored warning and rejects continuation after the deadline', async () => {
    loginResponse = {
      ...authenticated,
      server_time: new Date().toISOString(),
      idle_expires_at: new Date(Date.now() + 120000).toISOString(),
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    vi.setSystemTime(Date.now() + 120000);
    await auth.continueSession();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.sessionWarning()).toBe(false);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/auth/sign-in');
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/auth/refresh`)).toBe(false);
  });

  it('uses the absolute deadline and rechecks immediately when a suspended tab regains focus', async () => {
    loginResponse = {
      ...authenticated,
      server_time: new Date().toISOString(),
      absolute_expires_at: new Date(Date.now() + 60000).toISOString(),
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.sessionWarning()).toBe(true);
    expect(auth.canContinueSession()).toBe(false);
    expect(auth.sessionSecondsRemaining()).toBe(60);
    vi.setSystemTime(Date.now() + 60000);
    window.dispatchEvent(new Event('focus'));
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('deduplicates repeated continuation clicks and never restores a session after sign-out', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    let finish!: (response: Response) => void;
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) =>
      url.endsWith('/auth/refresh')
        ? new Promise<Response>((resolve) => (finish = resolve))
        : original(url, options),
    );
    const first = auth.continueSession();
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await auth.continueSession();
    auth.signOut();
    finish(Response.json(authenticated));
    await first;
    expect(auth.isAuthenticated()).toBe(false);
    expect(
      fetchMock.mock.calls.filter((call) => call[0] === `${API_BASE}/auth/refresh`),
    ).toHaveLength(1);
  });

  it('waits for a background token rotation before sending explicit continuation', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    let finish!: (response: Response) => void;
    let rotations = 0;
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) => {
      if (!url.endsWith('/auth/refresh')) return original(url, options);
      if (++rotations === 1) return new Promise<Response>((resolve) => (finish = resolve));
      return Response.json(authenticated);
    });
    vi.setSystemTime(Date.now() + 295000);
    const request = auth.api('/me');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    const continuation = auth.continueSession();
    expect(rotations).toBe(1);
    finish(Response.json(authenticated));
    await Promise.all([request, continuation]);
    const bodies = fetchMock.mock.calls
      .filter((call) => call[0] === `${API_BASE}/auth/refresh`)
      .map((call) => JSON.parse(call[1]!.body as string));
    expect(bodies).toEqual([{ continue_session: false }, { continue_session: true }]);
    expect(auth.continuingSession()).toBe(false);
  });

  it('returns to sign-in when the backend rejects explicit continuation', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) =>
      url.endsWith('/auth/refresh')
        ? Response.json(
            { code: 'unauthenticated', detail: 'Sign-in has expired.' },
            { status: 401 },
          )
        : original(url, options),
    );
    await auth.continueSession();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.continuingSession()).toBe(false);
    expect(auth.sessionError()).toContain('Please sign in again');
  });

  it('clears the session when refresh credentials are rejected', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/csrf')
        ? Response.json({ csrf: 'set', csrf_token: 'test-csrf' })
        : Response.json(
            { code: 'invalid_credentials', detail: 'Session expired.' },
            { status: 401 },
          ),
    );
    vi.setSystemTime(Date.now() + 295000);
    await expect(auth.api('/me')).rejects.toThrow('Session expired.');
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('accepts invitations through the API and reloads the assigned profile', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    await firstValueFrom(auth.acceptInvite('server-token'));
    const request = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/auth/invitations/server-token/accept`,
    )![1] as RequestInit;
    expect(request.method).toBe('POST');
    expect(request.headers).toMatchObject({
      Authorization: 'Bearer access-token',
      'X-CSRFToken': 'test-csrf',
    });
    expect(fetchMock.mock.calls.filter((call) => call[0] === `${API_BASE}/me`)).toHaveLength(2);
  });

  it('never authenticates from local accounts, trusted-device flags or MFA overrides when the API rejects credentials', async () => {
    localStorage.setItem(
      'cv_trusted_device:person@example.com',
      JSON.stringify({ expiresAt: Date.now() + 86400000 }),
    );
    localStorage.setItem(
      'cv_management_v1',
      JSON.stringify({
        company: {
          roleMfa: { 'Company Admin': false },
          members: [{ email: 'person@example.com', role: 'Company Admin', status: 'Active' }],
        },
      }),
    );
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/csrf')
        ? Response.json({ csrf: 'set', csrf_token: 'test-csrf' })
        : Response.json(
            { code: 'invalid_credentials', detail: 'Sign-in failed.' },
            { status: 401 },
          ),
    );
    await expect(firstValueFrom(auth.signIn('person@example.com', 'password'))).rejects.toThrow(
      'Sign-in failed.',
    );
    expect(auth.session()).toBeNull();
    expect(auth.currentUser()).toBeNull();
    expect(auth.workspaces()).toEqual([]);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('preserves server invitation destinations while rejecting external redirects', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.nextRoute('/auth/invite/server-token')).toBe('/auth/invite/server-token');
    expect(auth.nextRoute('https://example.com')).toBe('/manage/rota/overview');
    expect(auth.nextRoute('//example.com')).toBe('/manage/rota/overview');
    expect(auth.session()?.signedInAt).toBeNull();
    expect(auth.session()?.mfaVerified).toBeNull();
  });
  it('takes Company Admin from platform roles and restricts company access to its server assignment', async () => {
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.currentUser()?.roleCode).toBe('CA');
    expect(auth.isSuperAdmin()).toBe(false);
    expect(auth.canSwitchWorkspace()).toBe(false);
    expect(auth.canAccessCompany('company-1')).toBe(true);
    expect(auth.canAccessCompany('company-2')).toBe(false);
    await expect(
      TestBed.inject(CompaniesApiService).create(
        {
          company: { name: 'New', code: 'NEW' },
          addresses: [],
          initial_admin: { email: 'admin@example.com', mfa_override: 'inherit' },
        },
        'key',
      ),
    ).rejects.toThrow('Only Super Admin');
    expect(fetchMock.mock.calls.some((call) => call[0] === `${API_BASE}/platform/companies`)).toBe(
      false,
    );
  });

  it('uses Super Admin authority for company creation and workspace access', async () => {
    profile = {
      ...companyUser,
      platform_roles: ['CA', 'PO'],
      company_entry_state: 'platform',
      can_select_workspace: true,
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.currentUser()?.roleCode).toBe('PO');
    expect(auth.currentUser()?.workspaceIds).toEqual([]);
    expect(auth.canSwitchWorkspace()).toBe(true);
    expect(auth.canAccessCompany('company-2')).toBe(true);
    const payload = {
      company: { name: 'New', code: 'NEW' },
      addresses: [],
      initial_admin: { email: 'admin@example.com', mfa_override: 'inherit' as const },
    };
    await TestBed.inject(CompaniesApiService).create(payload, 'request-key');
    const options = fetchMock.mock.calls.find(
      (call) => call[0] === `${API_BASE}/platform/companies`,
    )![1] as RequestInit;
    expect(options.headers).toMatchObject({ 'Idempotency-Key': 'request-key' });
    expect(JSON.parse(options.body as string)).toEqual(payload);
  });

  it('does not infer an administrator role from company membership alone', async () => {
    profile = { ...companyUser, platform_roles: [] };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.currentUser()?.roleCode).toBe('UN');
    expect(auth.hasRole('CA', 'PO')).toBe(false);
    expect(auth.canSwitchWorkspace()).toBe(false);
  });
  it('uses the API profile and assigned company without inventing missing fields', async () => {
    profile = {
      ...companyUser,
      display_name: 'Server Person',
      version: 7,
      authentication: {
        primary_method: 'password',
        mfa_verified_at: '2026-11-07T09:00:00Z',
        trusted_device_used: false,
      },
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.currentUser()?.name).toBe('Server Person');
    expect(auth.profile()).toEqual(profile);
    expect(auth.currentUser()?.mfaMethod).toBeNull();
    expect(auth.workspaces()).toEqual([
      { id: 'company-1', name: 'Example Care', entryState: 'ready' },
    ]);
    expect(auth.session()?.signedInAt).toBeNull();
  });

  it('keeps an empty API workspace list empty despite legacy cached workspaces', async () => {
    profile = {
      ...companyUser,
      platform_roles: ['PO'],
      company_entry_state: 'platform',
      can_select_workspace: true,
    };
    localStorage.setItem(
      'cv_custom_workspaces_v1',
      JSON.stringify([{ id: 'local-company', name: 'Cached Company' }]),
    );
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      url === `${API_BASE}/me/workspaces`
        ? Promise.resolve(Response.json({ results: [], next: null, count: 0 }))
        : original(url, options),
    );
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    expect(auth.workspaces()).toEqual([]);
    expect(auth.session()?.workspaceId).toBeNull();
    expect(auth.needsWorkspace()).toBe(true);
  });

  it('fails closed when assigned-company responses disagree', async () => {
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      url === `${API_BASE}/me/company`
        ? Promise.resolve(
            Response.json({
              company_id: 'other-company',
              name: 'Other Company',
              company_entry_state: 'ready',
            }),
          )
        : original(url, options),
    );
    await expect(firstValueFrom(auth.signIn('person@example.com', 'password'))).rejects.toThrow(
      'company assignment changed',
    );
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.profile()).toBeNull();
    expect(auth.workspaces()).toEqual([]);
  });

  it('does not fill in a profile when the API profile request fails', async () => {
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      url === `${API_BASE}/me`
        ? Promise.resolve(Response.json({ detail: 'Profile unavailable.' }, { status: 503 }))
        : original(url, options),
    );
    await expect(firstValueFrom(auth.signIn('person@example.com', 'password'))).rejects.toThrow(
      'Profile unavailable.',
    );
    expect(auth.currentUser()).toBeNull();
    expect(auth.profile()).toBeNull();
    expect(auth.workspaces()).toEqual([]);
  });
  it('surfaces nested company validation messages as named field errors', async () => {
    profile = {
      ...companyUser,
      platform_roles: ['PO'],
      company_entry_state: 'platform',
      can_select_workspace: true,
    };
    await firstValueFrom(auth.signIn('person@example.com', 'password'));
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((url: string, options?: RequestInit) =>
      url === `${API_BASE}/platform/companies`
        ? Promise.resolve(
            Response.json(
              {
                code: 'validation_error',
                detail: 'Invalid company.',
                field_errors: {
                  company: { code: ['Already exists.'] },
                  initial_admin: { email: ['Enter a valid email.'] },
                },
              },
              { status: 400 },
            ),
          )
        : original(url, options),
    );
    const payload = {
      company: { name: 'New', code: 'NEW' },
      addresses: [],
      initial_admin: { email: 'admin@example.com', mfa_override: 'inherit' as const },
    };
    await expect(
      TestBed.inject(CompaniesApiService).create(payload, 'validation-key'),
    ).rejects.toMatchObject({
      message: 'Already exists. Enter a valid email.',
      fieldErrors: {
        'company.code': ['Already exists.'],
        'initial_admin.email': ['Enter a valid email.'],
      },
    });
  });
});
