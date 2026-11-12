import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import { ManagementStore } from '../../shared/management.store';
import { AcademyApi } from './academy-api.service';
import type { AcademyDashboardRead } from './academy.generated';

const sources = ['reports', 'courses', 'assignments', 'results', 'certificates', 'governance'];
@Injectable({ providedIn: 'root' })
export class AcademyDashboardApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly store = inject(ManagementStore);
  readonly scope = inject(AcademyApi).scope;
  readonly available = computed(() =>
    sources.every((feature) => this.access.can('academy', feature, 'read')),
  );
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly source = signal<{ scope: string; value: AcademyDashboardRead } | null>(null);
  readonly data = computed(() =>
    this.available() && this.source()?.scope === this.scope() ? this.source()!.value : null,
  );
  private ticket = 0;
  private readonly deniedScopes = new Set<string>();
  private currentScope = this.scope();
  private pending?: { scope: string; period: number; promise: Promise<void> };
  constructor() {
    effect(() => {
      this.scope();
      untracked(() => this.syncScope());
    });
  }
  private syncScope() {
    const scope = this.scope();
    if (scope === this.currentScope) return;
    this.currentScope = scope;
    this.ticket++;
    this.source.set(null);
    this.loading.set(false);
    this.error.set('');
    this.pending = undefined;
  }
  can(feature: string, action = 'read') {
    return this.access.can('academy', feature, action);
  }
  private check(scope: string) {
    if (scope !== this.scope() || !this.available())
      throw Error('The dashboard workspace or access changed.');
  }
  async load(period = 30, force = false): Promise<void> {
    this.syncScope();
    const scope = this.scope();
    this.check(scope);
    if (!force && this.data()?.meta.period === period) return;
    if (!force && this.deniedScopes.has(scope))
      throw Error('Dashboard access is unavailable. Reload after access is restored.');
    if (this.pending?.scope === scope && this.pending.period === period)
      return this.pending.promise;
    const ticket = ++this.ticket;
    this.source.set(null);
    this.loading.set(true);
    this.error.set('');
    const promise = (async () => {
      try {
        const value = await this.auth.api<AcademyDashboardRead>(
          `/companies/${this.store.companyId()}/academy/dashboard?period=${period}`,
        );
        this.check(scope);
        if (
          value.meta.company_id !== this.store.companyId() ||
          value.meta.period !== period ||
          [value.activity, value.renewals, value.recent].some(
            (page) => page.meta.company_id !== this.store.companyId(),
          )
        )
          throw Error('Dashboard response scope mismatch.');
        if (ticket === this.ticket) {
          this.source.set({ scope, value });
          this.deniedScopes.delete(scope);
        }
      } catch (error) {
        if (ticket === this.ticket && scope === this.scope()) {
          this.source.set(null);
          this.error.set((error as Error).message);
          if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
            this.deniedScopes.add(scope);
            this.access.invalidate();
          }
        }
        throw error;
      } finally {
        if (ticket === this.ticket) {
          this.loading.set(false);
          this.pending = undefined;
        }
      }
    })();
    this.pending = { scope, period, promise };
    return promise;
  }
}
