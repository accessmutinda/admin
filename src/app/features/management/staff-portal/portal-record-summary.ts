import { Component, Injector, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortalConnections } from './portal-connections.service';

@Component({
  selector: 'cv-portal-record-summary',
  imports: [DatePipe, RouterLink],
  templateUrl: './portal-record-summary.html',
  styleUrl: './portal-record-summary.css',
})
export class PortalRecordSummary {
  readonly connected = input(true);
  readonly clientId = input('');
  readonly staffId = input('');
  private readonly injector = inject(Injector);
  private get connections() {
    return this.injector.get(PortalConnections);
  }
  protected readonly connection = computed(() =>
    !this.connected()
      ? null
      : this.clientId()
        ? this.connections.client(this.clientId())
        : this.connections.staff(this.staffId()),
  );
}
