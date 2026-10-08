import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { EcmWallboard } from './ecm-wallboard';
import { EcmService } from './ecm.service';
import { emptyEcm } from './ecm.models';
import { RotaVisit, londonInstant } from '../rota/rota.models';
import { ManagementStore } from '../shared/management.store';

const visit = (id: string, changes: Partial<RotaVisit> = {}): RotaVisit => ({
  id,
  callId: 'call',
  clientId: id,
  clientName: `Client ${id}`,
  address: 'Private address',
  callName: 'Morning call',
  date: '2026-10-07',
  start: '08:00',
  end: '08:45',
  carers: 1,
  skills: [],
  tasks: 'Private care task',
  staffIds: ['carer'],
  allocation: 'Regular',
  state: 'Published',
  priority: 'Standard',
  attendance: [],
  exception: '',
  ...changes,
});

describe('ECM TV wallboard', () => {
  const data = signal({ visits: [] as RotaVisit[], clients: [] });
  const canView = signal(true);
  const ecm = signal(emptyEcm());
  const setup = () => {
    const fixture = TestBed.createComponent(EcmWallboard);
    fixture.detectChanges();
    return { fixture, board: fixture.componentInstance as any };
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T07:20:00Z'));
    canView.set(true);
    ecm.set(emptyEcm());
    data.set({ visits: Array.from({ length: 14 }, (_, i) => visit(String(i))), clients: [] });
    TestBed.configureTestingModule({
      imports: [EcmWallboard],
      providers: [
        provideRouter([]),
        { provide: EcmService, useValue: { data: ecm, rota: { data, can: () => canView() } } },
        {
          provide: ManagementStore,
          useValue: {
            data: signal({ people: [{ id: 'carer', name: 'Care worker' }] }),
            company: signal({ name: 'Test office', code: 'TV' }),
          },
        },
      ],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('rotates through every visit, pauses, and resumes without scrolling', () => {
    const { fixture, board } = setup();
    const shown = new Set<string>();
    for (let i = 0; i < board.pages(); i++) {
      board.visible().forEach((r: any) => shown.add(r.v.id));
      board.next();
    }
    expect(shown.size).toBe(14);
    board.page.set(0);
    vi.advanceTimersByTime(15000);
    expect(board.currentPage()).toBe(1);
    board.paused.set(true);
    vi.advanceTimersByTime(30000);
    expect(board.currentPage()).toBe(1);
    board.paused.set(false);
    vi.advanceTimersByTime(15000);
    expect(board.currentPage()).toBe(2);
    fixture.destroy();
  });
  it('filters counts and visits together and resets to the complete published list', () => {
    data.set({
      clients: [],
      visits: [
        visit('high', { priority: 'High', carers: 2, riskFlags: ['Dementia'] }),
        visit('standard'),
        visit('draft', { state: 'Draft' }),
        visit('yesterday', { date: '2026-10-06' }),
      ],
    });
    const { fixture, board } = setup();
    expect(board.all().length).toBe(2);
    board.highOnly.set(true);
    board.double.set(true);
    board.risk.set('Dementia');
    expect(board.rows().map((r: any) => r.v.id)).toEqual(['high']);
    expect(board.totals()[0].value).toBe(1);
    board.risk.set('Living alone');
    expect(board.rows()).toEqual([]);
    expect(board.currentPage()).toBe(0);
    board.reset();
    expect(board.rows().length).toBe(2);
    expect(board.filterCount()).toBe(0);
    fixture.destroy();
  });
  it('includes missing second carers and overstays in manager attention', () => {
    const start = londonInstant('2026-10-07', '08:00')!;
    data.set({
      clients: [],
      visits: [
        visit('double', {
          carers: 2,
          staffIds: ['carer', 'second'],
          attendance: [{ personId: 'carer', start, end: '' }],
        }),
        visit('over', { end: '08:10', attendance: [{ personId: 'carer', start, end: '' }] }),
        visit('done', {
          attendance: [{ personId: 'carer', start, end: londonInstant('2026-10-07', '08:10')! }],
        }),
      ],
    });
    const { fixture, board } = setup();
    expect(board.attention().length).toBe(2);
    expect(board.displayStatus(board.all().find((r: any) => r.v.id === 'double'))).toBe(
      'Awaiting second carer',
    );
    expect(board.displayStatus(board.all().find((r: any) => r.v.id === 'over'))).toBe('Overstayed');
    board.selectView('Still on duty');
    expect(board.rows().length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('Private address');
    expect(fixture.nativeElement.textContent).not.toContain('Private care task');
    fixture.destroy();
  });
  it('rolls over at UK midnight and retains overnight carryover', () => {
    vi.setSystemTime(new Date('2026-10-07T22:59:59Z'));
    data.set({
      clients: [],
      visits: [
        visit('day'),
        visit('overnight', { start: '23:30', end: '00:15' }),
        visit('tomorrow', { date: '2026-10-08' }),
      ],
    });
    const { fixture, board } = setup();
    expect(board.all().map((r: any) => r.v.id)).toEqual(['day', 'overnight']);
    vi.advanceTimersByTime(1000);
    expect(board.all().map((r: any) => r.v.id)).toEqual(['overnight', 'tomorrow']);
    fixture.destroy();
  });
  it('does not expose visits when rota access is denied', () => {
    canView.set(false);
    const { fixture, board } = setup();
    expect(board.all()).toEqual([]);
    expect(fixture.nativeElement.textContent).not.toContain('Client 0');
    fixture.destroy();
  });
});
