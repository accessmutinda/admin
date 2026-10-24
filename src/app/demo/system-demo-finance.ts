import type { WorkspaceData } from '../features/management/shared/management.store';
import {
  emptyPayroll,
  type Contractor,
  type Invoice,
  type PayProfile,
  type PayRun,
  type WorkRecord,
} from '../features/management/payroll/payroll.models';
import { emptyEcm, type ClientInvoice } from '../features/management/ecm/ecm.models';
import { addDays, londonInstant, type RotaVisit } from '../features/management/rota/rota.models';
import { appendDemo, demoAt, demoId, monthDate } from './system-demo-utils';

export function seedSystemFinance(data: WorkspaceData, today: string): WorkspaceData {
  const rota = data.rota!;
  const staff = data.people.filter((person) => /^care-demo-staff-\d+$/.test(person.id)).slice(0, 8);
  const clients = rota.clients.filter((client) => client.active).slice(0, 8);
  const history: RotaVisit[] = [];
  const bills: ClientInvoice[] = [];
  for (let month = -6; month < 0; month++) {
    for (const [index, client] of clients.entries()) {
      const call = rota.calls.find((item) => item.clientId === client.id && item.active)!;
      const visits: RotaVisit[] = [16].map((day) => {
        const date = monthDate(today, month, day);
        const person = staff[index % staff.length];
        return {
          id: demoId('history-' + month + '-' + index + '-' + day),
          callId: call.id,
          clientId: client.id,
          clientName: client.name,
          address: client.address,
          callName: call.name,
          date,
          start: '09:00',
          end: '11:00',
          carers: 1,
          skills: [],
          tasks: 'Fictional completed care visit for demonstration reporting.',
          staffIds: [person.id],
          allocation: 'Regular',
          state: 'Published',
          priority: 'Standard',
          exception: '',
          demo: true,
          attendance: [
            {
              personId: person.id,
              start: londonInstant(date, '09:00')!,
              end: londonInstant(date, '11:00')!,
            },
          ],
        };
      });
      history.push(...visits);
      const date = monthDate(today, month + 1, 0);
      bills.push({
        id: demoId('client-invoice-' + month + '-' + index),
        clientId: client.id,
        number:
          'DEMO-CV-' + date.slice(0, 7).replace('-', '') + '-' + String(index + 1).padStart(3, '0'),
        date,
        state: month === -1 ? 'Approved' : 'Exported',
        lines: visits.map((visit) => ({
          visitId: visit.id,
          date: visit.date,
          call: visit.callName,
          hours: 2,
          rate: 42,
          amount: 84,
          basis: 'Visit hour',
        })),
        audit: [
          {
            at: demoAt(date),
            user: 'Demo finance officer',
            note: 'Fictional sample invoice based on linked completed demo visits.',
          },
        ],
      });
    }
  }
  const allVisits = appendDemo(rota.visits, history);
  const payroll = data.payroll ?? emptyPayroll();
  const profiles: PayProfile[] = data.people
    .filter((person) => person.stage === 'Hired')
    .map((person) => ({
      id: demoId('pay-profile-' + person.id),
      personId: person.id,
      basis: 'Hourly',
      rate: person.hr?.employment.rate ?? 14.5,
      weeklyHours: person.hr?.employment.hours ?? 32,
      effective: addDays(today, -240),
      frequency: 'Monthly',
    }));
  const audit = (action: string) => [
    {
      at: demoAt(today, -1),
      userId: 'demo-finance',
      user: 'Demo finance officer',
      action,
      note: 'Fictional financial demonstration record.',
    },
  ];
  const work: WorkRecord[] = allVisits
    .filter((visit) => visit.attendance.some((attendance) => attendance.end))
    .flatMap((visit) =>
      visit.attendance
        .filter((attendance) => attendance.end)
        .map((attendance) => {
          const hours = (Date.parse(attendance.end) - Date.parse(attendance.start)) / 3600000;
          const profile = profiles.find((item) => item.personId === attendance.personId);
          return {
            id: demoId('work-' + visit.id + '-' + attendance.personId),
            personId: attendance.personId,
            date: visit.date,
            hours,
            actualHours: hours,
            rate: profile?.rate ?? 14.5,
            kind: 'Regular',
            category: 'Care delivery',
            reason: 'Completed demo visit linked to recorded attendance.',
            status: visit.date < today.slice(0, 7) + '-01' ? 'Approved' : 'Confirmed',
            rotaVisitIds: [visit.id],
            audit: audit('Demo attendance transferred'),
          } as WorkRecord;
        }),
    );
  const runs: PayRun[] = Array.from({ length: 6 }, (_, index) => {
    const month = index - 6;
    const start = monthDate(today, month),
      end = monthDate(today, month + 1, 0);
    const id = demoId('payrun-' + start.slice(0, 7));
    const lines = staff.map((person) => {
      const profile = profiles.find((item) => item.personId === person.id)!;
      const records = work.filter(
        (item) => item.personId === person.id && item.date >= start && item.date <= end,
      );
      records.forEach((record) => {
        record.runId = id;
      });
      const hours = records.reduce((total, record) => total + record.actualHours, 0);
      const basic = Math.round(hours * profile.rate * 100) / 100;
      return {
        personId: person.id,
        name: person.name,
        profileId: profile.id,
        basis: 'Hourly',
        rate: profile.rate,
        hours,
        basic,
        overtime: 0,
        allowances: 0,
        adjustment: 0,
        adjustmentReason: '',
        total: basic,
        workIds: records.map((record) => record.id),
      };
    });
    return {
      id,
      name: 'DEMO - ' + start.slice(0, 7) + ' monthly payroll',
      start,
      end,
      payday: end,
      cutoff: addDays(end, -3),
      frequency: 'Monthly',
      status: index === 5 ? 'Locked' : 'Paid',
      createdBy: 'Demo finance officer',
      lines,
      audit: audit('Demo payroll prepared'),
      ...(index < 5 ? { paymentDate: end, paymentReference: 'DEMO-PAY-' + start.slice(0, 7) } : {}),
    };
  });
  const contractors: Contractor[] = [
    {
      id: demoId('contractor-agency'),
      name: 'Demo Community Staffing Ltd',
      email: 'agency@example.test',
      type: 'Agency',
      rate: 22,
      unit: 'Hour',
      terms: 30,
      start: addDays(today, -240),
      end: '',
      reference: 'DEMO-AGENCY-001',
      managerId: staff[0].id,
    },
    {
      id: demoId('contractor-trainer'),
      name: 'Demo Care Training Services',
      email: 'training@example.test',
      type: 'Contractor',
      rate: 250,
      unit: 'Day',
      terms: 30,
      start: addDays(today, -240),
      end: '',
      reference: 'DEMO-TRAINING-001',
      managerId: staff[0].id,
    },
  ];
  const invoices: Invoice[] = Array.from({ length: 6 }, (_, index) => {
    const month = index - 5,
      issued = monthDate(today, month, 5);
    return {
      id: demoId('supplier-invoice-' + index),
      contractorId: contractors[index % 2].id,
      number: 'DEMO-SUP-' + String(index + 1).padStart(3, '0'),
      issued,
      due: addDays(issued, 30),
      start: monthDate(today, month),
      end: monthDate(today, month + 1, 0),
      lines: [
        {
          description: index % 2 ? 'Demo staff development workshop' : 'Demo agency cover hours',
          quantity: index % 2 ? 1 : 12,
          rate: index % 2 ? 250 : 22,
          vat: 0,
        },
      ],
      status: index === 5 ? 'Recorded' : index === 4 ? 'Work confirmed' : 'Approved',
      createdBy: 'Demo finance officer',
      audit: audit('Demo supplier invoice recorded'),
      payments:
        index < 4
          ? [
              {
                date: addDays(issued, 14),
                amount: index % 2 ? 250 : 264,
                reference: 'DEMO-SUP-PAY-' + index,
              },
            ]
          : [],
    };
  });
  const ecm = rota.ecm ?? emptyEcm();
  return {
    ...data,
    payroll: {
      ...payroll,
      profiles: appendDemo(payroll.profiles, profiles),
      work: appendDemo(payroll.work, work),
      contractors: appendDemo(payroll.contractors, contractors),
      invoices: appendDemo(payroll.invoices, invoices),
      runs: appendDemo(payroll.runs, runs),
    },
    rota: {
      ...rota,
      visits: allVisits,
      ecm: { ...ecm, invoices: appendDemo(ecm.invoices, bills) },
    },
  };
}
