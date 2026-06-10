export function toDatetimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatEventDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

export function isEventPast(isoDate: string): boolean {
  return new Date(isoDate).getTime() < Date.now();
}
