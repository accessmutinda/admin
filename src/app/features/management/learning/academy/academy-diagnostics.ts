import { Component, inject } from '@angular/core';
import { AcademyService } from './academy.service';
import { AcademyAdminNav } from './academy-shared';
import { AcademyDate } from './academy-date';
@Component({
  selector: 'cv-academy-diagnostics',
  host: { class: 'module-page academy-page' },
  imports: [AcademyAdminNav, AcademyDate],
  template: `<cv-academy-admin-nav />
    <div class="heading">
      <div>
        <h1>CareVerity Academy — Restricted Diagnostics</h1>
        <p>
          Approved technical access to job identifiers and processing states. Staff names,
          assessment content and certificate files are excluded.
        </p>
      </div>
    </div>
    @if (academy.can('diagnostics')) {
      <section class="panel">
        <h2>Evidence processing jobs</h2>
        <div class="scroll" tabindex="0" role="region" aria-label="Redacted processing jobs">
          <table>
            <thead>
              <tr>
                <th>Job / trace</th>
                <th>State</th>
                <th>Attempts</th>
                <th>Updated / next retry</th>
              </tr>
            </thead>
            <tbody>
              @for (j of academy.state().completions ?? []; track j.id) {
                <tr>
                  <td>
                    {{ j.id }}<small>{{ j.correlationId }}</small>
                  </td>
                  <td>{{ j.status }}</td>
                  <td>{{ j.retryCount }}</td>
                  <td>
                    {{ j.updatedAt | ukDate: 'd MMM yyyy, HH:mm:ss'
                    }}<small>{{
                      j.nextRetryAt
                        ? (j.nextRetryAt | ukDate: 'd MMM yyyy, HH:mm:ss')
                        : 'No scheduled retry'
                    }}</small>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    } @else {
      <section class="panel">
        <h2>Access unavailable</h2>
        <p>Your approved diagnostic access has expired or was revoked.</p>
      </section>
    }`,
  styleUrls: ['./academy.css', './academy-governance.css'],
})
export class AcademyDiagnostics {
  protected readonly academy = inject(AcademyService);
}
