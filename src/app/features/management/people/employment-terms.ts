export const WORKING_PATTERNS = ['Full time', 'Part time', 'Bank / flexible'] as const;
export const CONTRACT_TYPES = ['Permanent', 'Fixed term', 'Bank', 'Agency', 'Contract'] as const;

export type WorkingPattern = (typeof WORKING_PATTERNS)[number];
export type ContractType = (typeof CONTRACT_TYPES)[number];

function savedChoice<T extends string>(value: string | null | undefined, choices: readonly T[]): T | '' {
  const key = (text: string) => text.toLowerCase().replaceAll('-', ' ').trim().replace(/\s+/g, ' ');
  return choices.find((choice) => key(choice) === key(value ?? '')) ?? '';
}

export function workingPattern(value: string | null | undefined): WorkingPattern | '' {
  return savedChoice(value, WORKING_PATTERNS);
}

export function contractType(value: string | null | undefined): ContractType | '' {
  return savedChoice(value, CONTRACT_TYPES);
}
