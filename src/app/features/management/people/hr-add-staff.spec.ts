import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi } from 'vitest';
import { HrWorkspace } from './hr-workspace';
import { HrService } from './hr.service';
import { PeopleApiService } from './people-api.service';

@Component({ template: '<h1>Recruitment destination</h1>' })
class RecruitmentDestination {}

async function workspace(permissions: string[], mode = 'directory') {
  TestBed.resetTestingModule();
  const has = (permission: string) => permissions.includes(permission);
  const api = {
    companyId: signal(''),
    allowed: signal(false),
    loading: signal(false),
    error: signal(''),
    summary: signal({
      company: { id: 'north', name: 'North', code: 'N', sector: 'Care', head_office_address: '' },
      totals: { staff: 0, active: 0, onboarding: 0, branches: 0, drafts: 0 },
      unavailable: {},
    }),
    directory: signal(null),
    reset: vi.fn(),
    load: vi.fn(),
    access: {
      canPath: (path: string) => path === '/manage/recruitment' && has('recruitment.read'),
      can: (_module: string, submodule: string, action: string) => has(`${submodule}.${action}`),
    },
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'manage/people/staff', component: HrWorkspace, data: { hrMode: mode } },
        { path: 'manage/recruitment', component: RecruitmentDestination },
      ]),
      { provide: PeopleApiService, useValue: api },
      {
        provide: HrService,
        useValue: {
          can: (action: string) => action === 'create' && has('records.create'),
          store: { company: () => null },
        },
      },
    ],
  });
  const harness = await RouterTestingHarness.create('/manage/people/staff');
  const button = Array.from(harness.routeNativeElement!.querySelectorAll('a')).find((a) =>
    a.textContent?.includes('Add Staff'),
  );
  return { harness, button };
}

const hiringPermissions = [
  'records.create',
  'recruitment.read',
  'recruitment.create',
  'onboarding.create',
];
describe('Staff directory Add Staff Member', () => {
  it('opens the recruitment workflow used to create staff from an accepted offer', async () => {
    const { harness, button } = await workspace(hiringPermissions);
    expect(button).toBeDefined();
    expect(button!.getAttribute('href')).toBe('/manage/recruitment');
    expect(button!.getAttribute('aria-disabled')).not.toBe('true');
    button!.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/manage/recruitment');
    expect(harness.routeNativeElement!.textContent).toContain('Recruitment destination');
  });
  it('connects both the heading and Quick Actions buttons on the People & HR overview', async () => {
    const { harness } = await workspace(hiringPermissions, 'overview');
    const buttons = Array.from(harness.routeNativeElement!.querySelectorAll('a')).filter((a) =>
      a.textContent?.includes('Add Staff'),
    );
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.getAttribute('href')).toBe('/manage/recruitment');
      expect(button.getAttribute('aria-disabled')).not.toBe('true');
    }
  });
  for (const missing of hiringPermissions) {
    it(`does not offer an unusable staff-creation action without ${missing}`, async () => {
      const { button } = await workspace(
        hiringPermissions.filter((permission) => permission !== missing),
      );
      expect(button).toBeUndefined();
    });
  }
});
