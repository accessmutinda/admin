// Generated from backend/docs-api/companies.openapi.json. Regenerate with scripts/generate-company-access-types.py.

export type ModuleConfiguration = {
  company_id: string;
  version: number;
  etag: string;
  core_permissions: {
    code: string;
    label: string;
  }[];
  modules: {
    code: string;
    name: string;
    enabled: boolean;
    submodules: {
      code: string;
      name: string;
      description: string;
      enabled: boolean;
      effective_enabled: boolean;
      permissions: {
        code: string;
        action: string;
      }[];
    }[];
  }[];
};

export type ModuleConfigurationChange = {
  module: string;
  submodule?: string;
  enabled: boolean;
};

export type CompanyAccessContext = {
  company_id: string;
  company_active: boolean;
  platform: boolean;
  revision: number;
  enabled_modules: string[];
  roles: {
    id: string;
    code: string;
    name: string;
  }[];
  permissions: string[];
  core_permissions: string[];
  can_manage_modules: boolean;
  can_manage_roles: boolean;
  can_create_roles: boolean;
};

export type CompanyRoleCreate = {
  code: string;
  name: string;
  description?: string;
};

export type CompanyRolePermissions = {
  permissions: string[];
  core_permissions?: string[];
  mfa_required?: boolean;
};

export type CompanyRole = {
  id: string;
  code: string;
  name: string;
  description: string;
  protected: boolean;
  mfa_required: boolean;
  version: number;
  etag: string;
  core_permissions: string[];
  permissions: {
    code: string;
    scope: 'company';
  }[];
};

export type CompanyRoles = {
  company_id: string;
  results: {
    id: string;
    code: string;
    name: string;
    description: string;
    protected: boolean;
    mfa_required: boolean;
    version: number;
    etag: string;
    core_permissions: string[];
    permissions: {
      code: string;
      scope: 'company';
    }[];
  }[];
};
