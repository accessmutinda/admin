import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { StaffAddDialog } from './staff-add-dialog';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, it, expect, vi } from 'vitest';
import { HrWorkspace } from './hr-workspace';
import { HrService } from './hr.service';
import { PeopleApiService } from './people-api.service';

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
  const open = vi.fn(() => ({ afterClosed: () => of(undefined) }));
  TestBed.configureTestingModule({
    providers: [
      { provide: MatDialog, useValue: { open } },
      provideRouter([
        { path: 'manage/people/staff', component: HrWorkspace, data: { hrMode: mode } },
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
  const button = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find((a) =>
    a.textContent?.includes('Add Staff'),
  );
  return { harness, button, open };
}

const hiringPermissions = ['records.create', 'onboarding.create'];
describe('Staff directory Add Staff Member', () => {
  it('opens the direct staff wizard without recruitment permissions', async () => {
    const { harness, button, open } = await workspace(hiringPermissions);
    expect(button).toBeDefined();
    button!.click();
    await harness.fixture.whenStable();
    expect(open).toHaveBeenCalledWith(StaffAddDialog, expect.objectContaining({ width: '780px' }));
  });
  it('connects both the heading and Quick Actions buttons on the overview', async () => {
    const { harness, open } = await workspace(hiringPermissions, 'overview');
    const buttons = Array.from(harness.routeNativeElement!.querySelectorAll('button')).filter(
      (button) => button.textContent?.includes('Add Staff'),
    );
    expect(buttons).toHaveLength(2);
    for (const button of buttons) button.click();
    expect(open).toHaveBeenCalledTimes(2);
  });
  for (const missing of hiringPermissions) {
    it(`hides staff creation without ${missing}`, async () => {
      const { button } = await workspace(
        hiringPermissions.filter((permission) => permission !== missing),
      );
      expect(button).toBeUndefined();
    });
  }
});
