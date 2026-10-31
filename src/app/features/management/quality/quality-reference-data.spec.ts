import { QUALITY_DASHBOARDS } from './quality-dashboard.models';
import { demoReferenceDashboard } from './quality-reference-data';

describe('Seeded Rich KPI reference period', () => {
  it('presents all nine reference pages in the seeded report month without altering the original templates', () => {
    const original = JSON.stringify(QUALITY_DASHBOARDS);
    for (const template of QUALITY_DASHBOARDS) {
      const report = demoReferenceDashboard(template, '2026-10-01');
      expect(report.title).toBe(template.title);
      expect(report.metrics).toEqual(template.metrics);
      expect(report.panels).toHaveLength(template.panels.length);
      expect(JSON.stringify(report.panels)).not.toContain('Apr 2025');
      const chart = report.panels.find((panel) => panel.kind === 'chart' && !panel.forecast);
      if (chart) expect(chart.labels?.at(-1)).toBe('Oct');
    }
    expect(JSON.stringify(QUALITY_DASHBOARDS)).toBe(original);
  });
  it('keeps the April reference and rejects malformed report months', () => {
    const template = QUALITY_DASHBOARDS[0];
    expect(demoReferenceDashboard(template, '2025-04-01')).toBe(template);
    expect(demoReferenceDashboard(template, 'invalid')).toBe(template);
    expect(demoReferenceDashboard(template, '2026-99-01')).toBe(template);
  });
});
