import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { WORKSPACES } from './fixtures';
import { Workspace } from './models/workspace';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly auth = inject(AuthService);

  private readonly custom = signal<Workspace[]>(this.restoreCustom());
  readonly allWorkspaces = computed(() => {
    const custom = this.custom();
    return [
      ...WORKSPACES.map((w) => custom.find((c) => c.id === w.id) ?? w),
      ...custom.filter((c) => !WORKSPACES.some((w) => w.id === c.id)),
    ];
  });

  registerWorkspace(workspace: Workspace): void {
    this.custom.update((all) => [...all.filter((w) => w.id !== workspace.id), workspace]);
    try {
      localStorage.setItem('cv_custom_workspaces_v1', JSON.stringify(this.custom()));
    } catch {
      /* Keep the workspace available in this session. */
    }
    this.auth.grantWorkspaceAccess(workspace.id);
  }

  private restoreCustom(): Workspace[] {
    try {
      return JSON.parse(localStorage.getItem('cv_custom_workspaces_v1') ?? '[]');
    } catch {
      return [];
    }
  }

  readonly myWorkspaces = computed<Workspace[]>(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }
    return this.allWorkspaces().filter((workspace) => user.workspaceIds.includes(workspace.id));
  });

  readonly currentWorkspace = computed<Workspace | null>(() => {
    const id = this.auth.session()?.workspaceId;
    return this.allWorkspaces().find((workspace) => workspace.id === id) ?? null;
  });

  switchWorkspace(workspaceId: string): void {
    this.auth.setWorkspace(workspaceId);
  }
}
