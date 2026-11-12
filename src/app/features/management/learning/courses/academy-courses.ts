import { AcademyService } from '../academy/academy.service';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { Course, Person } from '../../shared/management.store';
@Component({
  selector: 'cv-academy-courses',
  imports: [FormsModule, MatSelectModule, CvSelect],
  templateUrl: './academy-courses.html',
  styleUrls: [
    '../../people/hr.css',
    '../../people/hr-tables.css',
    '../../people/hr-forms.css',
    '../academy-design.css',
    './academy-courses.css',
  ],
})
export class AcademyCourses {
  protected readonly academy = inject(AcademyService);
  constructor() {
    void this.academy.api.load().catch(() => {});
  }
  protected readonly search = signal('');
  protected readonly category = signal('All courses');
  protected readonly filtered = computed(() =>
    this.academy
      .editableCourses()
      .map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        icon: 'menu_book',
        duration: `${c.estimatedMinutes ?? c.lessons.reduce((sum, l) => sum + l.minutes, 0)} min`,
      }))
      .filter(
        (c) =>
          `${c.title} ${c.description}`.toLowerCase().includes(this.search().toLowerCase()) &&
          (this.category() === 'All courses' || c.category === this.category()),
      ),
  );
  readonly person = input<Person | undefined>();
  readonly courseOpened = output<Course>();
}
