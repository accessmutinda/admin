export type RoleCode =
  | 'PO'
  | 'CA'
  | 'RM'
  | 'CC'
  | 'CW'
  | 'FS'
  | 'QA'
  | 'HR'
  | 'FN'
  | 'TM'
  | 'CO'
  | 'IN';

export interface RoleDefinition {
  code: RoleCode;
  label: string;
  /** Tailwind background utility class, tokens defined in styles.css */
  colorClass: string;
}

export const ROLES: Record<RoleCode, RoleDefinition> = {
  PO: { code: 'PO', label: 'Platform Owner', colorClass: 'bg-role-po' },
  CA: { code: 'CA', label: 'Company Admin', colorClass: 'bg-role-ca' },
  RM: { code: 'RM', label: 'Registered Manager', colorClass: 'bg-role-rm' },
  CC: { code: 'CC', label: 'Care Coordinator', colorClass: 'bg-role-cc' },
  CW: { code: 'CW', label: 'Care Worker', colorClass: 'bg-role-cw' },
  FS: { code: 'FS', label: 'Field Supervisor', colorClass: 'bg-role-fs' },
  QA: { code: 'QA', label: 'Quality Assurance', colorClass: 'bg-role-qa' },
  HR: { code: 'HR', label: 'HR Officer', colorClass: 'bg-role-hr' },
  FN: { code: 'FN', label: 'Finance Officer', colorClass: 'bg-role-fn' },
  TM: { code: 'TM', label: 'Training Manager', colorClass: 'bg-role-tm' },
  CO: { code: 'CO', label: 'Compliance Officer', colorClass: 'bg-role-co' },
  IN: { code: 'IN', label: 'Inspector / Commissioner', colorClass: 'bg-role-in' },
};

export const ADMIN_ROLES: RoleCode[] = ['PO', 'CA', 'RM'];
