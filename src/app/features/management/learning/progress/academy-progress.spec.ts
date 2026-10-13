import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore, WorkspaceData } from '../../shared/management.store';
import { AcademyProgress } from './academy-progress';

describe('Team learning register', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AcademyProgress],
      providers: [provideRouter([])],
    });
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    const store = TestBed.inject(ManagementStore);
    const person = store.staff()[0];
    store.update((data): WorkspaceData => ({
      ...data,
      people: [
        {
          ...person,
          id: 'learning-review',
          name: 'Learning Review',
          learning: ['one', 'two', 'three'],
          progress: { one: 100, two: 50, three: 0 },
        },
        { ...person, id: 'unassigned', name: 'Unassigned Learner', learning: [], progress: {} },
        {
          ...person,
          id: 'complete',
          name: 'Complete Learner',
          learning: ['one'],
          progress: { one: 100 },
        },
      ],
    }));
  });

  it('preserves learning counts, status and profile actions in the register', async () => {
    const fixture = TestBed.createComponent(AcademyProgress);
    fixture.detectChanges();
    await fixture.whenStable();
    const rows = fixture.nativeElement.querySelectorAll('.learner-progress-table tbody tr');
    expect(rows).toHaveLength(3);
    const cells = rows[0].querySelectorAll('td');
    expect(cells[0].textContent).toContain('Learning Review');
    expect(cells[1].textContent.trim()).toBe(TestBed.inject(ManagementStore).staff()[0].role);
    expect(cells[2].textContent.trim()).toBe('50%');
    expect(cells[3].textContent.trim()).toBe('1');
    expect(cells[4].textContent.trim()).toBe('1');
    expect(cells[5].textContent.trim()).toBe('1');
    expect(rows[0].querySelector('td[data-label="Status"]').textContent).toContain(
      'Learning underway',
    );
    expect(rows[0].querySelector('.learner-action a').getAttribute('href')).toBe(
      '/manage/people/learning-review?tab=Learning',
    );
    expect(rows[1].textContent).toContain('Not assigned');
    expect(rows[1].textContent).toContain('Assign courses');
    expect(rows[2].querySelector('.badge.success')?.textContent).toContain(
      'All assigned courses complete',
    );
  });

  it('keeps role and learning counts in separate columns', async () => {
    const fixture = TestBed.createComponent(AcademyProgress);
    fixture.detectChanges();
    await fixture.whenStable();
    const table: HTMLTableElement = fixture.nativeElement.querySelector('.learner-progress-table');
    expect(Array.from(table.tHead!.rows[0].cells).map((cell) => cell.textContent!.trim())).toEqual([
      'Team member',
      'Role',
      'Assigned learning',
      'Completed',
      'In progress',
      'Not started',
      'Status',
      'Actions',
    ]);
    for (const row of Array.from(table.tBodies[0].rows)) {
      expect(row.cells).toHaveLength(8);
      expect(row.querySelector('td:first-child small')).toBeNull();
    }
    const row = table.tBodies[0].rows[0];
    expect(row.querySelector('.learner-action a')!.getAttribute('href')).toBe(
      '/manage/people/learning-review?tab=Learning',
    );
  });

  it('searches and restores the register without changing staff records', async () => {
    const fixture = TestBed.createComponent(AcademyProgress);
    fixture.detectChanges();
    await fixture.whenStable();
    const store = TestBed.inject(ManagementStore);
    const before = JSON.stringify(store.data());
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Search learning progress"]',
    );
    input.value = 'No matching learner';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-cell')?.textContent).toContain(
      'No learners match this view.',
    );
    fixture.nativeElement.querySelector('.empty-cell button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.learner-progress-table tbody tr')).toHaveLength(
      3,
    );
    expect(JSON.stringify(store.data())).toBe(before);
  });
});
