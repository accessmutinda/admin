import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RotaService } from './rota.service';
import { RotaVisit } from './rota.models';
import { VisitsAttention } from './visits-attention';

const visit = (id: string, overrides: Partial<RotaVisit> = {}): RotaVisit => ({
  id,
  callId: 'call',
  clientId: 'client',
  clientName: id,
  address: 'Test Road',
  callName: 'Morning call',
  date: '2026-10-25',
  start: '11:30',
  end: '12:00',
  carers: 1,
  skills: [],
  tasks: '',
  staffIds: [],
  allocation: 'Regular',
  state: 'Published',
  priority: 'Standard',
  attendance: [],
  exception: '',
  ...overrides,
});

describe('Visits home attention', () => {
  const records = signal<{ visits: RotaVisit[] }>({ visits: [] });
  const allowed = signal(true);
  const conflicts = vi.fn<(visit: RotaVisit) => string[]>(() => []);
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-24T12:00:00Z'));
    records.set({ visits: [] });
    allowed.set(true);
    conflicts.mockReset().mockReturnValue([]);
    TestBed.configureTestingModule({
      imports: [VisitsAttention],
      providers: [
        provideRouter([]),
        {
          provide: RotaService,
          useValue: { data: records, can: () => allowed(), conflicts },
        },
      ],
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('uses actual UK instants across a clock change and includes missing double-up places', () => {
    records.set({
      visits: [
        visit('inside', { carers: 2, staffIds: ['one'], timeSensitive: true }),
        visit('outside', { start: '12:30', end: '13:00' }),
        visit('past', { date: '2026-10-24', start: '12:30', end: '13:00' }),
        visit('cancelled', { state: 'Cancelled' }),
        visit('staffed', { staffIds: ['one'] }),
      ],
    });
    const fixture = TestBed.createComponent(VisitsAttention);
    fixture.detectChanges();
    const group = fixture.nativeElement.querySelector('article');
    expect(group.querySelectorAll('.attention-row')).toHaveLength(1);
    expect(group.textContent).toContain('inside');
    expect(group.textContent).toContain('1 carer place(s) still needed');
    expect(group.textContent).toContain('Time-sensitive call');
    expect(group.querySelector('a').getAttribute('href')).toBe('/manage/rota/planner?visit=inside');
  });

  it('shows upcoming draft reviews and actual conflict reasons with exact visit links', () => {
    records.set({
      visits: [
        visit('draft', { state: 'Draft' }),
        visit('conflicted', { staffIds: ['one'] }),
        visit('too-far', { state: 'Draft', date: '2026-11-02' }),
        visit('old-draft', { state: 'Draft', date: '2026-10-23' }),
      ],
    });
    conflicts.mockImplementation((v) =>
      v.id === 'conflicted' ? ['Recorded leave.', 'Required training missing.'] : [],
    );
    const fixture = TestBed.createComponent(VisitsAttention);
    fixture.detectChanges();
    const groups = fixture.nativeElement.querySelectorAll('article');
    expect(groups[1].querySelectorAll('.attention-row')).toHaveLength(1);
    const link = groups[1].querySelector('a').getAttribute('href');
    expect(link).toContain('/manage/rota/publishing?visit=draft');
    expect(link).toContain('from=2026-10-25&to=2026-10-25');
    expect(groups[2].textContent).toContain('Recorded leave. Required training missing.');
    expect(groups[2].querySelector('a').getAttribute('href')).toBe(
      '/manage/rota/planner?visit=conflicted',
    );
  });

  it('shows truthful empty states and renders no records without view permission', () => {
    const fixture = TestBed.createComponent(VisitsAttention);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.attention-empty')).toHaveLength(3);
    allowed.set(false);
    records.set({ visits: [visit('private person')] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.attention-panel')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('private person');
  });
});
