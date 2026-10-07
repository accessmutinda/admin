import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkspaceService } from '../../../core/auth/workspace.service';
import { DEMO_USER } from '../../../core/auth/fixtures';
import { Ecm } from './ecm';

describe('ECM date rollover', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T22:59:59Z'));
    TestBed.configureTestingModule({ imports: [Ecm], providers: [provideRouter([])] });
    const auth = TestBed.inject(AuthService);
    auth.signInWithMicrosoft();
    TestBed.inject(WorkspaceService).switchWorkspace('lqcs');
    vi.spyOn(auth, 'currentUser').mockReturnValue({ ...DEMO_USER, roleCode: 'CA' });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('ticks the clock in seconds and keeps the update time until a manual or automatic refresh', () => {
    const fixture = TestBed.createComponent(Ecm);
    const board = fixture.componentInstance as unknown as {
      now(): number;
      refreshed(): number;
      time(value: string, seconds?: boolean): string;
      refresh(): void;
    };
    expect(board.time(board.now().toString(), true)).toBe('23:59:59');
    expect(board.time(board.now().toString())).toBe('23:59');
    vi.advanceTimersByTime(1000);
    expect(board.time(board.now().toString(), true)).toBe('00:00:00');
    expect(board.time(board.refreshed().toString(), true)).toBe('23:59:59');
    board.refresh();
    expect(board.time(board.refreshed().toString(), true)).toBe('00:00:00');
    vi.advanceTimersByTime(180000);
    expect(board.time(board.refreshed().toString(), true)).toBe('00:03:00');
    fixture.destroy();
  });
  it('rolls the current board forward at UK midnight while retaining a historical selection', () => {
    const fixture = TestBed.createComponent(Ecm);
    const board = fixture.componentInstance as unknown as {
      date: { (): string; set(value: string): void };
    };
    expect(board.date()).toBe('2026-10-07');
    vi.advanceTimersByTime(2000);
    expect(board.date()).toBe('2026-10-08');
    board.date.set('2026-10-06');
    vi.setSystemTime(new Date('2026-10-09T00:00:00Z'));
    vi.advanceTimersByTime(1000);
    expect(board.date()).toBe('2026-10-06');
    fixture.destroy();
  });
});
