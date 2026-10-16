export type BrandingTab = 'theme' | 'emails' | 'documents' | 'portal';
export type BrandingPreview = 'login' | 'header' | 'email' | 'document';
export type EmailTemplateKey = 'welcome' | 'invitation' | 'notification';
export interface CompanyBranding {
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  subdomain: string;
  showPlatformBranding: boolean;
  customWelcome: boolean;
  welcomeMessage: string;
  useCustomSender: boolean;
  senderName: string;
  senderEmail: string;
  emailTemplates: Record<EmailTemplateKey, { subject: string; body: string }>;
  emailFooter: string;
  document: {
    headerStyle: 'standard' | 'compact';
    showLogo: boolean;
    showAddress: boolean;
    showTagline: boolean;
    footer: string;
  };
  portal: {
    language: string;
    timezone: string;
    supportEmail: string;
    privacyUrl: string;
    termsUrl: string;
    microsoftSignIn: boolean;
  };
}
export interface PublishedCompanyBranding {
  theme: CompanyBranding;
  publishedAt: string;
  publishedBy: string;
}
export const BRANDING_FONTS = ['Lato', 'Inter', 'Arial', 'Roboto', 'Georgia'];
export function defaultCompanyBranding(name: string, code: string): CompanyBranding {
  return {
    logo: '',
    favicon: '',
    primaryColor: '#008afa',
    secondaryColor: '#10b981',
    accentColor: '#f59e0b',
    fontFamily: 'Lato',
    subdomain: code
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 63),
    showPlatformBranding: true,
    customWelcome: false,
    welcomeMessage: `Welcome to ${name}. Together we make a brighter, safer future for our communities.`,
    useCustomSender: false,
    senderName: name,
    senderEmail: '',
    emailTemplates: {
      welcome: {
        subject: 'Welcome to {{companyName}}',
        body: 'Hello {{recipientName}},\n\nWelcome to {{companyName}}. Your team will help you get started and find the information you need.',
      },
      invitation: {
        subject: 'Your invitation to {{companyName}}',
        body: 'Hello {{recipientName}},\n\nYou have been invited to join {{companyName}}. Please follow the invitation instructions provided by your administrator.',
      },
      notification: {
        subject: 'An update from {{companyName}}',
        body: 'Hello {{recipientName}},\n\nThere is an update for you from {{companyName}}. Please sign in to review the details.',
      },
    },
    emailFooter: 'Please contact your company administrator if you need support.',
    document: {
      headerStyle: 'standard',
      showLogo: true,
      showAddress: true,
      showTagline: true,
      footer: name + ' · Confidential',
    },
    portal: {
      language: 'English',
      timezone: 'Europe/London',
      supportEmail: '',
      privacyUrl: '',
      termsUrl: '',
      microsoftSignIn: true,
    },
  };
}
export function initialCompanyBranding(company: {
  name: string;
  code: string;
  logo: string;
  color: string;
  accent: string;
  branding?: CompanyBranding;
}): CompanyBranding {
  return company.branding
    ? structuredClone(company.branding)
    : {
        ...defaultCompanyBranding(company.name, company.code),
        logo: company.logo,
        primaryColor: company.color,
        accentColor: company.accent,
      };
}
export function validBrandColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}
export function validBrandUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}
