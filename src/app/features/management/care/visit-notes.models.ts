export type VisitNoteAudience = 'staff' | 'family' | 'inspector';
export type VisitNoteStatus = 'Completed' | 'Flagged';
export interface VisitNoteAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  data: string;
  uploadedAt?: string;
  uploadedBy?: string;
}
export interface VisitNoteDraft {
  id: string;
  visitId: string;
  date: string;
  start: string;
  end: string;
  carerId: string;
  visitType: string;
  body: string;
  status: VisitNoteStatus;
  visibility: Record<VisitNoteAudience, boolean>;
  attachments: VisitNoteAttachment[];
}
export interface VisitNoteRevision {
  version: number;
  date: string;
  start: string;
  end: string;
  carerId: string;
  visitId: string;
  visitType: string;
  body: string;
  status: VisitNoteStatus;
  visibility: Record<VisitNoteAudience, boolean>;
  attachmentIds: string[];
  updatedAt: string;
  updatedBy: string;
}
export interface VisitNote extends VisitNoteDraft {
  version: number;
  createdAt: string;
  createdById: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  revisions: VisitNoteRevision[];
}
export const visitNoteRevision = (note: VisitNote): VisitNoteRevision => ({
  version: note.version,
  date: note.date,
  start: note.start,
  end: note.end,
  carerId: note.carerId,
  visitId: note.visitId,
  visitType: note.visitType,
  body: note.body,
  status: note.status,
  visibility: { ...note.visibility },
  attachmentIds: note.attachments.map((a) => a.id),
  updatedAt: note.updatedAt,
  updatedBy: note.updatedBy,
});
export const blankVisitNote = (date: string): VisitNoteDraft => ({
  id: crypto.randomUUID(),
  visitId: '',
  date,
  start: '09:00',
  end: '10:00',
  carerId: '',
  visitType: 'Personal Care',
  body: '',
  status: 'Completed',
  visibility: { staff: true, family: false, inspector: false },
  attachments: [],
});

export function validVisitNoteAttachment(file: VisitNoteAttachment): boolean {
  if (
    !file.id ||
    !file.name.trim() ||
    file.name.length > 255 ||
    !Number.isSafeInteger(file.size) ||
    file.size <= 0 ||
    file.size > 5 * 1024 * 1024 ||
    !['image/png', 'image/jpeg', 'application/pdf'].includes(file.mime)
  )
    return false;
  const prefix = `data:${file.mime};base64,`;
  if (!file.data.startsWith(prefix)) return false;
  const encoded = file.data.slice(prefix.length);
  if (encoded.length !== Math.ceil(file.size / 3) * 4) return false;
  try {
    const bytes = atob(encoded);
    if (bytes.length !== file.size) return false;
    return file.mime === 'application/pdf'
      ? bytes.startsWith('%PDF-')
      : file.mime === 'image/png'
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes.charCodeAt(i) === v)
        : [255, 216, 255].every((v, i) => bytes.charCodeAt(i) === v);
  } catch {
    return false;
  }
}
