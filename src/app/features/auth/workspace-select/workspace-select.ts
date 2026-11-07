import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Skeleton } from '../../../shared/ui/skeleton';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';

@Component({
  selector: 'cv-workspace-select',
  imports: [AuthCenteredLayout, Skeleton],
  templateUrl: './workspace-select.html',
})
export class WorkspaceSelect implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly workspaceSvc = inject(WorkspaceService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly switching = signal<string | null>(null);
  protected readonly skeletonRows = Array.from({ length: 4 });

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.workspaceSvc.load();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load workspaces.');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const all = this.workspaceSvc.myWorkspaces();
    return term ? all.filter((w) => w.name.toLowerCase().includes(term)) : all;
  });

  protected select(workspaceId: string): void {
    if (this.switching()) {
      return;
    }
    this.switching.set(workspaceId);
    void this.workspaceSvc
      .switchWorkspace(workspaceId)
      .then(() => {
        void this.router.navigateByUrl('/manage/companies');
      })
      .catch((error: Error) => this.error.set(error.message))
      .finally(() => this.switching.set(null));
  }
}
