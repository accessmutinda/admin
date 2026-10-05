import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthCenteredLayout } from '../../../shared/layouts/auth-centered-layout';
import { Skeleton } from '../../../shared/ui/skeleton';
import { WorkspaceService } from '../../../core/auth/workspace.service';

@Component({
  selector: 'cv-workspace-select',
  imports: [AuthCenteredLayout, Skeleton],
  templateUrl: './workspace-select.html',
})
export class WorkspaceSelect implements OnInit {
  private readonly workspaceSvc = inject(WorkspaceService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly search = signal('');
  protected readonly switching = signal<string | null>(null);
  protected readonly skeletonRows = Array.from({ length: 4 });

  ngOnInit(): void {
    setTimeout(() => this.loading.set(false), 450);
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
    setTimeout(() => {
      this.workspaceSvc.switchWorkspace(workspaceId);
      this.router.navigateByUrl('/manage/companies');
    }, 500);
  }
}
