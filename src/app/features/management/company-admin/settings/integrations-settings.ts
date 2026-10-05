import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManagementStore } from '../../shared/management.store';
import { ToastService } from '../../../../shared/ui/toast.service';
@Component({
  selector: 'cv-integrations-settings',
  imports: [FormsModule],
  templateUrl: './integrations-settings.html',
})
export class IntegrationsSettings {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected keys: { id: string; name: string; created: string }[] = [
    ...(this.store.data().apiKeys ?? []),
  ];
  protected keyName = '';
  protected revealedKey = '';
  protected backup = this.store.data().backup;
  protected createKey(): void {
    if (!this.keyName.trim()) return;
    this.keys.push({
      id: crypto.randomUUID(),
      name: this.keyName,
      created: new Date().toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' }),
    });
    this.store.update((d) => ({ ...d, apiKeys: [...this.keys] }));
    this.revealedKey = 'demo_' + crypto.randomUUID();
    this.keyName = '';
    this.toast.info('Demo key created. It does not grant API access.');
  }
  protected revokeKey(id: string): void {
    this.keys = this.keys.filter((k) => k.id !== id);
    this.store.update((d) => ({ ...d, apiKeys: [...this.keys] }));
    this.revealedKey = '';
    this.toast.success('Demo key revoked.');
  }
  protected saveBackup(): void {
    this.store.update((d) => ({ ...d, backup: this.backup }));
    this.toast.success('Backup preference saved for this demo.');
  }
  protected downloadBackup(): void {
    this.store.download(
      'workspace-backup.json',
      JSON.stringify(this.store.data(), null, 2),
      'application/json',
    );
  }
}
