import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { A11yModule } from '@angular/cdk/a11y';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyCourseSteps } from './academy-course-steps';
import {
  AcademyCourse,
  AcademyQuestion,
  AcademyQuestionGroup,
  hasUnusedVideos,
} from './academy.models';
import { AcademyAdminNav, AcademyMessage } from './academy-shared';
import { AcademyImage } from './academy-image';
import { AcademyDate } from './academy-date';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-question-editor',
  imports: [
    AcademyCourseSteps,
    FormsModule,
    RouterLink,
    A11yModule,
    MatSelectModule,
    MatMenuModule,
    CvSelect,
    AcademyAdminNav,
    AcademyMessage,
    AcademyImage,
    AcademyDate,
  ],
  templateUrl: './academy-question-editor.html',
  styleUrls: ['./academy-forms.css', './academy.css', './academy-question-editor.css'],
})
export class AcademyQuestionEditor {
  protected readonly academy = inject(AcademyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workspace = this.academy.store.companyId();
  private readonly id = this.route.snapshot.paramMap.get('questionId');
  private readonly source = this.academy.editableQuestions().find((q) => q.id === this.id);
  protected readonly unavailable = !!this.id && !this.source;
  protected course: AcademyCourse | undefined;
  protected bank: AcademyQuestion[] = [];
  protected groups: AcademyQuestionGroup[] = [];
  protected draft!: AcademyQuestion;
  protected tags = '';
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly previewOpen = signal(false);
  protected readonly mobilePreview = signal(false);
  protected readonly revealAnswers = signal(false);
  protected readonly groupOpen = signal(false);
  protected readonly selectedIds = signal<string[]>([]);
  protected targetGroup = '';
  protected groupForm!: AcademyQuestionGroup;
  protected byTopic = false;
  protected selectedGroupId = '';
  protected readonly types = [
    { value: 'Single choice', label: 'Multiple choice — single correct answer' },
    { value: 'Multiple choice', label: 'Multiple choice — multiple answers' },
    { value: 'True / false', label: 'True / False' },
    { value: 'Free text', label: 'Free text — surveys only' },
  ];
  private original = '';
  private originalBank: AcademyQuestion[] = [];
  private expectedCourse = '';
  constructor() {
    this.loadCourse(
      this.source?.courseId ??
        this.route.snapshot.queryParamMap.get('course') ??
        this.academy.editableCourses()[0]?.id ??
        '',
      this.id ?? '',
      this.route.snapshot.routeConfig?.path === 'questions/new',
    );
  }
  private blank(): AcademyQuestion {
    return {
      id: crypto.randomUUID(),
      courseId: this.course?.id ?? '',
      lessonId: this.course?.lessons[0]?.id ?? '',
      groupId: '',
      order: this.bank.length,
      type: 'Single choice',
      text: '',
      scenario: '',
      category: 'General',
      difficulty: 'Medium',
      weight: 1,
      required: true,
      shuffle: true,
      critical: false,
      imageId: '',
      options: ['A', 'B', 'C', 'D'].map(() => ({ id: crypto.randomUUID(), text: '' })),
      correctIds: [],
      explanation: '',
      correctFeedback: '',
      incorrectFeedback: '',
      tags: [],
      status: 'Draft',
      version: 0,
      updatedAt: '',
    };
  }
  private snapshot() {
    return JSON.stringify({ bank: this.bank, groups: this.groups });
  }
  private syncTags() {
    if (this.draft)
      this.draft.tags = this.tags
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
  }
  private loadCourse(id: string, selected = '', create = false) {
    this.course = structuredClone(this.academy.course(id));
    this.expectedCourse = this.course?.updatedAt ?? '';
    this.bank = structuredClone(
      this.academy.editableQuestions().filter((q) => q.courseId === id),
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.groups = structuredClone(this.course?.questionGroups ?? []);
    this.originalBank = structuredClone(this.bank);
    this.original = this.snapshot();
    this.selectedIds.set([]);
    this.draft = this.bank.find((q) => q.id === selected) ?? this.bank[0] ?? this.blank();
    if ((create || !this.bank.length) && this.course && !this.unavailable) {
      this.draft = this.blank();
      this.bank.push(this.draft);
    }
    this.selectedGroupId = this.draft.groupId === 'final' ? '' : this.draft.groupId || '';
    this.tags = this.draft.tags.join(', ');
    this.original = this.snapshot();
    this.error.set('');
    this.notice.set('');
  }
  protected changeCourse(id: string) {
    this.syncTags();
    if (
      this.snapshot() !== this.original &&
      !window.confirm('Discard unsaved question bank changes and change course?')
    )
      return;
    if (hasUnusedVideos(this.academy.course(id))) {
      void this.router.navigate(['/manage/learning/structure', id]);
      return;
    }
    this.loadCourse(id);
  }
  protected rows() {
    return this.bank
      .filter((q) => (q.groupId === 'final' ? '' : (q.groupId ?? '')) === this.selectedGroupId)
      .sort((a, b) =>
        this.byTopic
          ? a.category.localeCompare(b.category) || (a.order ?? 0) - (b.order ?? 0)
          : (a.order ?? this.bank.indexOf(a)) - (b.order ?? this.bank.indexOf(b)),
      );
  }
  protected sections() {
    return [
      ...this.groups.map((g) => ({
        id: g.id,
        title: g.title,
        kind: g.kind ?? 'Quiz',
        description: this.placement(g) + ' · ' + this.gradingLabel(g),
      })),
      {
        id: '',
        title: 'Final course assessment',
        kind: 'Quiz',
        description: 'End of course · Counts toward final grade',
      },
    ].map((g) => ({
      ...g,
      questions: this.bank.filter((q) => (q.groupId === 'final' ? '' : q.groupId || '') === g.id),
    }));
  }
  protected chooseGroup(id: string) {
    this.syncTags();
    this.selectedGroupId = id;
    const first = this.rows()[0];
    if (first) this.select(first);
    this.selectedIds.set([]);
    this.error.set('');
  }
  protected selectedGroup() {
    return this.sections().find((g) => g.id === this.selectedGroupId)!;
  }
  protected hasSelectedQuestion() {
    return this.rows().some((q) => q.id === this.draft.id);
  }
  protected questionPosition() {
    return this.rows().findIndex((q) => q.id === this.draft.id);
  }
  protected groupDefinition(id: string) {
    return this.groups.find((g) => g.id === id);
  }
  protected bankGroupCount(id: string) {
    return this.bank.filter((q) => q.groupId === id && q.status !== 'Archived').length;
  }
  protected groupLessons() {
    return this.lessons().filter(
      (l) => this.groupForm.placement !== 'Within module' || l.moduleId === this.groupForm.moduleId,
    );
  }
  protected isSurvey(question = this.draft) {
    return this.groups.find((g) => g.id === question.groupId)?.kind === 'Survey';
  }
  protected gradingLabel(group?: AcademyQuestionGroup) {
    return group?.kind === 'Survey'
      ? 'Survey · No grade'
      : !group || group.countsTowardGrade
        ? 'Counts toward final grade'
        : 'Practice only · Excluded from final grade';
  }
  protected changeGroup() {
    this.selectedGroupId = this.draft.groupId === 'final' ? '' : this.draft.groupId || '';
    if (this.isSurvey()) {
      this.draft.correctIds = [];
      this.draft.critical = false;
    } else if (this.draft.type === 'Free text') {
      this.draft.type = 'Single choice';
      this.changeType();
    }
  }
  protected changeGroupKind(kind: 'Quiz' | 'Survey') {
    this.groupForm.kind = kind;
    if (this.groupForm.kind === 'Survey') this.groupForm.countsTowardGrade = false;
  }
  protected select(question: AcademyQuestion) {
    this.syncTags();
    this.draft = question;
    this.selectedGroupId = question.groupId === 'final' ? '' : question.groupId || '';
    this.tags = question.tags.join(', ');
    this.error.set('');
  }
  protected number(question = this.draft) {
    return this.bank.indexOf(question) + 1;
  }
  protected padded(question = this.draft) {
    return String(this.number(question)).padStart(2, '0');
  }
  protected navigate(direction: number) {
    const rows = this.rows();
    const index = rows.indexOf(this.draft) + direction;
    if (index >= 0 && index < rows.length) this.select(rows[index]);
  }
  protected add(groupId = this.selectedGroupId) {
    this.syncTags();
    const question = this.blank();
    question.groupId = groupId;
    this.bank.push(question);
    this.select(question);
  }
  protected duplicate(question = this.draft) {
    this.syncTags();
    const copy = structuredClone(question);
    const options = copy.options.map((o) => ({ ...o, id: crypto.randomUUID() }));
    copy.correctIds = copy.correctIds
      .map((id) => options[copy.options.findIndex((o) => o.id === id)]?.id)
      .filter(Boolean);
    Object.assign(copy, {
      id: crypto.randomUUID(),
      text: copy.text ? copy.text.slice(0, 1990) + ' (copy)' : '',
      options,
      status: 'Draft',
      version: 0,
      updatedAt: '',
      order: this.bank.length,
    });
    this.bank.push(copy);
    this.select(copy);
  }
  protected move(question: AcademyQuestion, direction: number) {
    const siblings = this.bank.filter((q) => (q.groupId || '') === (question.groupId || ''));
    const adjacent = siblings[siblings.indexOf(question) + direction];
    if (!adjacent) return;
    const i = this.bank.indexOf(question),
      target = this.bank.indexOf(adjacent);
    [this.bank[i], this.bank[target]] = [this.bank[target], this.bank[i]];
    this.bank.forEach((q, index) => (q.order = index));
  }
  protected canMove(question: AcademyQuestion, direction: number) {
    const siblings = this.bank.filter((q) => (q.groupId || '') === (question.groupId || ''));
    return !!siblings[siblings.indexOf(question) + direction];
  }
  protected changeType(type = this.draft.type) {
    this.draft.type = type;
    if (this.draft.type === 'Free text') {
      this.draft.options = [];
      this.draft.correctIds = [];
    } else if (this.draft.type === 'True / false') {
      this.draft.options = ['True', 'False'].map((text) => ({ id: crypto.randomUUID(), text }));
      this.draft.correctIds = [];
    } else {
      if (
        !this.draft.options.length ||
        (this.draft.options.length === 2 &&
          this.draft.options.every((o) => ['True', 'False'].includes(o.text)))
      )
        this.draft.options = ['A', 'B', 'C', 'D'].map(() => ({
          id: crypto.randomUUID(),
          text: '',
        }));
      if (this.draft.type === 'Single choice')
        this.draft.correctIds = this.draft.correctIds.slice(0, 1);
    }
  }
  protected toggleCorrect(id: string) {
    this.draft.correctIds =
      this.draft.type !== 'Multiple choice'
        ? [id]
        : this.draft.correctIds.includes(id)
          ? this.draft.correctIds.filter((v) => v !== id)
          : [...this.draft.correctIds, id];
  }
  protected addOption() {
    if (this.draft.options.length < 8)
      this.draft.options.push({ id: crypto.randomUUID(), text: '' });
  }
  protected removeOption(id: string) {
    if (this.draft.options.length <= 2) return;
    this.draft.options = this.draft.options.filter((o) => o.id !== id);
    this.draft.correctIds = this.draft.correctIds.filter((v) => v !== id);
  }
  protected letter(index: number) {
    return String.fromCharCode(65 + index);
  }
  protected totalMarks() {
    return this.bank
      .filter((q) => q.status !== 'Archived' && !this.isSurvey(q))
      .reduce((sum, q) => sum + (Number.isFinite(q.weight) ? q.weight : 0), 0);
  }
  protected passMark() {
    return this.course?.passMark ?? this.academy.state().settings.passMark;
  }
  protected requiredMarks() {
    const id = this.selectedGroupId;
    const marks = this.bank
      .filter(
        (q) =>
          (q.groupId === 'final' ? '' : (q.groupId ?? '')) === id &&
          q.status !== 'Archived' &&
          !this.isSurvey(q),
      )
      .reduce((sum, q) => sum + (Number.isFinite(q.weight) ? q.weight : 0), 0);
    return Math.ceil((marks * this.passMark()) / 100);
  }
  protected count(type: string) {
    return this.bank.filter((q) => q.status !== 'Archived' && q.type === type).length;
  }
  protected percent(type: string) {
    const count = this.bank.filter((q) => q.status !== 'Archived').length;
    return count ? Math.round((this.count(type) * 100) / count) : 0;
  }
  protected history() {
    return this.academy
      .state()
      .events.filter(
        (e) => e.action === 'Question saved' && e.detail.startsWith(this.draft.id + ' ·'),
      )
      .slice(0, 8);
  }
  protected save(publish = false) {
    if (!this.course) return;
    this.syncTags();
    this.notice.set('');
    const candidates = this.bank.map((q) => {
      const old = this.originalBank.find((v) => v.id === q.id);
      const changed = JSON.stringify(old) !== JSON.stringify(q);
      return {
        ...q,
        status:
          publish && q.id === this.draft.id
            ? ('Published' as const)
            : changed && q.status !== 'Archived'
              ? ('Draft' as const)
              : q.status,
      };
    });
    const id = this.draft.id;
    const groupId = this.selectedGroupId;
    const error = this.academy.saveQuestionBank(
      this.course.id,
      candidates,
      this.groups,
      this.expectedCourse,
      this.workspace,
    );
    this.error.set(error ?? '');
    if (error) return;
    this.loadCourse(this.course.id, id);
    if (this.selectedGroupId !== groupId) this.chooseGroup(groupId);
    this.notice.set(
      publish
        ? 'Selected question published. Publish the approved course version to use this bank for new assignments.'
        : 'Question bank saved. Edited and new questions remain drafts until approved and published.',
    );
  }
  protected back() {
    this.syncTags();
    if (this.snapshot() !== this.original) this.save();
    else this.error.set('');
    if (!this.error() && this.course)
      void this.router.navigate(['/manage/learning/structure', this.course.id]);
  }
  protected saveContinue() {
    this.save();
    if (!this.error() && this.course)
      void this.router.navigate(['/manage/learning/rules', this.course.id]);
  }
  protected lessons() {
    return this.course?.lessons ?? [];
  }
  protected groupLabel(id?: string) {
    return !id || id === 'final'
      ? 'Final course assessment'
      : (this.groups.find((g) => g.id === id)?.title ?? 'Unassigned group');
  }
  protected toggleSelected(id: string) {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id],
    );
  }
  protected assignSelected() {
    for (const q of this.bank)
      if (this.selectedIds().includes(q.id)) {
        if (
          q.type === 'Free text' &&
          this.groups.find((g) => g.id === this.targetGroup)?.kind !== 'Survey'
        ) {
          this.error.set('Free text questions must remain in a survey group.');
          return;
        }
      }
    for (const q of this.bank)
      if (this.selectedIds().includes(q.id)) {
        q.groupId = this.targetGroup;
        if (this.isSurvey(q)) {
          q.correctIds = [];
          q.critical = false;
        }
      }
    if (this.selectedIds().includes(this.draft.id))
      this.selectedGroupId = this.draft.groupId === 'final' ? '' : this.draft.groupId || '';
    this.error.set('');
    this.notice.set(
      `${this.selectedIds().length} questions assigned to ${this.groupLabel(this.targetGroup)}. Save Question Bank to retain this change.`,
    );
    this.selectedIds.set([]);
  }
  protected openGroup(group?: AcademyQuestionGroup) {
    this.groupForm = structuredClone(
      group
        ? { kind: 'Quiz', countsTowardGrade: false, ...group }
        : {
            id: crypto.randomUUID(),
            title: '',
            placement: 'After module',
            moduleId: this.course?.modules?.[0]?.id ?? '',
            lessonId: this.lessons()[0]?.id ?? '',
            availableAfterDays: 0,
            dueAfterDays: null,
            required: true,
            kind: 'Quiz',
            countsTowardGrade: false,
          },
    );
    this.error.set('');
    this.groupOpen.set(true);
  }
  protected saveGroup() {
    const group = this.groupForm;
    if (
      !group.title.trim() ||
      group.title.length > 100 ||
      this.groups.some(
        (g) => g.id !== group.id && g.title.toLowerCase() === group.title.trim().toLowerCase(),
      ) ||
      (['Before module', 'After module'].includes(group.placement) &&
        !this.course?.modules?.some((m) => m.id === group.moduleId)) ||
      (group.placement === 'After lesson' &&
        !this.lessons().some((l) => l.id === group.lessonId)) ||
      (group.placement === 'Within module' &&
        !this.lessons().some((l) => l.id === group.lessonId && l.moduleId === group.moduleId)) ||
      (group.kind === 'Survey' && group.countsTowardGrade) ||
      (group.kind !== 'Survey' &&
        this.bank.some((q) => q.groupId === group.id && q.type === 'Free text')) ||
      !Number.isInteger(group.availableAfterDays) ||
      group.availableAfterDays < 0 ||
      group.availableAfterDays > 3650 ||
      (group.dueAfterDays !== null &&
        (!Number.isInteger(group.dueAfterDays) ||
          group.dueAfterDays < group.availableAfterDays ||
          group.dueAfterDays > 3650))
    ) {
      this.error.set(
        'Enter a unique group name, valid module/lesson and schedule days. Due day must be on or after the opening day. Surveys cannot count toward the grade; free text questions require a survey group.',
      );
      return;
    }
    group.title = group.title.trim();
    if (!['Before module', 'After module', 'Within module'].includes(group.placement))
      group.moduleId = '';
    if (!['After lesson', 'Within module'].includes(group.placement)) group.lessonId = '';
    this.groups = this.groups.some((g) => g.id === group.id)
      ? this.groups.map((g) => (g.id === group.id ? structuredClone(group) : g))
      : [...this.groups, structuredClone(group)];
    if (group.kind === 'Survey')
      for (const q of this.bank.filter((q) => q.groupId === group.id)) {
        q.correctIds = [];
        q.critical = false;
      }
    this.groupOpen.set(false);
    this.error.set('');
    this.notice.set('Question group configured. Save Question Bank to retain the schedule.');
  }
  protected removeGroup(group: AcademyQuestionGroup) {
    if (this.bank.some((q) => q.groupId === group.id)) {
      this.error.set('Reassign this group’s questions before removing it.');
      return;
    }
    this.groups = this.groups.filter((g) => g.id !== group.id);
    if (this.targetGroup === group.id) this.targetGroup = '';
    if (this.selectedGroupId === group.id) this.chooseGroup('');
  }
  protected placement(group: AcademyQuestionGroup) {
    const target = ['Before module', 'After module'].includes(group.placement)
      ? this.course?.modules?.find((m) => m.id === group.moduleId)?.title
      : ['After lesson', 'Within module'].includes(group.placement)
        ? this.lessons().find((l) => l.id === group.lessonId)?.title
        : '';
    return (
      group.placement +
      (target ? ': ' + target : '') +
      ' · Opens day ' +
      group.availableAfterDays +
      (group.dueAfterDays !== null ? ' · Due day ' + group.dueAfterDays : '')
    );
  }
  protected showPreview() {
    this.revealAnswers.set(false);
    this.previewOpen.set(true);
  }
  canLeave() {
    this.syncTags();
    return (
      this.snapshot() === this.original || window.confirm('Discard unsaved question bank changes?')
    );
  }
  @HostListener('window:keydown.escape') protected escape() {
    this.previewOpen.set(false);
    this.groupOpen.set(false);
  }
  @HostListener('window:beforeunload', ['$event']) protected unload(event: BeforeUnloadEvent) {
    this.syncTags();
    if (this.snapshot() !== this.original) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
