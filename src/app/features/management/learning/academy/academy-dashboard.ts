import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
import { AcademyDashboardApi } from './academy-dashboard-api.service';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-dashboard',
  imports: [
    RouterLink,
    FormsModule,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyDate,
    AcademyMessage,
  ],
  templateUrl: './academy-dashboard.html',
  styleUrls: ['./academy.css', './academy-dashboard.css'],
})
export class AcademyDashboard {
  protected readonly api = inject(AcademyDashboardApi);
  protected readonly period = signal(30);
  constructor() {
    effect(() => {
      const period = this.period();
      this.api.scope();
      if (this.api.available())
        untracked(() => {
          void this.api.load(period).catch(() => {});
        });
    });
  }
  protected reload() {
    void this.api.load(this.period(), true).catch(() => {});
  }
  protected stats() {
    return this.api.data()?.stats ?? [];
  }
  protected activity() {
    return this.api.data()?.activity.results ?? [];
  }
  protected renewals() {
    return this.api.data()?.renewals.results ?? [];
  }
  protected recent() {
    return this.api.data()?.recent.results ?? [];
  }
  protected readiness() {
    return this.api.data()!.readiness;
  }
  protected percent(count: number) {
    const total = this.readiness().total;
    return total ? Math.round((count * 100) / total) + '%' : '—';
  }
  protected timestamp(at?: string | null) {
    if (!at) return 'Not recorded';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: this.api.data()?.meta.timezone ?? 'Europe/London',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(at));
  }
  protected integrationRows() {
    return this.api.data()?.integrations ?? [];
  }
  protected serviceCards() {
    const rows = this.integrationRows();
    return [
      {
        title: 'Certificates Filed to Staff Records',
        description: 'Internal certificate evidence is linked to the same staff record.',
        icon: 'folder_open',
        tone: 'blue',
        row: rows[0],
      },
      {
        title: 'Training Matrix',
        description: 'Current knowledge evidence is calculated against mandatory requirements.',
        icon: 'layers',
        tone: 'blue',
        row: rows[1],
      },
      {
        title: 'Rota Eligibility',
        description: 'External delivery and deployment authority require configured adapters.',
        icon: 'event_available',
        tone: 'purple',
        row: rows[2],
      },
    ];
  }
  protected readonly workflow = [
    { icon: 'groups', label: 'Assign Course', tone: 'blue' },
    { icon: 'smart_display', label: 'Watch Video', tone: 'blue' },
    { icon: 'assignment_turned_in', label: 'Complete Quiz', tone: 'purple' },
    { icon: 'check_circle', label: 'Auto Mark', tone: 'green' },
    { icon: 'workspace_premium', label: 'Generate Internal Certificate', tone: 'purple' },
    { icon: 'folder_open', label: 'Save to Staff HR File', tone: 'blue' },
    { icon: 'database', label: 'Update Training Record', tone: 'blue' },
    { icon: 'verified_user', label: 'Recalculate Compliance', tone: 'green' },
    { icon: 'event_available', label: 'Rota Adapter (when configured)', tone: 'purple' },
  ];
}
