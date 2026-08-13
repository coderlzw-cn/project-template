import { describe, expect, it } from '@jest/globals';
import {
  addDate,
  compareDate,
  differenceInCalendarDays,
  differenceInDays,
  differenceInMilliseconds,
  differenceInSeconds,
  endOfDay,
  formatDate,
  formatDateIntl,
  formatDateMinute,
  formatDateRange,
  formatDateSecond,
  formatDateTime,
  formatDuration,
  formatRelativeTime,
  formatTime,
  formatTimeSecond,
  getDaysInMonth,
  getTimestamp,
  getUnixTime,
  isAfter,
  isBefore,
  isBetween,
  isLeapYear,
  isSameDate,
  isToday,
  isValidDate,
  startOfDay,
  toDate,
} from './date';

describe('date utils', () => {
  describe('formatDateTime', () => {
    const input = new Date('2026-07-05T09:03:02.007Z');

    it.each([
      ['date', '2026-07-05'],
      ['time', '09:03'],
      ['timeSecond', '09:03:02'],
      ['datetime', '2026-07-05 09:03'],
      ['datetimeSecond', '2026-07-05 09:03:02'],
      ['compactDate', '20260705'],
      ['compactDatetime', '20260705090302'],
      ['isoDate', '2026-07-05'],
      ['isoDatetime', '2026-07-05T09:03:02'],
    ] as const)('formats the %s preset with zero-padded parts', (preset, expected) => {
      expect(formatDateTime(input, { preset, timeZone: 'UTC' })).toBe(expected);
    });

    it('supports custom patterns, milliseconds and IANA time zones', () => {
      expect(formatDateTime(input, { pattern: 'YYYY年MM月DD日 HH:mm:ss.SSS', timeZone: 'Asia/Shanghai' })).toBe('2026年07月05日 17:03:02.007');
    });

    it('normalizes single-digit date and time input with leading zeroes', () => {
      expect(formatDateTime('2026-7-5 9:3:2')).toBe('2026-07-05 09:03:02');
      expect(formatDateTime('2026-7-5 9:3')).toBe('2026-07-05 09:03:00');
    });

    it('supports second and millisecond timestamps', () => {
      expect(formatDateTime(1, { timestampUnit: 'second', pattern: 'ss.SSS', timeZone: 'UTC' })).toBe('01.000');
      expect(formatDateTime(1, { timestampUnit: 'millisecond', pattern: 'ss.SSS', timeZone: 'UTC' })).toBe('00.001');
    });

    it('returns the configured fallback for invalid input, locale or time zone', () => {
      expect(formatDateTime('invalid', { fallback: 'N/A' })).toBe('N/A');
      expect(formatDateTime(input, { timeZone: 'Invalid/Zone', fallback: 'N/A' })).toBe('N/A');
      expect(formatDateTime(input, { locale: 'invalid_locale', fallback: 'N/A' })).toBe('N/A');
    });
  });

  describe('international, relative and range formatting', () => {
    it('formats localized date content with Intl.DateTimeFormat', () => {
      expect(
        formatDateIntl('2026-07-15T00:00:00Z', {
          locale: 'en-US',
          timeZone: 'UTC',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        }),
      ).toBe('Wednesday, July 15, 2026');
      expect(formatDateIntl('invalid', { fallback: 'N/A' })).toBe('N/A');
    });

    it('selects natural and numeric relative-time units', () => {
      expect(formatRelativeTime('2026-07-16T00:00:00Z', { base: '2026-07-15T00:00:00Z', locale: 'zh-CN' })).toBe('明天');
      expect(formatRelativeTime('2026-07-15T01:00:00Z', { base: '2026-07-15T00:00:00Z', locale: 'en-US', numeric: 'always' })).toBe('in 1 hour');
      expect(formatRelativeTime('invalid', { fallback: 'N/A' })).toBe('N/A');
    });

    it('formats ranges and collapses the repeated date on the same day', () => {
      expect(formatDateRange('2026-07-15T09:00:00Z', '2026-07-15T12:30:00Z', { timeZone: 'UTC' })).toBe('2026-07-15 09:00:00 ~ 12:30:00');
      expect(formatDateRange('2026-07-15T09:00:00Z', '2026-07-15T12:30:00Z', { timeZone: 'UTC', collapseSameDate: false })).toBe('2026-07-15 09:00:00 ~ 2026-07-15 12:30:00');
      expect(formatDateRange('2026-07-15T09:00:00Z', '2026-07-15T12:30:00Z', { preset: 'date', timeZone: 'UTC' })).toBe('2026-07-15');
      expect(formatDateRange('invalid', '2026-07-15', { fallback: 'N/A' })).toBe('N/A');
      expect(formatDateRange('2026-07-15', '2026-07-16', { timeZone: 'Invalid/Zone', fallback: 'N/A' })).toBe('N/A');
    });
  });

  describe('formatDuration', () => {
    it.each([
      [65_000, {}, '1分钟5秒'],
      [3_723_000, { compact: true, maxUnits: 3 }, '1h 2m 3s'],
      [1.999, { inputUnit: 'second', showMilliseconds: true, maxUnits: 2 }, '1秒999毫秒'],
      [0, {}, '0秒'],
      [0, { compact: true, showMilliseconds: true }, '0ms'],
    ] as const)('formats %s with options', (duration, options, expected) => {
      expect(formatDuration(duration, options)).toBe(expected);
    });

    it('handles invalid duration and option bounds', () => {
      expect(formatDuration(-1, { fallback: 'N/A' })).toBe('N/A');
      expect(formatDuration(Infinity, { fallback: 'N/A' })).toBe('N/A');
      expect(() => formatDuration(1, { maxUnits: 0 })).toThrow(RangeError);
      expect(() => formatDuration(1, { maxUnits: 6 })).toThrow(RangeError);
    });
  });

  describe('toDate and validation', () => {
    it('clones Date input and rejects invalid dates', () => {
      const source = new Date('2026-07-15T00:00:00Z');
      const result = toDate(source);

      expect(result).toEqual(source);
      expect(result).not.toBe(source);
      expect(toDate(new Date('invalid'))).toBeNull();
      expect(isValidDate(source)).toBe(true);
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('2026-07-15')).toBe(false);
    });

    it('parses auto-detected timestamps, numeric strings and offsets', () => {
      expect(toDate(1)?.getTime()).toBe(1000);
      expect(toDate('1000', 'millisecond')?.getTime()).toBe(1000);
      expect(toDate('2026-7-5 9:3:2+08:00')?.toISOString()).toBe('2026-07-05T01:03:02.000Z');
    });

    it.each(['', '   ', 'not-a-date', '2026-13-01'])('returns null for invalid string %j', (input) => {
      expect(toDate(input)).toBeNull();
    });

    it.each([NaN, Infinity, -Infinity])('returns null for non-finite timestamp %s', (input) => {
      expect(toDate(input)).toBeNull();
    });
  });

  describe('comparison and ranges', () => {
    it('compares dates and handles invalid values', () => {
      expect(compareDate('2026-07-14', '2026-07-15')).toBe(-1);
      expect(compareDate('2026-07-15', '2026-07-15')).toBe(0);
      expect(compareDate('2026-07-16', '2026-07-15')).toBe(1);
      expect(compareDate('invalid', '2026-07-15')).toBeNull();
      expect(isBefore('2026-07-14', '2026-07-15')).toBe(true);
      expect(isAfter('2026-07-16', '2026-07-15')).toBe(true);
    });

    it('compares calendar dates in a selected time zone', () => {
      expect(isSameDate('2026-07-15T00:30:00Z', '2026-07-14T23:30:00Z', 'Asia/Shanghai')).toBe(true);
      expect(isSameDate('2026-07-15', 'invalid')).toBe(false);
      expect(isSameDate('2026-07-15', '2026-07-15', 'Invalid/Zone')).toBe(false);
    });

    it('checks inclusive and exclusive ranges and rejects reversed ranges', () => {
      expect(isBetween('2026-07-15', '2026-07-15', '2026-07-16')).toBe(true);
      expect(isBetween('2026-07-15', '2026-07-15', '2026-07-16', false)).toBe(false);
      expect(isBetween('2026-07-15', '2026-07-16', '2026-07-14')).toBe(false);
      expect(isBetween('invalid', '2026-07-14', '2026-07-16')).toBe(false);
    });
  });

  describe('date differences', () => {
    it('calculates elapsed milliseconds, seconds and 24-hour days', () => {
      const start = '2026-07-15T00:00:00Z';
      expect(differenceInMilliseconds(start, '2026-07-15T00:00:01.900Z')).toBe(1900);
      expect(differenceInSeconds(start, '2026-07-15T00:00:01.900Z')).toBe(1);
      expect(differenceInSeconds('2026-07-15T00:00:01.900Z', start)).toBe(-1);
      expect(differenceInDays(start, '2026-07-17T12:00:00Z')).toBe(2);
    });

    it('calculates local calendar-day differences', () => {
      expect(differenceInCalendarDays('2026-07-15 23:59:59', '2026-07-16 00:00:01')).toBe(1);
      expect(differenceInCalendarDays('2026-07-16', '2026-07-15')).toBe(-1);
    });

    it.each([differenceInMilliseconds, differenceInSeconds, differenceInDays, differenceInCalendarDays])('returns null for invalid inputs', (difference) => {
      expect(difference('invalid', '2026-07-15')).toBeNull();
    });
  });

  describe('calendar operations', () => {
    it('adds calendar units without overflowing month ends', () => {
      expect(formatDateSecond(addDate('2024-01-31 09:03:02', { months: 1 }) ?? 'invalid')).toBe('2024-02-29 09:03:02');
      expect(formatDateSecond(addDate('2024-02-29 09:03:02', { years: 1 }) ?? 'invalid')).toBe('2025-02-28 09:03:02');
      expect(formatDateSecond(addDate('2026-07-15 09:03:02', { days: -1, hours: 2, minutes: 3, seconds: 4 }) ?? 'invalid')).toBe('2026-07-14 11:06:06');
      expect(addDate('invalid', { days: 1 })).toBeNull();
      expect(addDate('2026-07-15', { days: 1.5 })).toBeNull();
    });

    it('returns local start and end of day without mutating the input', () => {
      const source = new Date(2026, 6, 15, 12, 30, 45, 123);
      const start = startOfDay(source);
      const end = endOfDay(source);

      expect([start?.getHours(), start?.getMinutes(), start?.getSeconds(), start?.getMilliseconds()]).toEqual([0, 0, 0, 0]);
      expect([end?.getHours(), end?.getMinutes(), end?.getSeconds(), end?.getMilliseconds()]).toEqual([23, 59, 59, 999]);
      expect(source.getHours()).toBe(12);
      expect(startOfDay('invalid')).toBeNull();
      expect(endOfDay('invalid')).toBeNull();
    });

    it('recognizes today, leap years and month lengths', () => {
      expect(isToday(new Date())).toBe(true);
      expect(isToday('invalid')).toBe(false);
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2100)).toBe(false);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2024.5)).toBe(false);
      expect(getDaysInMonth('2024-02-01')).toBe(29);
      expect(getDaysInMonth('2025-02-01')).toBe(28);
      expect(getDaysInMonth('invalid')).toBeNull();
    });
  });

  describe('timestamps and convenience formatters', () => {
    it('returns Unix and millisecond timestamps', () => {
      expect(getUnixTime('1970-01-01T00:00:01.999Z')).toBe(1);
      expect(getTimestamp('1970-01-01T00:00:01Z')).toBe(1000);
      expect(() => getUnixTime('invalid')).toThrow(TypeError);
      expect(() => getTimestamp('invalid')).toThrow(TypeError);
    });

    it('formats all convenience presets with zero-padded parts', () => {
      const input = new Date(2026, 6, 5, 9, 3, 2);
      expect(formatDate(input)).toBe('2026-07-05');
      expect(formatTime(input)).toBe('09:03');
      expect(formatTimeSecond(input)).toBe('09:03:02');
      expect(formatDateMinute(input)).toBe('2026-07-05 09:03');
      expect(formatDateSecond(input)).toBe('2026-07-05 09:03:02');
    });
  });
});
