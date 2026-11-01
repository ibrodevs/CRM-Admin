import test from 'node:test';
import assert from 'node:assert/strict';
import { popoverPosition } from '../src/shared/ui/popover-position.js';

test('a dropdown aligns with its field when space is available', () => {
  assert.deepEqual(popoverPosition({ left: 100, right: 300, top: 80, bottom: 130 }, { width: 200, height: 240 }, { width: 1024, height: 768 }), { left: 100, top: 136, width: 200, maxHeight: 240 });
});
test('a wide passenger panel stays inside the right viewport edge', () => {
  const position = popoverPosition({ left: 900, right: 1100, top: 80, bottom: 130 }, { width: 620, height: 400 }, { width: 1120, height: 800 }, { align: 'end' });
  assert.equal(position.left, 480);
  assert.ok(position.left + position.width <= 1112);
});
test('a dropdown near the bottom opens above the field', () => {
  const position = popoverPosition({ left: 100, right: 300, top: 650, bottom: 700 }, { width: 200, height: 300 }, { width: 1024, height: 768 });
  assert.equal(position.top, 344);
  assert.equal(position.maxHeight, 300);
});
test('oversized lists scroll within the available space on narrow screens', () => {
  const position = popoverPosition({ left: 240, right: 340, top: 230, bottom: 280 }, { width: 620, height: 600 }, { width: 360, height: 500 });
  assert.equal(position.width, 344);
  assert.equal(position.left, 8);
  assert.ok(position.top >= 8);
  assert.ok(position.top + position.maxHeight <= 492);
});
test('a short search result can grow without being locked to its first height', () => {
  const position = popoverPosition({ left: 100, right: 300, top: 650, bottom: 700 }, { width: 200, height: 360, contentHeight: 80 }, { width: 1024, height: 768 });
  assert.equal(position.top, 564);
  assert.equal(position.maxHeight, 360);
});
