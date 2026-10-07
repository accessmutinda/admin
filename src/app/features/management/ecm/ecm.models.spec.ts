import { RotaVisit, londonInstant } from '../rota/rota.models';
import { emptyEcm, liveVisit, onBoardDate } from './ecm.models';
const visit = (): RotaVisit => ({
  id: 'visit',
  callId: 'call',
  clientId: 'client',
  clientName: 'Mary Smith',
  address: 'London',
  callName: 'Morning',
  date: '2026-10-07',
  start: '08:00',
  end: '08:45',
  carers: 1,
  skills: [],
  tasks: '',
  staffIds: ['james'],
  allocation: 'Regular',
  state: 'Published',
  priority: 'High',
  attendance: [],
  exception: '',
});
const at = (time: string) => Date.parse(londonInstant('2026-10-07', time)!);
describe('ECM live timing', () => {
  it('includes overnight carryover on the following day, excluding other past visits', () => {
    expect(onBoardDate(visit(), '2026-10-07')).toBe(true);
    expect(onBoardDate(visit(), '2026-10-08')).toBe(false);
    expect(onBoardDate({ ...visit(), start: '23:30', end: '00:15' }, '2026-10-08')).toBe(true);
  });
  it('applies configurable thresholds at their exact boundary', () => {
    const v = visit();
    expect(liveVisit(v, at('07:59')).status).toBe('Scheduled');
    expect(liveVisit(v, at('08:04')).status).toBe('Scheduled');
    expect(liveVisit(v, at('08:05')).status).toBe('Running late');
    expect(liveVisit(v, at('08:15')).status).toBe('Missed visit risk');
    expect(liveVisit(v, at('08:30')).status).toBe('Missed visit');
    expect(liveVisit(v, at('08:30'), { ...emptyEcm(), missedMinutes: 60 }).status).toBe(
      'Missed visit risk',
    );
  });
  it('waits for both carers and ignores unrelated attendance', () => {
    const v = {
      ...visit(),
      carers: 2,
      staffIds: ['james', 'sarah'],
      attendance: [
        { personId: 'james', start: londonInstant('2026-10-07', '08:00')!, end: '' },
        { personId: 'other', start: londonInstant('2026-10-07', '08:00')!, end: '' },
      ],
    };
    expect(liveVisit(v, at('08:20')).status).toBe('Missed visit risk');
    expect(liveVisit(v, at('08:20')).arrived).toBe(1);
    v.attendance.push({ personId: 'sarah', start: londonInstant('2026-10-07', '08:19')!, end: '' });
    expect(liveVisit(v, at('08:20')).status).toBe('In progress');
  });
  it('requires all check-outs and measures duration and overrun', () => {
    const v = visit();
    v.attendance = [{ personId: 'james', start: londonInstant('2026-10-07', '07:50')!, end: '' }];
    expect(liveVisit(v, at('07:55')).status).toBe('Early');
    expect(liveVisit(v, at('08:50')).overrun).toBe(5);
    v.attendance[0].end = londonInstant('2026-10-07', '08:30')!;
    expect(liveVisit(v, at('12:00')).status).toBe('Completed');
    expect(liveVisit(v, at('12:00')).duration).toBe(40);
  });
  it('handles overnight visits and unavailable clock-change times', () => {
    const v = {
      ...visit(),
      start: '23:30',
      end: '00:15',
      attendance: [{ personId: 'james', start: londonInstant('2026-10-07', '23:30')!, end: '' }],
    };
    expect(liveVisit(v, Date.parse(londonInstant('2026-10-08', '00:10')!)).overrun).toBe(0);
    expect(liveVisit({ ...visit(), date: '2026-10-25', start: '01:30' }, at('08:30')).status).toBe(
      'Timing unavailable',
    );
  });
});
