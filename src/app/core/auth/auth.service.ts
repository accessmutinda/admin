import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AppUser } from './models/user';
import { AuthSession } from './models/session';
import { Invite } from './models/invite';
import { RoleCode, ROLES } from './models/role';
import { effectiveMfa, MfaWorkspace } from './mfa-policy';
import {
  DEMO_EMAIL,
  DEMO_MFA_CODE,
  DEMO_PASSWORD,
  DEMO_USER,
  DEMO_PORTAL_USERS,
  INVITES,
} from './fixtures';

const SESSION_KEY = 'cv_session';
const TRUSTED_DEVICE_PREFIX = 'cv_trusted_device:';
const LATENCY_MS = 700;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<AuthSession | null>(this.restoreSession());
  /** Set once a password has been accepted but MFA has not been verified yet. */
  private readonly _pendingUser = signal<AppUser | null>(null);

  readonly session = this._session.asReadonly();
  readonly pendingUser = this._pendingUser.asReadonly();
  readonly currentUser = computed(() => this._session()?.user ?? null);
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly needsWorkspace = computed(
    () => this._session() !== null && this._session()?.workspaceId === null,
  );

  signIn(email: string, password: string): Observable<{ requiresMfa: boolean; user: AppUser }> {
    const address = email.trim().toLowerCase();
    const user =
      address === DEMO_EMAIL
        ? DEMO_USER
        : (DEMO_PORTAL_USERS.find((account) => account.email === address) ??
          this.localMemberAccount(address));
    if (!user || password !== DEMO_PASSWORD) {
      return throwError(() => new Error('Incorrect email or password.')).pipe(delay(LATENCY_MS));
    }

    return this.beginSignIn(user);
  }

  private localMemberAccount(email: string): AppUser | undefined {
    try {
      const records: Record<string, MfaWorkspace> =
        JSON.parse(localStorage.getItem('cv_management_v1') ?? '{}') ?? {};
      const memberships = Object.entries(records).flatMap(([workspace, data]) =>
        (data.members ?? [])
          .filter((member) => member.email.toLowerCase() === email && member.status === 'Active')
          .map((member) => ({ workspace, member })),
      );
      const member = memberships[0]?.member;
      const role = Object.values(ROLES).find((role) => role.label === member?.role);
      if (!member || !role) return undefined;
      const name = member.name?.trim() || email;
      return {
        id: member.id ?? email,
        name,
        initials: name
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        email,
        roleCode: role.code,
        mfaEnabled: true,
        mfaMethod: 'authenticator',
        workspaceIds: memberships.map((membership) => membership.workspace),
      };
    } catch {
      return undefined;
    }
  }

  private beginSignIn(account: AppUser): Observable<{ requiresMfa: boolean; user: AppUser }> {
    const user = { ...account, mfaEnabled: this.requiresMfa(account) };
    const requiresMfa = user.mfaEnabled && !this.isDeviceTrusted(user);
    this._session.set(null);
    this._pendingUser.set(null);
    localStorage.removeItem(SESSION_KEY);

    if (requiresMfa) {
      this._pendingUser.set(user);
    } else {
      this.establishSession(user, false);
    }

    return of({ requiresMfa, user }).pipe(delay(LATENCY_MS));
  }

  verifyMfa(code: string, trustDevice: boolean): Observable<AuthSession> {
    const user = this._pendingUser();
    if (!user) {
      return throwError(() => new Error('Your sign-in session expired. Please sign in again.'));
    }
    if (code !== DEMO_MFA_CODE) {
      return throwError(() => new Error('That code is incorrect. Please try again.')).pipe(
        delay(LATENCY_MS),
      );
    }

    this._pendingUser.set(null);
    const session = this.establishSession(user, trustDevice);
    return of(session).pipe(delay(LATENCY_MS));
  }

  resendMfaCode(): Observable<void> {
    return of(void 0).pipe(delay(LATENCY_MS));
  }

  signInWithGoogle(): Observable<{ requiresMfa: boolean; user: AppUser }> {
    return this.beginSignIn(DEMO_USER);
  }

  requiresMfa(user: AppUser): boolean {
    return this.accountPolicies(user).some((policy) => policy.required);
  }

  private accountPolicies(
    user: AppUser,
  ): { workspace: string; required: boolean; policy: string }[] {
    let records: Record<string, MfaWorkspace> = {};
    try {
      records = JSON.parse(localStorage.getItem('cv_management_v1') ?? '{}') ?? {};
    } catch {
      /* Use the seeded account policy when storage is unavailable. */
    }
    const policies = [...new Set([...user.workspaceIds, ...this.localWorkspaceIds()])].flatMap(
      (workspace) => {
        const data = records[workspace];
        const member = data?.members?.find(
          (m) => m.email.toLowerCase() === user.email.toLowerCase(),
        );
        const role = member?.role ?? ROLES[user.roleCode].label;
        if (!member && data?.roleMfa?.[role] === undefined) return [];
        const policy = member ?? { email: user.email, role, mfaPolicy: 'inherit' as const };
        return [
          {
            workspace,
            required: effectiveMfa(policy, data?.roleMfa),
            policy: JSON.stringify([
              role,
              policy.mfaPolicy,
              policy.mfaEnabled,
              data?.roleMfa?.[role],
            ]),
          },
        ];
      },
    );
    return policies.length
      ? policies
      : [{ workspace: '', required: user.mfaEnabled, policy: 'account-default' }];
  }

  private trustSignature(user: AppUser): string {
    return JSON.stringify(this.accountPolicies(user));
  }

  signInDemoSession(): Observable<AuthSession> {
    const session = this.establishSession(DEMO_USER, false);
    return of(session).pipe(delay(900));
  }

  requestPasswordReset(_email: string): Observable<void> {
    return of(void 0).pipe(delay(LATENCY_MS));
  }

  resetPassword(currentPassword: string, _newPassword: string): Observable<void> {
    if (currentPassword !== DEMO_PASSWORD) {
      return throwError(() => new Error('Your current password is incorrect.')).pipe(
        delay(LATENCY_MS),
      );
    }
    return of(void 0).pipe(delay(LATENCY_MS));
  }

  getInvite(token: string): Invite | undefined {
    return INVITES[token];
  }

  acceptInvite(token: string): Observable<AuthSession> {
    const invite = INVITES[token];
    if (!invite || invite.status !== 'pending') {
      return throwError(() => new Error('This invitation is no longer valid.'));
    }
    invite.status = 'accepted';
    const user: AppUser = { ...DEMO_USER, roleCode: invite.roleCode };
    const session = this.establishSession(user, false);
    return of(session).pipe(delay(LATENCY_MS));
  }

  declineInvite(token: string): Observable<void> {
    const invite = INVITES[token];
    if (invite) {
      invite.status = 'declined';
    }
    return of(void 0).pipe(delay(LATENCY_MS));
  }

  setWorkspace(workspaceId: string): void {
    const current = this._session();
    if (!current) {
      return;
    }
    const next: AuthSession = { ...current, workspaceId };
    this._session.set(next);
    this.persistSession(next);
  }

  grantWorkspaceAccess(workspaceId: string): void {
    const session = this._session();
    if (!session || session.user.workspaceIds.includes(workspaceId)) return;
    const next = {
      ...session,
      user: { ...session.user, workspaceIds: [...session.user.workspaceIds, workspaceId] },
    };
    this._session.set(next);
    this.persistSession(next);
  }

  signOut(): void {
    this._session.set(null);
    this._pendingUser.set(null);
    localStorage.removeItem(SESSION_KEY);
  }

  hasRole(...codes: RoleCode[]): boolean {
    const user = this.currentUser();
    return !!user && codes.includes(user.roleCode);
  }

  private establishSession(user: AppUser, trustDevice: boolean): AuthSession {
    const session: AuthSession = {
      user: {
        ...user,
        workspaceIds: [...new Set([...user.workspaceIds, ...this.localWorkspaceIds()])],
      },
      workspaceId: null,
      mfaVerified: true,
      signedInAt: new Date().toISOString(),
    };
    this._session.set(session);
    this.persistSession(session);
    if (trustDevice) {
      localStorage.setItem(
        TRUSTED_DEVICE_PREFIX + user.email,
        JSON.stringify({
          signature: this.trustSignature(user),
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        }),
      );
    }
    return session;
  }

  private localWorkspaceIds(): string[] {
    try {
      return (
        JSON.parse(localStorage.getItem('cv_custom_workspaces_v1') ?? '[]') as { id: string }[]
      ).map((w) => w.id);
    } catch {
      return [];
    }
  }

  private isDeviceTrusted(user: AppUser): boolean {
    try {
      const trusted = JSON.parse(
        localStorage.getItem(TRUSTED_DEVICE_PREFIX + user.email) ?? 'null',
      );
      return trusted?.signature === this.trustSignature(user) && trusted.expiresAt > Date.now();
    } catch {
      return false;
    }
  }

  private persistSession(session: AuthSession): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable (e.g. private browsing) — session stays in-memory only.
    }
  }

  private restoreSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }
}
