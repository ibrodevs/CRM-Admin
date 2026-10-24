import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarMonthCells, calendarMonths } from '../src/shared/ui/calendar-months.js';

test('October grid has Monday-first alignment and no September/November dates', () => {
  const cells = calendarMonthCells(2026, 9);
  assert.equal(cells.length, 42);
  assert.deepEqual(cells.slice(0, 3), [null, null, null]);
  assert.equal(cells[3].getDate(), 1);
  assert.equal(cells[3].getDay(), 4);
  const days = cells.filter(Boolean);
  assert.equal(days.length, 31);
  assert.ok(days.every((d) => d.getMonth() === 9 && d.getFullYear() === 2026));
  assert.equal(days.at(-1).getDate(), 31);
  assert.ok(cells.slice(34).every((d) => d === null));
});

test('scrollable months keep October and November separate and cover a cross-month stay', () => {
  const months = calendarMonths(2026, 9);
  assert.deepEqual(months.map((m) => [m.year, m.month]), [[2026, 9], [2026, 10]]);
  assert.ok(months[0].cells.some((d) => d?.getDate() === 23));
  assert.ok(months[1].cells.some((d) => d?.getDate() === 4));
  assert.ok(months[1].cells.filter(Boolean).every((d) => d.getMonth() === 10));
});

test('next-month scrolling crosses December into January without repeating dates', () => {
  const months = calendarMonths(2026, 11, 4);
  assert.deepEqual(months.map((m) => [m.year, m.month]), [[2026, 11], [2027, 0], [2027, 1], [2027, 2]]);
  const days = months.flatMap((m) => m.cells.filter(Boolean));
  assert.equal(new Set(days.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)).size, days.length);
});

test('February includes the leap day only in leap years', () => {
  assert.equal(calendarMonthCells(2028, 1).filter(Boolean).length, 29);
  assert.equal(calendarMonthCells(2027, 1).filter(Boolean).length, 28);
});
