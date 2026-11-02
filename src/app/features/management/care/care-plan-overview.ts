import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlanVersion, PlanSection } from './care-plan.models';
import { RotaClient, RotaCall } from '../rota/rota.models';
import { CARE_AREA_TABS, SERVICE_USER_RECORDS } from './care-plan-workspace.models';
@Component({
  selector: 'cv-care-plan-overview',
  imports: [DatePipe, RouterLink],
  templateUrl: './care-plan-overview.html',
  styleUrl: './care-plan-overview.css',
})
export class CarePlanOverview {
  readonly client = input.required<RotaClient>();
  readonly plan = input.required<PlanVersion>();
  readonly approved = input<PlanVersion>();
  readonly calls = input<RotaCall[]>([]);
  readonly canExport = input(false);
  readonly hasWorkingReview = input(false);
  readonly action = output<string>();
  readonly area = output<number>();
  readonly careAreas = CARE_AREA_TABS;
  readonly sourceRecords = Object.entries(SERVICE_USER_RECORDS).map(([id, record]) => ({
    id,
    ...record,
  }));
  readonly descriptions = [
    'Personal history, interests, values',
    'Washing, bathing, dressing',
    'Movement, transfers, stairs',
    'Eating, drinking, diet',
    'Bladder and bowel care',
    'Clothing, grooming and appearance',
    'Speech, hearing, language',
    'Diagnosis, behaviour support',
    'Medication support and risks',
    'Home environment, fire safety',
    'Family, social, community',
    'Morning and evening routines',
    'Religion, language, cultural needs',
    'Finance and budgeting',
    'Preferences and wishes',
    'Access and security',
    'Number of calls and schedule',
  ];
  get current() {
    return this.approved() || this.plan();
  }
  get facts() {
    const c = this.client(),
      d = c.file?.details || {};
    return [
      { label: 'Preferred name', value: d['preferredName'] || c.name, icon: 'person' },
      { label: 'Date of birth', value: this.birth(d['dob']), icon: 'event' },
      { label: 'NHS number', value: d['nhs'], icon: 'calendar_month' },
      { label: 'Address', value: c.address, icon: 'contact_mail' },
      { label: 'Postcode', value: c.postcode, icon: 'pin_drop' },
      { label: 'Telephone', value: c.phone, icon: 'call', phone: true },
      {
        label: 'Mobile',
        value: d['mobile'] || this.plan().details['mobile'],
        icon: 'smartphone',
        phone: true,
      },
      { label: 'Email', value: c.email, icon: 'mail', email: true },
      { label: 'Primary language', value: d['language'], icon: 'translate' },
      { label: 'Religion', value: d['religion'], icon: 'auto_awesome' },
    ];
  }
  private birth(value: string) {
    if (!value) return 'Not recorded';
    const dob = new Date(value + 'T12:00:00Z');
    if (!Number.isFinite(dob.getTime())) return value;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    if (
      now.getMonth() < dob.getMonth() ||
      (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
    )
      age--;
    return (
      dob.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      (age >= 0 ? ` (${age} years)` : '')
    );
  }
  get alerts() {
    const c = this.client();
    const risks = [
      ...(c.riskFlags || []),
      ...(c.file?.entries['risks'] || []).filter((r) => r.status === 'Active').map((r) => r.name),
    ];
    const result = [...new Set(risks)].map((text, i) => ({
      text,
      icon: i === 0 ? 'warning' : /fall|mobil/i.test(text) ? 'elderly' : 'neurology',
      tone: i === 0 ? 'red' : 'amber',
    }));
    for (const allergy of (c.file?.entries['allergies'] || []).filter(
      (a) => a.status !== 'Inactive',
    ))
      result.push({ text: 'Allergies – ' + allergy.name, icon: 'allergy', tone: 'amber' });
    if (c.file?.medications?.length)
      result.push({
        text: 'Medication support recorded – see current instructions',
        icon: 'medication',
        tone: 'blue',
      });
    return result;
  }
  get contacts() {
    const all = this.client().file?.contacts || [];
    const gp = all.find((c) => c.type === 'GP');
    const professional =
      all.find((c) => c.type === 'Professional') || all.find((c) => c.type === 'Pharmacy');
    const kin =
      all.find((c) => c.nextOfKin) ||
      all.find((c) => c.type === 'Family') ||
      all.find((c) => c.type === 'Emergency');
    return [
      { title: 'GP', record: gp, icon: 'groups', tone: 'blue' },
      {
        title:
          professional?.type === 'Pharmacy'
            ? 'Pharmacy'
            : professional?.relationship || 'Social Worker',
        record: professional,
        icon: 'link',
        tone: 'blue',
      },
      { title: 'Next of Kin', record: kin, icon: 'group', tone: 'red' },
    ];
  }
  get activity() {
    const events = [
      ...(this.client().file?.audit || []),
      ...this.plan().events.map((e, i) => ({ ...e, id: 'plan-' + i })),
    ];
    return events
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5)
      .map((e) => ({
        ...e,
        icon: /medicat/i.test(e.action)
          ? 'pill'
          : /body|skin/i.test(e.action)
            ? 'accessibility_new'
            : /visit/i.test(e.action)
              ? 'event_note'
              : /feedback|call|compl/i.test(e.action)
                ? 'chat_bubble'
                : 'description',
      }));
  }
  get packageRows() {
    return this.calls()
      .flatMap((call) => call.weekdays.map((day) => ({ call, day, id: call.id + '-' + day })))
      .sort((a, b) => (a.day || 7) - (b.day || 7) || a.call.start.localeCompare(b.call.start));
  }
  readonly weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  duration(call: RotaCall) {
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    return (minutes(call.end) - minutes(call.start) + 1440) % 1440;
  }
  get weeklyMinutes() {
    return this.packageRows.reduce((sum, row) => sum + this.duration(row.call), 0);
  }
  status(section: PlanSection) {
    if (!section.required) return 'Not Required';
    if (section.complete) return 'Completed';
    const previous = this.approved()?.sections.find((s) => s.name === section.name);
    if (
      previous &&
      JSON.stringify(previous.fields) === JSON.stringify(section.fields) &&
      previous.review === section.review &&
      JSON.stringify(previous.visibility) === JSON.stringify(section.visibility)
    )
      return 'Not Started';
    return Object.values(section.fields).some((value) => value.trim())
      ? 'In Progress'
      : 'Not Started';
  }
  stateClass(section: PlanSection) {
    return this.status(section).toLowerCase().replaceAll(' ', '-');
  }
}
