import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth/auth.service';
import { WorkspaceService } from '../core/auth/workspace.service';
import { WORKSPACES } from '../core/auth/fixtures';
import { ManagementStore } from '../features/management/shared/management.store';
import { installSystemDemo } from './system-demo';
import { SYSTEM_DEMO_VERSION } from './system-demo-utils';
import { RotaService } from '../features/management/rota/rota.service';
import { CareService } from '../features/management/care/care.service';

describe('Portal demo installation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });
  it('installs linked records once and seeds a newly selected demo company', () => {
    const store = TestBed.inject(ManagementStore),
      injector = TestBed.inject(EnvironmentInjector);
    installSystemDemo(injector);
    TestBed.tick();
    expect(store.data().systemDemoVersion).toBe(SYSTEM_DEMO_VERSION);
    expect(store.data().journal!.tasks.length).toBeGreaterThan(0);
    const save = vi.spyOn(store, 'saveWorkspace');
    installSystemDemo(injector);
    TestBed.tick();
    expect(save).not.toHaveBeenCalled();
    TestBed.inject(WorkspaceService).switchWorkspace('riverside');
    TestBed.tick();
    expect(store.data().systemDemoVersion).toBe(SYSTEM_DEMO_VERSION);
    expect(store.data().staffPortal!.communications.length).toBeGreaterThan(0);
  });
  it('leaves a custom company’s data unchanged', () => {
    const workspace = TestBed.inject(WorkspaceService);
    workspace.registerWorkspace({
      ...WORKSPACES[0],
      id: 'customer-company',
      name: 'Customer Company',
    });
    workspace.switchWorkspace('customer-company');
    const store = TestBed.inject(ManagementStore),
      before = structuredClone(store.data());
    installSystemDemo(TestBed.inject(EnvironmentInjector));
    TestBed.tick();
    expect(store.data()).toEqual(before);
    expect(store.data().systemDemoVersion).toBeUndefined();
  });
  it('includes a publish-ready draft and a deliberately blocked draft in the real workspace', () => {
    installSystemDemo(TestBed.inject(EnvironmentInjector));
    TestBed.tick();
    const rota = TestBed.inject(RotaService);
    const ready = rota.data().visits.find((v) => v.id === 'system-demo-workspace-publishing-0')!;
    expect(ready).toBeDefined();
    expect(rota.conflicts(ready)).toEqual([]);
    const blocked = rota.data().visits.find((v) => v.id === 'system-demo-workspace-conflict-0')!;
    expect(rota.conflicts(blocked).length).toBeGreaterThan(0);
    const care = TestBed.inject(CareService);
    const client = rota.data().clients.find((c) => c.file?.visitNotes?.length)!;
    const note = care.visitNotes(client.id)[0];
    expect(care.canManageNoteVisibility()).toBe(true);
    expect(
      care.setVisitNoteVisibility(
        client.id,
        'lqcs',
        note.id,
        'family',
        !note.visibility.family,
        note.version,
      ),
    ).toBeNull();
    expect(care.visitNotes(client.id).find((n) => n.id === note.id)!.visibility.family).toBe(
      !note.visibility.family,
    );
  });
  it('does not downgrade or repeatedly save a newer seed version', () => {
    const store = TestBed.inject(ManagementStore);
    store.saveWorkspace((data) => ({ ...data, systemDemoVersion: SYSTEM_DEMO_VERSION + 1 }));
    const save = vi.spyOn(store, 'saveWorkspace');
    installSystemDemo(TestBed.inject(EnvironmentInjector));
    TestBed.tick();
    expect(save).not.toHaveBeenCalled();
    expect(store.data().systemDemoVersion).toBe(SYSTEM_DEMO_VERSION + 1);
  });
});
