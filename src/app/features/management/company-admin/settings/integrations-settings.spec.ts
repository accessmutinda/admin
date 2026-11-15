import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/ui/toast.service';
import { CompaniesApiService } from '../../companies/companies-api.service';
import { ManagementStore } from '../../shared/management.store';
import { IntegrationsSettings } from './integrations-settings';

describe('Company integration readiness and backup preferences', () => {
  let api: ReturnType<typeof vi.fn>;
  let store: any;
  beforeEach(() => {
    api = vi.fn().mockResolvedValue({ etag: '"v2"', backup_preference: 'enabled' });
    store = {
      companyId: signal('north'),
      company: signal({ id: 'north', name: 'North', code: 'N', modules: [] }),
      data: signal({ apiKeys: [], backup: false, people: [] }),
      download: vi.fn(),
      exportPeople: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ManagementStore, useValue: store },
        { provide: AuthService, useValue: { api } },
        { provide: CompaniesApiService, useValue: { loading: () => false, error: () => '' } },
        { provide: ToastService, useValue: { success: vi.fn() } },
      ],
    });
  });
  async function open() {
    const fixture = TestBed.createComponent(IntegrationsSettings);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, editor: fixture.componentInstance as any };
  }
  it('loads the saved company preference and disables unavailable API credential creation', async () => {
    const { fixture, editor } = await open();
    expect(api).toHaveBeenCalledWith('/companies/north/preferences');
    expect(editor.backup).toBe(true);
    expect(editor.backupChanged()).toBe(false);
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.includes('Create API Key'));
    expect(button?.disabled).toBe(true);
  });
  it('saves the preference using server version control and retains unrelated data', async () => {
    const { editor } = await open();
    editor.backup = false;
    api.mockResolvedValueOnce({ etag: '"v3"', backup_preference: 'disabled' });
    await editor.saveBackup();
    expect(api).toHaveBeenLastCalledWith(
      '/companies/north/preferences',
      { backup_preference: 'disabled' },
      'PATCH',
      { 'If-Match': '"v2"' },
    );
    expect(editor.backupChanged()).toBe(false);
    expect(store.data().people).toEqual([]);
  });
  it('retains failed edits and supports discarding to the server snapshot', async () => {
    const { editor } = await open();
    editor.backup = false;
    api.mockRejectedValueOnce(new Error('The record changed. Reload.'));
    await editor.saveBackup();
    expect(editor.backupError()).toContain('record changed');
    expect(editor.backupChanged()).toBe(true);
    editor.discardBackup();
    expect(editor.backup).toBe(true);
  });
  it('does not apply a late response from a different company', async () => {
    let resolve: any;
    api.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    const fixture = TestBed.createComponent(IntegrationsSettings);
    fixture.detectChanges();
    const editor = fixture.componentInstance as any;
    store.companyId.set('south');
    fixture.detectChanges();
    await fixture.whenStable();
    resolve({ etag: '"v99"', backup_preference: 'disabled' });
    await fixture.whenStable();
    expect(editor.backup).toBe(true);
    editor.backup = false;
    api.mockResolvedValueOnce({ etag: '"v3"', backup_preference: 'disabled' });
    await editor.saveBackup();
    expect(api).toHaveBeenLastCalledWith(
      '/companies/south/preferences',
      expect.anything(),
      'PATCH',
      { 'If-Match': '"v2"' },
    );
  });
});
