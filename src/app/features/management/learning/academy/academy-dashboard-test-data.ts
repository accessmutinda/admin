import type { AcademyDashboardRead } from './academy.generated';
export function dashboardData(period = 30): AcademyDashboardRead {
  const meta = {
    company_id: 'company',
    as_of: '2026-11-12T12:00:00Z',
    request_id: 'read',
    timezone: 'Europe/London',
    period,
    from_date: '2026-10-14',
    to_date: '2026-11-12',
    dueSoonDays: 30,
  };
  const empty = { count: 0, next: null, previous: null, results: [], meta };
  return {
    meta,
    stats: [
      {
        label: 'Pass Rate',
        value: '50%',
        icon: 'check_circle',
        path: 'results',
        tone: 'green',
        caption: 'Two scored final assessments',
        positive: true,
      },
    ],
    activity: empty,
    renewals: empty,
    recent: {
      ...empty,
      count: 1,
      results: [
        {
          id: 'attempt',
          personId: 'person',
          learner: 'Canonical learner',
          courseTitle: 'Safeguarding',
          submittedAt: '2026-11-12T10:00:00Z',
        },
      ],
    },
    readiness: { total: 2, compliant: 1, soon: 0, overdue: 0, outstanding: 1, percent: 50 },
    integrations: [
      {
        name: 'HR Staff Records (Certificates)',
        at: null,
        status: 'Available',
        healthy: true,
        detail: 'Internal filings',
      },
      {
        name: 'Training Matrix',
        at: null,
        status: 'Calculated',
        healthy: true,
        detail: 'Live source calculation',
      },
      {
        name: 'Rota / Workforce System',
        at: null,
        status: 'Not configured',
        healthy: false,
        detail: 'No delivery adapter',
      },
    ],
    staffCount: 2,
  };
}
