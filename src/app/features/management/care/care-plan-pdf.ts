import { ASSESSMENT_FIELDS } from './care-plan-assessment.models';
import { jsPDF } from 'jspdf';
import { ABOUT_ME_FIELDS, PLAN_FIELDS, PlanVersion } from './care-plan.models';
export function createCarePlanPdf(p: PlanVersion) {
  const doc = new jsPDF();
  const detailFields = [
    ['clientId', 'Client ID'],
    ['postcode', 'Postcode'],
    ['mobile', 'Mobile'],
    ['name', 'Full name'],
    ['preferred', 'Preferred name'],
    ['gender', 'Gender'],
    ['ethnicity', 'Ethnicity'],
    ['marital', 'Marital status'],
    ['dob', 'Date of birth'],
    ['nhs', 'NHS number'],
    ['address', 'Address'],
    ['phone', 'Telephone'],
    ['email', 'Email'],
    ['language', 'Primary language'],
    ['religion', 'Religion / culture'],
    ['allergies', 'Known allergies'],
    ['risks', 'Key risks'],
    ['access', 'Home access / key safe'],
    ['contacts', 'Family, GP, pharmacy and other professionals'],
  ];
  const capacityFields = [
    ['decision', 'Specific care decision and capacity finding'],
    ['assessment', 'Areas requiring assessment / assessment reference'],
    ['welfare', 'LPA · Health & Welfare'],
    ['finance', 'LPA · Property & Financial Affairs'],
    ['deputy', 'Deputy / advocate and authority'],
    ['bestInterests', 'Best-interest decision, consultation and rationale'],
  ];
  let y = 28;
  const header = () => {
    doc.setFillColor(17, 47, 82);
    doc.rect(0, 0, 210, 18, 'F');
    doc.setTextColor(255);
    doc.setFontSize(13);
    doc.text('London Quality Care Services | CareVerity', 14, 12);
    doc.setTextColor(30, 45, 65);
  };
  const line = (label: string, value: string) => {
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(`${label}: ${value || 'Not recorded'}`, 180);
    for (const text of lines) {
      if (y > 275) {
        doc.addPage();
        header();
        y = 28;
      }
      doc.setFontSize(10);
      doc.text(text, 14, y);
      y += 5;
    }
    y += 3;
  };
  header();
  doc.setFontSize(28);
  doc.text('PERSON-CENTRED CARE PLAN', 14, 53);
  y = 73;
  line('Service user', p.details['name']);
  line('Version', p.version + ' · ' + p.status);
  line('Review date', p.review);
  line('Approved by', p.approver);
  line('Approval date', p.approvedAt);
  line(
    'Confidential',
    'Authorised care record. Handle in accordance with recorded disclosure permissions.',
  );
  doc.addPage();
  header();
  y = 28;
  for (const [key, label] of detailFields) line(label, p.details[key]);
  line(
    'Participation / representation',
    Object.entries(p.participation)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; '),
  );
  for (const [key, label] of capacityFields) line(label, p.capacity[key]);
  line('Care package decision', p.packageDecision);
  line('Proposed package / approval', p.packageProposal + ' · ' + p.packageStatus);
  for (const c of p.packageSnapshot)
    line(
      c.name,
      `${c.weekdays.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')} · ${c.start}–${c.end} · ${(Number(c.end.slice(0, 2)) * 60 + Number(c.end.slice(3)) - (Number(c.start.slice(0, 2)) * 60 + Number(c.start.slice(3))) + 1440) % 1440} min · ${c.carers} carer(s) · ${c.active ? 'Active' : 'Inactive'}`,
    );
  for (const s of p.sections) {
    doc.addPage();
    header();
    y = 28;
    line('Care area', s.name);
    if (s.fields['lastReview']) line('Last review date', s.fields['lastReview']);
    if (s.fields['reviewOutcome']) line('Review outcome', s.fields['reviewOutcome']);
    if (!s.required) {
      line('Care plan required', 'No');
      continue;
    }
    for (const [key, label] of s.name === 'About Me'
      ? [...PLAN_FIELDS, ...ABOUT_ME_FIELDS]
      : PLAN_FIELDS)
      line(label, s.fields[key]);
    line('Review date', s.review);
  }
  doc.addPage();
  header();
  y = 28;
  line('Body chart', `${p.body.length} observation(s)`);
  for (const [view, left] of [
    ['Front', 42],
    ['Back', 132],
  ] as const) {
    doc.setFontSize(11);
    doc.text(view, left + 15, 42);
    doc.setDrawColor(170, 151, 134);
    doc.setFillColor(249, 238, 227);
    const scale = 0.23,
      ox = left,
      oy = 49;
    doc.circle(ox + 100 * scale, oy + 35 * scale, 25 * scale, 'FD');
    const points = [
      [85, 60],
      [83, 78],
      [60, 85],
      [48, 106],
      [21, 204],
      [27, 220],
      [40, 207],
      [67, 130],
      [72, 212],
      [60, 397],
      [72, 416],
      [84, 400],
      [100, 257],
      [116, 400],
      [128, 416],
      [140, 397],
      [128, 212],
      [133, 130],
      [160, 207],
      [173, 220],
      [179, 204],
      [152, 106],
      [140, 85],
      [117, 78],
      [115, 60],
    ];
    const steps = points
      .slice(1)
      .map((point, i) => [(point[0] - points[i][0]) * scale, (point[1] - points[i][1]) * scale]);
    doc.lines(steps, ox + points[0][0] * scale, oy + points[0][1] * scale, [1, 1], 'FD', true);
    doc.line(ox + 100 * scale, oy + 80 * scale, ox + 100 * scale, oy + 210 * scale);
    p.body.forEach((b, index) => {
      if (b.view !== view) return;
      const x = ox + (b.x / 100) * 200 * scale,
        by = oy + (b.y / 100) * 440 * scale;
      doc.setFillColor(200, 70, 64);
      doc.circle(x, by, 2.5, 'F');
      doc.setFontSize(8);
      doc.setTextColor(255);
      doc.text(String(index + 1), x - 0.8, by + 1);
      doc.setTextColor(30, 45, 65);
    });
  }
  y = 160;
  for (const b of p.body) {
    line(
      `${b.view} · ${b.location}`,
      `${b.type} · ${b.description} · Size ${b.size} · Pain ${b.pain} · ${b.date} · ${b.issue} · ${b.status}`,
    );
    line('Action / professional / related record', `${b.action}; ${b.professional}; ${b.related}`);
    if (b.photo) {
      if (y > 220) {
        doc.addPage();
        header();
        y = 28;
      }
      doc.addImage(b.photo, b.photo.startsWith('data:image/png') ? 'PNG' : 'JPEG', 14, y, 45, 45);
      y += 50;
    }
  }
  for (const a of p.assessments) {
    line(a.name, `${a.status} · ${a.findings} · ${a.action} · Review ${a.review}`);
    for (const [key, label] of ASSESSMENT_FIELDS[a.name] || [])
      if (a.fields?.[key]) line(label, a.fields[key]);
  }
  if (p.reviewReport) {
    line('Review mode', 'Seeded frontend demo, reviewed by a supervisor');
    for (const finding of p.reviewReport.findings.filter((f) => f.decision !== 'Pending'))
      line(finding.title, `${finding.decision} · ${finding.rationale}`);
  }

  line('Linked documents', p.documentSnapshot.map((d) => `${d.name} v${d.version}`).join('; '));
  line('Quality review rationale', p.qualityReview);
  line(
    'Author / reviewer / approval',
    `${p.author} / ${p.reviewer} / ${p.approver} · ${p.approvedAt}`,
  );
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `${p.details['name']} | v${p.version} | Confidential | Page ${i} of ${doc.getNumberOfPages()}`,
      14,
      290,
    );
  }

  return doc;
}
