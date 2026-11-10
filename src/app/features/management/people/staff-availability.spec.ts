import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { CompanyAccessService } from '../../../core/access/company-access.service';
import { newStaff, availabilityCovers } from './hr.models';
import { StaffAvailability } from './staff-availability';

describe('Staff availability matrix and calendar', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { profile: () => ({ id: 'actor' }), api: vi.fn() } },
        {
          provide: CompanyAccessService,
          useValue: {
            companyId: signal('north'),
            context: () => ({ revision: 1 }),
            can: () => true,
          },
        },
      ],
    }),
  );
  async function open(editable = true) {
    const p = newStaff();
    const fixture = TestBed.createComponent(StaffAvailability);
    fixture.componentRef.setInput('p', p);
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    await fixture.whenStable();
    return { p, fixture, page: fixture.nativeElement as HTMLElement };
  }
  it('renders a labelled matrix and never mutates a read-only pattern', async () => {
    const { p, fixture, page } = await open(false),
      before = JSON.stringify(p);
    expect(page.querySelectorAll('.hr-availability-matrix thead th')).toHaveLength(8);
    const cell = page.querySelector<HTMLButtonElement>('.hr-availability-matrix tbody button')!;
    expect(cell.disabled).toBe(true);
    cell.click();
    fixture.detectChanges();
    expect(JSON.stringify(p)).toBe(before);
  });
  it('cycles actual draft preferences and preserves gaps in the existing weekly editor', async () => {
    const { p, fixture, page } = await open();
    const first = page.querySelector<HTMLButtonElement>(
      'button[aria-label="Monday Morning: Unavailable"]',
    )!;
    first.click();
    fixture.detectChanges();
    expect(p.hr!.weeklySlots![0].days[0]).toBe('Available');
    expect(availabilityCovers(p, '2026-11-16', '07:00', '11:00')).toBe(true);
    expect(availabilityCovers(p, '2026-11-16', '11:00', '13:00')).toBe(false);
    first.click();
    fixture.detectChanges();
    expect(p.hr!.weeklySlots![0].days[0]).toBe('Preferred');
    [...page.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Copy Monday to all'))!
      .click();
    fixture.detectChanges();
    expect(p.hr!.weeklySlots![0].days.every((v) => v === 'Preferred')).toBe(true);
  });
  it('keeps custom windows and overlays only explicitly supplied approved source leave', async () => {
    const { p, fixture, page } = await open();
    p.hr!.availability[0] = {
      day: 'Monday',
      start: '07:30',
      end: '11:15',
      preference: 'Available',
    };
    p.hr!.availabilityMode = 'Custom times';
    (
      fixture.componentInstance as unknown as { month: ReturnType<typeof signal<string>> }
    ).month.set('2026-11');
    fixture.detectChanges();
    expect(page.querySelectorAll('.hr-availability-custom')).toHaveLength(7);
    const row = {
      id: 'leave',
      version: 1,
      etag: '"v1"',
      personId: p.id,
      person: p.name,
      type: 'Other',
      type_id: 'kind',
      start: '2026-11-16',
      end: '2026-11-16',
      status: 'Pending',
      reason: '',
      days: '1',
      can_approve: false,
      can_cancel: false,
      balance: null,
      balance_unavailable: null,
    };
    fixture.componentRef.setInput('approvedLeaves', [row]);
    fixture.detectChanges();
    expect(page.querySelector('td[aria-label="2026-11-16: Available"]')).not.toBeNull();
    fixture.componentRef.setInput('approvedLeaves', [{ ...row, status: 'Approved' }]);
    fixture.detectChanges();
    expect(page.querySelector('td[aria-label="2026-11-16: On leave"]')).not.toBeNull();
  });
});
