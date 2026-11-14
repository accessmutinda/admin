import { companyDateKey } from '../../shared/pipes/company-date.pipe';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { CompanyAccessService } from '../../core/access/company-access.service';
import { Company } from '../management/shared/management.store';
import { emptyCompliance } from '../management/companies/company-compliance.models';
import {
  InspectorDocument,
  InspectionDraft,
  emptyInspection,
  documentStatus,
} from './inspector.models';
import { InspectorProviderRead, InspectorDetailsRead } from './inspector-provider.generated';
import { download } from './inspector-download';

@Injectable({ providedIn: 'root' })
export class InspectorProviderApi {
  private readonly auth = inject(AuthService);
  private readonly access = inject(CompanyAccessService);
  private readonly snapshot = signal<InspectorProviderRead | null>(null);
  private readonly verified = signal('');
  private active = false;
  private generation = 0;
  private lifecycle = 0;
  private timer?: ReturnType<typeof setInterval>;
  private pending?: Promise<void>;
  private logoUrl = '';
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly companyId = computed(() => this.access.companyId() || '');
  readonly scope = computed(() => {
    const context = this.access.context();
    return JSON.stringify({
      company: this.companyId(),
      actor: this.auth.profile()?.id,
      authenticated: this.auth.isAuthenticated(),
      context: context
        ? {
            active: context.company_active,
            platform: context.platform,
            revision: context.revision,
            permissions: [...(context.permissions ?? [])].sort(),
            core: [...(context.core_permissions ?? [])].sort(),
            modules: [...(context.enabled_modules ?? [])].sort(),
            roles: (context.roles ?? []).map((role) => role.id).sort(),
          }
        : null,
    });
  });
  readonly value = computed(() => (this.verified() === this.scope() ? this.snapshot() : null));
  readonly ready = computed(() => !!this.value());
  readonly canEdit = computed(() => !!this.value()?.capabilities['edit_details']);
  readonly canDownload = computed(() => !!this.value()?.capabilities['download_evidence']);
  readonly locations = computed(() => this.value()?.locations ?? []);
  readonly serviceUserCount = computed(() => this.value()?.service_user_count ?? null);
  readonly registeredAddress = computed(() =>
    this.address(this.value()?.company.registered_address),
  );
  readonly state = computed(() => {
    const result = emptyInspection(),
      details = this.value()?.inspection;
    result.draft.type = details?.type ?? '';
    result.draft.start = details?.start ?? '';
    result.draft.end = details?.end ?? '';
    result.draft.revision = details?.version ?? 0;
    result.draft.updated = details?.updated ?? '';
    result.draft.by = details?.by ?? '';
    result.draft.ratings = this.value()?.recommendations?.ratings ?? {};
    result.draft.summary = this.value()?.recommendations?.summary ?? '';
    return result;
  });
  readonly documents = computed<InspectorDocument[]>(() =>
    (this.value()?.documents ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      category: this.category(row.kind),
      questions: ['Well-led'],
      owner: row.owner ?? '',
      updated: row.updated,
      version: String(row.version),
      expiry: row.expiry ?? '',
      status: documentStatus(
        { status: 'Recorded', expiry: row.expiry ?? '' },
        companyDateKey(this.value()!.meta.as_of, this.value()!.meta.timezone),
      ),
      content: '',
      source: 'Provider compliance',
    })),
  );
  private readonly logo = signal('');
  readonly company = computed<Company | undefined>(() => {
    const c = this.value()?.company;
    if (!c) return undefined;
    const compliance = emptyCompliance();
    const mapping = {
      cqcNumber: 'regulator_number',
      providerType: 'provider_type',
      registrationStatus: 'registration_status',
      inspectionType: 'inspection_type',
      insuranceExpiry: 'insurance_expiry',
      regulatoryRegion: 'regulatory_region',
      dataProtectionNumber: 'data_protection_number',
      safeguardingLead: 'safeguarding_lead',
      medicationLead: 'medication_lead',
    } as const;
    for (const [target, source] of Object.entries(mapping))
      (compliance as unknown as Record<string, unknown>)[target] = c.compliance[source] ?? '';
    for (const d of this.value()!.documents) {
      const key = (
        {
          registration_certificate: 'registration',
          insurance_certificate: 'insurance',
          data_protection_policy: 'dataProtection',
          business_continuity_plan: 'continuity',
        } as const
      )[d.kind as 'registration_certificate'];
      if (key)
        compliance.documents[key] = {
          id: d.id,
          version: d.version,
          name: d.name,
          type: d.content_type ?? '',
          size: d.size,
          content: '',
          uploadedAt: d.updated,
          uploadedBy: '',
          owner: d.owner ?? '',
          expiry: d.expiry ?? '',
        };
    }
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      tradingName: c.trading_name ?? '',
      registration: c.registration_number ?? '',
      sector: c.sector ?? '',
      size: '',
      country: c.country ?? '',
      region: c.region ?? '',
      postcode: String(c.head_office_address?.['postcode'] ?? ''),
      headOfficeAddress: this.address(c.head_office_address),
      registeredPlaces: c.registered_places,
      establishedDate: c.date_established ?? '',
      active: c.active,
      modifiedAt: c.updated_at,
      logo: this.logo(),
      color: '',
      accent: '',
      tagline: '',
      modules: [],
      compliance,
    };
  });
  readonly contacts = computed(() => this.value()?.company.contacts ?? {});
  constructor() {
    let prior = this.scope();
    effect(() => {
      const scope = this.scope();
      if (scope !== prior) {
        prior = scope;
        untracked(() => {
          this.clear();
          if (this.active) void this.load();
        });
      }
    });
  }
  private address(row: Record<string, unknown> | null | undefined): string {
    return row
      ? ['line1', 'line2', 'city', 'county', 'postcode', 'country']
          .map((key) => row[key])
          .filter(Boolean)
          .join(', ')
      : '';
  }
  private category(kind: string) {
    return (
      (
        {
          insurance_certificate: 'Insurance',
          business_continuity_plan: 'Business Continuity',
          data_protection_policy: 'Data Protection',
        } as Record<string, string>
      )[kind] ?? 'Policies'
    );
  }
  private root() {
    return `/companies/${this.companyId()}/inspector/provider`;
  }
  private current(scope: string, generation: number) {
    return this.active && scope === this.scope() && generation === this.generation;
  }
  private clear() {
    this.lifecycle++;
    this.generation++;
    this.verified.set('');
    this.snapshot.set(null);
    this.pending = undefined;
    this.loading.set(false);
    this.busy.set(false);
    this.error.set('');
    if (this.logoUrl) URL.revokeObjectURL(this.logoUrl);
    this.logoUrl = '';
    this.logo.set('');
  }
  start() {
    this.active = true;
    void this.load();
    this.timer ??= setInterval(() => {
      if (document.visibilityState !== 'hidden' && !this.busy()) void this.load();
    }, 15000);
  }
  stop() {
    this.active = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.clear();
  }
  load(): Promise<void> {
    if (!this.active) return Promise.resolve();
    if (this.pending) return this.pending;
    const scope = this.scope(),
      generation = ++this.generation;
    this.loading.set(true);
    const task = (async () => {
      try {
        const value = await this.auth.api<InspectorProviderRead>(this.root());
        if (!this.current(scope, generation)) return;
        if (value.company_id !== this.companyId() || value.company.id !== this.companyId())
          throw Error('The provider response does not match this workspace.');
        this.snapshot.set(value);
        this.verified.set(scope);
        this.error.set('');
        if (value.company.logo_available) {
          const blob = await this.auth.api<Blob>(
            this.root() + '/logo',
            undefined,
            undefined,
            undefined,
            'blob',
          );
          if (!this.current(scope, generation)) return;
          if (this.logoUrl) URL.revokeObjectURL(this.logoUrl);
          this.logoUrl = URL.createObjectURL(blob);
          this.logo.set(this.logoUrl);
        } else {
          if (this.logoUrl) URL.revokeObjectURL(this.logoUrl);
          this.logoUrl = '';
          this.logo.set('');
        }
      } catch (error) {
        if (!this.current(scope, generation)) return;
        this.clear();
        this.error.set(
          error instanceof Error
            ? error.message
            : 'The provider profile is unavailable. Please retry.',
        );
      } finally {
        if (this.current(scope, generation)) this.loading.set(false);
      }
    })();
    this.pending = task;
    void task.finally(() => {
      if (this.pending === task) this.pending = undefined;
    });
    return task;
  }
  async saveDetails(draft: InspectionDraft, companyId: string): Promise<boolean> {
    if (this.busy() || !this.canEdit() || companyId !== this.companyId()) return false;
    this.generation++;
    this.pending = undefined;
    const scope = this.scope(),
      generation = this.generation,
      lifecycle = this.lifecycle,
      value = this.value()!;
    this.busy.set(true);
    this.error.set('');
    try {
      const saved = await this.auth.api<InspectorDetailsRead & { company_id: string }>(
        this.root() + '/inspection',
        { type: draft.type, start: draft.start || null, end: draft.end || null },
        'PATCH',
        { 'If-Match': value.inspection.etag },
      );
      if (!this.current(scope, generation)) return false;
      if (saved.company_id !== companyId)
        throw Error('The inspection response does not match this workspace.');
      this.snapshot.set({ ...value, inspection: saved });
      return true;
    } catch (error) {
      if (this.current(scope, generation)) {
        const status = (error as { status?: number }).status;
        if ([401, 403, 404].includes(status ?? 0)) this.clear();
        else if (status === 412) await this.load();
        if (scope !== this.scope()) return false;
        this.error.set(
          error instanceof Error ? error.message : 'Could not save the inspection details.',
        );
      }
      return false;
    } finally {
      if (scope === this.scope() && lifecycle === this.lifecycle) this.busy.set(false);
    }
  }
  async download(id: string): Promise<void> {
    if (!this.canDownload() || !this.value()?.documents.some((d) => d.id === id))
      throw Error('This evidence download is not permitted.');
    const scope = this.scope(),
      lifecycle = this.lifecycle,
      document = this.value()!.documents.find((d) => d.id === id)!;
    try {
      const blob = await this.auth.api<Blob>(
        this.root() + `/evidence/${id}/content`,
        undefined,
        undefined,
        undefined,
        'blob',
      );
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      if (
        !this.canDownload() ||
        !this.value()?.documents.some((row) => row.id === id && row.version === document.version)
      )
        throw Error(
          'This provider evidence changed while downloading. Reload the profile and try again.',
        );
      download(blob, document.name, document.content_type ?? 'application/octet-stream');
    } catch (error) {
      if (!this.active || scope !== this.scope() || lifecycle !== this.lifecycle) return;
      if ([401, 403, 404].includes((error as { status?: number }).status ?? 0)) {
        this.clear();
        this.error.set(error instanceof Error ? error.message : 'Evidence access is unavailable.');
      }
      throw error;
    }
  }
}
