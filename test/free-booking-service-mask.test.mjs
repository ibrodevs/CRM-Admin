import assert from 'node:assert/strict';
import { readFile } from './helpers/source.mjs';
import test from 'node:test';

const wrapper = await readFile(new URL('../src/modules/orders/ui/FreeBookingAddServicePanel.jsx', import.meta.url), 'utf8');
const index = await readFile(new URL('../src/modules/orders/index.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/components/location-autocomplete.css', import.meta.url), 'utf8');

test('free booking always supplies a real currency to quick service forms', () => {
  assert.match(wrapper, /currency:\s*resolveCurrency\(props\.aviaParams\?\.currency\)/);
  assert.match(index, /FreeBookingAddServicePanel\.jsx/);
});

test('free booking service masks use one surface without split gradient', () => {
  assert.match(css, /free-booking-service-mask/);
  assert.match(css, /background:\s*var\(--surface\)/);
  assert.doesNotMatch(css, /linear-gradient\(90deg,\s*var\(--surface-2\)/);
});

test('avia find button and quick-add fields have explicit compact layout rules', () => {
  assert.match(css, /data-kind="Авиа"[\s\S]*form-grid \+ \.btn[\s\S]*margin:\s*12px 0 0 auto/);
  assert.match(css, /data-kind="Страховка"[\s\S]*grid-template-columns:\s*minmax\(260px, 1\.35fr\) 180px minmax\(220px, 1fr\) 180px/);
  assert.match(css, /data-kind="Доп\. услуга"/);
});
