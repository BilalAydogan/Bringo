function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function toDatetimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatEventDate(isoDate: string): string {
  if (!isoDate) return '-';

  const locale = document.documentElement.lang || 'tr';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: getBrowserTimeZone(),
  }).format(date);
}

export function formatDateTime(isoDate: string): string {
  return formatEventDate(isoDate);
}

export function datetimeLocalToIso(value: string): string {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);

  return new Date(year, month - 1, day, hours, minutes).toISOString();
}

export function isEventPast(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
