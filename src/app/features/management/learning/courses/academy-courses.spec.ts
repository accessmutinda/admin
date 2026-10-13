import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { COURSES, Course, ManagementStore } from '../../shared/management.store';
import { AcademyCourses } from './academy-courses';

describe('Compact academy course catalogue', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [AcademyCourses] });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });

  it('preserves course information and emits the selected course without editing learning records', async () => {
    const store = TestBed.inject(ManagementStore);
    const person = {
      ...store.staff()[0],
      progress: { [COURSES[0].id]: 100, [COURSES[1].id]: 40 },
    };
    const before = JSON.stringify(person);
    const fixture = TestBed.createComponent(AcademyCourses);
    fixture.componentRef.setInput('person', person);
    const opened: Course[] = [];
    fixture.componentInstance.courseOpened.subscribe((course) => opened.push(course));
    fixture.detectChanges();
    await fixture.whenStable();
    const entries: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.academy-course-entry'),
    );
    expect(entries).toHaveLength(COURSES.length);
    for (const [index, entry] of entries.entries()) {
      expect(entry.textContent).toContain(COURSES[index].title);
      expect(entry.textContent).toContain(COURSES[index].category);
      expect(entry.textContent).toContain(COURSES[index].duration);
      expect(entry.textContent).toContain(COURSES[index].description);
    }
    expect(entries[0].textContent).toContain('Completed');
    expect(entries[1].textContent).toContain('40% complete');
    expect(
      entries[0].querySelector('.academy-course-status')!.classList.contains('completed'),
    ).toBe(true);
    expect(entries[0].querySelector('[role="progressbar"]')).toBeNull();
    expect(entries[1].querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe(
      '40',
    );
    expect(entries[2].textContent).toContain('0% complete');
    expect(entries[2].querySelector('.academy-course-open')!.textContent).toContain(
      'Start learning',
    );
    expect(entries[1].querySelector('.academy-course-open')!.textContent).toContain('Continue');
    entries[0].querySelector<HTMLButtonElement>('.academy-course-open')!.click();
    expect(opened).toEqual([COURSES[0]]);
    expect(JSON.stringify(person)).toBe(before);
  });

  it('combines category and search filters and restores courses after an empty result', async () => {
    const fixture = TestBed.createComponent(AcademyCourses);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.debugElement
      .query(By.css('mat-select[aria-label="Filter course category"]'))
      .triggerEventHandler('ngModelChange', 'Mandatory');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.academy-course-entry')).toHaveLength(
      COURSES.filter((course) => course.category === 'Mandatory').length,
    );
    const search: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Search courses"]',
    );
    search.value = 'No matching course';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.empty-state').textContent).toContain(
      'No courses found',
    );
    search.value = COURSES[0].title;
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.academy-course-entry')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.academy-course-entry').textContent).toContain(
      COURSES[0].title,
    );
  });
});
