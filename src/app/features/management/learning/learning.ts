import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../shared/ui/select';
import { A11yModule } from '@angular/cdk/a11y';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { COURSES, Course, ManagementStore } from '../shared/management.store';
import { ToastService } from '../../../shared/ui/toast.service';
import { AcademyCourses } from './courses/academy-courses';
import { AcademyProgress } from './progress/academy-progress';
import { AcademyCpd } from './cpd/academy-cpd';
@Component({
  selector: 'cv-learning',
  imports: [
    MatSelectModule,
    CvSelect,
    A11yModule,
    FormsModule,
    RouterLink,
    AcademyCourses,
    AcademyProgress,
    AcademyCpd,
  ],
  host: { '(document:keydown.escape)': 'player.set(null)' },
  templateUrl: './learning.html',
})
export class Learning {
  protected readonly store = inject(ManagementStore);
  private readonly toast = inject(ToastService);
  protected readonly tabs = [
    'Courses',
    'Webinars',
    'Training matrix',
    'Certificates',
    'CPD',
    'Progress',
  ];
  protected readonly tab = signal('Courses');
  protected readonly selectedPerson = signal(this.store.staff()[0]?.id ?? '');
  protected readonly person = computed(() =>
    this.store.staff().find((p) => p.id === this.selectedPerson()),
  );
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
