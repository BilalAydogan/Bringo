import { afterEach, describe, expect, it, vi } from 'vitest';
import { datetimeLocalToIso, formatEventDate, isEventPast, toDatetimeLocalValue } from './date';

describe('date utils', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.lang = 'tr';
  });

  it('returns fallback text for invalid date values', () => {
    expect(formatEventDate('')).toBe('-');
    expect(formatEventDate('invalid-date')).toBe('-');
  });

  it('converts datetime-local values to ISO strings', () => {
    const iso = datetimeLocalToIso('2026-06-11T10:30');

    expect(iso).toMatch(/^2026-06-11T/);
    expect(toDatetimeLocalValue(iso)).toBe('2026-06-11T10:30');
  });

  it('marks past events relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00Z'));

    expect(isEventPast('2026-06-11T11:59:00Z')).toBe(true);
    expect(isEventPast('2026-06-11T12:01:00Z')).toBe(false);
  });
});
