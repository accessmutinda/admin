import {
  Component,
  computed,
  inject,
  viewChild,
  effect,
  untracked,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ModuleDesign } from '../shared/module-design';
import { PortalClientContext } from '../staff-portal/portal-client-context';
import { PortalClientJournal } from '../staff-portal/portal-client-journal';
import { PortalCommunications } from '../staff-portal/portal-communications';
import { CareHeader } from './care-header';
import { JournalService } from '../journal/journal.service';
import { ToastService } from '../../../shared/ui/toast.service';
import { ServiceUsersApi } from '../clients/service-users-api.service';
import { PageLoading } from '../../../shared/layouts/page-loading';
import { CompanyUnavailable } from '../shared/company-unavailable';

@Component({
  selector: 'cv-care-communications',
  imports: [
    ModuleDesign,
    CareHeader,
    PortalClientJournal,
    PortalCommunications,
    PageLoading,
    CompanyUnavailable,
  ],
  providers: [PortalClientContext, ServiceUsersApi],
  host: { class: 'module-page operations-page' },
  template: `
    <cv-module-design />
    @if (client(); as client) {
      <cv-care-header
        [client]="client"
        [active]="section()"
        [printManaged]="true"
        [printBusy]="
          section() === 'journal' ? journalService.printBusy() : communicationsPrintBusy()
        "
        (printRequested)="printJournal()"
      />
      @if (section() === 'journal') {
        <cv-portal-client-journal />
      } @else {
        <cv-portal-communications />
      }
    } @else if (records.detailLoading()) {
      <cv-page-loading url="/manage/clients" />
    } @else if (records.error()) {
      <cv-company-unavailable [message]="records.error()" (retry)="records.detail(context.id())" />
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
  protected readonly journalService = inject(JournalService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);
  protected async printJournal(): Promise<void> {
    try {
      if (this.section() !== 'journal') {
        await this.communications()?.print();
        return;
      }
      await this.journalService.preparePrint();
      this.changeDetector.detectChanges();
      window.print();
    } catch (error) {
      this.toast.error(
        error instanceof Error ? error.message : 'The journal could not be prepared for printing.',
      );
    }
  }
  protected readonly records = inject(ServiceUsersApi);
  protected readonly client = computed(() =>
    this.records.selected()?.id === this.context.id() ? this.records.selected() : null,
  );
  protected communicationsPrintBusy(): boolean {
    return this.communications()?.printBusy() ?? false;
  }
  constructor() {
    effect(() => {
      const section = this.section(),
        id = this.context.id(),
        scope = this.records.scope();
      untracked(() => {
        if (id) void this.records.detail(id);
      });
    });
  }
  private readonly journal = viewChild(PortalClientJournal);
  private readonly communications = viewChild(PortalCommunications);

  canLeave(): boolean {
    return (this.journal() ?? this.communications())?.canLeave() ?? true;
  }
}
