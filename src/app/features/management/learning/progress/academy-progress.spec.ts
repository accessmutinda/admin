import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceService } from '../../../../core/auth/workspace.service';
import { ManagementStore, WorkspaceData } from '../../shared/management.store';
import { AcademyProgress } from './academy-progress';

describe('Team learning register', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('animates the banner and learner progress on tab entry without changing records', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    const cancelFrame = vi.fn((id: number) => frames.delete(id));
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const advance = (time: number) => {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    };
    const store = TestBed.inject(ManagementStore);
    const before = JSON.stringify(store.data());
    const fixture = TestBed.createComponent(AcademyProgress);
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const banner: HTMLElement = fixture.nativeElement.querySelector('.academy-average-gauge');
    const progress: HTMLElement = fixture.nativeElement.querySelector('.learner-completion strong');
    expect(progress.textContent!.trim()).toBe('0%');
    advance(450);
    fixture.detectChanges();
    expect(parseInt(progress.textContent!)).toBeGreaterThan(0);
    expect(parseInt(progress.textContent!)).toBeLessThan(50);
    expect(parseInt(banner.style.getPropertyValue('--completion'))).toBeGreaterThan(0);
    advance(900);
    fixture.detectChanges();
    expect(progress.textContent!.trim()).toBe('50%');
    expect(banner.style.getPropertyValue('--completion')).toBe('63%');
    expect(banner.getAttribute('aria-valuenow')).toBe('63');
    expect(fixture.nativeElement.querySelector('.academy-average-copy').textContent).toContain(
      '2 of 4 assignments completed',
    );
    expect(fixture.nativeElement.querySelector('.academy-average-track > span').style.width).toBe(
      '63%',
    );
    expect(
      fixture.nativeElement.querySelector('.learner-completion .progress-track span').style.width,
    ).toBe('50%');
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(progress.textContent!.trim()).toBe('0%');
    cancelFrame.mockClear();
    fixture.destroy();
    expect(cancelFrame).toHaveBeenCalled();
    expect(JSON.stringify(store.data())).toBe(before);
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
    expect(rows[2].querySelector('.hr-badge.good')?.textContent).toContain(
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
