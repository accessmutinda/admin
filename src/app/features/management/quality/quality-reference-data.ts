import { QualityDashboard } from './quality-dashboard.models';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fullMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function demoReferenceDashboard(
  template: QualityDashboard,
  reportMonth: string,
): QualityDashboard {
  if (reportMonth === '2025-04-01' || !/^\d{4}-\d{2}-01$/.test(reportMonth)) return template;
  const [year, month] = reportMonth.split('-').map(Number);
  if (month < 1 || month > 12 || year < 1900) return template;
  const offset = (year - 2025) * 12 + month - 4;
  const shift = (monthIndex: number, sourceYear: number, day = 1) => {
    const first = new Date(Date.UTC(sourceYear, monthIndex + offset, 1));
    const last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last)));
  };
  const text = (value: string) =>
    value
      .replace(
        /\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g,
        (_, day: string, mon: string, yr: string) => {
          const date = shift(months.indexOf(mon), Number(yr), Number(day));
          return `${String(date.getUTCDate()).padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
        },
      )
      .replace(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December) 2025\b/g,
        (_, mon: string) => {
          const date = shift(fullMonths.indexOf(mon), 2025);
          return `${fullMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
        },
      );
  return {
    ...template,
    panels: template.panels.map((panel) => ({
      ...panel,
      rows: panel.rows?.map((row) => row.map(text)),
      note: panel.note ? text(panel.note) : panel.note,
      labels: (
        panel.labels ??
        (panel.kind === 'chart'
          ? panel.forecast
            ? ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
            : ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
          : undefined)
      )?.map((label) =>
        months.includes(label)
          ? months[shift(months.indexOf(label), 2025).getUTCMonth()]
          : text(label),
      ),
    })),
  };
}
