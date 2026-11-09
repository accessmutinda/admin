import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ManagementStore } from '../shared/management.store';
import { CompanyUserDialog } from './company-user-dialog';
import { testRole } from '../company-admin/access/access-test-fixtures.test-support';

describe('Company membership API dialog', () => {
  const api = vi.fn();
  const close = vi.fn();
  async function open(mode: 'invite' | 'edit' | 'delete') {
    api.mockReset().mockResolvedValue({});
    close.mockReset();
    TestBed.configureTestingModule({
      imports: [CompanyUserDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            companyId: 'north',
            mode,
            member:
              mode === 'invite'
                ? undefined
                : {
                    id: 'member-one',
                    name: 'Nurse',
                    email: 'nurse@example.com',
                    role: 'Company nurse',
                    roleCode: 'NURSE',
                    status: 'Active',
                    version: 3,
                  },
          },
        },
        { provide: MatDialogRef, useValue: { close, disableClose: false } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: signal('north'),
            roles: vi.fn().mockResolvedValue({ results: [testRole] }),
            refresh: vi.fn().mockResolvedValue(undefined),
          },
        },
        { provide: AuthService, useValue: { api } },
        {
          provide: ManagementStore,
          useValue: { companies: signal([{ id: 'north', name: 'North' }]) },
        },
        { provide: ToastService, useValue: { success: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(CompanyUserDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return fixture.componentInstance as any;
  }
  it('uses company custom role codes and a membership precondition', async () => {
    const editor = await open('edit');
    await editor.save();
    expect(api).toHaveBeenCalledWith(
      '/companies/north/memberships/member-one',
      { role_code: 'NURSE', status: 'active' },
      'PATCH',
      { 'If-Match': '"v3"' },
    );
    expect(close).toHaveBeenCalledWith(true);
  });
  it('queues an invitation with an idempotency key', async () => {
    const editor = await open('invite');
    editor.email = 'nurse@example.com';
    editor.role = 'NURSE';
    await editor.save();
    expect(api).toHaveBeenCalledWith(
      '/companies/north/invitations',
      { email: 'nurse@example.com', role_code: 'NURSE' },
      'POST',
      { 'Idempotency-Key': expect.any(String) },
    );
  });
  it('retains the dialog and displays a rejected membership change', async () => {
    const editor = await open('delete');
    api.mockRejectedValue(new Error('Last active Company Admin cannot be removed.'));
    await editor.save();
    expect(close).not.toHaveBeenCalled();
    expect(editor.error()).toContain('Last active');
  });
});
