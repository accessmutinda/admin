import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { StaffAddDialog } from './staff-add-dialog';

async function dialog() {
  const company = signal('north');
  const close = vi.fn();
  const api = vi
    .fn()
    .mockResolvedValue({
      company_id: 'north',
      local_date: '2026-11-13',
      branches: ['London'],
      employment_types: ['Full time'],
    });
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { profile: signal({ id: 1 }), api } },
      { provide: CompanyAccessService, useValue: { companyId: company, can: () => true } },
      { provide: MatDialogRef, useValue: { close, disableClose: false } },
    ],
  });
  const fixture = TestBed.createComponent(StaffAddDialog);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, close, api, company };
}
const fields = {
  first_name: 'Jane',
  surname: 'Direct',
  email: 'jane@example.com',
  reference: 'DIR-1',
  branch_name: 'London',
  job_title: 'Care Worker',
};

describe('Direct staff wizard', () => {
  it('validates required details before advancing and retains entered data when moving back', async () => {
    const { fixture, component } = await dialog();
    const submit = () => {
      fixture.nativeElement
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    submit();
    expect(component['step']()).toBe(0);
    for (const [name, value] of Object.entries(fields).filter(([name]) =>
      ['first_name', 'surname', 'email'].includes(name),
    )) {
      const input = fixture.nativeElement.querySelector(`input[name="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    fixture.detectChanges();
    await fixture.whenStable();
    submit();
    expect(component['step']()).toBe(1);
    component['back']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component['form'].first_name).toBe('Jane');
    expect(fixture.nativeElement.querySelector('input[name="first_name"]').value).toBe('Jane');
  });

  it('retries an uncertain save with the same key and creates a new key after editing', async () => {
    const { component, api } = await dialog();
    Object.assign(component['form'], fields);
    api.mockRejectedValue(Error('Connection lost'));
    await component['save']();
    const initial = api.mock.calls.at(-1)!;
    await component['save']();
    expect(api.mock.calls.at(-1)![3]).toEqual(initial[3]);
    component['form'].surname = 'Changed';
    await component['save']();
    expect(api.mock.calls.at(-1)![3]).not.toEqual(initial[3]);
    expect(component['error']()).toBe('Connection lost');
  });

  it('prevents duplicate submissions and returns the created account to the directory', async () => {
    const { component, api, close } = await dialog();
    Object.assign(component['form'], fields);
    let resolve!: (value: unknown) => void;
    api.mockImplementationOnce(
      () =>
        new Promise((value) => {
          resolve = value;
        }),
    );
    const first = component['save']();
    await component['save']();
    expect(api.mock.calls.filter((call) => call[2] === 'POST')).toHaveLength(1);
    const result = {
      company_id: 'north',
      staff_id: 'staff-1',
      employment_id: 'employment-1',
      login_email: 'jdirect@careverity.com',
      status: 'Onboarding',
    };
    resolve(result);
    await first;
    expect(close).toHaveBeenCalledWith(result);
  });

  it('closes when the selected company changes and prevents saving into the old company', async () => {
    const { fixture, component, company, api, close } = await dialog();
    company.set('south');
    fixture.detectChanges();
    await component['save']();
    expect(close).toHaveBeenCalled();
    expect(api.mock.calls.filter((call) => call[2] === 'POST')).toHaveLength(0);
  });
});
