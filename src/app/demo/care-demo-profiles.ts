import type { WorkspaceData } from '../features/management/shared/management.store';
import {
  emptyClientFile,
  type ClientFile,
  type ClientEntry,
} from '../features/management/clients/client-file.models';
import {
  blankPrescription,
  type Administration,
  type CareDocument,
  type Prescription,
} from '../features/management/care/care.models';
import { addDays, londonInstant } from '../features/management/rota/rota.models';

function append<T extends { id: string }>(saved: T[] = [], added: T[]): T[] {
  return [...saved, ...added.filter((item) => !saved.some((entry) => entry.id === item.id))];
}
function fill(
  saved: Record<string, string> = {},
  defaults: Record<string, string>,
): Record<string, string> {
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(saved).filter(([, value]) => value !== '')),
  };
}
export function demoCareDocument(
  id: string,
  name: string,
  category: string,
  today: string,
  shared = false,
): CareDocument {
  const text = 'Fictional demonstration document - ' + category + '. No clinical authority.';
  const stream = `BT /F1 14 Tf 50 760 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n')
    .join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return {
    id,
    name,
    category,
    version: '1.0',
    data: 'data:application/pdf;base64,' + btoa(pdf),
    mime: 'application/pdf',
    size: pdf.length,
    at: addDays(today, -7) + 'T09:00:00Z',
    by: 'Demo care coordinator',
    familyShared: shared,
  };
}
function prescriptions(prefix: string, today: string): Prescription[] {
  return [
    {
      name: 'Demo daily tablet',
      strength: '10 mg',
      form: 'Tablet',
      route: 'Oral',
      dose: 'One tablet',
      times: ['06:00', '18:00'],
      stock: 28,
    },
    {
      name: 'Demo emollient cream',
      strength: 'Standard',
      form: 'Cream',
      route: 'Topical',
      dose: 'Apply as recorded in the demo plan',
      times: ['08:00'],
      stock: 4,
    },
    {
      name: 'Demo PRN tablet',
      strength: '500 mg',
      form: 'Tablet',
      route: 'Oral',
      dose: 'One tablet',
      times: [],
      stock: 18,
    },
    {
      name: 'Demo controlled tablet',
      strength: '5 mg',
      form: 'Tablet',
      route: 'Oral',
      dose: 'One tablet',
      times: ['20:00'],
      stock: 14,
    },
  ].map((item, index) => ({
    ...blankPrescription(),
    ...item,
    id: prefix + 'medicine-' + index,
    frequency: index === 2 ? 'PRN' : 'Daily',
    start: addDays(today, -30),
    support: 'Administer',
    prescriber: 'Demo GP - Community Practice',
    pharmacy: 'Demo Community Pharmacy',
    indication: 'Fictional medication for interface demonstration',
    controlled: index === 3,
    lowStock: 5,
    stockLocation: 'Demo medication cupboard',
    dispensing: 'Original labelled packaging',
    monitoring: 'Demonstration record only; no clinical instructions.',
    notes: 'Fictional sample medicine. This record is for demonstration only.',
    prnIndication: index === 2 ? 'Demonstration symptom relief' : '',
    prnMax: index === 2 ? 4 : null,
    prnInterval: index === 2 ? 4 : null,
  }));
}
function administrations(
  medicines: Prescription[],
  prefix: string,
  today: string,
): Administration[] {
  const records: Administration[] = [];
  for (let day = -6; day <= 0; day++) {
    const date = addDays(today, day);
    for (const [index, medicine] of medicines.entries()) {
      const times = medicine.frequency === 'PRN' ? (day === -2 ? ['14:00'] : []) : medicine.times;
      for (const time of times) {
        const at = londonInstant(date, time)!;
        if (Date.parse(at) > Date.now()) continue;
        const outcome =
          day === -2 && index === 0 && time === '18:00'
            ? 'Refused'
            : day === -3 && index === 1
              ? 'Omitted'
              : day === -5 && index === 0 && time === '18:00'
                ? 'Absent'
                : 'Given';
        records.push({
          id: prefix + 'mar-' + index + '-' + date + '-' + time,
          medicationId: medicine.id,
          date,
          time,
          outcome,
          doseUnits: outcome === 'Given' ? 1 : 0,
          reason:
            outcome === 'Given'
              ? ''
              : 'Fictional ' +
                outcome.toLowerCase() +
                ' example; recorded and escalated in the demo care record.',
          response: medicine.frequency === 'PRN' ? 'Demo follow-up: comfortable at review.' : '',
          at,
          by: day % 2 ? 'Sarah Clarke' : 'James Turner',
          userId: 'care-demo-staff-' + (day % 2 ? 0 : 1),
          witness: medicine.controlled ? 'Priya Desai' : '',
        });
      }
    }
  }
  return records;
}
function profile(file: ClientFile, index: number, name: string, today: string): ClientFile {
  const prefix = 'care-demo-profile-' + index + '-';
  const kin =
    file.contacts?.find((contact) => contact.nextOfKin)?.name ?? 'Demo family representative';
  const medicine = prescriptions(prefix, today);
  const sections: ClientFile['sections'] = {
    diagnoses: {
      primary:
        index === 3
          ? 'Dementia - demonstration diagnosis'
          : 'Reduced mobility - demonstration diagnosis',
      ongoing: 'Routine GP review and annual health checks recorded in the demonstration plan.',
      hearing: 'Hearing aid; face the person when speaking.',
      vision: 'Reading glasses.',
      sensory: 'Quiet surroundings and good lighting.',
    },
    plan: {
      name: name + ' - Personalised care plan',
      status: 'Active',
      start: addDays(today, -60),
      review: addDays(today, 30),
      needs: 'Support with personal care, medication routines, meals and maintaining independence.',
      support: 'Offer choices, explain each task and record the support provided.',
    },
    moving: {
      assessed: addDays(today, -20),
      review: addDays(today, 60),
      support: 'One person',
      equipment: 'Walking frame',
      instructions: 'Follow the demonstration mobility assessment and check the environment.',
    },
    capacity: {
      status: 'Has capacity',
      assessed: addDays(today, -20),
      review: addDays(today, 60),
      welfareLpa: kin + ' - fictional recorded representative',
      financeLpa: kin + ' - fictional recorded representative',
      advance: 'No advance decision recorded in this demonstration.',
      support: 'Use clear explanations, offer choices and allow time to respond.',
    },
    consent: {
      status: 'Recorded',
      date: addDays(today, -20),
      by: name,
      care: 'Agreed',
      medication: 'Agreed',
      family: 'Agreed',
      photo: 'Declined',
      notes: 'Fictional consent record for the demo profile; share only the approved care summary.',
    },
    support: {
      personal: 'Support washing, dressing and oral care while promoting independence.',
      nutrition: 'Offer preferred meals and regular drinks.',
      continence: 'Provide discreet support and follow the individual plan.',
      safety: 'Check walking areas and keep essential items within reach.',
      behaviour: 'Use a calm tone, familiar routines and reassurance; allow extra time.',
      gender: 'Any',
      preferredStaff: 'Sarah Clarke, James Turner',
      backupStaff: 'care-demo-staff-2',
      continuity: 'A small regular care team supports familiar routines.',
    },
    access: {
      location: 'Beside the front door',
      code: 'DEMO ONLY',
      checked: addDays(today, -7),
      instructions:
        'Fictional access details. Knock, introduce yourself and follow the agreed entry procedure.',
    },
    family: {
      approved: 'Care-plan summary, visits, medication support and approved wellbeing updates.',
      preferences:
        'Contact the next of kin for routine updates; use the agreed escalation process for urgent concerns.',
    },
  };
  const entry = (key: string, title: string, detail: string): ClientEntry => ({
    id: prefix + key,
    name: title,
    detail,
    date: addDays(today, -7),
    level: key === 'allergy' ? 'High' : 'Low',
    status: 'Active',
  });
  const entries: ClientFile['entries'] = {
    diagnoses: [
      entry(
        'diagnosis',
        'Osteoarthritis - demo',
        'Demonstration condition with daily mobility support.',
      ),
    ],
    allergies: [
      entry(
        'allergy',
        index % 2 ? 'Penicillin - demo allergy' : 'Adhesive dressing - demo allergy',
        'Fictional reaction: rash. Check the demonstration medication record.',
      ),
    ],
    medication: [
      entry(
        'medication-support',
        'Medication administration support',
        'Trained carers support the recorded routine and complete MAR entries.',
      ),
    ],
    plan: [
      entry(
        'goal',
        'Maintain independence at home',
        'Offer choices and support the person to complete familiar tasks.',
      ),
    ],
    risks: [
      entry(
        'risk',
        'Falls assessment',
        'Walking frame, clear routes and regular review recorded in this demonstration.',
      ),
    ],
    capacity: [
      entry(
        'capacity',
        'Daily care decisions',
        'Demonstration assessment records the support provided for informed choices.',
      ),
    ],
    tasks: [
      entry(
        'task',
        'Daily wellbeing and hydration',
        'Offer drinks, check wellbeing and record changes at each visit.',
      ),
    ],
    documents: [
      entry(
        'document-register',
        'Care plan and risk assessment',
        'Version 1.0 demonstration documents are available in the Documents tab.',
      ),
    ],
  };
  const mergedSections = { ...file.sections };
  for (const [key, values] of Object.entries(sections))
    mergedSections[key] = fill(file.sections[key], values);
  const mergedEntries = { ...file.entries };
  for (const [key, values] of Object.entries(entries))
    mergedEntries[key] = append(file.entries[key], values);
  return {
    ...file,
    details: fill(file.details, {
      nhs: 'DEMO-' + String(index + 1).padStart(6, '0'),
      preferredName: name.split(' ')[0],
      ethnicity: 'White British - demonstration',
      religion: 'No preference recorded',
      sexuality: 'Prefer not to say',
      language: 'English',
      likes: 'Music, gardening and time with family.',
      dislikes: 'Feeling rushed.',
      about:
        'Fictional demonstration profile. Staying independent and choosing daily routines matters to me.',
    }),
    sections: mergedSections,
    entries: mergedEntries,
    medications: append(file.medications, medicine),
    administrations: append(file.administrations, administrations(medicine, prefix, today)),
    contacts: append(file.contacts, [
      {
        id: prefix + 'gp',
        name: 'Demo Community Practice',
        type: 'GP',
        relationship: 'General practitioner',
        phone: '07700 900100',
        email: 'gp@example.test',
        nextOfKin: false,
      },
      {
        id: prefix + 'pharmacy',
        name: 'Demo Community Pharmacy',
        type: 'Pharmacy',
        relationship: 'Dispensing pharmacy',
        phone: '07700 900101',
        email: 'pharmacy@example.test',
        nextOfKin: false,
      },
      {
        id: prefix + 'emergency',
        name: kin,
        type: 'Emergency',
        relationship: 'Family representative',
        phone: '07700 900102',
        email: 'emergency@example.test',
        nextOfKin: false,
      },
    ]),
    documents: append(file.documents, [
      demoCareDocument(prefix + 'care-plan', 'Demo care plan.pdf', 'Care plan', today, true),
      demoCareDocument(
        prefix + 'risk-assessment',
        'Demo risk assessment.pdf',
        'Risk assessment',
        today,
      ),
      demoCareDocument(prefix + 'consent', 'Demo consent record.pdf', 'Consent', today),
    ]),
    familyAccess: append(file.familyAccess, [
      {
        id: prefix + 'family-access',
        name: kin,
        email: 'family.' + index + '@example.test',
        relationship: 'Family member',
        status: 'Active',
        scopes: ['Care plan', 'Visits', 'Medication', 'Messages', 'Documents'],
        at: addDays(today, -7) + 'T10:00:00Z',
      },
    ]),
    familyUpdates: append(file.familyUpdates, [
      {
        id: prefix + 'family-update',
        date: addDays(today, -1),
        category: 'Wellbeing',
        text: 'Demo update: enjoyed breakfast and a conversation about the garden. Daily support completed and recorded.',
        by: 'Sarah Clarke',
        at: addDays(today, -1) + 'T10:00:00Z',
      },
    ]),
    messages: append(file.messages, [
      {
        id: prefix + 'family-message',
        accessId: prefix + 'family-access',
        text: 'Demo message: please let the care team know about the next routine appointment.',
        by: kin,
        fromFamily: true,
        at: addDays(today, -1) + 'T11:00:00Z',
      },
    ]),
    audit: append(
      file.audit,
      [
        'Profile completed',
        'Care plan reviewed',
        'Medication schedule reviewed',
        'Family update shared',
      ].map((action, step) => ({
        id: prefix + 'audit-' + step,
        at: addDays(today, -7 + step) + 'T09:00:00Z',
        by: 'Demo care coordinator',
        action,
        detail: 'Fictional demonstration event. No real care activity is represented.',
      })),
    ),
  };
}

export function seedCareProfiles(data: WorkspaceData, today: string): WorkspaceData {
  if (!data.rota) return data;
  return {
    ...data,
    rota: {
      ...data.rota,
      clients: data.rota.clients.map((client) => {
        const match = /^care-demo-client-(\d+)$/.exec(client.id);
        return match
          ? {
              ...client,
              file: profile(client.file ?? emptyClientFile(), Number(match[1]), client.name, today),
            }
          : client;
      }),
    },
  };
}
