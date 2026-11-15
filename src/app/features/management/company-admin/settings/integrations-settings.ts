import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyLoading } from '../../companies/company-loading';
import { CompaniesApiService } from '../../companies/companies-api.service';
import {
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ManagementStore } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
import { companyModifiedAt } from '../../companies/company-profile.models';

@Component({
  selector: 'cv-integrations-settings',
  host: { class: 'module-page companies-page integrations-page' },
  imports: [CompanyLoading, FormsModule, RouterLink],
  templateUrl: './integrations-settings.html',
  styleUrl: './integrations-settings.css',
})
export class IntegrationsSettings {
  protected readonly store = inject(ManagementStore);
  protected readonly dataApi = inject(CompaniesApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  protected readonly preferencesLoading = signal(true);
  protected readonly preferencesSaving = signal(false);
  private readonly savedBackup = signal(false);
  private preferencesEtag = '';
  private generation = 0;
  protected readonly company = this.store.company;
  protected readonly modifiedAt = companyModifiedAt;
  protected readonly keys = computed(() => this.store.data().apiKeys ?? []);
  protected keyName = '';
  protected revealedKey = '';
  private revealedId = '';
  protected backup = this.store.data().backup;
  protected readonly search = signal('');
  protected readonly page = signal(1);
  protected readonly keyError = signal('');
  protected readonly backupError = signal('');
  protected readonly submitted = signal(false);
  private workspaceId = this.store.companyId();
  protected readonly filtered = computed(() =>
    this.keys().filter((key) =>
      key.name.toLowerCase().includes(this.search().trim().toLowerCase()),
    ),
  );
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / 5)));
  protected readonly currentPage = computed(() =>
    Math.max(1, Math.min(this.page(), this.pageCount())),
  );
  protected readonly rows = computed(() =>
    this.filtered().slice((this.currentPage() - 1) * 5, this.currentPage() * 5),
  );
  protected readonly start = computed(() =>
    this.filtered().length ? (this.currentPage() - 1) * 5 + 1 : 0,
  );
  protected readonly end = computed(() => Math.min(this.currentPage() * 5, this.filtered().length));
  constructor() {
    effect(() => {
      const id = this.store.companyId();
      untracked(() => {
        this.workspaceId = id;
        this.keyName = '';
        this.dismissKey();
        void this.loadPreferences(id);
        this.keyError.set('');
        this.backupError.set('');
        this.submitted.set(false);
        this.search.set('');
        this.page.set(1);
      });
    });
  }
  protected createdDate(value: string): string {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? this.modifiedAt(value) : value || 'Not recorded';
  }
  protected setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }
  protected backupChanged(): boolean {
    return this.backup !== this.savedBackup();
  }
  canLeave(): boolean {
    if (this.preferencesSaving()) return false;
    return (
      (!this.backupChanged() && !this.keyName.trim()) ||
      window.confirm('Leave without saving the integration name or backup preference?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) protected beforeUnload(
    event: BeforeUnloadEvent,
  ): void {
    if (this.backupChanged() || this.keyName.trim()) event.preventDefault();
  }
  private currentWorkspace(): boolean {
    return this.workspaceId === this.store.companyId() && !!this.company();
  }
  protected dismissKey(): void {
    this.revealedKey = '';
    this.revealedId = '';
  }
  protected createKey(): void {
    this.keyError.set('API credentials require a configured integration service.');
  }
  protected revokeKey(id: string): void {
    this.keyError.set('');
    if (!this.currentWorkspace()) {
      this.keyError.set(
        'The workspace changed. Reopen this company’s integrations before changing keys.',
      );
      return;
    }
    const key = this.keys().find((key) => key.id === id);
    if (!key) return;
    if (!window.confirm(`Remove the sample key “${key.name}” from this company?`)) return;
    const saved = this.store.saveWorkspace((data) => ({
      ...data,
      apiKeys: (data.apiKeys ?? []).filter((key) => key.id !== id),
    }));
    if (!saved) {
      this.keyError.set(
        'The sample key could not be removed. Try again after freeing browser storage.',
      );
      return;
    }
    if (this.revealedId === id) this.dismissKey();
    this.toast.success('Sample key removed.');
  }
  private async loadPreferences(id: string): Promise<void> {
    const generation = ++this.generation;
    this.preferencesLoading.set(true);
    this.preferencesEtag = '';
    this.savedBackup.set(false);
    this.backup = false;
    if (!id) {
      this.preferencesLoading.set(false);
      return;
    }
    try {
      const value = await this.auth.api<{ backup_preference: string | null; etag: string }>(
        `/companies/${id}/preferences`,
      );
      if (generation !== this.generation || id !== this.store.companyId()) return;
      this.preferencesEtag = value.etag;
      this.backup = value.backup_preference === 'enabled';
      this.savedBackup.set(this.backup);
    } catch (error) {
      if (generation === this.generation) this.backupError.set((error as Error).message);
    } finally {
      if (generation === this.generation) this.preferencesLoading.set(false);
    }
  }
  protected async saveBackup(): Promise<void> {
    if (
      this.preferencesLoading() ||
      this.preferencesSaving() ||
      !this.preferencesEtag ||
      !this.backupChanged()
    )
      return;
    const id = this.store.companyId();
    if (!this.currentWorkspace()) return;
    this.backupError.set('');
    this.preferencesSaving.set(true);
    try {
      const result = await this.auth.api<{ backup_preference: string; etag: string }>(
        `/companies/${id}/preferences`,
        { backup_preference: this.backup ? 'enabled' : 'disabled' },
        'PATCH',
        { 'If-Match': this.preferencesEtag },
      );
      if (id !== this.store.companyId()) return;
      this.preferencesEtag = result.etag;
      this.backup = result.backup_preference === 'enabled';
      this.savedBackup.set(this.backup);
      this.toast.success(
        'Backup preference saved. Scheduled backups require a configured backup service.',
      );
    } catch (error) {
      if (id === this.store.companyId()) this.backupError.set((error as Error).message);
    } finally {
      this.preferencesSaving.set(false);
    }
  }
  protected discardBackup(): void {
    this.backup = this.savedBackup();
    this.backupError.set('');
  }
  protected downloadBackup(): void {
    if (!this.currentWorkspace()) return;
    this.store.download(
      'workspace-backup.json',
      JSON.stringify(this.store.data(), null, 2),
      'application/json',
    );
  }
  protected exportPeople(): void {
    if (this.currentWorkspace()) this.store.exportPeople();
  }
}
