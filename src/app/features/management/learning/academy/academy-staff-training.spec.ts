import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AcademyService } from './academy.service';
import { AcademyStaffTraining } from './academy-staff-training';

describe('Academy records in the staff HR file', () => {
  function open(fail = false) {
    const permitted = signal(true);
    const load = vi.fn(async () => {
      if (fail) throw Error('Training records could not be loaded.');
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AcademyService,
          useValue: {
            store: { companyId: () => 'company' },
            api: { load },
            assignmentApi: { available: permitted, load },
            resultsApi: { available: () => true, load },
            certificatesApi: { available: () => true, load },
            can: () => false,
            canViewEvidence: () => true,
            assignments: () => [
              {
                id: 'assigned',
                personId: 'worker',
                courseVersion: 3,
                type: 'Initial',
                due: '2027-01-01',
                completedAt: '2026-11-15',
                archived: false,
              },
              { id: 'foreign', personId: 'other', archived: false },
            ],
            assignedCourse: (a: { id: string }) => ({
              title: a.id === 'assigned' ? 'Safe care' : 'Other worker course',
            }),
            status: () => 'Completed',
            completion: () => ({ status: 'ROTA_REFRESH_PENDING', certificateId: 'certificate' }),
            state: () => ({ certificates: [{ id: 'certificate', assignmentId: 'assigned' }] }),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AcademyStaffTraining);
    fixture.componentRef.setInput('personId', 'worker');
    fixture.detectChanges();
    return { fixture, load, permitted };
  }
  it('loads saved records and shows only the selected staff member to a read-only reviewer', async () => {
    const { fixture, load } = open();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(load).toHaveBeenCalled();
    expect(page.textContent).toContain('Safe care');
    expect(page.textContent).toContain('Completed');
    expect(page.textContent).not.toContain('Other worker course');
    expect(page.textContent).not.toContain('not connected');
    expect(page.textContent).not.toContain('Assign course');
    expect(
      page.querySelector('a[href="/manage/learning/certificates/certificate"]'),
    ).not.toBeNull();
  });
  it('hides academy records when assignment access is removed', async () => {
    const { fixture, permitted } = open();
    await fixture.whenStable();
    permitted.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Safe care');
  });
  it('shows a failed load instead of claiming that records are disconnected', async () => {
    const { fixture } = open(true);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
        'Training records could not be loaded.',
      );
    });
  });
});
