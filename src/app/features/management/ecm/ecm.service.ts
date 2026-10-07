import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { ManagementStore, COURSES } from '../shared/management.store';
import { RotaService } from '../rota/rota.service';
import { addDays, emptyRota, londonInstant, minutes, RotaVisit } from '../rota/rota.models';
import { EcmData, EcmRecord, EcmEvidence, ECM_ACTIONS, emptyEcm } from './ecm.models';

@Injectable({ providedIn: 'root' })
export class EcmService {
  private readonly store = inject(ManagementStore);
  private readonly auth = inject(AuthService);
  readonly rota = inject(RotaService);
  readonly data = computed(() => ({ ...emptyEcm(), ...this.rota.data().ecm }));
  attendance(
    visitId: string,
    personId: string,
    at: string,
    kind: 'Check in' | 'Check out',
    note: string,
  ): string | null {
    if (!this.rota.can('attendance')) return 'Your role cannot record attendance.';
    const visit = this.rota.data().visits.find((v) => v.id === visitId && v.state === 'Published');
    const time = Date.parse(at);
    const scheduled = visit && londonInstant(visit.date, visit.start);
    if (
      !visit ||
      !visit.staffIds.includes(personId) ||
      !scheduled ||
      !Number.isFinite(time) ||
      time > Date.now() ||
      Math.abs(time - Date.parse(scheduled)) > 86400000 ||
      !note.trim()
    )
      return 'Choose an allocated carer, an actual time within 24 hours of the visit and not in the future, and a verification note.';
    const existing = visit.attendance.find((a) => a.personId === personId);
    if (kind === 'Check out') {
      if (!existing?.start || existing.end)
        return 'A recorded check-in is required; completed attendance is locked.';
      return this.rota.recordAttendance(visitId, personId, existing.start, at, note);
    }
    if (existing) return 'This carer already has a check-in record.';
    if (
      this.rota
        .data()
        .visits.some(
          (v) =>
            v.id !== visitId &&
            v.attendance.some(
              (a) =>
                a.personId === personId &&
                (!a.end || (time >= Date.parse(a.start) && time < Date.parse(a.end))),
            ),
        )
    )
      return 'This carer has another open or overlapping attendance record.';
    const user = this.auth.currentUser()!;
    return this.store.saveWorkspace((d) => {
      const rota = d.rota ?? emptyRota();
      return {
        ...d,
        rota: {
          ...rota,
          visits: rota.visits.map((v) =>
            v.id === visitId
              ? {
                  ...v,
                  attendance: [
                    ...v.attendance,
                    { personId, start: new Date(time).toISOString(), end: '' },
                  ],
                }
              : v,
          ),
          audit: [
            ...rota.audit,
            {
              id: crypto.randomUUID(),
              userId: user.id,
              user: user.name,
              at: new Date().toISOString(),
              action: 'ECM check-in recorded',
              detail: `${visit.clientName} · ${personId} · ${at} · ${note.trim()}`,
            },
          ],
        },
      };
    })
      ? null
      : 'Could not save attendance. Free some browser storage and try again.';
  }
  private save(
    action: string,
    detail: string,
    change: (data: EcmData) => EcmData,
    changedVisit?: RotaVisit,
  ): string | null {
    if (!this.rota.can('manage')) return 'Your role cannot manage ECM records.';
    const user = this.auth.currentUser()!;
    return this.store.saveWorkspace((d) => {
      const rota = d.rota ?? emptyRota();
      return {
        ...d,
        rota: {
          ...rota,
          ecm: change({ ...emptyEcm(), ...rota.ecm }),
          visits: changedVisit
            ? rota.visits.map((v) => (v.id === changedVisit.id ? changedVisit : v))
            : rota.visits,
          audit: [
            ...rota.audit,
            {
              id: crypto.randomUUID(),
              userId: user.id,
              user: user.name,
              at: new Date().toISOString(),
              action,
              detail,
            },
          ],
        },
      };
    })
      ? null
      : 'Could not save. Free some browser storage and try again.';
  }
  record(visitId: string, input: Omit<EcmRecord, 'id' | 'visitId' | 'at' | 'user'>): string | null {
    const visit = this.rota.data().visits.find((v) => v.id === visitId && v.state === 'Published');
    if (!visit) return 'This published visit is no longer available.';
    if (!ECM_ACTIONS.includes(input.action as (typeof ECM_ACTIONS)[number]) || !input.note.trim())
      return 'Choose an action and enter a note.';
    if (input.action.includes('Contact') && (!input.contact.trim() || !input.outcome.trim()))
      return 'Enter who was contacted and the outcome.';
    const contactParts = input.contactAt?.split('T');
    const contactAt = contactParts ? londonInstant(contactParts[0], contactParts[1] ?? '') : null;
    if (
      (input.action.includes('Contact') && !contactAt) ||
      (input.contactAt && (!contactAt || Date.parse(contactAt) > Date.now()))
    )
      return 'Enter the actual contact date and time in UK time, not in the future.';
    if (
      input.eta &&
      !londonInstant(
        visit.end <= visit.start && input.eta < visit.start ? addDays(visit.date, 1) : visit.date,
        input.eta,
      )
    )
      return 'Enter a valid revised arrival time in UK time.';
    if (input.concern && !input.followUp.trim())
      return 'Enter a follow-up action for the welfare concern.';
    if (
      input.queueMessage &&
      (!input.recipient?.trim() || !['SMS', 'Email', 'In-app'].includes(input.channel ?? ''))
    )
      return 'Choose a demo delivery channel and recipient.';
    if (
      input.action === 'Escalate missed visit risk' &&
      !this.store.data().members.some((m) => m.id === input.ownerId && m.status === 'Active')
    )
      return 'Choose an active owner for this escalation.';
    let changedVisit: RotaVisit | undefined;
    if (input.action === 'Request changed time' && input.accepted) {
      if (visit.attendance.length || !input.eta)
        return 'Choose an unstarted visit and an agreed new arrival time to reschedule.';
      const length = (minutes(visit.end) - minutes(visit.start) + 1440) % 1440;
      const end = (minutes(input.eta) + length) % 1440;
      changedVisit = {
        ...visit,
        date:
          visit.end <= visit.start && input.eta < visit.start ? addDays(visit.date, 1) : visit.date,
        start: input.eta,
        end: `${Math.floor(end / 60)
          .toString()
          .padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`,
      };
      const issues = this.rota.conflicts(changedVisit);
      if (issues.length) return issues.join(' ');
    }
    return this.save(
      'ECM action recorded',
      `${visit.clientName} · ${input.action} · ${input.note.trim()}`,
      (d) => ({
        ...d,
        notifications: input.queueMessage
          ? [
              ...d.notifications,
              {
                id: crypto.randomUUID(),
                visitId,
                at: new Date().toISOString(),
                user: this.auth.currentUser()!.name,
                recipient: input.recipient!.trim(),
                channel: input.channel!,
                subject: input.action,
                body: input.note.trim(),
                state: 'Queued',
                attempts: 0,
                updatedAt: new Date().toISOString(),
                error: '',
              },
            ]
          : d.notifications,
        escalations:
          input.action === 'Escalate missed visit risk'
            ? [
                ...d.escalations,
                {
                  id: crypto.randomUUID(),
                  visitId,
                  at: new Date().toISOString(),
                  ownerId: input.ownerId!,
                  severity: visit.priority === 'High' || input.concern ? 'Critical' : 'Priority',
                  state: 'Open',
                  note: input.note.trim(),
                  dueAt: new Date(Date.now() + 15 * 60000).toISOString(),
                  resolution: '',
                  history: [
                    {
                      at: new Date().toISOString(),
                      user: this.auth.currentUser()!.name,
                      note: input.note.trim(),
                    },
                  ],
                },
              ]
            : d.escalations,
        records: [
          ...d.records,
          {
            ...input,
            contactAt: contactAt ?? '',
            note: input.note.trim(),
            id: crypto.randomUUID(),
            visitId,
            at: new Date().toISOString(),
            user: this.auth.currentUser()!.name,
          },
        ],
      }),
      changedVisit,
    );
  }
  settings(input: EcmData): string | null {
    const { lateMinutes: late, riskMinutes: risk, missedMinutes: missed } = input;
    if (
      ![late, risk, missed].every((n) => Number.isInteger(n) && n > 0 && n <= 180) ||
      late >= risk ||
      risk >= missed
    )
      return 'Use whole minutes from 1 to 180, with late < risk < missed.';
    if (
      Object.values(input.styles).some(
        (s) =>
          !/^#[0-9a-f]{6}$/i.test(s.background) ||
          !/^#[0-9a-f]{6}$/i.test(s.color) ||
          !s.label.trim() ||
          (s.duration !== undefined &&
            (!Number.isInteger(s.duration) || s.duration < 5 || s.duration > 240)) ||
          (s.priority !== undefined && !['Standard', 'High'].includes(s.priority)) ||
          s.skills?.some((id) => !COURSES.some((c) => c.id === id)) ||
          contrast(s.color, s.background) < 4.5,
      )
    )
      return 'Use a label, colours with at least 4.5:1 contrast, a duration of 5–240 whole minutes and recognised skills and priority.';
    return this.save(
      'ECM settings saved',
      `${late}/${risk}/${missed} minute alert thresholds; call label colours updated`,
      (d) => ({
        ...d,
        lateMinutes: late,
        riskMinutes: risk,
        missedMinutes: missed,
        styles: structuredClone(input.styles),
      }),
    );
  }
  evidence(
    visitId: string,
    input: Pick<
      EcmEvidence,
      'type' | 'note' | 'photo' | 'photoName' | 'audio' | 'audioName' | 'transcript'
    >,
    consent: boolean,
  ): string | null {
    if (!this.rota.data().visits.some((v) => v.id === visitId && v.state === 'Published'))
      return 'Choose a published visit.';
    if (
      !['Care note', 'Safeguarding', 'Wound / skin', 'Other concern'].includes(input.type) ||
      !input.note.trim()
    )
      return 'Enter a care note and a valid concern type.';
    if (
      input.photo &&
      (!consent ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(input.photo) ||
        input.photo.length > 700000)
    )
      return 'Use a PNG, JPEG or WebP under 500 KB and confirm consent and care-plan permission.';
    if (
      input.audio &&
      (!/^data:audio\/(webm|ogg|mp4|wav|mpeg)(;codecs=[a-z0-9-]+)?;base64,[A-Za-z0-9+/=]+$/i.test(
        input.audio,
      ) ||
        input.audio.length > 2800000)
    )
      return 'Use a voice recording under 2 MB in a supported audio format.';
    return this.save(
      'Visit evidence added',
      `${visitId} · ${input.type}${input.photo ? ' · photo attached' : ''}`,
      (d) => ({
        ...d,
        escalations:
          input.type !== 'Care note'
            ? [
                ...d.escalations,
                {
                  id: crypto.randomUUID(),
                  visitId,
                  at: new Date().toISOString(),
                  ownerId:
                    this.store
                      .data()
                      .members.find((m) => m.status === 'Active' && m.role === 'Registered Manager')
                      ?.id ?? '',
                  severity: input.type === 'Safeguarding' ? 'Critical' : 'Priority',
                  state: 'Open',
                  note: input.note.trim(),
                  dueAt: new Date(Date.now() + 15 * 60000).toISOString(),
                  resolution: '',
                  history: [
                    {
                      at: new Date().toISOString(),
                      user: this.auth.currentUser()!.name,
                      note: `${input.type} evidence submitted for manager review`,
                    },
                  ],
                },
              ]
            : d.escalations,
        evidence: [
          ...d.evidence,
          {
            ...input,
            note: input.note.trim(),
            id: crypto.randomUUID(),
            visitId,
            at: new Date().toISOString(),
            user: this.auth.currentUser()!.name,
          },
        ],
      }),
    );
  }
  reviewEvidence(id: string): string | null {
    if (!['Company Admin', 'Platform Owner', 'Registered Manager'].includes(this.rota.role()))
      return 'Manager access is required to review sensitive evidence.';
    if (!this.data().evidence.some((e) => e.id === id)) return 'Evidence is no longer available.';
    return this.save('Visit evidence reviewed', id, (d) => ({
      ...d,
      evidence: d.evidence.map((e) =>
        e.id === id
          ? {
              ...e,
              reviewedAt: new Date().toISOString(),
              reviewedBy: this.auth.currentUser()!.name,
            }
          : e,
      ),
    }));
  }
  viewAudio(id: string): string | null {
    const e = this.data().evidence.find((e) => e.id === id);
    if (!e?.audio) return 'Voice note is no longer available.';
    if (
      e.type !== 'Care note' &&
      !['Company Admin', 'Platform Owner', 'Registered Manager'].includes(this.rota.role())
    )
      return 'Manager access is required to play sensitive recordings.';
    return this.save('Visit voice note played', `${e.visitId} · ${e.id}`, (d) => d);
  }
  viewPhoto(id: string): string | null {
    const e = this.data().evidence.find((e) => e.id === id);
    if (!e || !e.photo) return 'Photo is no longer available.';
    if (
      e.type !== 'Care note' &&
      !['Company Admin', 'Platform Owner', 'Registered Manager'].includes(this.rota.role())
    )
      return 'Manager access is required to view sensitive photos.';
    return this.save('Visit photo viewed', `${e.visitId} · ${e.id}`, (d) => d);
  }
}
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
