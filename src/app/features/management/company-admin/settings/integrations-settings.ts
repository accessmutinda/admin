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
  imports: [FormsModule, RouterLink],
  templateUrl: './integrations-settings.html',
  styleUrl: './integrations-settings.css',
})
export class IntegrationsSettings {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
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
      if (id === this.workspaceId) return;
      untracked(() => {
        this.workspaceId = id;
        this.keyName = '';
        this.dismissKey();
        this.backup = this.store.data().backup;
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
    return this.backup !== this.store.data().backup;
  }
  canLeave(): boolean {
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
    this.submitted.set(true);
    this.keyError.set('');
    if (!this.currentWorkspace()) {
      this.keyError.set('The workspace changed. Reopen this company’s integrations before saving.');
      return;
    }
    const name = this.keyName.trim();
    if (!name || name.length > 80) {
      this.keyError.set('Enter an integration name, up to 80 characters.');
      return;
    }
    const key = { id: crypto.randomUUID(), name, created: new Date().toISOString() };
    const saved = this.store.saveWorkspace((data) => {
      if (
        (data.apiKeys ?? []).some(
          (existing) => existing.name.trim().toLowerCase() === name.toLowerCase(),
        )
      ) {
        this.keyError.set('A sample key with this name already exists in this company.');
        return data;
      }
      return { ...data, apiKeys: [...(data.apiKeys ?? []), key] };
    });
    if (this.keyError()) return;
    if (!saved) {
      this.keyError.set(
        'The sample key could not be saved. Your name is still here; free browser storage and try again.',
      );
      return;
    }
    this.revealedKey = 'demo_' + crypto.randomUUID();
    this.revealedId = key.id;
    this.keyName = '';
    this.submitted.set(false);
    this.search.set('');
    this.page.set(this.pageCount());
    this.toast.info('Sample key recorded. It does not grant API access.');
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
  protected saveBackup(): void {
    this.backupError.set('');
    if (!this.currentWorkspace()) {
      this.backupError.set(
        'The workspace changed. Reopen this company’s backup preferences before saving.',
      );
      return;
    }
    if (!this.backupChanged()) return;
    if (!this.store.saveWorkspace((data) => ({ ...data, backup: this.backup }))) {
      this.backupError.set(
        'The preference could not be saved. Your selection is still here; free browser storage and try again.',
      );
      return;
    }
    this.toast.success('Backup preference saved. Scheduled backups are not connected.');
  }
  protected discardBackup(): void {
    this.backup = this.store.data().backup;
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
