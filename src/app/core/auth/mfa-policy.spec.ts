import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DEMO_EMAIL, DEMO_MFA_CODE, DEMO_PASSWORD, DEMO_USER } from './fixtures';
import { effectiveMfa, MfaPolicy } from './mfa-policy';

describe('Role defaults and user MFA overrides', () => {
  let auth: AuthService;
  function policy(roleRequired: boolean, override: MfaPolicy = 'inherit'): void {
    localStorage.setItem(
      'cv_management_v1',
      JSON.stringify({
        lqcs: {
          roleMfa: { 'Care Worker': roleRequired },
          members: [{ email: DEMO_EMAIL, role: 'Care Worker', mfaPolicy: override }],
        },
      }),
    );
  }
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
  });
  it('inherits a disabled role default and allows an individual user to require MFA', () => {
    expect(
      effectiveMfa(
        { email: DEMO_EMAIL, role: 'Care Worker', mfaEnabled: true },
        { 'Care Worker': false },
      ),
    ).toBe(false);
    policy(false);
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.pendingUser()).toBeNull();
    auth.signOut();
    policy(false, 'required');
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.pendingUser()?.email).toBe(DEMO_EMAIL);
    auth.verifyMfa(DEMO_MFA_CODE, false);
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('applies a saved user override when an active seeded company member signs in', () => {
    const member = {
      id: 'staff-1',
      name: 'Mary Wilson',
      email: 'mary@example.test',
      role: 'Care Worker',
      status: 'Active',
      mfaPolicy: 'required',
    };
    localStorage.setItem(
      'cv_management_v1',
      JSON.stringify({ lqcs: { members: [member], roleMfa: { 'Care Worker': false } } }),
    );
    auth.signIn(member.email, DEMO_PASSWORD);
    expect(auth.pendingUser()?.email).toBe(member.email);
    auth.verifyMfa(DEMO_MFA_CODE, false);
    expect(auth.currentUser()?.name).toBe(member.name);
    expect(auth.currentUser()?.workspaceIds).toContain('lqcs');
    auth.signOut();
    member.mfaPolicy = 'inherit';
    localStorage.setItem(
      'cv_management_v1',
      JSON.stringify({ lqcs: { members: [member], roleMfa: { 'Care Worker': false } } }),
    );
    auth.signIn(member.email, DEMO_PASSWORD);
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('allows an explicit exemption and restores the role default when inheritance is selected', () => {
    policy(true, 'not-required');
    expect(auth.requiresMfa(DEMO_USER)).toBe(false);
    policy(true);
    expect(auth.requiresMfa(DEMO_USER)).toBe(true);
    expect(
      effectiveMfa({
        email: DEMO_EMAIL,
        role: 'Care Worker',
        mfaEnabled: false,
        mfaPolicy: 'inherit',
      }),
    ).toBe(true);
  });
  it('applies the same policy to Google sign-in without opening a session before verification', () => {
    policy(false, 'required');
    auth.signInWithGoogle();
    expect(auth.pendingUser()).not.toBeNull();
    expect(auth.session()).toBeNull();
    expect(localStorage.getItem('cv_session')).toBeNull();
    auth.verifyMfa(DEMO_MFA_CODE, false);
    expect(auth.session()?.mfaVerified).toBe(true);
    auth.signOut();
    policy(false);
    auth.signInWithGoogle();
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('honours trusted devices until their effective policy changes', () => {
    policy(true);
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    auth.verifyMfa(DEMO_MFA_CODE, true);
    auth.signOut();
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(auth.isAuthenticated()).toBe(true);
    auth.signOut();
    policy(false, 'required');
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.pendingUser()).not.toBeNull();
  });
  it('requires verification again after trusted-device expiry', () => {
    policy(true);
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    auth.verifyMfa(DEMO_MFA_CODE, true);
    auth.signOut();
    const key = 'cv_trusted_device:' + DEMO_EMAIL;
    const trusted = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...trusted, expiresAt: Date.now() - 1 }));
    auth.signIn(DEMO_EMAIL, DEMO_PASSWORD);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.pendingUser()).not.toBeNull();
  });
  it('uses the strongest effective policy across configured workspaces and survives a reload', () => {
    policy(false);
    const records = JSON.parse(localStorage.getItem('cv_management_v1')!);
    records.riverside = { roleMfa: { 'Care Worker': true }, members: [] };
    localStorage.setItem('cv_management_v1', JSON.stringify(records));
    TestBed.resetTestingModule();
    expect(TestBed.inject(AuthService).requiresMfa(DEMO_USER)).toBe(true);
  });
});
