import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { WORKSPACES } from './fixtures';
import { Workspace } from './models/workspace';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly auth = inject(AuthService);

  readonly myWorkspaces = computed<Workspace[]>(() => {
    const user = this.auth.currentUser();
    if (!user) {
      return [];
    }
    return WORKSPACES.filter((workspace) => user.workspaceIds.includes(workspace.id));
  });

  readonly currentWorkspace = computed<Workspace | null>(() => {
    const id = this.auth.session()?.workspaceId;
    return WORKSPACES.find((workspace) => workspace.id === id) ?? null;
  });

  switchWorkspace(workspaceId: string): void {
    this.auth.setWorkspace(workspaceId);
  }
}
