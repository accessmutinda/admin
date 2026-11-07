import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from './auth.service';
import { guestGuard, workspaceGuard, workspaceSelectionGuard } from './auth.guard';
import { DEMO_USER } from './fixtures';

@Component({ template: '<h1>Destination</h1>' })
class Destination {}

describe('Company Admin entry routing', () => {
  function session(roleCode: 'CA' | 'PO', workspaceIds = ['lqcs']): void {
    localStorage.setItem(
      'cv_session',
      JSON.stringify({
        user: { ...DEMO_USER, roleCode, workspaceIds },
        workspaceId: null,
        mfaVerified: true,
        signedInAt: new Date().toISOString(),
      }),
    );
  }
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'select-workspace',
            component: Destination,
            canActivate: [workspaceSelectionGuard],
          },
          { path: 'manage/rota/overview', component: Destination, canActivate: [workspaceGuard] },
          { path: 'auth/sign-in', component: Destination, canActivate: [guestGuard] },
          { path: 'access-denied', component: Destination },
        ]),
      ],
    });
  });
  it('bypasses the picker and selects the assigned company for Company Admin', async () => {
    session('CA');
    await RouterTestingHarness.create('/select-workspace');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/overview');
    expect(TestBed.inject(AuthService).session()?.workspaceId).toBe('lqcs');
  });
  it('sends an authenticated Company Admin visiting sign-in to the rota overview', async () => {
    session('CA');
    await RouterTestingHarness.create('/auth/sign-in');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/overview');
  });
  it('opens the overview on a direct link without sending Company Admin through the picker', async () => {
    session('CA');
    await RouterTestingHarness.create('/manage/rota/overview');
    expect(TestBed.inject(Router).url).toBe('/manage/rota/overview');
    expect(TestBed.inject(AuthService).session()?.workspaceId).toBe('lqcs');
  });
  it('keeps workspace selection available to Super Admin', async () => {
    session('PO');
    await RouterTestingHarness.create('/select-workspace');
    expect(TestBed.inject(Router).url).toBe('/select-workspace');
    expect(TestBed.inject(AuthService).session()?.workspaceId).toBeNull();
  });
  it('denies Company Admin entry when no company is assigned', async () => {
    session('CA', []);
    await RouterTestingHarness.create('/select-workspace');
    expect(TestBed.inject(Router).url).toBe('/access-denied');
    expect(TestBed.inject(AuthService).session()?.workspaceId).toBeNull();
  });
});
