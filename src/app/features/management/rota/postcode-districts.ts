const defaultDistricts = ['UB3', 'UB4', 'UB7', 'UB8', 'UB10'];

export function postcodeDistrict(value: string | null | undefined): string {
  const compact = (value ?? '').toUpperCase().replace(/\s+/g, '');
  return /^([A-Z]{1,2}[0-9][0-9A-Z]?|GIR)(?:[0-9][A-Z]{2})?$/.exec(compact)?.[1] ?? '';
}

export function postcodeDistrictOptions(postcodes: string[]): string[] {
  return [
    ...new Set([...defaultDistricts, ...postcodes.map(postcodeDistrict).filter(Boolean)]),
  ].sort((a, b) => a.localeCompare(b, 'en-GB', { numeric: true }));
}
