import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { hotelActionAvailability, HOTEL_ACTION_LABELS } from '../src/modules/services/hotels/actions/hotelCapabilities.js';

// Render the real JSX components with the same Babel preset shipped by Next.
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const modules = new Map();
function load(relative) {
  const filename = fileURLToPath(new URL(relative, import.meta.url));
  return compile(filename);
}
function compile(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const mod = new Module(filename);
  modules.set(filename, mod);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(dirname(filename));
  const localRequire = createRequire(filename);
  mod.require = (id) => id.startsWith('.') ? compile(localRequire.resolve(id)) : localRequire(id);
  const source = babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code;
  mod._compile(source, filename);
  return mod.exports;
}
const originalWindow = globalThis.window;
globalThis.window = {};
const { HotelBookingSummary, HotelPolicy } = load('../src/modules/services/hotels/actions/HotelBookingSummary.jsx');
const { HotelActionMenu } = load('../src/modules/services/hotels/actions/HotelActionMenu.jsx');
const { HotelCancellationPanel } = load('../src/modules/services/hotels/actions/HotelCancellationPanel.jsx');
if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const summary = {
  provider_adapter: 'hotelbook', hotel: 'Hotel', financial: { penalty: null, refund: null, warning: 'Точный штраф неизвестен' },
  service_id: 'crm-service-id', supplier_booking_reference: 'hb-order-id', confirmation_references: ['provider-ref-id'],
  client_order_id: 'workflow-id:item-id', supplier_item_ids: ['hb-item-id'], unassigned_guests: [],
  cancellation_policy: { cancellation_rules: 'Актуальные условия details', cancel: [{ from: '2027-03-09', price: { amount: '150', currency: 'EUR' } }] },
  rooms: [{ ref: 'room:0' }],
};

test('operator summary renders distinct CRM, supplier, item and clientOrderId identifiers', () => {
  const html = render(HotelBookingSummary, { summary });
  for (const value of ['CRM service ID', 'crm-service-id', 'Номер бронирования поставщика', 'hb-order-id', 'provider-ref-id', 'clientOrderId Hotelbook', 'workflow-id:item-id', 'Hotelbook itemId', 'hb-item-id']) assert.ok(html.includes(value), value);
});

test('normal cancellation and a manual free-cancellation request are separate visible actions', () => {
  const data = { summary, permissions: { cancel: true, modify: true, financial_confirmation: true }, operations: [], capabilities: { cancel_booking: { mode: 'api' }, request_free_cancel: { mode: 'manual' } } };
  assert.equal(HOTEL_ACTION_LABELS.cancel_booking, 'Отменить бронирование');
  assert.equal(hotelActionAvailability('cancel_booking', data, ['room:0']).mode, 'api');
  assert.equal(hotelActionAvailability('request_free_cancel', data, ['room:0']).mode, 'manual');
  const html = render(HotelActionMenu, { data, selected: ['room:0'] });
  assert.ok(html.includes('Отменить бронирование'));
  assert.ok(html.includes('Запросить отмену без штрафа'));
  assert.ok(!html.includes('Нет зафиксированного расчёта нулевого штрафа'));
  assert.ok(!html.includes('>Отменить без штрафа<'));
});

test('cancellation shows current policy, unknown penalty warning and requires a checkbox', () => {
  const html = render(HotelCancellationPanel, { operation: { original_snapshot: summary, financial_snapshot: summary.financial, room_refs: ['room:0'], supplier_reference: 'hb-order-id' } });
  assert.ok(html.includes('Актуальные условия details'));
  assert.ok(html.includes('150 EUR'));
  assert.ok(html.includes('Точный штраф неизвестен'));
  assert.ok(html.includes('возможный неизвестный штраф'));
  assert.ok(html.includes('type="checkbox"'));
  assert.match(html, /<button[^>]*disabled=""[^>]*>Подтвердить отмену бронирования/);
});

test('missing policy renders an explicit unknown-policy notice instead of zero penalty', () => {
  const html = render(HotelPolicy, { value: null });
  assert.ok(html.includes('Поставщик не передал условия отмены. Это не означает отсутствие штрафа.'));
  assert.ok(!html.includes('0 EUR'));
});

test('operator booking summary shows the selected check-in and check-out times', () => {
  const html = render(HotelBookingSummary, { summary: { ...summary, check_in_time: '09:00', check_out_time: '18:00' } });
  for (const text of ['Время заезда', '09:00', 'Время выезда', '18:00']) assert.ok(html.includes(text), text);
});
