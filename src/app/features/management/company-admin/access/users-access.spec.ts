import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ManagementStore } from '../../shared/management.store';
import { UsersAccess } from './users-access';
import { accessFixture, testRole } from './access-test-fixtures.test-support';

describe('Company role permission editor', () => {
  let access: ReturnType<typeof accessFixture>;
  let editor: any;
  beforeEach(async () => {
    access = accessFixture();
    TestBed.configureTestingModule({
      imports: [UsersAccess],
      providers: [
        provideRouter([]),
        { provide: CompanyAccessService, useValue: access },
        { provide: AuthService, useValue: { api: vi.fn() } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        {
          provide: ManagementStore,
          useValue: {
            company: signal({ id: 'north', name: 'North', code: 'N', modules: [], active: true }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(UsersAccess);
    fixture.detectChanges();
    await fixture.whenStable();
    editor = fixture.componentInstance;
  });
  it('keeps a failed permission edit available to retry', async () => {
    access.saveRole.mockRejectedValue(new Error('Record changed. Reload and retry.'));
    editor.toggle('care', 'records', 'edit');
    await editor.save();
    expect(editor.dirty()).toBe(true);
    expect(editor.has('care', 'records', 'edit')).toBe(true);
    expect(editor.selected().version).toBe(1);
    expect(editor.error()).toContain('Reload');
  });
  it('accepts confirmed role permissions and clears the draft after save', async () => {
    access.saveRole.mockResolvedValue({ ...testRole, version: 2, etag: '"v2"', permissions: [] });
    editor.toggle('care', 'records', 'read');
    await editor.save();
    expect(access.saveRole).toHaveBeenCalledWith(
      'north',
      expect.objectContaining({ etag: '"v1"' }),
      [],
      [],
      true,
    );
    expect(editor.dirty()).toBe(false);
    expect(editor.selected().etag).toBe('"v2"');
    expect(access.refresh).toHaveBeenCalled();
  });
  it('preserves each role draft when switching the original role selector', () => {
    editor.roles.update((roles: (typeof testRole)[]) => [
      ...roles,
      { ...testRole, id: 'role-two', code: 'VIEWER', name: 'Viewer', permissions: [] },
    ]);
    editor.toggle('care', 'records', 'edit');
    editor.choose('role-two');
    expect(editor.has('care', 'records', 'edit')).toBe(false);
    editor.choose(testRole.id);
    expect(editor.has('care', 'records', 'edit')).toBe(true);
    editor.choose('role-two');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(editor.canLeave()).toBe(false);
    vi.restoreAllMocks();
  });
  it('creates an empty custom role using a stable retry key', async () => {
    editor.name = 'Company nurse';
    editor.code = 'nurse';
    editor.description = '';
    access.createRole.mockRejectedValue(new Error('Unavailable'));
    await editor.create();
    await editor.create();
    expect(access.createRole.mock.calls[0][2]).toBe(access.createRole.mock.calls[1][2]);
    expect(access.createRole.mock.calls[0][1].code).toBe('NURSE');
  });
});
