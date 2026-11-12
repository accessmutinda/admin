import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AcademyReports } from './academy-reports';
import { AcademyReportsApi } from './academy-reports-api.service';
import type { AcademyReportRead } from './academy.generated';

describe('Training matrix report workflow', () => {
  const scope = signal('first'),
    data = signal<AcademyReportRead | null>(null);
  let load: ReturnType<typeof vi.fn>, download: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scope.set('first');
    data.set(null);
    load = vi.fn(async () => {});
    download = vi.fn();
    TestBed.configureTestingModule({
      imports: [AcademyReports],
      providers: [
        provideRouter([]),
        {
          provide: AcademyReportsApi,
          useValue: {
            scope,
            data,
            load,
            download,
            available: signal(true),
            canExport: signal(true),
            error: signal(''),
            loading: signal(false),
            exporting: signal(false),
          },
        },
      ],
    });
  });
  const view = (instance: AcademyReports) =>
    instance as unknown as {
      from: string;
      to: string;
      heatmapPage: number;
      auditPage: number;
      notice: { (): string };
      reload(initial?: boolean): Promise<void>;
      export(kind: 'matrix'): Promise<void>;
      filtersChanged(): void;
    };
  it('keeps a completed download notice tied to the requested filters', async () => {
    const fixture = TestBed.createComponent(AcademyReports);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = view(fixture.componentInstance);
    let resolve!: (value: boolean) => void;
    download.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    page.from = '2026-11-01';
    page.to = '2026-11-12';
    const pending = page.export('matrix');
    page.from = '2026-10-01';
    page.filtersChanged();
    resolve(true);
    await pending;
    expect(page.notice()).toBe('');
  });
  it('recovers both paginators when the dataset shrinks', async () => {
    const fixture = TestBed.createComponent(AcademyReports);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = view(fixture.componentInstance);
    page.heatmapPage = 3;
    page.auditPage = 4;
    data.set({ count: 2, audit: { count: 4 }, meta: { filters: {} } } as AcademyReportRead);
    load.mockClear();
    await page.reload();
    expect(page.heatmapPage).toBe(1);
    expect(page.auditPage).toBe(1);
    expect(load).toHaveBeenCalledTimes(2);
    expect(load.mock.calls[1].slice(1)).toEqual([1, 1]);
  });
  it('does not show an old download success after switching workspace', async () => {
    const fixture = TestBed.createComponent(AcademyReports);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = view(fixture.componentInstance);
    let resolve!: (value: boolean) => void;
    download.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const pending = page.export('matrix');
    scope.set('other');
    resolve(true);
    await pending;
    expect(page.notice()).toBe('');
  });
  it('shows effective server dates when a cleared date uses the reporting default', async () => {
    const fixture = TestBed.createComponent(AcademyReports);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = view(fixture.componentInstance);
    page.from = '';
    page.to = '2026-11-12';
    data.set({
      count: 0,
      audit: { count: 0 },
      meta: { filters: { from_date: '2026-10-14', to_date: '2026-11-12' } },
    } as AcademyReportRead);
    await page.reload();
    expect(page.from).toBe('2026-10-14');
    expect(page.to).toBe('2026-11-12');
  });
});
