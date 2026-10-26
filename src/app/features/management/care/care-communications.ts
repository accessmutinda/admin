import { Component, computed, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModuleDesign } from '../shared/module-design';
import { PortalClientContext } from '../staff-portal/portal-client-context';
import { PortalClientJournal } from '../staff-portal/portal-client-journal';
import { PortalCommunications } from '../staff-portal/portal-communications';
import { CareHeader } from './care-header';

@Component({
  selector: 'cv-care-communications',
  imports: [ModuleDesign, CareHeader, PortalClientJournal, PortalCommunications],
  providers: [PortalClientContext],
  host: { class: 'module-page operations-page' },
  template: `
    <cv-module-design />
    @if (context.client(); as client) {
      <cv-care-header [client]="client" [active]="section()" />
      @if (section() === 'journal') {
        <cv-portal-client-journal />
      } @else {
        <cv-portal-communications />
      }
    } @else {
      <p class="care-empty">Service user unavailable or access restricted.</p>
    }
  `,
  styleUrls: ['./service-user-spacing.css', './care-shared.css'],
})
export class CareCommunications {
  protected readonly context = inject(PortalClientContext);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  protected readonly section = computed(() => this.data()['careSection'] ?? 'journal');
  private readonly journal = viewChild(PortalClientJournal);
  private readonly communications = viewChild(PortalCommunications);

  canLeave(): boolean {
    return (this.journal() ?? this.communications())?.canLeave() ?? true;
  }
}
