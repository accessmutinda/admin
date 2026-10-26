import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PortalDemo } from './portal-demo.service';
import { PortalConnections } from './portal-connections.service';

@Component({
  selector: 'cv-portal-record-summary',
  imports: [DatePipe, RouterLink],
  templateUrl: './portal-record-summary.html',
  styleUrl: './portal-record-summary.css',
})
export class PortalRecordSummary {
  readonly clientId = input('');
  readonly staffId = input('');
  private readonly demo = inject(PortalDemo);
  private readonly connections = inject(PortalConnections);
  protected readonly connection = computed(() =>
    this.clientId()
      ? this.connections.client(this.clientId())
      : this.connections.staff(this.staffId()),
  );
}
