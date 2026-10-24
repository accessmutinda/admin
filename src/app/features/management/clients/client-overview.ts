import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { RotaClient } from '../rota/rota.models';
import { age } from '../care/care.models';
import { RotaService } from '../rota/rota.service';

interface ProfileRow {
  label: string;
  value: string;
  tone?: string;
  section?: string;
}
@Component({
  selector: 'cv-client-overview',
  imports: [RouterLink, DatePipe],
  templateUrl: './client-overview.html',
  styleUrls: ['../care/service-user-spacing.css', './client-overview.css'],
})
export class ClientOverview {
  readonly client = input.required<RotaClient>();
  readonly edit = output<string>();
  readonly open = output<string>();
  protected readonly rota = inject(RotaService);
  protected readonly age = age;
  protected readonly calls = computed(() =>
    this.rota.data().calls.filter((c) => c.clientId === this.client().id && c.active),
  );
  protected readonly contact = computed(
    () => this.client().file?.contacts?.find((c) => c.nextOfKin) ?? this.client().representative,
  );
  protected readonly file = computed(() => this.client().file);
  protected details(key: string): string {
    return this.file()?.details[key] || 'Not recorded';
  }
  protected section(section: string, key: string): string {
    return this.file()?.sections[section]?.[key] || 'Not recorded';
  }
  protected entries(key: string): string {
    return (
      this.file()
        ?.entries[key]?.filter((e) => e.status === 'Active')
        .map((e) => e.name + (e.detail ? ' · ' + e.detail : ''))
        .join('\n') || 'Not recorded'
    );
  }
  protected readonly medication = computed(
    () =>
      [
        ...(this.file()?.entries['medication'] ?? [])
          .filter((e) => e.status === 'Active')
          .map((e) => e.name),
        ...(this.file()?.medications ?? [])
          .filter(
            (m) =>
              !m.discontinuedAt &&
              m.start <= this.rotaToday() &&
              (!m.end || m.end >= this.rotaToday()),
          )
          .map((m) => `${m.name} ${m.strength} · ${m.dose}`),
      ].join('\n') || 'Not recorded',
  );
  private rotaToday(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date());
  }
  protected readonly personal = computed<ProfileRow[]>(() => [
    { label: 'NHS number', value: this.details('nhs') },
    {
      label: 'Address',
      value: [this.client().address, this.client().postcode].filter(Boolean).join('\n'),
    },
    { label: 'GP', value: this.details('gp') },
    { label: 'Gender', value: this.details('gender') },
    { label: 'Ethnicity', value: this.details('ethnicity') },
    { label: 'Preferred language', value: this.details('language') },
    {
      label: 'Key safe',
      value: this.file()?.sections['access']?.['location']
        ? 'Recorded · ' + this.section('access', 'location')
        : 'Not recorded',
      section: 'access',
    },
  ]);
  protected readonly health = computed<ProfileRow[]>(() => [
    { label: 'Primary diagnosis', value: this.section('diagnoses', 'primary') },
    { label: 'Other conditions', value: this.entries('diagnoses') },
    {
      label: 'Mobility status',
      value:
        [
          this.file()?.sections['moving']?.['equipment'],
          this.file()?.sections['moving']?.['support'],
        ]
          .filter(Boolean)
          .join('\n') || 'Not recorded',
      tone: 'amber',
    },
    {
      label: 'Capacity status',
      value: this.section('capacity', 'status'),
      tone: 'amber',
      section: 'capacity',
    },
    { label: 'Allergies', value: this.entries('allergies'), tone: 'red', section: 'allergies' },
    { label: 'Current medication', value: this.medication(), section: 'medication' },
    { label: 'Dietary needs', value: this.section('diagnoses', 'diet') },
    { label: 'Ongoing health care', value: this.section('diagnoses', 'ongoing') },
  ]);
  protected readonly communication = computed<ProfileRow[]>(() => [
    { label: 'Communication needs', value: this.section('diagnoses', 'communication') },
    { label: 'Preferred language', value: this.details('language') },
    { label: 'Hearing', value: this.section('diagnoses', 'hearing') },
    { label: 'Vision', value: this.section('diagnoses', 'vision') },
    { label: 'Sensory support', value: this.section('diagnoses', 'sensory') },
    { label: 'Other', value: this.section('capacity', 'support') },
  ]);
  protected readonly support = computed<ProfileRow[]>(() => [
    { label: 'Personal care', value: this.section('support', 'personal') },
    { label: 'Medication', value: this.entries('medication') },
    { label: 'Nutrition', value: this.section('support', 'nutrition') },
    { label: 'Mobility', value: this.section('moving', 'instructions') },
    { label: 'Continence', value: this.section('support', 'continence') },
    { label: 'Safety & wellbeing', value: this.section('support', 'safety') },
    { label: 'Reassuring approaches', value: this.section('support', 'behaviour') },
    { label: 'Continuity', value: this.section('support', 'continuity') },
  ]);
  protected callIcon(name: string): string {
    const text = name.toLowerCase();
    return text.includes('morning')
      ? 'light_mode'
      : text.includes('lunch')
        ? 'restaurant'
        : text.includes('tea')
          ? 'local_cafe'
          : text.includes('bed') || text.includes('night')
            ? 'dark_mode'
            : text.includes('medic')
              ? 'pill'
              : text.includes('clean')
                ? 'cleaning_services'
                : text.includes('welfare')
                  ? 'verified_user'
                  : 'accessibility_new';
  }
  protected frequency(days: number[]): string {
    return days.length === 7
      ? 'Daily'
      : days.length
        ? days.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
        : 'Days not recorded';
  }
  protected readonly review = computed(() => {
    const date = this.file()?.sections['plan']?.['review'];
    return date ? (date < this.rotaToday() ? 'Overdue · ' : 'Due · ') + date : 'Not recorded';
  });
}
