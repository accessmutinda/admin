import { addDays } from '../features/management/rota/rota.models';
export const SYSTEM_DEMO_VERSION = 3;
export const DEMO_WORKSPACES = ['lqcs', 'riverside', 'sunrise', 'meadowview', 'oakwood'];
export const demoId = (name: string) => 'system-demo-' + name;
export const appendDemo = <T extends { id: string }>(saved: T[] = [], added: T[]): T[] => [
  ...saved,
  ...added.filter((item) => !saved.some((entry) => entry.id === item.id)),
];
export const demoAt = (today: string, offset = 0, time = '09:00') =>
  addDays(today, offset) + 'T' + time + ':00Z';
export const monthDate = (today: string, offset: number, day = 1): string => {
  const [year, month] = today.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, day)).toISOString().slice(0, 10);
};
