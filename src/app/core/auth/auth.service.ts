import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, defer, from, throwError } from 'rxjs';
import { AppUser } from './models/user';
import { AuthSession } from './models/session';
import { RoleCode } from './models/role';
import {
  API_BASE,
  ApiError,
  ApiWorkspace,
  AuthResponse,
  AuthState,
  MeProfile,
  MfaEnrolment,
} from './auth-api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _session = signal<AuthSession | null>(null);
  readonly state = signal<AuthState>('signed_out');
  readonly profile = signal<MeProfile | null>(null);
  readonly enrolment = signal<MfaEnrolment | null>(null);
  readonly workspaces = signal<ApiWorkspace[]>([]);
  readonly passwordReason = signal('');
  readonly minPasswordLength = signal(8);
  readonly sessionError = signal('');
  private access: string | null = null;
  private accessExpiresAt = 0;
  private idleExpiresAt = 0;
  private refreshInFlight?: Promise<void>;
  private initialization?: Promise<void>;
  private lastActivity = 0;
  private generation = 0;
  private serverOffset = 0;
  readonly session = this._session.asReadonly();
  readonly currentUser = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.state() === 'authenticated' && !!this.access);
  readonly needsWorkspace = computed(
    () =>
      this.isAuthenticated() &&
      this.profile()?.can_select_workspace &&
      !this.session()?.workspaceId,
  );

  constructor() {
    // Discard sessions saved by the previous local sign-in implementation.
    try {
      localStorage.removeItem('cv_session');
    } catch {
      /* Storage is optional for API authentication. */
    }
    const activity = () => void this.recordActivity();
    for (const event of ['pointerdown', 'keydown'])
      document.addEventListener(event, activity, { passive: true });
    const timer = setInterval(() => {
      if (!this.isAuthenticated()) return;
      if (this.idleExpiresAt && Date.now() >= this.idleExpiresAt) {
        this.clear();
        void this.router.navigateByUrl('/auth/sign-in');
      } else if (Date.now() >= this.accessExpiresAt - 30000) {
        void this.refresh().catch(() => this.expire());
      }
    }, 15000);
    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      for (const event of ['pointerdown', 'keydown']) document.removeEventListener(event, activity);
    });
  }

  initialize(): Promise<void> {
    return (this.initialization ??= this.restore());
  }

  private async restore(): Promise<void> {
    try {
      const response = await this.request<AuthResponse>('/auth/state');
      if (response.state !== 'signed_out') await this.apply(response);
      else {
        await this.refresh();
        await this.loadProfile();
      }
    } catch (error) {
      this.clear();
      if (!(error instanceof ApiError && error.status === 401)) {
        this.sessionError.set(
          error instanceof Error ? error.message : 'Unable to restore your session.',
        );
      }
    }
  }

  signIn(
    email: string,
    password: string,
  ): Observable<{ requiresMfa: boolean; user: AppUser | null }> {
    return defer(() =>
      from(
        (async () => {
          this.clear();
          this.sessionError.set('');
          await this.apply(
            await this.request<AuthResponse>('/auth/login', { email: email.trim(), password }),
          );
          return { requiresMfa: this.state().startsWith('mfa_'), user: this.currentUser() };
        })(),
      ),
    );
  }

  verifyMfa(code: string, _trustDevice = false): Observable<AuthSession | null> {
    return defer(() =>
      from(
        (async () => {
          const device = this.enrolment();
          const path =
            this.state() === 'mfa_enrolment_required' ? '/auth/mfa/confirm' : '/auth/mfa/verify';
          if (path.endsWith('confirm') && !device)
            throw new Error('Set up your authenticator before continuing.');
          await this.apply(
            await this.request<AuthResponse>(
              path,
              device ? { device_id: device.device_id, code } : { code },
            ),
          );
          return this.session();
        })(),
      ),
    );
  }

  enrolMfa(): Observable<MfaEnrolment> {
    return defer(() =>
      from(
        (async () => {
          const result = await this.request<MfaEnrolment>('/auth/mfa/enrol', {});
          this.enrolment.set(result);
          return result;
        })(),
      ),
    );
  }

  resetPassword(
    currentPassword: string,
    newPassword: string,
    confirmation = newPassword,
  ): Observable<void> {
    return defer(() =>
      from(
        (async () => {
          if (this.access && Date.now() >= this.accessExpiresAt - 10000) {
            try {
              await this.refresh();
            } catch (error) {
              this.expire();
              throw error;
            }
          }
          await this.request('/auth/password/change', {
            current_password: currentPassword,
            new_password: newPassword,
            confirmation,
          });
          this.clear();
        })(),
      ),
    );
  }

  async loadWorkspaces(): Promise<void> {
    const results: ApiWorkspace[] = [];
    let path: string | null = '/me/workspaces';
    while (path) {
      const page: { results: ApiWorkspace[]; next: string | null } = await this.api(path);
      results.push(...page.results);
      if (page.next) {
        const url = new URL(page.next, window.location.origin);
        if (!url.pathname.startsWith(`${API_BASE}/me/workspaces`))
          throw new Error('Invalid workspace page.');
        path = url.pathname.slice(API_BASE.length) + url.search;
      } else path = null;
    }
    this.workspaces.set(results);
  }

  async selectWorkspace(id: string): Promise<void> {
    if (!this.profile()?.can_select_workspace)
      throw new Error('Workspace selection is limited to Super Admin.');
    await this.api('/me/workspaces/select', { company_id: id });
    this.setWorkspace(id);
  }

  private setWorkspace(workspaceId: string): void {
    const session = this.session();
    if (
      session &&
      (this.profile()?.can_select_workspace || this.profile()?.company_id === workspaceId)
    ) {
      this._session.set({ ...session, workspaceId });
    }
  }

  hasRole(...codes: RoleCode[]): boolean {
    return !!this.currentUser() && codes.includes(this.currentUser()!.roleCode);
  }
  nextRoute(redirectTo?: string | null): string {
    if (this.state().startsWith('mfa_')) return '/auth/mfa';
    if (this.state() === 'password_change_required') return '/auth/change-password';
    if (!this.isAuthenticated()) return '/auth/sign-in';
    if (redirectTo && /^\/auth\/invite\/[^/?#]+$/.test(redirectTo)) return redirectTo;
    if (this.profile()?.company_entry_state === 'platform') return '/manage/companies';
    if (this.profile()?.company_entry_state === 'ready') return '/manage/rota/overview';
    return '/access-denied';
  }

  signOut(): void {
    this.sessionError.set('');
    const logout = this.request('/auth/logout', {});
    this.clear();
    void logout.catch(() =>
      this.sessionError.set(
        'Sign-out could not reach the server. Please retry before leaving this device.',
      ),
    );
  }

  private async apply(response: AuthResponse): Promise<void> {
    this.state.set(response.state);
    this.passwordReason.set(response.reason ?? '');
    this.minPasswordLength.set(response.password_policy?.min_length ?? 8);
    if (response.state === 'authenticated') {
      try {
        this.acceptToken(response);
        await this.loadProfile();
      } catch (error) {
        this.clear();
        throw error;
      }
    } else {
      this.access = null;
      this._session.set(null);
      this.profile.set(null);
      this.enrolment.set(null);
    }
  }

  private acceptToken(response: AuthResponse): void {
    if (!response.access) throw new Error('The server did not return an access token.');
    this.access = response.access;
    this.accessExpiresAt = Date.now() + (response.expires_in ?? 300) * 1000;
    this.state.set('authenticated');
    this.deadlines(response);
  }

  private deadlines(response: AuthResponse): void {
    if (response.server_time) this.serverOffset = Date.parse(response.server_time) - Date.now();
    if (response.idle_expires_at) {
      this.idleExpiresAt =
        Math.min(
          Date.parse(response.idle_expires_at),
          response.absolute_expires_at ? Date.parse(response.absolute_expires_at) : Infinity,
        ) - this.serverOffset;
    }
  }

  private async loadProfile(): Promise<void> {
    const me = await this.api<MeProfile>('/me');
    this.profile.set(me);
    const name = me.display_name || me.email;
    const user: AppUser = {
      id: me.id,
      name,
      email: me.email,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      roleCode: me.platform_roles.includes('PO') ? 'PO' : 'UN',
      mfaEnabled: !!me.authentication?.mfa_verified_at,
      mfaMethod: 'authenticator',
      workspaceIds: me.company_id ? [me.company_id] : [],
    };
    if (me.company_entry_state === 'ready') {
      const company = await this.api<{
        company_id: string;
        name: string;
        company_entry_state: string;
      }>('/me/company');
      this.workspaces.set([
        {
          id: company.company_id,
          name: company.name,
          code: '',
          lifecycle: company.company_entry_state,
        },
      ]);
    }
    this._session.set({
      user,
      workspaceId: me.company_entry_state === 'ready' ? me.company_id : null,
      mfaVerified: !!me.authentication?.mfa_verified_at,
      signedInAt: null,
    });
  }

  private refresh(): Promise<void> {
    if (!this.refreshInFlight) {
      const generation = this.generation;
      this.refreshInFlight = this.request<AuthResponse>('/auth/refresh', {
        continue_session: false,
      })
        .then((response) => {
          if (generation === this.generation) this.acceptToken(response);
        })
        .finally(() => {
          this.refreshInFlight = undefined;
        });
    }
    return this.refreshInFlight;
  }

  async api<T>(path: string, body?: unknown, method?: 'POST'): Promise<T> {
    if (this.access && Date.now() >= this.accessExpiresAt - 10000) {
      try {
        await this.refresh();
      } catch (error) {
        this.expire();
        throw error;
      }
    }
    try {
      return await this.request<T>(path, body, method);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 403 &&
        error.code === 'password_change_required'
      ) {
        this.state.set('password_change_required');
        this.passwordReason.set(error.response?.reason ?? '');
        this.minPasswordLength.set(error.response?.password_policy?.min_length ?? 8);
        void this.router.navigateByUrl('/auth/change-password');
      } else if (error instanceof ApiError && error.status === 401 && this.access) {
        try {
          await this.refresh();
        } catch (refreshError) {
          this.expire();
          throw refreshError;
        }
        try {
          return await this.request<T>(path, body, method);
        } catch (retryError) {
          if (retryError instanceof ApiError && retryError.status === 401) this.expire();
          throw retryError;
        }
      }
      throw error;
    }
  }

  private async recordActivity(): Promise<void> {
    if (!this.isAuthenticated() || Date.now() - this.lastActivity < 60000) return;
    this.lastActivity = Date.now();
    try {
      this.deadlines(await this.api<AuthResponse>('/auth/activity', undefined, 'POST'));
    } catch {
      /* Authentication failures are handled by the request path. */
    }
  }

  private async request<T>(path: string, body?: unknown, method?: 'POST'): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.access) headers['Authorization'] = `Bearer ${this.access}`;
    if (body !== undefined) {
      await this.request('/auth/csrf');
      const cookie = document.cookie.split('; ').find((value) => value.startsWith('csrftoken='));
      if (!cookie)
        throw new Error('Cookies are required to sign in. Check the API proxy configuration.');
      headers['X-CSRFToken'] = decodeURIComponent(cookie.slice('csrftoken='.length));
      headers['Content-Type'] = 'application/json';
    }
    let response: Response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method: method ?? (body === undefined ? 'GET' : 'POST'),
        credentials: 'include',
        signal: AbortSignal.timeout(15000),
        headers,
        cache: 'no-store',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error('Unable to reach CareVerity. Check your connection and try again.');
    }
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const fields = data?.field_errors ?? {};
      const details = Object.values(fields).flat().join(' ');
      throw new ApiError(
        details || data?.detail || 'CareVerity is temporarily unavailable. Please try again.',
        response.status,
        data?.code ?? 'request_failed',
        fields,
        data,
      );
    }
    if (!data) throw new Error('The API returned an invalid response. Check the API proxy.');
    return data as T;
  }

  private expire(): void {
    this.clear();
    void this.router.navigateByUrl('/auth/sign-in');
  }
  private clear(): void {
    this.generation++;
    this.access = null;
    this.accessExpiresAt = 0;
    this.idleExpiresAt = 0;
    this.lastActivity = 0;
    this._session.set(null);
    this.profile.set(null);
    this.enrolment.set(null);
    this.workspaces.set([]);
    this.state.set('signed_out');
  }

  acceptInvite(token: string): Observable<void> {
    return defer(() =>
      from(
        (async () => {
          await this.api(`/auth/invitations/${encodeURIComponent(token)}/accept`, {});
          await this.loadProfile();
        })(),
      ),
    );
  }

  signInDemoSession(): Observable<AuthSession> {
    return throwError(() => new Error('Local sign-in is disabled. Sign in through the API.'));
  }
}
