import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import type { StaffDashboardRead } from './staff-dashboard.generated';

@Injectable({ providedIn: 'root' })
export class StaffDashboardApi {
  readonly connected = true;
  readonly auth = inject(AuthService);
  readonly access = inject(CompanyAccessService);
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      actor: this.auth.profile()?.id,
      company: this.access.companyId(),
      context: context
        ? {
            active: context.company_active,
            revision: context.revision,
            platform: context.platform,
            permissions: [...(context.permissions || [])].sort(),
            modules: [...(context.enabled_modules || [])].sort(),
            roles: (context.roles || []).map((role) => role.id).sort(),
          }
        : null,
    });
  });
  private readonly raw = signal<{ scope: string; data: StaffDashboardRead } | null>(null);
  private readonly companyRecord = signal<{
    scope: string;
    company: StaffDashboardRead['company'];
  } | null>(null);
  readonly snapshot = computed(() =>
    this.raw()?.scope === this.scope() ? this.raw()!.data : null,
  );
  readonly company = computed(() =>
    this.companyRecord()?.scope === this.scope() ? this.companyRecord()!.company : null,
  );
  readonly loading = signal(false);
  readonly error = signal('');
  readonly code = signal('');
  private generation = 0;
  private active = false;
  private currentScope = this.scope();
  readonly tasks = computed(() => this.snapshot()?.tasks || []);
  readonly clients = computed(() => this.snapshot()?.clients || []);
  readonly concerns = computed<any[]>(() => []);
  readonly communications = computed<any[]>(() => []);
  readonly professionalAwaiting = computed<any[]>(() => []);
  readonly openConcerns = computed<any[]>(() => []);
  readonly timeline = computed(() => this.snapshot()?.activity || []);
  readonly training = computed(() => this.snapshot()?.training || null);
  readonly contacts = computed(() => [
    ...(this.snapshot()
      ? [{ name: this.snapshot()!.staff.name, email: this.snapshot()!.staff.email }]
      : []),
    ...(this.snapshot()?.inbox.map((e) => ({ name: e.author, email: e.authorEmail })) || []),
  ]);
  readonly journal = {
    auth: this.auth,
    email: computed(() => this.auth.currentUser()?.email.toLowerCase() || ''),
    entries: computed(() => this.snapshot()?.inbox || []),
    data: computed(() => ({ tasks: this.tasks() })),
    events: computed<any[]>(() => []),
    summary: computed(() => ({ local_date: this.snapshot()?.meta.local_date || '' })),
  };
  readonly store = {
    company: this.company,
    staff: computed(() => (this.snapshot() ? [this.snapshot()!.staff] : [])),
    storageAvailable: () => !this.error(),
  };
  readonly care = {
    rota: {
      data: computed(() => ({ visits: this.snapshot()?.visits || [] })),
      can: () => !!this.snapshot()?.meta.available['visits'],
    },
  };
  readonly awaitingResponses = computed(() =>
    this.journal
      .entries()
      .filter(
        (e) =>
          e.authorEmail === this.journal.email() &&
          e.responseRequired &&
          e.responseStatus !== 'Responded',
      ),
  );
  get today() {
    return this.snapshot()?.meta.local_date || '';
  }
  get weekStart() {
    if (!this.today) return '';
    const day = new Date(this.today + 'T12:00:00Z');
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
    return day.toISOString().slice(0, 10);
  }
  constructor() {
    effect(() => {
      const scope = this.scope();
      untracked(() => {
        if (scope === this.currentScope) return;
        this.currentScope = scope;
        this.generation++;
        this.raw.set(null);
        this.companyRecord.set(null);
        this.error.set('');
        this.code.set('');
        if (this.active) void this.load();
      });
    });
    const timer = setInterval(() => {
      if (this.active && !this.loading() && document.visibilityState !== 'hidden') void this.load();
    }, 30000);
    inject(DestroyRef).onDestroy(() => {
      this.stop();
      clearInterval(timer);
    });
  }
  start() {
    this.active = true;
    void this.load();
  }
  stop() {
    this.active = false;
    this.generation++;
    this.raw.set(null);
    this.loading.set(false);
  }
  metric(key: string) {
    return this.snapshot()?.metrics[key] ?? null;
  }
  rememberCompany(company: StaffDashboardRead['company'], actor: string) {
    if (company.id === this.access.companyId() && String(actor) === String(this.auth.profile()?.id))
      this.companyRecord.set({scope: this.scope(), company});
  }
  clientName(id: string) {
    return (
      this.clients().find((c) => c.id === id)?.name || (id ? 'Service user unavailable' : 'General')
    );
  }
  person(email: string) {
    return this.contacts().find((c) => c.email === email)?.name || email;
  }
  async load() {
    const scope = this.scope(),
      generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    this.code.set('');
    try {
      const company = this.access.companyId();
      if (!company) throw Error('Select your company before opening the Staff Portal.');
      const data = await this.auth.api<StaffDashboardRead>(
        `/companies/${company}/staff-portal/dashboard`,
      );
      if (scope !== this.scope() || generation !== this.generation) return;
      if (data.company_id !== company || String(data.actor_id) !== String(this.auth.profile()?.id))
        throw Error('This dashboard does not belong to your current staff account.');
      this.raw.set({ scope, data });
      this.companyRecord.set({ scope, company: data.company });
    } catch (error) {
      if (scope !== this.scope() || generation !== this.generation) return;
      this.raw.set(null);
      this.code.set((error as any)?.code || 'unavailable');
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Your dashboard could not be loaded. Please try again.',
      );
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
}
