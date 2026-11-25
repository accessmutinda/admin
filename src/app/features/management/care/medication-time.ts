export function isMarMonth(value: string): boolean {
  return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

function localDateTime(format: Intl.DateTimeFormat, instant: number): string {
  const parts = format.formatToParts(instant);
  const part = (type: string) => parts.find((field) => field.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
}

export function medicationLocalTime(actualAt: string, timeZone: string): string {
  return localDateTime(formatter(timeZone), Date.parse(actualAt)).slice(0, 16);
}

export function medicationInstant(local: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const wallTime = local + ':00';
  const naive = Date.parse(wallTime + 'Z');
  if (!Number.isFinite(naive)) return null;

  const format = formatter(timeZone);
  const day = 86_400_000;
  // Check offsets on both sides of a clock change, then round-trip the wall time.
  const candidates = new Set(
    [naive - day, naive, naive + day].map(
      (sample) => naive - (Date.parse(localDateTime(format, sample) + 'Z') - sample),
    ),
  );
  const matches = [...candidates].filter((instant) => localDateTime(format, instant) === wallTime);
  return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
}
