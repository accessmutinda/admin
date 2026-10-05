import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { COURSES, Course, Person } from '../../shared/management.store';
@Component({
  selector: 'cv-academy-courses',
  imports: [FormsModule, MatSelectModule, CvSelect],
  templateUrl: './academy-courses.html',
})
export class AcademyCourses {
  protected readonly search = signal('');
  protected readonly category = signal('All courses');
  protected readonly filtered = computed(() =>
    COURSES.filter(
      (c) =>
        `${c.title} ${c.description}`.toLowerCase().includes(this.search().toLowerCase()) &&
        (this.category() === 'All courses' || c.category === this.category()),
    ),
  );
  readonly person = input<Person | undefined>();
  readonly courseOpened = output<Course>();
}
