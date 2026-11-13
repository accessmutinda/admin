import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { StaffAccounts } from './staff-accounts';
import { StaffAccountsApi } from './staff-accounts-api.service';
import { describe, it, expect, vi } from 'vitest';

describe('Staff account management page', () => {
  it('shows a real security confirmation form and requires a reason', async () => {
    const api = {
      canRead: signal(true),
      canManage: signal(true),
      scope: signal('north'),
      access: { can: () => true },
      page: signal({
        count: 1,
        results: [
          {
            id: 'one',
            name: 'John Smith',
            email: 'jsmith@careverity.com',
            user_id: 42,
            company_id: 'north',
            status: 'active',
            mfa_override: 'not-required',
            mfa_required: false,
            mfa_enrolled: false,
            active_sessions: 0,
            must_change_password: true,
            account_active: true,
          },
        ],
      }),
      loading: signal(false),
      saving: signal(false),
      notice: signal(''),
      error: signal(''),
      load: vi.fn(),
      isSelf: () => false,
      save: vi.fn().mockResolvedValue(true),
    };
    TestBed.configureTestingModule({ imports: [StaffAccounts], providers: [provideRouter([])] });
    TestBed.overrideComponent(StaffAccounts, {
      set: { providers: [{ provide: StaffAccountsApi, useValue: api }] },
    });
    const fixture = TestBed.createComponent(StaffAccounts);
    fixture.detectChanges();
    const reset = fixture.nativeElement.querySelector(
      '[aria-label="Reset password for John Smith"]',
    ) as HTMLButtonElement;
    expect(reset).not.toBeNull();
    reset.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = document.querySelector('mat-dialog-container')!;
    expect(dialog.textContent).toContain('They must choose a new password');
    const submit = dialog.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    const reason = dialog.querySelector('textarea') as HTMLTextAreaElement;
    reason.value = 'Verified support request';
    reason.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.tick();
    expect(submit.disabled).toBe(false);
    submit.click();
    await fixture.whenStable();
    expect(api.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'one' }),
      'reset-password',
      'Verified support request',
      'not-required',
      '',
    );
  });
});
