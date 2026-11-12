import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { ROLES } from '../../../../core/auth/models/role';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyService } from './academy.service';
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
  protected async refreshEvidence() {
    try { await this.academy.certificatesApi.load(); this.notice.set('Certificate workflows refreshed from saved records.'); }
    catch(e) { this.error.set((e as Error).message); }
  }
  private readonly workspace = this.academy.store.companyId();
  private readonly files = inject(AcademyAssets);
  protected readonly uploadingImage = signal(false);
  protected async uploadBrandImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploadingImage()) return;
    this.error.set('');
    this.notice.set('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.error.set('Choose a PNG, JPEG or WebP image.');
      return;
    }
    this.uploadingImage.set(true);
    try {
      await this.files.upload(file, this.workspace);
      this.notice.set(
        'Image uploaded. Select it for the signature, logo or background, then save your settings.',
      );
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.uploadingImage.set(false);
    }
  }
  protected draft: AcademySettings = {
    ...structuredClone(this.academy.state().settings),
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
  protected save(): void {
    const error = this.academy.saveSettings(
      this.draft,
      this.workspace,
      JSON.parse(this.original).updatedAt,
    );
    this.error.set(error ?? '');
    if (!error) {
      this.draft = structuredClone(this.academy.state().settings);
      this.original = JSON.stringify(this.draft);
      this.notice.set(
        'Academy settings saved on this device. Existing attempts and certificates retain their original rules.',
      );
    }
  }
  protected toggleRole(role: string): void {
    this.draft.adminRoles = this.draft.adminRoles.includes(role)
      ? this.draft.adminRoles.filter((r) => r !== role)
      : [...this.draft.adminRoles, role];
  }
  protected reminders(): void {
    const error = this.academy.generateReminders(this.workspace);
    this.error.set(error ?? '');
    if (!error)
      this.notice.set(
        'Eligible reminders recorded in the portal. External email and background scheduling are not configured.',
      );
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
