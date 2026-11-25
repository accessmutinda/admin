import type { MarRead } from './medication.generated';

export function witnessLabel(evidence: MarRead['witnessEvidence']): string {
  if (!evidence) return '';
  const name = evidence.name || 'Witness not recorded';
  return `${name} (${evidence.status === 'verified' ? 'Verified' : 'Unverified'})`;
}
