import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore } from '../../shared/management.store';
import { Companies } from '../../companies/companies';
import { ManagementLayout } from '../../layout/management-layout';
import { IntegrationsSettings } from './integrations-settings';
interface Editor {
  keyName: string;
  revealedKey: string;
  backup: boolean;
  keys(): { id: string; name: string; created: string }[];
  keyError(): string;
  backupError(): string;
  rows(): { id: string; name: string }[];
  page: { set(value: number): void };
  currentPage(): number;
  pageCount(): number;
  createKey(): void;
  revokeKey(id: string): void;
  saveBackup(): void;
  discardBackup(): void;
  backupChanged(): boolean;
  setSearch(value: string): void;
  downloadBackup(): void;
  exportPeople(): void;
  canLeave(): boolean;
}
describe('Company integrations and data', () => {
  let store: ManagementStore;
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'manage/companies/integrations',
            component: IntegrationsSettings,
            canDeactivate: [(component: IntegrationsSettings) => component.canLeave()],
          },
          {
            path: 'manage/settings',
            redirectTo: 'manage/companies/integrations',
            pathMatch: 'full',
          },
          { path: 'manage/companies', component: Companies },
        ]),
      ],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    store = TestBed.inject(ManagementStore);
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => vi.restoreAllMocks());
  async function open(): Promise<Editor> {
    return (await harness.navigateByUrl(
      '/manage/companies/integrations',
      IntegrationsSettings,
    )) as unknown as Editor;
  }
  it('opens from Companies with the shared banner and keeps the sidebar item removed', async () => {
    await harness.navigateByUrl('/manage/companies', Companies);
    const link = harness.routeNativeElement!.querySelector(
      '.co-check-card[href="/manage/companies/integrations"]',
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();
    link.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.co-summary')!.textContent).toContain(
      store.company()!.name,
    );
    for (const title of ['API Access', 'Backup Preferences', 'Data Exports'])
      expect(harness.routeNativeElement!.textContent).toContain(title);
    expect(harness.routeNativeElement!.textContent).toContain('do not grant API access');
    const layout = TestBed.createComponent(ManagementLayout);
    layout.detectChanges();
    expect(
      layout.nativeElement.querySelector('.app-sidebar a[href="/manage/settings"]'),
    ).toBeNull();
    expect(
      layout.nativeElement.querySelector('.app-sidebar a[href="/manage/companies/integrations"]'),
    ).toBeNull();
    layout.destroy();
    await harness.navigateByUrl('/manage/settings');
    expect(TestBed.inject(Router).url).toBe('/manage/companies/integrations');
  });
  it('validates and creates only local metadata, preserving other records and pending backup edits', async () => {
    const editor = await open();
    editor.createKey();
    expect(editor.keyError()).toContain('name');
    editor.keyName = 'x'.repeat(81);
    editor.createKey();
    expect(editor.keys()).toEqual([]);
    const before = structuredClone(store.data());
    editor.backup = !before.backup;
    editor.keyName = '  Reporting  ';
    editor.createKey();
    expect(editor.keys()).toHaveLength(1);
    expect(editor.keys()[0].name).toBe('Reporting');
    expect(editor.keys()[0].created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(editor.revealedKey).toMatch(/^demo_/);
    expect(editor.keyName).toBe('');
    expect(JSON.stringify(store.data().apiKeys)).not.toContain('demo_');
    expect(store.data().people).toEqual(before.people);
    expect(store.data().backup).toBe(before.backup);
    expect(editor.backupChanged()).toBe(true);
    editor.keyName = 'reporting';
    editor.createKey();
    expect(editor.keyError()).toContain('already exists');
    expect(editor.keys()).toHaveLength(1);
  });
  it('retains the key name and does not reveal or publish a key when storage fails', async () => {
    const editor = await open();
    editor.keyName = 'Retry';
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    editor.createKey();
    expect(editor.keyError()).toContain('still here');
    expect(editor.keyName).toBe('Retry');
    expect(editor.revealedKey).toBe('');
    expect(editor.keys()).toEqual([]);
    save.mockRestore();
    editor.createKey();
    expect(editor.keys()).toHaveLength(1);
  });
  it('confirms revocation and preserves the key on cancellation or failed persistence', async () => {
    const editor = await open();
    editor.keyName = 'Reporting';
    editor.createKey();
    const id = editor.keys()[0].id;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    editor.revokeKey(id);
    expect(editor.keys()).toHaveLength(1);
    confirm.mockReturnValue(true);
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    editor.revokeKey(id);
    expect(editor.keys()).toHaveLength(1);
    expect(editor.keyError()).toContain('could not be removed');
    save.mockRestore();
    editor.revokeKey(id);
    expect(editor.keys()).toEqual([]);
    expect(editor.revealedKey).toBe('');
  });
  it('supports five-key pagination and search without changing stored legacy dates', async () => {
    store.saveWorkspace((data) => ({
      ...data,
      apiKeys: Array.from({ length: 12 }, (_, index) => ({
        id: 'key-' + index,
        name: 'Integration ' + index,
        created: '16/10/2026',
      })),
    }));
    const editor = await open();
    expect(editor.rows()).toHaveLength(5);
    expect(editor.pageCount()).toBe(3);
    editor.page.set(3);
    expect(editor.rows()).toHaveLength(2);
    editor.setSearch('Integration 1');
    expect(editor.currentPage()).toBe(1);
    expect(editor.rows()).toHaveLength(3);
    expect(store.data().apiKeys![0].created).toBe('16/10/2026');
  });
  it('saves backup preferences with retry and supports discard', async () => {
    const editor = await open();
    const initial = store.data().backup;
    editor.backup = !initial;
    const save = vi.spyOn(store, 'saveWorkspace').mockReturnValue(false);
    editor.saveBackup();
    expect(editor.backupError()).toContain('still here');
    expect(editor.backup).toBe(!initial);
    expect(store.data().backup).toBe(initial);
    save.mockRestore();
    editor.saveBackup();
    expect(editor.backupChanged()).toBe(false);
    expect(store.data().backup).toBe(!initial);
    editor.backup = initial;
    editor.discardBackup();
    expect(editor.backup).toBe(!initial);
  });
  it('exports saved data from only the current workspace and makes people CSV formula safe', async () => {
    store.saveWorkspace((data) => ({
      ...data,
      people: [{ ...data.people[0], name: '=HYPERLINK("x")', email: 'new@example.org' }],
      apiKeys: [{ id: 'saved', name: 'Current company key', created: '2026-10-16T10:00:00Z' }],
    }));
    const editor = await open();
    editor.backup = !store.data().backup;
    editor.keyName = 'Unsaved key';
    const download = vi.spyOn(store, 'download').mockImplementation(() => {});
    editor.downloadBackup();
    expect(download).toHaveBeenCalledWith(
      'workspace-backup.json',
      expect.any(String),
      'application/json',
    );
    const snapshot = JSON.parse(download.mock.calls[0][1]);
    expect(snapshot.backup).toBe(store.data().backup);
    expect(snapshot.apiKeys[0].name).toBe('Current company key');
    expect(JSON.stringify(snapshot)).not.toContain('Unsaved key');
    editor.exportPeople();
    expect(download).toHaveBeenLastCalledWith(
      'people.csv',
      expect.stringContaining("'=HYPERLINK"),
      'text/csv',
    );
  });
  it('blocks stale-workspace writes and resets key previews, forms and preferences after switching', async () => {
    const editor = await open();
    editor.keyName = 'Private workspace key';
    editor.createKey();
    const source = structuredClone(store.data());
    editor.keyName = 'Uncreated';
    editor.backup = false;
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    editor.createKey();
    expect(editor.keyError()).toContain('workspace');
    editor.saveBackup();
    expect(editor.backupError()).toContain('workspace');
    harness.detectChanges();
    expect(editor.keyName).toBe('');
    expect(editor.revealedKey).toBe('');
    expect(editor.keys()).toEqual([]);
    expect(editor.backup).toBe(store.data().backup);
    expect(store.records()['lqcs']).toEqual(source);
    expect(store.records()['riverside']).toBeUndefined();
  });
  it('guards unsaved preference and key-name edits before leaving', async () => {
    const editor = await open();
    expect(editor.canLeave()).toBe(true);
    editor.keyName = 'Unsaved';
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/manage/companies');
    expect(TestBed.inject(Router).url).toBe('/manage/companies/integrations');
    expect(confirm).toHaveBeenCalled();
    editor.keyName = '';
    editor.backup = !store.data().backup;
    expect(editor.canLeave()).toBe(false);
    editor.discardBackup();
    expect(editor.canLeave()).toBe(true);
  });
});
