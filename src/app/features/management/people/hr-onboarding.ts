import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { Component, computed, inject, signal, effect, untracked, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { HrService } from './hr.service';
import { OnboardingApi } from './onboarding-api.service';
import { PageLoading } from '../../../shared/layouts/page-loading';
import { CompanyUnavailable } from '../shared/company-unavailable';
@Component({
  selector: 'cv-hr-onboarding',
  host: { class: 'module-page people-page hr-workspace-page' },
  imports: [
    CardTonePipe,
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    PageLoading,
    CompanyUnavailable,
  ],
  templateUrl: './hr-onboarding.html',
  styleUrls: ['./hr.css', './hr-directory.css', './hr-tables.css', './hr-queues.css'],
})
export class HrOnboarding {
  protected readonly hr = inject(HrService);
  protected readonly api = inject(OnboardingApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly q = computed(() => this.params().get('q') ?? '');
  protected readonly lane = computed(() => this.params().get('lane') ?? 'in-progress');
  protected readonly branch = computed(() => this.params().get('branch') ?? '');
  protected readonly error = this.api.error;
  protected readonly notice = signal('');
  protected readonly branches = computed(() => this.api.meta()?.branches ?? []);
  protected readonly rows = computed(() => this.api.rows().filter((row) => row.kind === 'starter'));
  protected readonly drafts = computed(() => this.api.rows().filter((row) => row.kind === 'draft'));
  protected readonly stats = computed(() => [
    {
      label: 'Saved Drafts',
      value: this.api.meta()?.counts.drafts ?? '—',
      caption: 'Staff setup not submitted',
      icon: 'draft',
      lane: 'drafts',
      color: '#008afa',
    },
    {
      label: 'In Progress',
      value: this.api.meta()?.counts.in_progress ?? '—',
      caption: 'Recruitment onboarding handoffs',
      icon: 'assignment_ind',
      lane: 'in-progress',
      color: '#ff8a00',
    },
    {
      label: 'Ready to Activate',
      value: this.api.meta()?.counts.ready ?? '—',
      caption: 'HR evidence verification required',
      icon: 'person_check',
      lane: 'ready',
      color: '#00a34e',
    },
  ]);
  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      this.api.scope();
      const lane = this.lane(),
        q = this.q(),
        branch = this.branch();
      untracked(() => {
        clearTimeout(timer);
        timer = setTimeout(() => void this.api.load(lane, q, branch), 150);
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
  protected reload(): void {
    void this.api.load(this.lane(), this.q(), this.branch());
  }
  protected set(key: string, value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
    });
  }
  protected clear(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { lane: this.lane() } });
  }
  protected activate(_id: string): void {
    this.error.set('HR evidence verification must be connected before staff can be activated.');
  }
}
