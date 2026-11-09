import { signal } from '@angular/core';
import type {
  CompanyRole,
  ModuleConfiguration,
} from '../../../../core/access/company-access.service';
export const testRole: CompanyRole = {
  id: 'role-one',
  code: 'NURSE',
  name: 'Company nurse',
  description: '',
  protected: false,
  mfa_required: true,
  version: 1,
  etag: '"v1"',
  core_permissions: [],
  permissions: [{ code: 'care.records.read', scope: 'company' }],
};
export const testConfiguration: ModuleConfiguration = {
  company_id: 'north',
  version: 0,
  etag: '"v0"',
  core_permissions: [{ code: 'company.profile.read', label: 'Read company profile' }],
  modules: [
    {
      code: 'care',
      name: 'Care delivery',
      enabled: true,
      submodules: [
        {
          code: 'records',
          name: 'Service User Records',
          description: 'Profiles',
          enabled: true,
          effective_enabled: true,
          permissions: [{ code: 'care.records.read', action: 'read' }],
        },
      ],
    },
  ],
};
export function accessFixture() {
  return {
    companyId: signal('north'),
    context: signal({ company_id: 'north', can_manage_roles: true, can_create_roles: true }),
    roles: vi.fn().mockResolvedValue({ results: [structuredClone(testRole)] }),
    configuration: vi.fn().mockResolvedValue(testConfiguration),
    core: () => false,
    refresh: vi.fn().mockResolvedValue(undefined),
    createRole: vi.fn(),
    saveRole: vi.fn(),
  };
}
