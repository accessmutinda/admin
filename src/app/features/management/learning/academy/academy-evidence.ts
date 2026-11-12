import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { FormsModule } from '@angular/forms';
import { AcademyService } from './academy.service';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyDate } from './academy-date';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-evidence',
  imports: [
    RouterLink,
    FormsModule,
    MatSelectModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyDate,
  ],
  templateUrl: './academy-evidence.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-dashboard.css'],
})
export class AcademyEvidence {
  protected readonly academy = inject(AcademyService);
  protected readonly resultsView = inject(ActivatedRoute).snapshot.data['view'] === 'results';
  private readonly router = inject(Router);
  protected resultStaff = '';
  protected certificateStaff = '';
  protected certificatePeople() {
    return this.academy.certificatesApi.people();
  }

  protected openStaffCertificate(id: string) {
    if (!this.academy.certificatesApi.available()) return;
    const latest = this.academy
      .state()
      .certificates.filter((c) => c.personId === id)
      .reverse()
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0];
    if (latest) void this.router.navigate(['/manage/learning/certificates', latest.id]);
  }
  protected resultPeople() {
    return this.academy.resultsApi
      .people()
      .filter((p) =>
        this.academy.state().attempts.some((a) => a.personId === p.id && a.submittedAt),
      );
  }
  protected openStaffResult(id: string) {
    if (!this.academy.can('evidence', id)) return;
    const latest = this.academy
      .state()
      .attempts.filter((a) => a.personId === id && a.submittedAt)
      .reverse()
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
    if (latest) void this.router.navigate(['/manage/learning/results', latest.id]);
  }
  protected filter = 'All';
  protected search = '';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected certificates() {
    return this.academy
      .state()
      .certificates.filter(
        (c) =>
          this.academy.certificatesApi.available() &&
          `${c.learner} ${c.courseTitle} ${c.id}`
            .toLowerCase()
            .includes(this.search.toLowerCase()) &&
          (this.filter === 'All' ||
            (this.filter === 'Revoked'
              ? !!c.revokedAt
              : !c.revokedAt &&
                (this.filter === 'Pending'
                  ? this.academy.completion(c.assignmentId)?.status !== 'COMPLETE_SYNCED'
                  : this.academy.completion(c.assignmentId)?.status === 'COMPLETE_SYNCED'))),
      );
  }
  protected attempts() {
    return this.academy
      .state()
      .attempts.filter(
        (a) =>
          a.submittedAt &&
          this.academy.can('evidence', a.personId) &&
          `${a.courseTitle} ${a.groupTitle ?? ''} ${this.name(a.personId)}`
            .toLowerCase()
            .includes(this.search.toLowerCase()),
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  protected name(id: string) {
    return (
      [...this.academy.resultsApi.people(), ...this.academy.certificatesApi.people()].find(
        (p) => p.id === id,
      )?.name ?? 'Unavailable staff record'
    );
  }
  protected accessRequests() {
    return (
      this.academy.state().accessRequests?.filter(() => this.academy.certificatesApi.available()) ??
      []
    );
  }
  protected async acknowledgeAccess(id: string) {
    const error = await this.academy.acknowledgeRecordsRequest(id, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error)
      this.notice.set(
        'Request acknowledged for HR handling. No disclosure or external message has been sent.',
      );
  }
  protected async retry(id: string) {
    try {
      await this.academy.certificatesApi.issue(id);
      this.notice.set('Certificate issued and linked to the staff training file.');
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
