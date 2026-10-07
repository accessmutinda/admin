import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ManagementStore } from '../shared/management.store';
import { ApplicationForm } from './application-form';
import { Logo } from '../../../shared/ui/logo';

@Component({
  selector: 'cv-public-application',
  imports: [ApplicationForm, Logo],
  template: `
    <main class="cv-management public-application">
      <header><cv-logo /><span>Careers</span></header>
      <p class="application-demo">
        Device demo: this link and applications work in the browser where the vacancy was saved.
        Applications from other devices require a connected recruitment service.
      </p>
      @if (vacancy(); as job) {
        <cv-application-form [vacancy]="job" [company]="company()" />
      } @else {
        <section class="panel panel-body" role="status">
          <h1>Vacancy unavailable</h1>
          <p>
            This vacancy is closed, the link is incorrect, or it is not saved in this browser.
            Contact the employer for an available application link.
          </p>
        </section>
      }
      <footer>Powered by CareVerity · People. Purpose. Progress.</footer>
    </main>
  `,
  styles: `
    .public-application {
      padding: 24px max(16px, calc((100vw - 760px) / 2));
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      color: var(--color-navy);
    }
    .application-demo {
      padding: 12px 16px;
      margin-bottom: 16px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
    }
    footer {
      padding: 24px 0;
      text-align: center;
      font-size: 12px;
      color: var(--color-slate);
    }
  `,
})
export class PublicApplication {
  private readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  private readonly companyId = this.route.snapshot.paramMap.get('companyId') ?? '';
  private readonly vacancyId = this.route.snapshot.paramMap.get('vacancyId') ?? '';
  protected readonly company = computed(() =>
    this.store.companies().find((c) => c.id === this.companyId),
  );
  protected readonly vacancy = computed(() =>
    this.store.publicVacancy(this.companyId, this.vacancyId),
  );
}
