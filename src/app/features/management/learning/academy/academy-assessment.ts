import { Component, DestroyRef, NgZone, computed, effect, inject, signal } from '@angular/core';
import { AcademyDate } from './academy-date';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AcademyService } from './academy.service';
import { AcademyAssets } from './academy-assets.service';
import { questionCorrect } from './academy.models';
import { AcademyTimeline } from './academy-timeline';
import { AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
import { downloadAcademyCertificate } from './academy-pdf';
@Component({
  host: {
    class: 'module-page academy-page',
    '[attr.inert]': 'academy.resultsApi.saving() ? "" : null',
    '[attr.aria-busy]': 'academy.resultsApi.saving()',
  },
  selector: 'cv-academy-assessment',
  imports: [AcademyDate, FormsModule, RouterLink, AcademyMessage, AcademyImage, AcademyTimeline],
  templateUrl: './academy-assessment.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-assessment.css',
    './academy-quiz-view.css',
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
  protected readonly timer = computed(() =>
    this.attempt()?.policy?.timeLimitMinutes === 0
      ? 'Untimed'
      : Math.floor(this.seconds() / 60) + ':' + String(this.seconds() % 60).padStart(2, '0'),
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
          !this.attempt()?.groupId &&
          c.assignmentId === this.attempt()?.assignmentId &&
          this.academy.canReadPerson(c.personId),
      ),
  );
  protected readonly history = computed(() =>
    this.academy
      .state()
      .attempts.filter(
        (a) =>
          a.assignmentId === this.attempt()?.assignmentId &&
          (a.groupId ?? '') === (this.attempt()?.groupId ?? '') &&
          this.academy.canReadPerson(a.personId),
      )
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
  );
  protected readonly topics = computed(() => {
    const a = this.attempt();
    if (!a || !this.academy.feedbackVisible(a)) return [];
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
        this.academy.resultsApi.saving() ||
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
  protected completionPercent() {
    const count = this.attempt()?.questions.length ?? 0;
    return count ? Math.round((this.answered() / count) * 100) : 0;
  }
  protected maxAttempts() {
    return this.attempt()?.policy?.maxAttempts ?? this.academy.state().settings.maxAttempts;
  }
  protected totalMarks() {
    return this.attempt()?.questions.reduce((sum, q) => sum + q.weight, 0) ?? 0;
  }
  protected requiredMarks() {
    return Math.ceil((this.totalMarks() * (this.attempt()?.passMark ?? 0)) / 100);
  }
  protected timerDescription() {
    return this.attempt()?.policy?.timeLimitMinutes === 0
      ? 'Untimed'
      : Math.floor(this.seconds() / 60) + ' minutes ' + (this.seconds() % 60) + ' seconds';
  }
  protected answerInstruction() {
    return this.question()?.type === 'Free text'
      ? 'Enter your response.'
      : this.question()?.type === 'Multiple choice'
        ? this.attempt()?.groupKind === 'Survey'
          ? 'Select all that apply.'
          : 'Select every correct answer.'
        : 'Select one answer.';
  }
  protected letter(index: number) {
    return String.fromCharCode(65 + index);
  }
  protected questionTypes() {
    return [...new Set(this.attempt()?.questions.map((q) => q.type) ?? [])].join(', ');
  }
  protected hasCriticalQuestions() {
    return !!this.attempt()?.questions.some((q) => q.critical);
  }
  protected async saveNext() {
    const attempt = this.attempt(),
      question = this.question();
    if (!attempt || !question || !this.canEdit()) return;
    this.notice.set('');
    const error = await this.academy.answer(
      attempt.id,
      question.id,
      attempt.answers[question.id] ?? [],
      null,
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
    if (error) return;
    this.notice.set('Responses saved.');
    if (this.index() < attempt.questions.length - 1) this.index.update((index) => index + 1);
    else this.notice.set('Responses saved. Review your answers, then submit when you are ready.');
  }
  protected async choose(id: string, event: Event) {
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
    const error = await this.academy.answer(
      a.id,
      q.id,
      answers,
      null,
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
    if (error) (event.target as HTMLInputElement).checked = previous.includes(id);
  }
  protected async writeResponse(text: string) {
    const a = this.attempt(),
      q = this.question();
    if (!a || !q || !this.canEdit()) return;
    this.error.set(
      (await this.academy.answer(
        a.id,
        q.id,
        text.trim() ? [text] : [],
        null,
        this.academy.store.companyId(),
      )) ?? '',
    );
  }
  protected async flag() {
    const a = this.attempt();
    const q = this.question();
    if (!a || !q) return;
    const error = await this.academy.answer(
      a.id,
      q.id,
      a.answers[q.id] ?? [],
      !a.flags.includes(q.id),
      this.academy.store.companyId(),
    );
    this.error.set(error ?? '');
  }
  protected async submit(expired = false) {
    const a = this.attempt();
    if (!a || !this.academy.owns(a.personId)) return;
    if (
      !expired &&
      !window.confirm(
        a.groupKind === 'Survey'
          ? 'Submit your survey? Submitted responses cannot be changed.'
          : 'Submit your assessment for marking? Submitted answers cannot be changed.',
      )
    )
      return;
    const error = await this.academy.submit(a.id, this.academy.store.companyId());
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
  protected async retry() {
    const a = this.attempt();
    if (!a) return;
    const result = await this.academy.startAttempt(
      a.assignmentId,
      this.academy.store.companyId(),
      a.groupId ?? '',
    );
    this.error.set(result.error ?? '');
    if (!result.error) void this.router.navigate(['/staff-portal/training/assessment', result.id]);
  }
  protected retake() {
    this.now();
    const assignment = this.academy.assignment(this.attempt()?.assignmentId ?? '');
    return assignment
      ? this.academy.assessmentAvailability(assignment, this.now(), this.attempt()?.groupId ?? '')
      : undefined;
  }
  protected remaining() {
    return Math.max(
      0,
      (this.attempt()?.policy?.maxAttempts ?? this.academy.state().settings.maxAttempts) -
        this.history().length,
    );
  }
  protected reviewQuestion(id: string) {
    const i = this.attempt()?.questions.findIndex((q) => q.id === id) ?? 0;
    this.index.set(Math.max(0, i));
    this.review.set(true);
  }
  protected async notifyManager() {
    const a = this.attempt();
    if (!a) return;
    const error = await this.academy.notifyManager(a.id, this.academy.store.companyId());
    this.error.set(error ?? '');
    if (!error)
      this.notice.set('Your training support request has been recorded for academy managers.');
  }
  protected async download() {
    const c = this.certificate();
    if (!c || !this.academy.canReadCertificate()) return;
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
    return !this.academy.resultsApi.saving();
  }
}
