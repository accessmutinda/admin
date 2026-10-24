import { Component, DestroyRef, NgZone, computed, effect, inject, signal } from '@angular/core';
import { AcademyDate } from './academy-date';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { questionCorrect } from './academy.models';
import { AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
import { downloadAcademyCertificate } from './academy-pdf';
@Component({
  selector: 'cv-academy-assessment',
  imports: [AcademyDate, FormsModule, RouterLink, AcademyMessage, AcademyImage],
  templateUrl: './academy-assessment.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-assessment.css',
  ],
})
export class AcademyAssessment {
  protected readonly academy = inject(AcademyService);
  private readonly files = inject(AcademyAssets);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  protected readonly attempt = computed(() =>
    this.academy.attempt(this.params().get('attemptId') ?? ''),
  );
  protected readonly result = computed(() => this.data()['view'] === 'result');
  protected readonly now = signal(Date.now());
  protected readonly index = signal(0);
  protected readonly review = signal(false);
  protected readonly question = computed(() => this.attempt()?.questions[this.index()]);
  protected readonly seconds = computed(
    () =>
      Math.max(0, Math.ceil((Date.parse(this.attempt()?.deadline ?? '') - this.now()) / 1000)) || 0,
  );
  protected readonly timer = computed(
    () => Math.floor(this.seconds() / 60) + ':' + String(this.seconds() % 60).padStart(2, '0'),
  );
  protected readonly answered = computed(
    () =>
      this.attempt()?.questions.filter((q) => !!this.attempt()?.answers[q.id]?.length).length ?? 0,
  );
  protected readonly canEdit = computed(
    () =>
      !!this.attempt() &&
      this.academy.owns(this.attempt()!.personId) &&
      !this.attempt()!.submittedAt &&
      this.seconds() > 0,
  );
  protected readonly certificate = computed(() =>
    this.academy
      .state()
      .certificates.find(
        (c) =>
          c.assignmentId === this.attempt()?.assignmentId && this.academy.canReadPerson(c.personId),
      ),
  );
  protected readonly history = computed(() =>
    this.academy
      .state()
      .attempts.filter(
        (a) =>
          a.assignmentId === this.attempt()?.assignmentId && this.academy.canReadPerson(a.personId),
      )
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  );
  protected readonly topics = computed(() => {
    const a = this.attempt();
    if (!a) return [];
    return [...new Set(a.questions.map((q) => q.category))].map((topic) => {
      const questions = a.questions.filter((q) => q.category === topic);
      const total = questions.reduce((sum, q) => sum + q.weight, 0);
      const correct = questions
        .filter((q) => questionCorrect(q, a.answers[q.id] ?? []))
        .reduce((sum, q) => sum + q.weight, 0);
      return { topic, score: total ? Math.round((correct / total) * 100) : 0 };
    });
  });
  protected largeText = false;
  protected highContrast = false;
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly questionCorrect = questionCorrect;
  private expiryAttempt = '';
  constructor() {
    const timer = inject(NgZone).runOutsideAngular(() =>
      setInterval(() => this.now.set(Date.now()), 1000),
    );
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect(() => {
      const a = this.attempt();
      if (
        !a ||
        a.submittedAt ||
        !this.academy.owns(a.personId) ||
        this.seconds() > 0 ||
        this.expiryAttempt === a.id
      )
        return;
      this.expiryAttempt = a.id;
      this.submit(true);
    });
    effect(() => {
      this.params();
      this.index.set(0);
      this.review.set(false);
    });
  }
  protected choose(id: string, event: Event) {
    const a = this.attempt();
    const q = this.question();
    if (!a || !q || !this.canEdit()) return;
    const previous = a.answers[q.id] ?? [];
    const answers =
      q.type === 'Multiple choice'
        ? previous.includes(id)
          ? previous.filter((v) => v !== id)
          : [...previous, id]
        : [id];
    const error = this.academy.answer(a.id, q.id, answers, null, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (error) (event.target as HTMLInputElement).checked = previous.includes(id);
  }
  protected flag() {
    const a = this.attempt();
    const q = this.question();
    if (!a || !q) return;
    const error = this.academy.answer(
      a.id,
      q.id,
      a.answers[q.id] ?? [],
      !a.flags.includes(q.id),
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
  }
  protected submit(expired = false) {
    const a = this.attempt();
    if (!a || !this.academy.owns(a.personId)) return;
    if (
      !expired &&
      !window.confirm('Submit your assessment for marking? Submitted answers cannot be changed.')
    )
      return;
    const error = this.academy.submit(a.id, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error) void this.router.navigate(['/staff-portal/training/results', a.id]);
  }
  protected attemptNumber() {
    return this.history().findIndex((attempt) => attempt.id === this.attempt()?.id) + 1;
  }
  protected correctCount() {
    const a = this.attempt();
    return a?.questions.filter((q) => questionCorrect(q, a.answers[q.id] ?? [])).length ?? 0;
  }
  protected minutesTaken() {
    const a = this.attempt();
    return a?.submittedAt
      ? Math.max(
          0,
          Math.ceil(
            (Math.min(Date.parse(a.submittedAt), Date.parse(a.deadline)) -
              Date.parse(a.startedAt)) /
              60000,
          ),
        )
      : 0;
  }
  protected retry() {
    const a = this.attempt();
    if (!a) return;
    const result = this.academy.startAttempt(a.assignmentId, this.academy.store.companyId());
    this.error.set(result.error ?? '');
    if (!result.error) void this.router.navigate(['/staff-portal/training/assessment', result.id]);
  }
  protected remaining() {
    return Math.max(0, this.academy.state().settings.maxAttempts - this.history().length);
  }
  protected reviewQuestion(id: string) {
    const i = this.attempt()?.questions.findIndex((q) => q.id === id) ?? 0;
    this.index.set(Math.max(0, i));
    this.review.set(true);
  }
  protected notifyManager() {
    const a = this.attempt();
    if (!a) return;
    const error = this.academy.notifyManager(a.id, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error)
      this.notice.set(
        'Your training support request has been recorded for academy managers on this device.',
      );
  }
  protected async download() {
    const c = this.certificate();
    if (!c) return;
    try {
      await downloadAcademyCertificate(c, this.files);
      this.notice.set('Certificate PDF prepared.');
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  protected context() {
    const a = this.attempt();
    return a && this.academy.canManage() ? { person: a.personId } : {};
  }
  canLeave(): boolean {
    return true;
  }
}
