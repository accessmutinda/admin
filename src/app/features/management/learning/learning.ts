import { CardTonePipe } from '../../../shared/ui/card-tone.pipe';
import { AcademyService } from './academy/academy.service';
import { QuickActions } from '../shared/quick-actions';
import { WorkspaceCards } from '../shared/workspace-cards';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { COURSES, Course, ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { AcademyCourses } from './courses/academy-courses';
import { AcademyProgress } from './progress/academy-progress';
import { AcademyCpd } from './cpd/academy-cpd';
@Component({
  selector: 'cv-learning',
  imports: [
    CardTonePipe,
    QuickActions,
    WorkspaceCards,
    MatSelectModule,
    CvSelect,
    A11yModule,
    FormsModule,
    RouterLink,
    AcademyCourses,
    AcademyProgress,
    AcademyCpd,
  ],
  host: {
    class: 'module-page people-page academy-page',
    '(document:keydown.escape)': 'player.set(null)',
  },
  templateUrl: './learning.html',
  styleUrls: [
    '../people/hr.css',
    '../people/hr-tables.css',
    '../people/hr-forms.css',
    './academy-design.css',
    './learning.css',
  ],
})
export class Learning {
  protected readonly academy = inject(AcademyService);
  protected readonly store = inject(ManagementStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly staffReturn = this.route.snapshot.queryParamMap.get('person');
  private readonly toast = inject(ToastService);
  protected readonly tabs = [
    'Overview',
    'Courses',
    'Webinars',
    'Training matrix',
    'Certificates',
    'CPD',
    'Progress',
  ];
  protected readonly tab = signal(
    this.tabs.includes(this.route.snapshot.queryParamMap.get('tab') ?? '')
      ? this.route.snapshot.queryParamMap.get('tab')!
      : this.staffReturn
        ? 'Courses'
        : 'Overview',
  );
  protected readonly selectedPerson = signal(
    this.store.staff().find((p) => p.id === this.staffReturn)?.id ??
      this.store.staff()[0]?.id ??
      '',
  );
  protected readonly person = computed(() =>
    this.store.staff().find((p) => p.id === this.selectedPerson()),
  );
  protected readonly homeViews = [
    {
      view: 'Courses',
      title: 'Courses',
      description: 'Browse sample courses and continue personal learning.',
      icon: 'menu_book',
    },
    {
      view: 'Training matrix',
      title: 'Training matrix',
      description: 'Review recorded staff training and requirements.',
      icon: 'grid_view',
    },
    {
      view: 'Progress',
      title: 'Team progress',
      description: 'Track assigned learning and sample course completion.',
      icon: 'monitoring',
    },
    {
      view: 'Certificates',
      title: 'Certificates',
      description: 'View demonstration certificates for completed sample courses.',
      icon: 'workspace_premium',
    },
    {
      view: 'CPD',
      title: 'CPD records',
      description: 'Record reflections and continuing professional development.',
      icon: 'history_edu',
    },
    {
      view: 'Webinars',
      title: 'Webinars',
      description: 'Explore sample webinar topics and record reflections.',
      icon: 'videocam',
    },
  ];
  protected readonly homeStats = computed(() => {
    const staff = this.store.staff();
    const assignments = staff.flatMap((person) =>
      person.learning.map((id) => person.progress[id] ?? 0),
    );
    return [
      {
        label: 'Staff',
        value: staff.length,
        caption: 'Current company',
        icon: 'groups',
        view: 'Progress',
      },
      {
        label: 'Assigned courses',
        value: assignments.length,
        caption: 'Sample learning assignments',
        icon: 'menu_book',
        view: 'Progress',
      },
      {
        label: 'Completed learning',
        value: assignments.filter((value) => value >= 100).length,
        caption: 'Completed sample assignments',
        icon: 'task_alt',
        view: 'Progress',
      },
      {
        label: 'In progress',
        value: assignments.filter((value) => value > 0 && value < 100).length,
        caption: 'Started sample assignments',
        icon: 'trending_up',
        view: 'Progress',
      },
      {
        label: 'CPD hours',
        value: this.store.data().cpd.reduce((sum, entry) => sum + entry.hours, 0),
        caption: 'Recorded across the team',
        icon: 'history_edu',
        view: 'CPD',
      },
    ];
  });
  protected readonly courses = COURSES;
  protected readonly player = signal<Course | null>(null);
  protected readonly lesson = signal(0);
  protected readonly lessons = [
    'Understand the essentials',
    'Recognise and respond',
    'Put it into practice',
  ];
  protected readonly webinars = [
    { title: 'Supporting people with dementia', duration: '50 min', icon: 'psychology' },
    { title: 'Medication safety in practice', duration: '40 min', icon: 'medication' },
    { title: 'Positive behaviour support', duration: '45 min', icon: 'favorite' },
  ];
  protected readonly certificates = computed(() =>
    COURSES.filter((c) => this.person()?.progress[c.id] === 100),
  );
  protected openCourse(course: Course): void {
    if (!this.person()) {
      this.toast.info('Add a staff member before starting a course.');
      return;
    }
    this.player.set(course);
    this.lesson.set(Math.min(2, Math.floor((this.person()?.progress[course.id] ?? 0) / 34)));
  }
  protected nextLesson(): void {
    const p = this.person();
    const course = this.player();
    if (!p || !course) return;
    const progress = this.lesson() === 2 ? 100 : (this.lesson() + 1) * 33;
    this.store.updatePerson({
      ...p,
      learning: p.learning.includes(course.id) ? p.learning : [...p.learning, course.id],
      progress: { ...p.progress, [course.id]: progress },
    });
    if (progress === 100) {
      this.player.set(null);
      this.toast.success('Sample course completed. A demo certificate is ready.');
    } else {
      this.lesson.update((i) => i + 1);
    }
  }
  protected certificate(course: Course): void {
    this.store.download(
      'sample-certificate-' + course.id + '.txt',
      `DEMONSTRATION CERTIFICATE\n\n${this.person()?.name}\n${course.title}\n${this.store.company()?.name}\n\nThis sample reflects completion of a demo lesson, not an accredited qualification.`,
    );
  }
  protected lessonCopy(course: Course): string {
    if (this.lesson() === 0)
      return (
        course.description +
        ' Start with the person’s preferences, your organisation’s policies and the support plan agreed by the care team.'
      );
    if (this.lesson() === 1)
      return 'Observe changes carefully. Record facts clearly, listen to the person and raise concerns with your manager through the agreed reporting route.';
    return 'Reflect on a situation from your day-to-day work. What would you observe, record and communicate? Discuss the approach with your supervisor before putting new techniques into practice.';
  }
  private readonly cpdTab = viewChild.required(AcademyCpd);
  protected openCpd(activity = ''): void {
    this.cpdTab().open(activity);
  }
}
