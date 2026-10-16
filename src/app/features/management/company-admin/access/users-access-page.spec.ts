import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { Companies } from '../../companies/companies';
import { ManagementLayout } from '../../layout/management-layout';
import { ManagementStore, Member } from '../../shared/management.store';
import { UsersAccess } from './users-access';
import { accessChange, accessCsv } from './access.models';
@Component({ template: '' })
class EmptyPage {}
interface AccessEditor {
  role: string;
  permissions: Record<string, boolean[]>;
  error(): string;
  rows(): Member[];
  page: { set(value: number): void };
  currentPage(): number;
  pageCount(): number;
  search(): string;
  selection(): string[];
  setFilter(key: 'search' | 'roleFilter' | 'statusFilter', value: string): void;
  toggleMember(id: string): void;
  togglePage(): void;
  exportUsers(): void;
  exportHistory(): void;
  openMember(mode: 'invite' | 'edit' | 'delete', member?: Member): void;
  applyPermissionPreset(preset: 'view' | 'none' | 'standard'): void;
  savePermissions(): void;
  changeRole(): void;
  level(role: string, module?: string): { label: string; tone: string };
  history(): { action: string; actor: string; subject: string }[];
}
interface MemberEditor {
  email: string;
  role: string;
  status: string;
  save(): void;
}
describe('Company users and roles page', () => {
  let store: ManagementStore;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage/companies/access',
            component: UsersAccess,
            canDeactivate: [(component: UsersAccess) => component.canLeave()],
          },
          { path: 'manage/access', redirectTo: 'manage/companies/access', pathMatch: 'full' },
          { path: 'manage/companies', component: Companies },
          { path: 'manage/workflows', component: EmptyPage },
        ]),
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    vi.restoreAllMocks();
  });
  async function open(query = ''): Promise<AccessEditor> {
    return (await harness.navigateByUrl(
      '/manage/companies/access' + query,
      UsersAccess,
    )) as unknown as AccessEditor;
  }
  function memberDialog(): MemberEditor {
    return TestBed.inject(MatDialog).openDialogs.at(-1)!
      .componentInstance as unknown as MemberEditor;
  }
  function populate() {
    store.saveWorkspace((data) => ({
      ...data,
      members: Array.from({ length: 23 }, (_, index) => ({
        id: 'user-' + index,
        name: 'User ' + index,
        email: `person${index}@example.org`,
        role: index % 2 ? 'Care Worker' : 'Company Admin',
        status: index % 3 ? 'Active' : 'Invited',
        department: index % 2 ? 'Care' : 'Operations',
      })),
    }));
  }
  it('opens from Companies, removes standalone sidebar navigation, and retains legacy permission links', async () => {
    await harness.navigateByUrl('/manage/companies', Companies);
    const card = harness.routeNativeElement!.querySelector(
      '.co-check-card[href="/manage/companies/access"]',
    ) as HTMLAnchorElement;
    expect(card).not.toBeNull();
    card.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.ua-users-table')).not.toBeNull();
    const layout = TestBed.createComponent(ManagementLayout);
    layout.detectChanges();
    expect(
      layout.nativeElement.querySelector('.app-sidebar a[href="/manage/companies/access"]'),
    ).toBeNull();
    expect(layout.nativeElement.querySelector('.app-sidebar a[href="/manage/access"]')).toBeNull();
    layout.destroy();
    await harness.navigateByUrl('/manage/access?tab=permissions&role=Finance%20Officer');
    const editor = harness.routeDebugElement!.componentInstance as AccessEditor;
    expect(TestBed.inject(Router).url).toContain('/manage/companies/access?');
    expect(harness.routeNativeElement!.querySelector('#ua-permission-editor')).not.toBeNull();
    expect(editor.role).toBe('Finance Officer');
  });
  it('renders users and the role editor directly with no summary matrix, history panel or configure button', async () => {
    await open();
    const element = harness.routeNativeElement!;
    expect(element.querySelector('.co-summary')!.textContent).toContain(store.company()!.name);
    expect(element.querySelectorAll('.ua-users-table tbody tr')).toHaveLength(4);
    expect(element.querySelector('.ua-matrix')).toBeNull();
    expect(element.querySelectorAll('table')).toHaveLength(1);
    expect(element.querySelector('h1')!.textContent).not.toContain('Approval');
    expect(element.querySelector('#ua-history-title')).toBeNull();
    expect(element.querySelectorAll('.ua-module-card')).toHaveLength(6);
    expect(element.querySelectorAll('.ua-module-actions input[type=checkbox]')).toHaveLength(30);
    expect(element.querySelectorAll('.ua-feature-card')).toHaveLength(2);
    expect(
      [...element.querySelectorAll('button')].some((button) =>
        /^Configure Role$/.test(button.textContent!.trim()),
      ),
    ).toBe(false);
    expect(element.textContent).not.toContain('Close Editor');
    expect(element.querySelectorAll('.ua-mfa.ua-enabled')).toHaveLength(0);
    expect(element.querySelectorAll('[role=tab]')).toHaveLength(0);
    expect(element.textContent).toContain('Role Permissions');
  });
  it('edits and saves module permissions directly from the visible cards', async () => {
    const editor = await open();
    const checkbox = harness.routeNativeElement!.querySelector(
      '.ua-module-actions input',
    ) as HTMLInputElement;
    checkbox.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(editor.permissions['Care delivery'][0]).toBe(false);
    const save = [
      ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>(
        '.ua-permission-footer button',
      ),
    ].find((button) => button.textContent!.includes('Save Changes'))!;
    expect(save.disabled).toBe(false);
    save.click();
    harness.detectChanges();
    expect(store.data().permissions['Registered Manager:Care delivery'][0]).toBe(false);
    expect(harness.routeNativeElement!.querySelector('.ua-save-state')!.textContent).toContain(
      'up to date',
    );
  });
  it('paginates five users, combines filters and exports only selected real rows safely', async () => {
    populate();
    const editor = await open();
    expect(editor.rows()).toHaveLength(5);
    expect(editor.pageCount()).toBe(5);
    editor.page.set(5);
    expect(editor.rows()).toHaveLength(3);
    editor.setFilter('roleFilter', 'Care Worker');
    expect(editor.currentPage()).toBe(1);
    expect(editor.rows()).toHaveLength(5);
    editor.setFilter('statusFilter', 'Active');
    expect(
      editor.rows().every((member) => member.role === 'Care Worker' && member.status === 'Active'),
    ).toBe(true);
    editor.setFilter('search', 'person1');
    expect(editor.rows().every((member) => member.email.includes('person1'))).toBe(true);
    editor.toggleMember(editor.rows()[0].id);
    const selected = editor.rows()[0];
    const download = vi.spyOn(store, 'download').mockImplementation(() => {});
    editor.exportUsers();
    expect(download).toHaveBeenCalledWith(
      'company-users.csv',
      expect.stringContaining(selected.email),
    );
    expect(download.mock.calls[0][1].split('\r\n')).toHaveLength(2);
    expect(accessCsv([['=HYPERLINK("x")', 'hello, world']])).toContain("'=HYPERLINK");
  });
  it('invites, edits and removes through existing popups and records actual actor/time for each successful change', async () => {
    const editor = await open();
    const before = store.data().people;
    editor.openMember('invite');
    let popup = memberDialog();
    popup.email = ' NEW@Example.org ';
    popup.role = 'Care Worker';
    popup.save();
    const member = store.data().members.find((member) => member.email === 'new@example.org')!;
    expect(member.status).toBe('Invited');
    expect(editor.history()[0].action).toBe('invited');
    editor.openMember('edit', member);
    popup = memberDialog();
    popup.email = 'cannot-change@example.org';
    popup.role = 'Finance Officer';
    popup.status = 'Inactive';
    popup.save();
    const saved = store.data().members.find((value) => value.id === member.id)!;
    expect(saved.email).toBe('new@example.org');
    expect(saved.role).toBe('Finance Officer');
    expect(saved.status).toBe('Inactive');
    expect(editor.history()[0].action).toBe('updated');
    editor.openMember('delete', saved);
    memberDialog().save();
    expect(store.data().members.some((value) => value.id === member.id)).toBe(false);
    expect(editor.history()[0].action).toBe('removed');
    expect(editor.history()).toHaveLength(3);
    expect(
      editor
        .history()
        .every((change) => change.actor === TestBed.inject(AuthService).currentUser()!.name),
    ).toBe(true);
    expect(store.data().people).toEqual(before);
    const download = vi.spyOn(store, 'download').mockImplementation(() => {});
    editor.exportHistory();
    expect(download).toHaveBeenCalledWith(
      'company-access-history.csv',
      expect.stringContaining('new@example.org'),
    );
  });
  it('does not invent changes for no-op edits, cancellation or failed saves', async () => {
    const editor = await open();
    editor.openMember('edit', store.data().members[0]);
    memberDialog().save();
    expect(editor.history()).toHaveLength(0);
    editor.openMember('invite');
    memberDialog().email = 'retry@example.org';
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    memberDialog().save();
    expect(editor.history()).toHaveLength(0);
    expect(TestBed.inject(MatDialog).openDialogs.length).toBeGreaterThan(0);
    save.mockRestore();
    memberDialog().save();
    expect(editor.history()).toHaveLength(1);
  });
  it('shows saved permission levels and preserves module, rota and payroll editing with retryable failures', async () => {
    const editor = await open();
    editor.role = 'Care Worker';
    editor.changeRole();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('#ua-permission-editor')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('#ua-permission-editor')).not.toBeNull();
    editor.applyPermissionPreset('view');
    expect(editor.level('Care Worker', 'Care delivery').tone).toBe('full');
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    editor.savePermissions();
    expect(editor.error()).toContain('still here');
    expect(editor.history()).toHaveLength(0);
    save.mockRestore();
    editor.savePermissions();
    expect(editor.level('Care Worker', 'Care delivery').tone).toBe('view');
    expect(store.data().rotaPermissions!['Care Worker']).toEqual(['view']);
    expect(store.data().payrollPermissions!['Care Worker']).toEqual(['view']);
    expect(editor.history()[0].action).toBe('permissions');
    editor.savePermissions();
    expect(editor.history()).toHaveLength(1);
    editor.applyPermissionPreset('none');
    editor.savePermissions();
    expect(editor.level('Care Worker').tone).toBe('none');
  });
  it('protects unsaved drafts for other roles when leaving and resets them on workspace change', async () => {
    const editor = await open();
    editor.applyPermissionPreset('view');
    editor.role = 'HR Officer';
    editor.changeRole();
    editor.applyPermissionPreset('none');
    editor.savePermissions();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/manage/companies');
    expect(TestBed.inject(Router).url).toBe('/manage/companies/access');
    expect(confirm).toHaveBeenCalled();
    editor.openMember('invite');
    const popup = memberDialog();
    popup.email = 'cross@example.org';
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    editor.savePermissions();
    expect(editor.error()).toContain('workspace');
    harness.detectChanges();
    expect(editor.role).toBe('Registered Manager');
    expect(harness.routeNativeElement!.querySelector('#ua-permission-editor')).not.toBeNull();
    expect(editor.selection()).toEqual([]);
    expect(editor.history()).toEqual([]);
    popup.save();
    expect(store.records()['riverside']).toBeUndefined();
  });
  it('opens the Companies invite shortcut with the Company Admin role selected', async () => {
    await harness.navigateByUrl('/manage/companies', Companies);
    const link = harness.routeNativeElement!.querySelector(
      'a[href="/manage/companies/access?invite=true"]',
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    link.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(memberDialog().role).toBe('Company Admin');
  });
  it('shows recorded metadata and keeps access history isolated between workspaces', async () => {
    store.saveWorkspace((data) => ({
      ...data,
      members: data.members.map((member, index) =>
        index === 0
          ? {
              ...member,
              department: 'Operations',
              lastLoginAt: '2026-10-16T08:00:00Z',
              mfaEnabled: true,
            }
          : member,
      ),
      accessHistory: [
        accessChange(
          TestBed.inject(AuthService).currentUser(),
          'permissions',
          'Finance Officer',
          'Recorded change',
        ),
      ],
    }));
    const editor = await open();
    expect(harness.routeNativeElement!.querySelectorAll('.ua-mfa.ua-enabled')).toHaveLength(1);
    expect(harness.routeNativeElement!.textContent).toContain('Operations');
    expect(editor.history()).toHaveLength(1);
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    harness.detectChanges();
    expect(editor.history()).toHaveLength(0);
  });
});
