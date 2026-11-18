import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { flightExtrasStatus } from '../src/modules/services/flights/flight-extras.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

test('included baggage never implies purchasable extras and unknown prices never become zero', () => {
  const included = flightExtrasStatus({ backendOffer: { fare: { baggage: '1PC' } }, ancillaries: [{ price: 0 }] });
  assert.equal(included.available, false);
  assert.equal(included.baggageLabel, 'Багаж по тарифу: 1PC');
  assert.equal(included.categories.length, 5);
  assert.ok(included.categories.every((category) => !('price' in category)));
  assert.equal(flightExtrasStatus({ backendOffer: { fare: { baggage: '0PC' } } }).baggageLabel, 'Багаж не включён в тариф');
  assert.equal(flightExtrasStatus({ backendOffer: { fare: { baggage: '' } } }).baggageLabel, 'Норма багажа не указана в предложении');
  assert.match(flightExtrasStatus(null).baggageLabel, /не указана/);
});

test('flight extras disclose availability before opening and offer only real navigation actions', () => {
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? require('react') : name.includes('locations') ? { StackPanel: 'StackPanel' }
    : name.includes('Button.jsx') ? { Button: 'Button' } : name.includes('icons') ? { Icon: 'Icon' }
    : name.includes('flight-extras.js') ? { flightExtrasStatus } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/modules/services/flights/FlightExtrasDrawer.jsx', import.meta.url), 'utf8'), { filename: 'flight-extras.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const offer = { backendOffer: { fare: { name: 'Стандарт', baggage: '1PC', booking_class: 'Y' } }, itinerary: { segments: [{ origin: 'DME', destination: 'IST', airline: 'HZ', flight_number: '123', departure: '2026-11-25T10:00:00Z' }, { origin: 'IST', destination: 'VKO', airline: 'DP', flight_number: '456' }] } };
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  const text = (node) => Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  let opened = 0, rules = 0, back = 0;
  const preview = mod.exports.FlightExtrasPreview({ offer, onOpen: () => opened++ });
  assert.match(text(preview), /Выбор допуслуг сейчас недоступен/);
  nodes(preview).find((node) => node.type === 'Button').props.onClick();
  assert.equal(opened, 1);
  const content = mod.exports.FlightExtrasContent({ offer, passengerCount: 3, onRules: () => rules++ });
  assert.match(text(content), /DME → IST · IST → VKO/);
  assert.match(text(content), /Пассажиров: 3/);
  assert.match(text(content), /Багаж по тарифу: 1PC/);
  assert.doesNotMatch(text(content), /0 ₽|бесплатно|Применить|Сохранённые черновики/);
  assert.equal(nodes(content).filter((node) => node.props.className === 'flight-extras-category').length, 5);
  nodes(content).find((node) => node.type === 'button').props.onClick();
  assert.equal(rules, 1);
  const drawer = mod.exports.FlightExtrasDrawer({ offer, passengerCount: 3, onBackToFares: () => back++ });
  nodes(drawer.props.footer).find((node) => node.type === 'Button').props.onClick();
  assert.equal(back, 1);
  assert.match(text(drawer.props.footer), /Стоимость допуслуг не рассчитана/);
  assert.equal(drawer.props.closeOnBackdrop, true);
});
