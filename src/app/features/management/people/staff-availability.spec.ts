import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { ManagementStore } from '../shared/management.store';
import { newStaff, availabilityCovers } from './hr.models';
import { StaffAvailability } from './staff-availability';

describe('Staff availability matrix and calendar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    TestBed.inject(AuthService).signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
  });
  async function open(editable = true) {
    const p = newStaff();
    const fixture = TestBed.createComponent(StaffAvailability);
    fixture.componentRef.setInput('p', p);
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    await fixture.whenStable();
    return { p, fixture, page: fixture.nativeElement as HTMLElement };
  }
  it('renders a labelled weekly matrix without writing data from a read-only view', async () => {
    const { p, fixture, page } = await open(false);
    const before = JSON.stringify(p);
    expect(page.querySelectorAll('.hr-availability-matrix thead th')).toHaveLength(8);
    const cell = page.querySelector<HTMLButtonElement>(
      'button[aria-label="Monday Morning: Unavailable"]',
    )!;
    expect(cell.disabled).toBe(true);
    cell.click();
    fixture.detectChanges();
    expect(JSON.stringify(p)).toBe(before);
    expect(
      page.querySelector('table[aria-label="Recurring availability calendar"]'),
    ).not.toBeNull();
  });
  it('cycles real slot preferences and preserves gaps when checking rota coverage', async () => {
    const { p, fixture, page } = await open();
    const first = page.querySelector<HTMLButtonElement>(
      'button[aria-label="Monday Morning: Unavailable"]',
    )!;
    first.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(p.hr!.weeklySlots![0].days[0]).toBe('Available');
    expect(availabilityCovers(p, '2026-10-19', '07:00', '11:00')).toBe(true);
    expect(availabilityCovers(p, '2026-10-19', '11:00', '13:00')).toBe(false);
    first.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(p.hr!.weeklySlots![0].days[0]).toBe('Preferred');
    const copy = [...page.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Copy Monday to all'),
    )!;
    copy.click();
    fixture.detectChanges();
    expect(p.hr!.weeklySlots![0].days.every((v) => v === 'Preferred')).toBe(true);
  });
  it('keeps custom daily windows available and overlays only approved leave', async () => {
    const { p, fixture, page } = await open();
    p.hr!.availability[0] = {
      day: 'Monday',
      start: '07:30',
      end: '11:15',
      preference: 'Available',
    };
    p.hr!.availabilityMode = 'Custom times';
    fixture.detectChanges();
    expect(page.querySelectorAll('.hr-availability-custom')).toHaveLength(7);
    const store = TestBed.inject(ManagementStore);
    store.update((d) => ({
      ...d,
      leaves: [
        {
          id: 'leave',
          personId: p.id,
          person: p.name,
          type: 'Annual leave',
          start: '2026-10-19',
          end: '2026-10-19',
          status: 'Pending',
        },
      ],
    }));
    (fixture.componentInstance as unknown as { month: string }).month = '2026-10';
    fixture.detectChanges();
    expect(page.querySelector('td[aria-label="2026-10-19: Available"]')).not.toBeNull();
    store.update((d) => ({ ...d, leaves: d.leaves.map((l) => ({ ...l, status: 'Approved' })) }));
    fixture.detectChanges();
    expect(page.querySelector('td[aria-label="2026-10-19: On leave"]')).not.toBeNull();
  });
});
