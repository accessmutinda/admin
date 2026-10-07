import { DatePipe } from '@angular/common';
import { ManagementRole } from '../shared/role-pill';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CHECKS,
  COURSES,
  ManagementStore,
  ONBOARDING,
  Person,
  STAGES,
} from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { PersonOnboarding } from './onboarding/person-onboarding';
import { PersonCompliance } from './compliance/person-compliance';
@Component({
  selector: 'cv-person-detail',
  imports: [
    DatePipe,
    ManagementRole,
    A11yModule,
    FormsModule,
    RouterLink,
    PersonOnboarding,
    PersonCompliance,
  ],
  host: { '(document:keydown.escape)': 'edit.set(false)' },
  templateUrl: './person-detail.html',
})
export class PersonDetail {
  protected readonly checks = CHECKS;
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  protected readonly id = this.route.snapshot.paramMap.get('id');
  protected readonly person = computed(() =>
    this.store.data().people.find((p) => p.id === this.id),
  );
  protected readonly tabs = [
    'Profile',
    'Onboarding',
    'Compliance',
    'Documents',
    'Learning',
    'Notes',
  ];
  protected readonly visibleTabs = computed(() =>
    this.person()?.stage === 'Hired'
      ? this.tabs
      : this.tabs.filter((tab) => tab !== 'Onboarding' && tab !== 'Learning'),
  );
  protected readonly tab = signal(
    this.visibleTabs().includes(this.route.snapshot.queryParamMap.get('tab') ?? '')
      ? this.route.snapshot.queryParamMap.get('tab')!
      : 'Profile',
  );
  protected readonly checklist = ONBOARDING;

  protected readonly courses = COURSES;
  protected readonly stages = STAGES;
  protected readonly tabIcons = [
    'person',
    'waving_hand',
    'verified_user',
    'folder_open',
    'school',
    'forum',
  ];
  protected readonly stageIcons = ['person_search', 'forum', 'handshake', 'celebration'];
  protected readonly stageHints = [
    'Application received',
    'Get to know the person',
    'Agree the next chapter',
    'Welcome to the team',
  ];

  protected readonly fromOnboarding = this.route.snapshot.queryParamMap.get('tab') === 'Onboarding';
  protected stageIndex(p: Person): number {
    return STAGES.indexOf(p.stage);
  }
  protected nextOnboarding(p: Person): string {
    const next = this.checklist.find((_, i) => !p.onboarding[i]);
    return next ?? 'Every welcome step is complete';
  }
  protected nextStepTitle(p: Person): string {
    return p.stage === 'Hired'
      ? this.nextOnboarding(p)
      : p.stage === 'Applied'
        ? 'Get to know ' + p.name.split(' ')[0]
        : p.stage === 'Interview'
          ? 'Review the interview'
          : 'Prepare a confident first day';
  }
  protected nextStepDescription(p: Person): string {
    if (p.stage !== 'Hired')
      return p.stage === 'Applied'
        ? 'Keep interview questions and observations in Notes, then move the application forward when your team is ready.'
        : p.stage === 'Interview'
          ? 'Bring your interview feedback together before deciding on an offer.'
          : 'Record the agreed terms and confirm the hire when the offer is accepted. Their welcome checklist is ready to continue.';
    return this.completed(p) === this.checklist.length
      ? 'All onboarding tasks are marked complete. Keep employment checks and learning records current.'
      : 'Give ' +
          p.name.split(' ')[0] +
          ' a clear, supported start. Pick up the next welcome task when your team is ready.';
  }
  protected readonly edit = signal(false);
  protected readonly note = signal('');
  protected draft: Person | null = null;
  protected stage(): string {
    const i = STAGES.indexOf(this.person()?.stage ?? '');
    return STAGES[Math.min(i + 1, STAGES.length - 1)];
  }
  protected advance(): void {
    const p = this.person();
    if (!p || p.stage === 'Hired') return;
    const next = this.stage();
    this.store.updatePerson({
      ...p,
      stage: next,
      onboarding:
        next === 'Hired' ? p.onboarding.map((v, i) => (i === 0 ? true : v)) : p.onboarding,
    });
    if (next === 'Hired') this.tab.set('Onboarding');
    this.toast.success(
      next === 'Hired'
        ? 'Welcome to the team. Onboarding is ready.'
        : `Applicant moved to ${next.toLowerCase()}.`,
    );
  }
  protected verified(p: Person): number {
    return p.checks.filter(Boolean).length;
  }
  protected completed(p: Person): number {
    return p.onboarding.filter(Boolean).length;
  }
  protected progress(p: Person): number {
    return Math.round((this.completed(p) / this.checklist.length) * 100);
  }

  protected async uploadDocument(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    const p = this.person();
    if (!file || !p) return;
    if (file.size > 1024 * 1024) {
      this.toast.error('Choose a document under 1 MB.');
      return;
    }
    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    this.store.updatePerson({
      ...p,
      documents: [
        ...(p.documents ?? []),
        { id: crypto.randomUUID(), name: file.name, type: file.type, content },
      ],
    });
    this.toast.success('Document saved on this device.');
  }
  protected downloadUploaded(content: string, name: string): void {
    const a = document.createElement('a');
    a.href = content;
    a.download = name;
    a.click();
  }
  protected removeDocument(id: string): void {
    const p = this.person();
    if (p)
      this.store.updatePerson({ ...p, documents: (p.documents ?? []).filter((d) => d.id !== id) });
  }
  protected startEdit(): void {
    this.draft = structuredClone(this.person()!);
    this.edit.set(true);
  }
  protected save(): void {
    if (this.draft) this.store.updatePerson(this.draft);
    this.edit.set(false);
    this.toast.success('Person details saved.');
  }
  protected addNote(): void {
    const p = this.person();
    if (!p || !this.note().trim()) return;
    this.store.updatePerson({ ...p, notes: [...p.notes, this.note().trim()] });
    this.note.set('');
    this.toast.success('Note added.');
  }
  protected assign(id: string): void {
    const p = this.person();
    if (!p) return;
    this.store.updatePerson({
      ...p,
      learning: p.learning.includes(id) ? p.learning.filter((c) => c !== id) : [...p.learning, id],
    });
  }
  protected downloadDocument(name: string): void {
    const p = this.person();
    if (!p) return;
    this.store.download(
      name.toLowerCase().replaceAll(' ', '-') + '-sample.txt',
      `SAMPLE DOCUMENT — FOR DEMONSTRATION\n\n${name}\n${p.name}\n${this.store.company()?.name}\n\nThis is a placeholder, not an issued employment or compliance document.`,
    );
  }
}
