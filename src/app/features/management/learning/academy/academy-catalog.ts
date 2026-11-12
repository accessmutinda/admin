import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { CvSelect } from '../../../../shared/ui/select';
import { AcademyService } from './academy.service';
import { AcademyAdminNav } from './academy-shared';
import { AcademyImage } from './academy-image';
@Component({
  host: { class: 'module-page academy-page' },
  selector: 'cv-academy-catalog',
  imports: [FormsModule, RouterLink, MatSelectModule, CvSelect, AcademyAdminNav, AcademyImage],
  templateUrl: './academy-catalog.html',
  styleUrls: [
    './academy-forms.css',
    './academy.css',
    './academy-workflows.css',
    './academy-catalog.css',
  ],
})
export class AcademyCatalog {
  protected readonly academy = inject(AcademyService);
  protected async reload() {
    try {
      await this.academy.api.load(true);
    } catch {}
  }
  protected search = '';
  protected filter = 'All';
  protected page = 1;
  protected filtered() {
    return this.academy
      .editableCourses()
      .filter(
        (course) =>
          `${course.title} ${course.code ?? ''} ${course.category} ${course.description}`
            .toLowerCase()
            .includes(this.search.trim().toLowerCase()) &&
          (this.filter === 'All' || course.status === this.filter),
      );
  }
  protected rows() {
    const rows = this.filtered();
    this.page = Math.min(this.page, Math.max(1, Math.ceil(rows.length / 8)));
    return rows.slice((this.page - 1) * 8, this.page * 8);
  }
  protected pages() {
    return Math.max(1, Math.ceil(this.filtered().length / 8));
  }
}
