import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { CareService } from './care.service';
import { age, csv } from './care.models';
import { RotaClient, londonDate } from '../rota/rota.models';
@Component({
  selector: 'cv-service-user-directory',
  imports: [DatePipe, FormsModule, RouterLink, MatSelectModule, CvSelect],
  styleUrls: ['./care-shared.css', './care-controls.css', './service-user-directory.css'],
  styles: [
    `
      .directory-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 8px;
      }
      .directory-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        object-fit: cover;
        background: #eaf5fc;
        color: #0066ac;
        display: inline-grid;
        place-items: center;
        flex-shrink: 0;
      }
      .directory-identity {
        display: flex;
        gap: 8px;
        align-items: center;
        min-width: 180px;
      }
    `,
  ],
  templateUrl: './service-user-directory.html',
})
export class ServiceUserDirectory {
  protected readonly care = inject(CareService);
  protected readonly query = signal('');
  protected readonly status = signal('Active');
  protected readonly funding = signal('');
  protected readonly need = signal('');
  protected readonly packageFilter = signal('');
  protected readonly view = signal('Table');
  protected readonly page = signal(1);
  protected readonly pageSize = 8;
  protected readonly selected = signal<string[]>([]);
  protected readonly sort = signal('name');
  protected readonly needs = computed(() =>
    [...new Set(this.care.clients().flatMap((c) => this.primaryNeeds(c)))].sort(),
  );
  protected readonly clients = computed(() =>
    this.care
      .clients()
      .filter(
        (c) =>
          (this.status() === 'All' || c.active === (this.status() === 'Active')) &&
          (!this.funding() || c.funding === this.funding()) &&
          (!this.need() || this.primaryNeeds(c).includes(this.need())) &&
          (!this.packageFilter() ||
            this.calls(c).some((call) => call.name === this.packageFilter())) &&
          `${c.name} ${c.address} ${c.postcode} ${c.reference} ${c.file?.details['gp'] ?? ''} ${c.representative?.name ?? ''} ${(c.file?.contacts ?? []).map((p) => p.name).join(' ')} ${Object.values(c.file?.details ?? {}).join(' ')}`
            .toLowerCase()
            .includes(this.query().trim().toLowerCase()),
      )
      .sort((a, b) =>
        this.sort() === 'name'
          ? a.name.localeCompare(b.name)
          : (this.nextVisit(a)?.date ?? '9999').localeCompare(this.nextVisit(b)?.date ?? '9999'),
      ),
  );
  protected readonly packages = computed(() =>
    [...new Set(this.care.rota.data().calls.map((c) => c.name))].sort(),
  );
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.clients().length / this.pageSize)),
  );
  protected readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  protected readonly rows = computed(() =>
    this.clients().slice(
      (this.currentPage() - 1) * this.pageSize,
      this.currentPage() * this.pageSize,
    ),
  );
  protected age = age;
  protected readonly today = londonDate();
  protected calls(c: RotaClient) {
    return this.care.rota.data().calls.filter((call) => call.clientId === c.id && call.active);
  }
  protected primaryNeeds(c: RotaClient): string[] {
    return [
      ...new Set(
        [
          c.file?.sections['diagnoses']?.['primary'],
          ...(c.file?.entries['diagnoses'] ?? [])
            .filter((e) => e.status === 'Active')
            .map((e) => e.name),
        ].filter(Boolean),
      ),
    ] as string[];
  }
  protected nextVisit(c: RotaClient) {
    return this.care.rota
      .data()
      .visits.filter(
        (v) =>
          v.clientId === c.id &&
          v.state !== 'Cancelled' &&
          (v.date > this.today ||
            (v.date === this.today &&
              v.start >=
                new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Europe/London',
                  hour: '2-digit',
                  minute: '2-digit',
                  hourCycle: 'h23',
                }).format(new Date()))),
      )
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0];
  }
  protected kin(c: RotaClient) {
    return c.file?.contacts?.find((p) => p.nextOfKin) ?? c.representative;
  }
  protected alerts(c: RotaClient): string[] {
    const result: string[] = [...(c.riskFlags ?? [])];
    if (c.priority === 'High') result.push('High priority');
    if (c.file?.sections['capacity']?.['status'] === 'Fluctuates') result.push('Review capacity');
    if (this.calls(c).some((call) => call.timeSensitive)) result.push('Time-sensitive');
    if (c.file?.sections['plan']?.['review'] && c.file.sections['plan']['review'] < this.today)
      result.push('Care plan review overdue');
    return result;
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0])
      .join('');
  }
  protected toggle(id: string): void {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  }
  protected selectAll(): void {
    const ids = this.rows().map((c) => c.id);
    this.selected.update((selected) =>
      ids.every((id) => selected.includes(id))
        ? selected.filter((id) => !ids.includes(id))
        : [...new Set([...selected, ...ids])],
    );
  }
  protected clear(): void {
    this.query.set('');
    this.status.set('Active');
    this.funding.set('');
    this.need.set('');
    this.packageFilter.set('');
    this.page.set(1);
    this.selected.set([]);
  }
  protected export(): void {
    if (!this.care.rota.can('export')) return;
    const rows = this.clients().filter(
      (c) => !this.selected().length || this.selected().includes(c.id),
    );
    this.care.store.download(
      'service-users.csv',
      csv([
        [
          'Name',
          'DOB',
          'NHS number',
          'Address',
          'Postcode',
          'Primary needs',
          'Funding',
          'Next of kin',
          'GP',
          'Status',
        ],
        ...rows.map((c) => [
          c.name,
          c.file?.details['dob'],
          c.file?.details['nhs'],
          c.address,
          c.postcode,
          this.primaryNeeds(c).join('; '),
          c.funding,
          this.kin(c)?.name,
          c.file?.details['gp'],
          c.active ? 'Active' : 'Inactive',
        ]),
      ]),
      'text/csv',
    );
  }
}
