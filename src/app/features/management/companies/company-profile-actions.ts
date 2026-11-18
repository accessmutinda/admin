import { LOCATION_SETUP_REQUIREMENT } from '../locations/locations.models';
import type { Company } from '../shared/management.store';
import type { SetupAreaKey } from './companies-api.models';

interface ProfileDestination {
  link: string[];
  queryParams?: Record<string, boolean | string>;
  fragment?: string;
}

interface ProfileStep extends ProfileDestination {
  key: SetupAreaKey;
  title: string;
  nextAction: string;
  complete: boolean | null;
}

export function companyProfileSteps(company: Company): ProfileStep[] {
  const profile = ['/manage/companies', company.id];
  const steps: Omit<ProfileStep, 'complete'>[] = [
    {
      key: 'general',
      title: 'General Information',
      link: profile,
      queryParams: { edit: true },
      fragment: 'general-information',
      nextAction: 'Fill in the required company details and save your changes.',
    },
    {
      key: 'registration',
      title: 'Registration & Compliance',
      link: [...profile, 'compliance'],
      fragment: 'rc-registration',
      nextAction: 'Save the required registration details, responsible leads and insurance expiry.',
    },
    {
      key: 'contacts',
      title: 'Contact Information',
      link: [...profile, 'contacts'],
      nextAction: 'Save the company email, phone number and required addresses.',
    },
    {
      key: 'locations',
      title: 'Branches & Locations',
      link: [...profile, 'locations'],
      nextAction: LOCATION_SETUP_REQUIREMENT,
    },
    {
      key: 'modules',
      title: 'Services & Care Types',
      link: [...profile, 'modules', 'overview'],
      nextAction: 'Enable at least one applicable module and save the configuration.',
    },
    {
      key: 'documents',
      title: 'Documents & Policies',
      link: [...profile, 'compliance'],
      fragment: 'rc-mapping',
      nextAction: 'Upload the four required documents and replace any expired copies.',
    },
    {
      key: 'access',
      title: 'Roles & Permissions',
      link: [...profile, 'access'],
      fragment: 'ua-users-title',
      nextAction:
        company.primaryAdministratorState === 'invited'
          ? 'The invited Company Admin must accept the invitation and become active.'
          : 'Invite a Company Admin and have them accept the invitation to become active.',
    },
  ];
  return steps.map((step) => ({
    ...step,
    complete: company.setupProgress?.[step.key]?.complete ?? null,
  }));
}

export function completeCompanyProfileAction(company: Company) {
  const pending = companyProfileSteps(company).filter((step) => step.complete === false);
  if (pending.length === 0) return null;
  const destination: ProfileDestination =
    pending.length === 1
      ? pending[0]
      : { link: ['/manage/companies', company.id], fragment: 'required-sections' };
  return {
    ...destination,
    guidance:
      pending.length === 1
        ? pending[0].nextAction
        : 'Review the Required Sections checklist for the next action in each pending section.',
  };
}
