import {
  CompanyAddress,
  addressErrors,
  validContactEmail,
  validContactPhone,
} from '../companies/company-contacts.models';
export const LOCATION_TYPES = [
  'Residential Care Home',
  'Nursing Care Home',
  'Supported Living',
  'Community Service',
  'Outreach Service',
  'Domiciliary Care',
  'Office / Branch',
];
export const LOCATION_STATUSES = ['Active', 'In Progress', 'Pending Review', 'Inactive'];
export interface ServiceLocation {
  id: string;
  name: string;
  code: string;
  type: string;
  region: string;
  address: CompanyAddress;
  registeredPlaces: number | null;
  manager: string;
  managerEmail: string;
  managerPhone: string;
  phone: string;
  email: string;
  hours: string;
  services: string[];
  status: string;
  latitude: number | null;
  longitude: number | null;
  modifiedAt: string;
  modifiedBy: string;
}
export function emptyLocation(): ServiceLocation {
  return {
    id: crypto.randomUUID(),
    name: '',
    code: '',
    type: 'Residential Care Home',
    region: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      county: '',
      postcode: '',
      country: 'United Kingdom',
    },
    registeredPlaces: null,
    manager: '',
    managerEmail: '',
    managerPhone: '',
    phone: '',
    email: '',
    hours: '',
    services: [],
    status: 'In Progress',
    latitude: null,
    longitude: null,
    modifiedAt: '',
    modifiedBy: '',
  };
}
export function locationAddress(location: ServiceLocation): string {
  const address = location.address;
  return [
    address.line1,
    address.line2,
    address.city,
    address.county,
    address.postcode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');
}
export function hasCoordinates(location: ServiceLocation): boolean {
  return (
    location.latitude !== null &&
    location.longitude !== null &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180
  );
}
export function locationErrors(location: ServiceLocation, others: ServiceLocation[]): string[] {
  const errors: string[] = [];
  if (!location.name.trim() || location.name.length > 150)
    errors.push('Enter a location name, up to 150 characters.');
  if (!location.code.trim() || location.code.length > 40)
    errors.push('Enter a location code, up to 40 characters.');
  if (
    others.some(
      (row) =>
        row.id !== location.id &&
        row.code.trim().toLowerCase() === location.code.trim().toLowerCase(),
    )
  )
    errors.push('This location code already exists in this workspace.');
  if (!LOCATION_TYPES.includes(location.type)) errors.push('Choose a supported location type.');
  if (!LOCATION_STATUSES.includes(location.status))
    errors.push('Choose a supported location status.');
  for (const [key, error] of Object.entries(addressErrors(location.address)))
    errors.push(key === 'postcode' ? 'Postcode: ' + error : 'Address ' + key + ': ' + error);
  if (Object.values(location.address).some((value) => value.length > 150))
    errors.push('Keep each address field within 150 characters.');
  if (!Number.isSafeInteger(location.registeredPlaces) || Number(location.registeredPlaces) < 0)
    errors.push(
      'Registered places must be a nonnegative whole number; use zero for services without registered places.',
    );
  for (const [label, value] of [
    ['Email', location.email],
    ['Manager email', location.managerEmail],
  ])
    if (value && (!validContactEmail(value) || value.length > 254))
      errors.push(label + ': enter a valid email address.');
  for (const [label, value] of [
    ['Phone', location.phone],
    ['Manager phone', location.managerPhone],
  ])
    if (value && !validContactPhone(value)) errors.push(label + ': enter a valid phone number.');
  if (location.manager.length > 150 || location.region.length > 100 || location.hours.length > 150)
    errors.push('Keep the manager/hours within 150 characters and region within 100.');
  if (location.services.length > 20 || location.services.some((value) => value.length > 80))
    errors.push('Use up to 20 service names, each within 80 characters.');
  if ((location.latitude !== null || location.longitude !== null) && !hasCoordinates(location))
    errors.push(
      'Enter both valid coordinates: latitude −90 to 90 and longitude −180 to 180, or leave both blank.',
    );
  return errors;
}
export function cleanLocation(location: ServiceLocation): ServiceLocation {
  const next = structuredClone(location);
  for (const key of [
    'name',
    'code',
    'region',
    'manager',
    'managerEmail',
    'managerPhone',
    'phone',
    'email',
    'hours',
  ] as const)
    next[key] = next[key].trim();
  next.address = Object.fromEntries(
    Object.entries(next.address).map(([key, value]) => [key, value.trim()]),
  ) as unknown as CompanyAddress;
  next.services = [...new Set(next.services.map((v) => v.trim()).filter(Boolean))];
  return next;
}
export const LOCATION_CSV_HEADERS = [
  'name',
  'code',
  'type',
  'addressLine1',
  'addressLine2',
  'city',
  'county',
  'postcode',
  'country',
  'region',
  'registeredPlaces',
  'manager',
  'managerEmail',
  'managerPhone',
  'phone',
  'email',
  'hours',
  'services',
  'status',
  'latitude',
  'longitude',
];
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += char;
      continue;
    }
    if (char === '"') {
      if (value || closed) throw new Error('Unexpected quote in CSV.');
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
      closed = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(value);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      value = '';
      closed = false;
    } else {
      if (closed) throw new Error('Unexpected text after a quoted CSV value.');
      value += char;
    }
  }
  if (quoted) throw new Error('A quoted CSV value was not closed.');
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function parseLocations(text: string): ServiceLocation[] {
  const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!headers || !rows.length)
    throw new Error('The CSV must contain a header and at least one location.');
  if (rows.length > 500) throw new Error('Import a maximum of 500 locations at a time.');
  const names = headers.map((h) => h.trim());
  if (new Set(names).size !== names.length) throw new Error('CSV column names must be unique.');
  for (const header of [
    'name',
    'code',
    'type',
    'addressLine1',
    'city',
    'postcode',
    'registeredPlaces',
  ])
    if (!names.includes(header)) throw new Error('Missing required CSV column: ' + header);
  return rows.map((row, index) => {
    if (row.length !== headers.length)
      throw new Error('Row ' + (index + 2) + ' has the wrong number of columns.');
    const data = Object.fromEntries(names.map((name, i) => [name, row[i].trim()]));
    const location = emptyLocation();
    for (const key of [
      'name',
      'code',
      'type',
      'region',
      'manager',
      'managerEmail',
      'managerPhone',
      'phone',
      'email',
      'hours',
    ] as const)
      location[key] = data[key] ?? '';
    location.status = data['status'] || 'In Progress';
    location.address = {
      line1: data['addressLine1'],
      line2: data['addressLine2'] ?? '',
      city: data['city'],
      county: data['county'] ?? '',
      postcode: data['postcode'],
      country: data['country'] || 'United Kingdom',
    };
    location.registeredPlaces = data['registeredPlaces'] ? Number(data['registeredPlaces']) : null;
    location.latitude = data['latitude'] ? Number(data['latitude']) : null;
    location.longitude = data['longitude'] ? Number(data['longitude']) : null;
    location.services = (data['services'] ?? '').split(';').filter(Boolean);
    return cleanLocation(location);
  });
}

export function locationsComplete(locations: ServiceLocation[] | undefined): boolean {
  return (
    !!locations?.length &&
    locations.every((row) => row.status === 'Active' || row.status === 'Inactive')
  );
}
