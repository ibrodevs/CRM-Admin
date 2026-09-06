import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workspace = await readFile(new URL('../js/core/workspace-context.jsx', import.meta.url), 'utf8');
const shifts = await readFile(new URL('../js/page_shifts.jsx', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../js/page_dashboard.jsx', import.meta.url), 'utf8');

test('empty current shift response stays null instead of becoming a fake shift', () => {
  assert.match(workspace, /hasOwnProperty\.call\(currentShiftPayload, 'shift'\)/);
  assert.match(workspace, /\? currentShiftPayload\.shift/);
});

test('shift time helpers and dashboard tolerate missing or invalid dates', () => {
  assert.match(shifts, /function shiftDate\(value\)/);
  assert.match(shifts, /if \(!d\) return '—'/);
  assert.match(shifts, /if \(!startedAt\) return '—'/);
  assert.match(dashboard, /const openedAt = shiftDate\(shiftSource\?\.openedAt \|\| shiftSource\?\.started_at\)/);
  assert.match(dashboard, /const shift = shiftSource && openedAt/);
});
