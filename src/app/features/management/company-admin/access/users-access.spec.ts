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
  it('counts individual permissions including actions outside the module shortcuts', () => {
    const configuration = editor.configuration();
    const module = configuration.modules[0],
      submodule = module.submodules[0];
    editor.configuration.set({
      ...configuration,
      modules: [
        {
          ...module,
          submodules: [
            {
              ...submodule,
              permissions: [
                ...submodule.permissions,
                { code: 'care.records.approve', action: 'approve' },
                { code: 'care.records.publish', action: 'publish' },
              ],
            },
          ],
        },
      ],
    });
    editor.permissionCodes.set(['care.records.read', 'care.records.publish']);
    expect(editor.permissionCount()).toBe(2);
    expect(editor.permissionTotal()).toBe(3);
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
  it('shows only pending server invitations alongside memberships', () => {
    editor.invitations.set([
      { id: 'pending', email: 'invite@example.test', state: 'pending', role_code: testRole.code },
      { id: 'revoked', email: 'revoked@example.test', state: 'revoked', role_code: testRole.code },
    ]);
    expect(editor.tableMembers().map((member: any) => member.id)).toEqual(['pending']);
    expect(editor.tableMembers()[0].status).toBe('Invited');
  });
  it('resends and revokes invitations through company-scoped server endpoints', async () => {
    access.core = () => true;
    const api = TestBed.inject(AuthService).api as ReturnType<typeof vi.fn>;
    api.mockResolvedValue({ results: [] });
    const member = { id: 'invitation', email: 'invite@example.test', status: 'Invited' };
    await editor.invitationAction(member, 'resend');
    expect(api).toHaveBeenCalledWith(
      '/companies/north/invitations/invitation/resend',
      {},
      'POST',
      expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await editor.invitationAction(member, 'revoke');
    expect(api).toHaveBeenCalledWith(
      '/companies/north/invitations/invitation/revoke',
      {},
      'POST',
      undefined,
    );
    vi.restoreAllMocks();
  });
});
