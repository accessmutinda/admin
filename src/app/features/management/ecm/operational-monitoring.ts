import {
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/auth/auth-api';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { ModuleDesign } from '../shared/module-design';
import { EcmNavigation } from './ecm-navigation';

const categories = [
  { key: 'late', label: 'Late visits', icon: 'schedule', tone: 'amber' },
  { key: 'missed', label: 'Missed visits', icon: 'warning', tone: 'red' },
  { key: 'shortage', label: 'Staff shortages', icon: 'group_off', tone: 'purple' },
  { key: 'overlap', label: 'Overlapping allocations', icon: 'event_busy', tone: 'blue' },
  { key: 'uncovered', label: 'Uncovered care packages', icon: 'assignment_late', tone: 'teal' },
] as const;
type Kind = (typeof categories)[number]['key'];
type Warning = {
  kind: Kind;
  title: string;
  message: string;
  visitId: string | null;
  clientId: string | null;
  clientName: string;
  date: string | null;
  startsAt: string | null;
  workerId: string | null;
  packageId: string | null;
};
type Board = {
  company_id: string;
  asOf: string;
  date: string;
  timezone: string;
  warnings: Warning[];
};

@Component({
  selector: 'cv-operational-monitoring',
  imports: [FormsModule, RouterLink, ModuleDesign, EcmNavigation],
  host: { class: 'module-page operations-page geo-page monitor-page' },
  templateUrl: './operational-monitoring.html',
  styleUrls: ['./live-geomap.css', './operational-monitoring.css'],
  encapsulation: ViewEncapsulation.None,
})
export class OperationalMonitoring {
  private readonly auth = inject(AuthService);
  private readonly records = inject(ServiceUsersApi);
  protected readonly allowed = computed(
    () =>
      this.records.allowed() &&
      this.records.access.can('care', 'rostering', 'read') &&
      this.records.access.can('care', 'ecm', 'read') &&
      this.records.access.can('care', 'ecm', 'edit'),
  );
  protected readonly board = signal<Board | null>(null);
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly filter = signal<Kind | ''>('');
  protected readonly search = signal('');
  protected readonly page = signal(0);
  private generation = 0;
  private readonly pageSize = 20;
  protected readonly summary = computed(() =>
    categories.map((category) => ({
      ...category,
      count: (this.board()?.warnings ?? []).filter((row) => row.kind === category.key).length,
    })),
  );
  protected readonly results = computed(() => {
    const text = this.search().trim().toLocaleLowerCase();
    return (this.board()?.warnings ?? []).filter(
      (row) =>
        (!this.filter() || row.kind === this.filter()) &&
        [row.title, row.clientName, row.message].some((value) =>
          value.toLocaleLowerCase().includes(text),
        ),
    );
  });
  protected readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.results().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pages() - 1));
  protected readonly rows = computed(() => {
    const start = this.currentPage() * this.pageSize;
    return this.results().slice(start, start + this.pageSize);
  });

  constructor() {
    effect(() => {
      this.records.scope();
      const allowed = this.allowed();
      untracked(() => {
        this.generation++;
        this.board.set(null);
        this.error.set('');
        this.loading.set(false);
        this.page.set(0);
        if (allowed) void this.refresh();
      });
    });
    const timer = setInterval(() => {
      if (!document.hidden) void this.refresh();
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.generation++;
    });
  }
  protected async refresh(): Promise<void> {
    const company = this.records.companyId();
    if (!company || !this.allowed() || this.loading()) return;
    const generation = this.generation;
    const scope = this.records.scope();
    this.error.set('');
    this.loading.set(true);
    const current = () =>
      generation === this.generation && scope === this.records.scope() && this.allowed();
    try {
      const result = await this.auth.api<Board>(`/companies/${company}/ecm/operations`);
      if (!current()) return;
      if (result.company_id !== company) {
        this.board.set(null);
        throw Error('The warnings belong to a different workspace.');
      }
      this.board.set(result);
    } catch (error) {
      if (!current()) return;
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) this.board.set(null);
      this.error.set(
        error instanceof Error ? error.message : 'Operational warnings are unavailable.',
      );
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  protected time(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: this.board()?.timezone,
    }).format(new Date(value));
  }
  protected kindLabel(kind: Kind): string {
    return categories.find((item) => item.key === kind)!.label;
  }
}
