import { Component, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { CompanyAccessService } from '../../../../core/access/company-access.service';
import type { CompanyRole } from '../../../../core/access/company-access.generated';
import { ROLES } from '../../../../core/auth/models/role';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyService } from './academy.service';
import { AcademySettingsApi } from './academy-settings-api.service';
import { AcademyAssets } from './academy-assets.service';
import { AcademyCertificate, AcademySettings } from './academy.models';
import { AcademyCertificateView } from './academy-certificate';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-settings',
  imports: [
    FormsModule,
    RouterLink,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyCertificateView,
  ],
  templateUrl: './academy-settings.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-settings.css',
  ],
})
export class AcademySettingsPage {
  protected readonly academy = inject(AcademyService);
  protected readonly access = inject(CompanyAccessService);
  private readonly savedRoles = signal<CompanyRole[]>([]);
  protected roleAccess(code: string): boolean | null {
    const role = this.savedRoles().find((role) => role.code === code);
    return role
      ? role.permissions.some(
          (permission) =>
            permission.code.startsWith('academy.') &&
            !permission.code.startsWith('academy.learner.'),
        )
      : null;
  }
  private async loadRoles(scope: string) {
    this.savedRoles.set([]);
    if (!this.access.core('company.roles.read')) return;
    try {
      const result = await this.access.roles(this.workspace);
      if (scope === this.api.scope() && this.access.core('company.roles.read'))
        this.savedRoles.set(result.results);
    } catch {
      if (scope === this.api.scope()) this.savedRoles.set([]);
    }
  }
  protected async refreshEvidence() {
    const scope = this.api.scope();
    try {
      await this.academy.certificatesApi.load();
      if (scope === this.api.scope())
        this.notice.set('Certificate workflows refreshed from saved records.');
    } catch (e) {
      if (scope === this.api.scope()) this.error.set((e as Error).message);
    }
  }
  protected readonly api = inject(AcademySettingsApi);
  private workspace = this.academy.store.companyId();
  private etag = '';
  constructor() {
    let previous = this.api.scope();
    void this.loadRoles(previous);
    effect(() => {
      const scope = this.api.scope();
      const value = this.api.settings();
      const etag = this.api.record()?.etag ?? '';
      untracked(() => {
        this.workspace = this.academy.store.companyId();
        this.draft = value
          ? structuredClone(value)
          : structuredClone(this.academy.state().settings);
        this.etag = etag;
        this.original = JSON.stringify(this.draft);
        if (scope !== previous) {
          this.error.set('');
          this.notice.set('');
          this.fullPreview.set(false);
          previous = scope;
          void this.loadRoles(scope);
        }
      });
    });
  }
  protected async reload() {
    const scope = this.api.scope();
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.load(true);
    } catch (e) {
      if (scope === this.api.scope()) this.error.set((e as Error).message);
    }
  }
  private readonly files = inject(AcademyAssets);
  protected readonly uploadingImage = signal(false);
  protected async uploadBrandImage(event: Event) {
    const scope = this.api.scope();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploadingImage() || !this.api.canEdit()) return;
    this.error.set('');
    this.notice.set('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error.set('Choose a PNG, JPEG or WebP image.');
      return;
    }
    this.uploadingImage.set(true);
    try {
      await this.files.upload(file, this.workspace);
      if (scope !== this.api.scope()) return;
      this.notice.set(
        'Image uploaded. Once scanning is complete, select it for the signature, logo or background and save your settings.',
      );
    } catch (e) {
      if (scope === this.api.scope()) this.error.set((e as Error).message);
    } finally {
      this.uploadingImage.set(false);
    }
  }
  protected draft: AcademySettings = {
    ...structuredClone(this.api.settings() ?? this.academy.state().settings),
    demoFailure: this.academy.state().settings.demoFailure ?? ('None' as const),
  };
  private original = JSON.stringify(this.draft);
  protected readonly tab = signal('General settings');
  protected readonly tabs = [
    'General settings',
    'Learner experience',
    'Compliance rules',
    'Integrations',
    'Notifications',
  ];
  protected readonly templates: AcademySettings['template'][] = [
    'Standard',
    'Modern',
    'Minimal',
    'Professional',
  ];
  protected readonly roles = Object.values(ROLES).filter((r) =>
    ['PO', 'CA', 'RM', 'TM', 'HR'].includes(r.code),
  );
  protected readonly notificationKeys = ['assigned', 'result', 'certificate', 'expiry'] as const;
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly previewDate = new Date().toISOString();
  protected readonly fullPreview = signal(false);
  protected knownImage(id: string): boolean {
    return this.academy.state().assets.some((asset) => asset.id === id);
  }
  protected preview(): AcademyCertificate {
    return {
      id: 'PREVIEW · NOT ISSUED',
      assignmentId: '',
      courseId: '',
      courseTitle: this.academy.state().courses[0]?.title ?? 'Course title',
      personId: '',
      learner: this.academy.me()?.name ?? 'Learner name',
      issuer: this.draft.issuer || this.academy.store.company()?.name || 'CareVerity',
      issuedAt: this.previewDate,
      expires: '',
      score: this.draft.passMark,
      cpdHours: 0,
      sample: true,
      branding: this.draft,
    };
  }
  protected async save(): Promise<void> {
    const scope = this.api.scope();
    this.error.set('');
    this.notice.set('');
    if (!this.api.record() || !this.etag) {
      this.error.set('Load the saved academy settings before editing.');
      return;
    }
    try {
      await this.api.save(this.draft, this.etag);
      if (scope !== this.api.scope()) return;
      this.draft = structuredClone(this.api.settings()!);
      this.etag = this.api.record()!.etag;
      this.original = JSON.stringify(this.draft);
      this.notice.set(
        'Academy settings saved. Existing course revisions, attempts and certificates retain their original rules.',
      );
    } catch (e) {
      if (scope === this.api.scope()) this.error.set((e as Error).message);
    }
  }
  protected async reminders(): Promise<void> {
    const scope = this.api.scope();
    this.error.set('');
    this.notice.set('');
    if (JSON.stringify(this.draft) !== this.original) {
      this.error.set('Save settings before generating reminders.');
      return;
    }
    try {
      const count = await this.api.reminders();
      if (scope !== this.api.scope()) return;
      this.notice.set(
        `${count} portal reminders queued. Repeated checks on the same day do not create duplicates. Email delivery and background scheduling are not configured.`,
      );
    } catch (e) {
      if (scope === this.api.scope()) this.error.set((e as Error).message);
    }
  }
  canLeave(): boolean {
    return (
      JSON.stringify(this.draft) === this.original ||
      window.confirm('Discard unsaved academy settings?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ) {
    if (JSON.stringify(this.draft) !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
