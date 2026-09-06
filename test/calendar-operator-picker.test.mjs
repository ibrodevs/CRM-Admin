import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/modules/calendar/ui/CalendarEvents.jsx', import.meta.url), 'utf8');
const calendarSource = await readFile(new URL('../src/modules/calendar/ui/TripCalendarPage.jsx', import.meta.url), 'utf8');

test('назначение другому оператору открывает боковой выбор сотрудников', () => {
  assert.match(source, /function CalOperatorPickerDrawer/);
  assert.match(source, /title="Выбор оператора"/);
  assert.match(source, /f\.scope === 'Другому оператору'/);
  assert.match(source, /<CalOperatorPicker value=\{f\.resp\} users=\{users\}/);
});

test('задание нельзя создать до выбора другого оператора', () => {
  assert.match(source, /const assigneeReady = f\.scope !== 'Другому оператору' \|\| Boolean\(f\.resp\)/);
  assert.match(source, /scope === 'Другому оператору' \? ''/);
});

test('свой интервал сразу открывает боковую настройку и остаётся доступен для изменения', () => {
  assert.match(source, /if \(repeat === 'Свой интервал'\) setRepeatDrawerOpen\(true\)/);
  assert.match(source, /title="Свой интервал повторения"/);
  assert.match(source, /Ближайшие повторения/);
  assert.match(source, /className="cal-repeat-summary"/);
  assert.match(source, /function calRecurrenceRule/);
  assert.match(calendarSource, /recurrence_rule: event\.recurrenceRule \|\| ''/);
});
