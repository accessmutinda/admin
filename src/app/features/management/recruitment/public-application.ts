import { publicRecruitment, PublicVacancy } from './recruitment-api.service';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ApplicationForm } from './application-form';
import { Logo } from '../../../shared/ui/logo';

@Component({
  selector: 'cv-public-application',
  imports: [ApplicationForm, Logo, Skeleton],
  template: `
    <main class="cv-management public-application">
      <header><cv-logo /><span>Careers</span></header>
      @if (loading()) {
        <section
          class="panel panel-body"
          role="status"
          aria-label="Loading vacancy"
          aria-busy="true"
        >
          @for (row of [0, 1, 2, 3, 4, 5]; track row) {
            <cv-skeleton sizeClass="my-5 h-8 w-full" />
          }
        </section>
      } @else if (vacancy(); as job) {
        <cv-application-form [vacancy]="job" [company]="company()" />
      } @else {
        <section class="panel panel-body" role="status">
          <h1>Vacancy unavailable</h1>
          <p>
            {{
              error() ||
                'This vacancy is closed or the application link is unavailable. Contact the employer for an available link.'
            }}
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
  private readonly route = inject(ActivatedRoute);
  private readonly companyId = this.route.snapshot.paramMap.get('companyId') ?? '';
  private readonly vacancyId = this.route.snapshot.paramMap.get('vacancyId') ?? '';
  protected readonly vacancy = signal<PublicVacancy | null>(null);
  protected readonly company = computed(() => this.vacancy()?.company);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  constructor() {
    void this.load();
  }
  private async load(): Promise<void> {
    try {
      this.vacancy.set(
        await publicRecruitment<PublicVacancy>(
          `/public/companies/${this.companyId}/vacancies/${this.vacancyId}`,
        ),
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'The vacancy is unavailable.');
    } finally {
      this.loading.set(false);
    }
  }
}
