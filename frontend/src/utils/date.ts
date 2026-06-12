export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function normalizeTimeZone(timeZone?: string | null): string {
  if (!timeZone) {
    return getBrowserTimeZone();
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

function getDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = getDateParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - date.getTime()) / 60000;
}

export function toDatetimeLocalValue(isoDate: string, timeZone?: string | null): string {
  if (!isoDate) return '';

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const zone = normalizeTimeZone(timeZone);
  const parts = getDateParts(date, zone);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatEventDate(isoDate: string, timeZone?: string | null): string {
  if (!isoDate) return '-';

  const locale = document.documentElement.lang || 'tr';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  const zone = normalizeTimeZone(timeZone);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: zone,
  }).format(date);
}

export function formatDateTime(isoDate: string, timeZone?: string | null): string {
  return formatEventDate(isoDate, timeZone);
}

export function datetimeLocalToIso(value: string, timeZone?: string | null): string {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  const zone = normalizeTimeZone(timeZone);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0);
  const firstOffsetMinutes = getTimeZoneOffsetMinutes(zone, new Date(utcGuess));
  const firstPass = utcGuess - firstOffsetMinutes * 60_000;
  const correctedOffsetMinutes = getTimeZoneOffsetMinutes(zone, new Date(firstPass));

  return new Date(utcGuess - correctedOffsetMinutes * 60_000).toISOString();
}

export function isEventPast(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}

export function getSupportedTimeZones(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };

  if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
    return intlWithSupportedValues.supportedValuesOf('timeZone');
  }

  return ['UTC', 'Europe/Istanbul', 'Europe/Berlin', 'America/New_York', 'Asia/Dubai'];
}
