import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcademyService } from './academy.service';
import { hasUnusedVideos } from './academy.models';
@Component({
  selector: 'cv-academy-course-steps',
  imports: [RouterLink],
  template: `<nav aria-label="Course creation steps">
    @for (step of steps; track step.number; let last = $last) {
      @if (current() === step.number) {
        <strong class="step current" aria-current="step"
          ><span class="number">{{ step.number }}</span
          >{{ step.label }}</strong
        >
      } @else if (courseId() && !(step.number > 3 && blocked())) {
        <a
          class="step"
          [class.previous]="step.number < current()"
          [routerLink]="path(step.number)"
          [queryParams]="step.number === 4 ? { course: courseId() } : {}"
          ><span class="number">{{ step.number }}</span
          >{{ step.label }}</a
        >
      } @else {
        <span class="step unavailable" role="link" aria-disabled="true"
          ><span class="number">{{ step.number }}</span
          >{{ step.label }}</span
        >
      }
      @if (!last) {
        <span class="material-symbols-outlined arrow" aria-hidden="true">chevron_right</span>
      }
    }
  </nav>`,
  styleUrls: ['./academy-course-steps.css'],
})
export class AcademyCourseSteps {
  private readonly academy = inject(AcademyService);
  readonly blockedAfterStructure = input<boolean | undefined>(undefined);
  protected blocked() {
    return this.blockedAfterStructure() ?? hasUnusedVideos(this.academy.course(this.courseId()));
  }
  readonly courseId = input('');
  readonly current = input.required<number>();
  protected readonly steps = [
    { number: 1, label: 'Course Details' },
    { number: 2, label: 'Video & Resources' },
    { number: 3, label: 'Modules & Lessons' },
    { number: 4, label: 'Questions' },
    { number: 5, label: 'Rules & Assignments' },
    { number: 6, label: 'Publish' },
  ];
  protected path(step: number) {
    return step === 4
      ? ['/manage/learning/questions']
      : [
          '/manage/learning/' +
            (
              { 1: 'courses', 2: 'content', 3: 'structure', 5: 'rules', 6: 'publish' } as Record<
                number,
                string
              >
            )[step],
          this.courseId(),
        ];
  }
}
