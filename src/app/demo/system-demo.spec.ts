import { seedSystemDemo } from './system-demo';
import { seedSystemCompany } from './system-demo-company';
import { DEMO_EMAIL } from '../core/auth/fixtures';
import type { WorkspaceData, Company } from '../features/management/shared/management.store';
import { ASSESSMENT_TEMPLATES } from '../features/management/quality/quality.models';
import { invoiceTotal } from '../features/management/payroll/payroll.models';

const blank = (): WorkspaceData => ({
  people: [],
  vacancies: [],
  members: [],
  permissions: {},
  workflows: {},
  backup: false,
  leaves: [],
  reviews: [],
  cpd: [],
});
const today = '2026-10-24',
  now = Date.parse('2026-10-24T10:00:00Z');

describe('Connected system demonstration', () => {
  it('populates management and every portal using linked staff and client records', () => {
    const data = seedSystemDemo(blank(), today, now);
    const jane = data.people.find((person) => person.email === DEMO_EMAIL)!;
    expect(jane.stage).toBe('Hired');
    expect(
      data.rota!.visits.some((visit) => visit.date === today && visit.staffIds.includes(jane.id)),
    ).toBe(true);
    expect(data.journal!.tasks.some((task) => task.owner === DEMO_EMAIL)).toBe(true);
    expect(data.journal!.entries.some((entry) => entry.to.includes(DEMO_EMAIL))).toBe(true);
    expect(data.staffPortal!.concerns.length).toBeGreaterThan(6);
    expect(data.staffPortal!.communications.length).toBeGreaterThan(6);
    expect(data.academy!.assignments.some((assignment) => assignment.personId === jane.id)).toBe(
      true,
    );
    expect(data.academy!.attempts.length).toBeGreaterThan(0);
    expect(data.academy!.certificates.length).toBeGreaterThan(0);
    expect(data.inspection!.documents).toHaveLength(12);
    expect(data.inspection!.draft.findings).toHaveLength(5);
    expect(data.locations).toHaveLength(3);
    expect(data.vacancies).toHaveLength(5);
    expect(
      data.rota!.clients[0].file!.familyAccess!.some(
        (access) => access.email === DEMO_EMAIL && access.status === 'Active',
      ),
    ).toBe(true);
    expect(data.rota!.ecm!.escalations.length).toBeGreaterThan(0);
    expect(data.rota!.ecm!.evidence.length).toBeGreaterThan(0);
  });

  it('seeds portal conversations with valid visit, journal and concern links and preserves edits on upgrade', () => {
    const data = seedSystemDemo(blank(), today, now);
    for (const task of data.journal!.tasks) {
      if (task.visitId)
        expect(
          data.rota!.visits.some((v) => v.id === task.visitId && v.clientId === task.clientId),
        ).toBe(true);
      if (task.journalId)
        expect(
          data.journal!.entries.some(
            (e) => e.id === task.journalId && e.clientId === task.clientId,
          ),
        ).toBe(true);
      if (task.concernId)
        expect(
          data.staffPortal!.concerns.some(
            (c) => c.id === task.concernId && c.clientId === task.clientId,
          ),
        ).toBe(true);
    }
    const task = data.journal!.tasks.find((t) => t.id.startsWith('system-demo-portal-'))!;
    task.title = 'Preserved user edit';
    data.systemDemoVersion = 1;
    const upgraded = seedSystemDemo(data, today, now);
    expect(upgraded.journal!.tasks.find((t) => t.id === task.id)?.title).toBe(
      'Preserved user edit',
    );
    expect(new Set(upgraded.journal!.entries.map((e) => e.id)).size).toBe(
      upgraded.journal!.entries.length,
    );
  });
  it('keeps financial records tied to completed visits and reconciles payroll lines', () => {
    const data = seedSystemDemo(blank(), today, now),
      rota = data.rota!,
      payroll = data.payroll!;
    expect(payroll.runs).toHaveLength(6);
    expect(rota.ecm!.invoices).toHaveLength(48);
    const billed = new Set<string>();
    for (const invoice of rota.ecm!.invoices)
      for (const line of invoice.lines) {
        const visit = rota.visits.find((item) => item.id === line.visitId)!;
        expect(visit.clientId).toBe(invoice.clientId);
        expect(visit.date).toBe(line.date);
        expect(visit.attendance.every((attendance) => attendance.end)).toBe(true);
        expect(line.amount).toBe(line.hours * line.rate);
        expect(billed.has(line.visitId)).toBe(false);
        billed.add(line.visitId);
      }
    for (const run of payroll.runs)
      for (const line of run.lines) {
        const work = line.workIds.map((id) => payroll.work.find((record) => record.id === id)!);
        expect(
          work.every((record) => record.personId === line.personId && record.runId === run.id),
        ).toBe(true);
        expect(line.hours).toBe(work.reduce((sum, record) => sum + record.actualHours, 0));
        expect(line.total).toBe(line.basic + line.overtime + line.allowances + line.adjustment);
        expect(line.basic).toBe(Math.round(line.hours * line.rate * 100) / 100);
      }
    for (const invoice of payroll.invoices)
      expect(
        invoice.payments.reduce((sum, payment) => sum + payment.amount, 0),
      ).toBeLessThanOrEqual(invoiceTotal(invoice));
  });

  it('preserves existing records and edits and does not duplicate a completed seed', () => {
    const source = blank();
    source.journal = {
      entries: [],
      tasks: [
        {
          id: 'existing-task',
          owner: 'owner@example.test',
          title: 'Existing task',
          clientId: '',
          due: today,
          priority: 'Normal',
          status: 'Open',
        },
      ],
      events: [],
    };
    source.permissions = { 'Existing role:Care delivery': [true, false] };
    const data = seedSystemDemo(source, today, now);
    expect(source.people).toHaveLength(0);
    expect(data.journal!.tasks[0]).toBe(source.journal.tasks[0]);
    expect(data.permissions).toBe(source.permissions);
    data.journal!.tasks[1].title = 'Edited demo task';
    data.payroll!.invoices.pop();
    const again = seedSystemDemo(data, '2026-10-25', now);
    expect(again).toBe(data);
    expect(again.journal!.tasks[1].title).toBe('Edited demo task');
    expect(again.payroll!.invoices).toHaveLength(5);
  });

  it('keeps quality, inspector, training and communications references valid', () => {
    const data = seedSystemDemo(blank(), today, now);
    const clients = new Set(data.rota!.clients.map((client) => client.id));
    for (const assessment of data.quality!.assessments)
      expect(ASSESSMENT_TEMPLATES.some((template) => template.id === assessment.templateId)).toBe(
        true,
      );
    for (const action of data.quality!.actions)
      expect(
        data.quality!.assessments.some((assessment) => assessment.id === action.assessmentId),
      ).toBe(true);
    for (const finding of data.inspection!.draft.findings)
      expect(
        finding.evidenceIds.every((id) =>
          data.inspection!.documents.some((document) => document.id === id),
        ),
      ).toBe(true);
    for (const entry of data.staffPortal!.communications) {
      expect(clients.has(entry.clientId)).toBe(true);
      expect(
        data
          .rota!.clients.find((client) => client.id === entry.clientId)!
          .file!.contacts!.some((contact) => contact.id === entry.contactId),
      ).toBe(true);
    }
    for (const certificate of data.academy!.certificates)
      expect(
        data.academy!.assignments.some(
          (assignment) =>
            assignment.id === certificate.assignmentId &&
            assignment.personId === certificate.personId &&
            assignment.courseId === certificate.courseId,
        ),
      ).toBe(true);
  });

  it('fills missing company panels while preserving recorded company settings', () => {
    const company: Company = {
      id: 'lqcs',
      name: 'Recorded company',
      code: 'LQ',
      sector: 'Domiciliary care',
      size: '11-50 staff',
      registration: 'Existing registration',
      postcode: 'HA1 1AA',
      color: '#123456',
      accent: '#654321',
      tagline: 'Existing tagline',
      logo: '/existing-logo.png',
      modules: ['Care delivery'],
    };
    const data = seedSystemDemo(blank(), today, now),
      result = seedSystemCompany(company, data, today);
    expect(result.logo).toBe(company.logo);
    expect(result.registration).toBe(company.registration);
    expect(result.modules).toBe(company.modules);
    expect(result.contacts!.keyContacts).toHaveLength(5);
    expect(Object.keys(result.compliance!.documents)).toHaveLength(4);
    expect(result.subscription!.invoices).toHaveLength(3);
  });
  it('keeps five complete demo workspaces within the browser storage budget', () => {
    const data = seedSystemDemo(blank(), today, now);
    expect(JSON.stringify(data).length * 5).toBeLessThan(4_900_000);
  });
});
