import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';
import { ApiWorkspace } from './auth-api';

describe('API-only workspace views', () => {
  const workspaces = signal<ApiWorkspace[]>([]);
  const authenticated = signal(true);
  const selected = signal<string | null>(null);
  let service: WorkspaceService;
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'cv_custom_workspaces_v1',
      JSON.stringify([{ id: 'cached', name: 'Cached company' }]),
    );
    workspaces.set([]);
    authenticated.set(true);
    selected.set(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            workspaces,
            isAuthenticated: authenticated,
            session: () => ({ workspaceId: selected() }),
            canSwitchWorkspace: () => false,
            selectWorkspace: vi.fn(),
          },
        },
      ],
    });
    service = TestBed.inject(WorkspaceService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });
  it('does not invent companies when the API returns none', () => {
    expect(service.allWorkspaces()).toEqual([]);
    expect(service.currentWorkspace()).toBeNull();
  });
  it('uses returned identity and lifecycle without synthetic counts, logos or care types', () => {
    workspaces.set([{ id: 'api-company', code: 'API', name: 'API Company', lifecycle: 'active' }]);
    selected.set('api-company');
    const workspace = service.currentWorkspace()!;
    expect(workspace.name).toBe('API Company');
    expect(workspace.shortCode).toBe('API');
    expect(workspace.lifecycle).toBe('active');
    expect(workspace.careType).toBeUndefined();
    expect(workspace.serviceUserCount).toBeUndefined();
    expect(workspace.logoUrl).toBeUndefined();
  });
  it('leaves absent assigned-company fields absent and clears the view after logout', () => {
    workspaces.set([{ id: 'assigned', name: 'Assigned Company', entryState: 'ready' }]);
    selected.set('assigned');
    expect(service.currentWorkspace()?.shortCode).toBeUndefined();
    expect(service.currentWorkspace()?.lifecycle).toBeUndefined();
    expect(service.currentWorkspace()?.entryState).toBe('ready');
    authenticated.set(false);
    expect(service.currentWorkspace()).toBeNull();
  });
});
