import { validDate } from './care.models';
import type { CareDocument } from './care.models';
import type { VisitNoteAudience } from './visit-notes.models';

export type CareDocumentStatus = 'Current' | 'Under Review';
export interface DocumentMetadata {
  name: string;
  category: string;
  version: string;
  status: CareDocumentStatus;
  issueDate: string;
  reviewDate: string;
  description: string;
}
export interface DocumentRevision extends DocumentMetadata {
  revision: number;
  visibility: Record<VisitNoteAudience, boolean>;
  updatedAt: string;
  updatedBy: string;
}
export const documentVisibility = (document: CareDocument): Record<VisitNoteAudience, boolean> => ({
  staff: document.visibility?.staff ?? true,
  family: document.visibility?.family ?? !!document.familyShared,
  inspector: document.visibility?.inspector ?? true,
});
export const documentMetadata = (document: CareDocument): DocumentMetadata => ({
  name: document.name,
  category: document.category,
  version: document.version,
  status: document.status ?? 'Current',
  issueDate: document.issueDate ?? '',
  reviewDate: document.reviewDate ?? '',
  description: document.description ?? '',
});
export const documentRevision = (document: CareDocument): DocumentRevision => ({
  ...documentMetadata(document),
  revision: document.revision ?? 1,
  visibility: documentVisibility(document),
  updatedAt: document.updatedAt ?? document.at,
  updatedBy: document.updatedBy ?? document.by,
});
export function documentGroup(document: Pick<CareDocument, 'category'>): string {
  const category = document.category.toLowerCase().replace(/[-_]/g, ' ').trim();
  if (category === 'care plan') return 'Care Plan';
  if (category.includes('risk') || category.includes('assessment')) return 'Risk Assessment';
  if (category.includes('support') || category.includes('mobility') || category.includes('moving'))
    return 'Support Plans';
  return 'Other';
}
export const DOCUMENT_GROUPS = [
  'All Documents',
  'Care Plan',
  'Risk Assessment',
  'Support Plans',
  'Other',
];
export const DOCUMENT_TYPES = [
  'Care Plan',
  'Risk Assessment',
  'Support Plan',
  'Mobility',
  'Assessment',
  'Consent',
  'LPA',
  'Advance decision',
  'Clinical',
  'Photo',
  'Other',
];
export function safeDocumentSource(data: string): boolean {
  return (
    /^data:[^;,]+(;base64)?,/.test(data) ||
    /^\/demo\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(data)
  );
}

export function documentMetadataError(metadata: DocumentMetadata): string | null {
  if (
    !metadata.name.trim() ||
    metadata.name.length > 255 ||
    !metadata.category.trim() ||
    metadata.category.length > 100 ||
    !/^v?\d+(\.\d+){0,2}$/i.test(metadata.version.trim()) ||
    !['Current', 'Under Review'].includes(metadata.status) ||
    metadata.description.length > 2000
  )
    return 'Enter a document name, type, valid version and description up to 2,000 characters.';
  if (
    (metadata.issueDate && !validDate(metadata.issueDate)) ||
    (metadata.reviewDate && !validDate(metadata.reviewDate)) ||
    (metadata.issueDate && metadata.reviewDate && metadata.reviewDate < metadata.issueDate)
  )
    return 'Enter valid dates; the review date cannot be before the issue date.';
  return null;
}

export function sharedDocument(document: CareDocument): CareDocument {
  const { revisions, deletedAt, deletedBy, ...current } = document;
  return current;
}
