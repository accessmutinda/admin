import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  CompanyAccessService,
  ModuleConfiguration,
  ProductModule,
} from '../../../core/access/company-access.service';
import { ManagementStore } from '../shared/management.store';
import { MODULE_CATALOG } from './company-modules.models';
import { companyModifiedAt } from './company-profile.models';

@Component({
  selector: 'cv-company-modules',
  host: { class: 'module-page companies-page company-profile-page company-modules-page' },
  imports: [RouterLink],
  templateUrl: './company-modules.html',
})
export class CompanyModulesPage {
  protected readonly access = inject(CompanyAccessService);
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly query = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly id = computed(() => this.params().get('id') ?? '');
  protected readonly company = computed(() =>
    this.store.companies().find((c) => c.id === this.id()),
  );
  protected readonly state = signal<ModuleConfiguration | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal(false);
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly configuring = computed(() => this.params().get('section') === 'configure');
  protected readonly selected = computed(() =>
    this.state()?.modules.find(
      (m) => m.code === this.query().get('module') || m.name === this.query().get('module'),
    ),
  );
  protected readonly writable = computed(
    () =>
      this.access.context()?.company_id === this.id() &&
      !!this.access.context()?.can_manage_modules,
  );
  protected readonly colors = [
    '#008afa',
    '#00a34e',
    '#ff8a00',
    '#7c3aed',
    '#03a6c1',
    '#ed3988',
    '#008afa',
    '#10b981',
    '#7c3aed',
  ];
  protected readonly icons: Record<string, string> = {
    care: 'description',
    people: 'groups',
    academy: 'school',
    quality: 'verified_user',
    finance: 'account_balance_wallet',
    reports: 'monitoring',
    staff_portal: 'badge',
    family_portal: 'family_restroom',
    inspector_portal: 'fact_check',
  };
  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.state.set(null);
        if (id) void this.load();
      });
    });
  }
  protected display(module: ProductModule): string {
    return module.code === 'academy' ? 'CareVerity Academy' : module.name;
  }
  protected enabledModuleCount(): number {
    return this.state()?.modules.filter((module) => module.enabled).length ?? 0;
  }
  protected description(module: ProductModule): string {
    return (
      MODULE_CATALOG.find((item) => item.name === module.name)?.description ??
      module.submodules.map((sub) => sub.name).join(', ')
    );
  }
  protected permissionSummary(module: ProductModule): string {
    return module.enabled
      ? 'Managed through Roles & Permissions'
      : 'Module not enabled for company users';
  }
  protected link(): string[] {
    return ['/manage/companies', this.id(), 'modules', 'overview'];
  }
  protected async load(): Promise<void> {
    const id = this.id();
    this.loading.set(true);
    this.error.set('');
    await this.access.refresh();
    try {
      const state = await this.access.configuration(id);
      if (id === this.id()) this.state.set(state);
    } catch (error) {
      if (id === this.id())
        this.error.set(
          error instanceof Error ? error.message : 'Module configuration unavailable.',
        );
    } finally {
      if (id === this.id()) this.loading.set(false);
    }
  }
  protected async toggle(module: ProductModule, submodule?: string): Promise<void> {
    const state = this.state();
    const id = this.id();
    if (!state || this.saving() || !this.writable()) return;
    const enabled = submodule
      ? !module.submodules.find((s) => s.code === submodule)!.enabled
      : !module.enabled;
    this.saving.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      const next = await this.access.change(id, state.etag, module.code, enabled, submodule);
      if (id === this.id()) {
        this.state.set(next);
        this.saved.set(true);
        await this.access.refresh();
      }
    } catch (error) {
      if (id === this.id())
        this.error.set(error instanceof Error ? error.message : 'Changes could not be saved.');
    } finally {
      if (id === this.id()) this.saving.set(false);
    }
  }
  canLeave(_url?: string): boolean {
    return !this.saving();
  }
}
