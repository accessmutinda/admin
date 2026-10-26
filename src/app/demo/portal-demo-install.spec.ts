import { EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../core/auth/auth.service';
import { WorkspaceService } from '../core/auth/workspace.service';
import { WORKSPACES } from '../core/auth/fixtures';
import { ManagementStore } from '../features/management/shared/management.store';
import { installSystemDemo } from './system-demo';
import { SYSTEM_DEMO_VERSION } from './system-demo-utils';

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
});
