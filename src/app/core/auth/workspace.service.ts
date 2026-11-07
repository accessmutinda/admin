import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Workspace } from './models/workspace';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly auth = inject(AuthService);
  readonly allWorkspaces = computed<Workspace[]>(() => [
    ...this.auth.workspaces().map((w) => ({
      id: w.id,
      name: w.name,
      shortCode: w.code,
      lifecycle: w.lifecycle,
      entryState: w.entryState,
      colorClass: 'bg-teal',
    })),
  ]);
  readonly myWorkspaces = this.allWorkspaces;
  readonly currentWorkspace = computed(() =>
    this.auth.isAuthenticated()
      ? (this.allWorkspaces().find((w) => w.id === this.auth.session()?.workspaceId) ?? null)
      : null,
  );

  async load(): Promise<void> {
    if (this.auth.canSwitchWorkspace()) await this.auth.loadWorkspaces();
  }
  registerWorkspace(_workspace: Workspace): void {
    /* New companies are provisioned by the API. */
  }
  switchWorkspace(workspaceId: string): Promise<void> {
    return this.auth.selectWorkspace(workspaceId);
  }
}
