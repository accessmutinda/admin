export interface LoginEvent {
  id: string;
  dateTime: string;
  location: string;
  device: string;
  method: 'Password' | 'Password + MFA' | 'SSO (Authenticator)' | 'SSO';
  status: 'Success' | 'Blocked';
}

export interface TrustedDevice {
  id: string;
  name: string;
  detail: string;
  addedOn: string;
}
