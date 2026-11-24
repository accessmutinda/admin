export interface CallIcon {
  file: string;
  label: string;
}

export const CALL_ICONS: CallIcon[] = [
  { file: 'bed.jpeg', label: 'Bed Call' },
  { file: 'cleaning.jpeg', label: 'Cleaning Call' },
  { file: 'community.jpeg', label: 'Community Access' },
  { file: 'companionship.jpeg', label: 'Companionship Call' },
  { file: 'double-up.jpeg', label: 'Double-Up Call' },
  { file: 'emergency.jpeg', label: 'Emergency Call' },
  { file: 'exercise.jpeg', label: 'Exercise Call' },
  { file: 'hospital.jpeg', label: 'Hospital Appointment' },
  { file: 'laundry.jpeg', label: 'Laundry Support' },
  { file: 'leaving.jpeg', label: 'Leaving Call' },
  { file: 'live-in.jpeg', label: 'Live-In Care' },
  { file: 'lunch.jpeg', label: 'Lunch Call' },
  { file: 'meal.jpeg', label: 'Meal Preparation' },
  { file: 'medication-collection.jpeg', label: 'Medication Collection Call' },
  { file: 'medication.jpeg', label: 'Medication Support' },
  { file: 'morning.jpeg', label: 'Morning Call' },
  { file: 'outreach.jpeg', label: 'Outreach Call' },
  { file: 'palliative.jpeg', label: 'Palliative Care' },
  { file: 'personal-care.jpeg', label: 'Personal Care' },
  { file: 'respite.jpeg', label: 'Respite Care' },
  { file: 'school.jpeg', label: 'School Escort' },
  { file: 'shopping.jpeg', label: 'Shopping Call' },
  { file: 'sitting.jpeg', label: 'Sitting Call' },
  { file: 'sleeping.jpeg', label: 'Sleeping Night' },
  { file: 'social.jpeg', label: 'Social Visit' },
  { file: 'supported-living.jpeg', label: 'Supported Living' },
  { file: 'tea.jpeg', label: 'Tea Call' },
  { file: 'transport.jpeg', label: 'Transport Call' },
  { file: 'waking.jpeg', label: 'Waking Night' },
  { file: 'welfare.jpeg', label: 'Welfare Check' },
];

const TALL_ICON_FILES = new Set([
  'community.jpeg',
  'laundry.jpeg',
  'meal.jpeg',
  'medication.jpeg',
  'palliative.jpeg',
  'personal-care.jpeg',
  'respite.jpeg',
  'school.jpeg',
  'social.jpeg',
  'supported-living.jpeg',
]);

export const CALL_ICONS_WIDE = CALL_ICONS.filter((icon) => !TALL_ICON_FILES.has(icon.file));
export const CALL_ICONS_TALL = CALL_ICONS.filter((icon) => TALL_ICON_FILES.has(icon.file));

const FILES = new Set(CALL_ICONS.map((icon) => icon.file));

export function callIconFile(icon?: string, name = ''): string {
  if (icon && FILES.has(icon)) return icon;
  const label = name.trim().toLowerCase();
  return CALL_ICONS.find((item) => item.label.toLowerCase() === label)?.file ?? '';
}

export function callIconSrc(icon?: string, name = ''): string {
  const file = callIconFile(icon, name);
  return file ? `/icons/${file}` : '';
}
