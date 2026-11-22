import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');

test('fare comparison pages real offers, shows full totals and selects the exact offer', () => {
  const states = [], effects = [], selected = [], inspected = [];
  let hook = 0;
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? { ...require('react'), useState: (initial) => { const i = hook++; if (!(i in states)) states[i] = initial; return [states[i], (next) => { states[i] = next; }]; }, useEffect: (effect) => effects.push(effect) }
    : name.includes('Button.jsx') ? { Button: 'Button' } : name.includes('icons') ? { Icon: 'Icon' }
    : name.includes('money.js') ? { currencySymbol: () => '₽' } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/modules/services/flights/FlightFareSelector.jsx', import.meta.url), 'utf8'), { filename: 'flight-fare-selector.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  const tiers = Array.from({ length: 14 }, (_, i) => ({ id: `offer-${i}`, name: 'Класс Y', delta: i * 100, rules: i === 0 ? [{ k: 'Багаж', v: '1PC' }] : [], offer: { fare: 1000 + i * 100, fee: 50 } })).reverse();
  const props = { classes: [{ code: 'Y', cabin: 'Эконом' }], classCode: 'Y', cabin: 'Эконом', tiers, selectedId: 'offer-0', currency: 'RUB', passengerCount: 3, onClassChange() {}, onSelect: (id) => selected.push(id), onInspect: (tier) => inspected.push(tier.id) };
  const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
  const render = () => { hook = 0; effects.length = 0; return nodes(mod.exports.FlightFareSelector(props)); };
  let tree = render();
  const cards = () => tree.filter((node) => node.type === 'article');
  assert.equal(cards().length, 6);
  assert.match(cards()[0].props['aria-label'], /1.050 ₽/);
  assert.equal(tree.filter((node) => node.type === 'dl').length, 6, 'each tariff has a visible comparison summary');
  assert.equal(tree.filter((node) => node.type === 'dt').length, 21, 'missing conditions retain their labelled comparison slots');
  assert.ok(tree.find((node) => node.type === 'dd' && node.props.children === 'Не указано'));
  assert.equal(tree.filter((node) => node.type === 'Icon' && node.props.name === 'luggage').length, 5);
  assert.equal(tree.find((node) => node.props.className?.includes('flight-fare-class ')).props['aria-pressed'], true);
  tree.find((node) => node.props['aria-label'] === 'Следующие тарифы').props.onClick();
  tree = render();
  assert.equal(cards().length, 6);
  nodes(cards()[0]).find((node) => node.type === 'Button').props.onClick();
  nodes(cards()[0]).find((node) => node.props.className === 'flight-fare-rules-link').props.onClick();
  assert.deepEqual(selected, ['offer-6']);
  assert.deepEqual(inspected, ['offer-6']);
  tree.find((node) => node.props['aria-label'] === 'Следующие тарифы').props.onClick();
  tree = render();
  assert.equal(cards().length, 2);
  assert.equal(tree.find((node) => node.props['aria-label'] === 'Следующие тарифы').props.disabled, true);
  props.selectedId = 'offer-1';
  render(); effects.forEach((effect) => effect()); tree = render();
  assert.equal(cards()[0].props['aria-label'].startsWith('Класс Y'), true);
  assert.equal(cards().length, 6, 'changing the selection reveals its page');
  assert.equal(tiers[0].id, 'offer-13', 'sorting never mutates source offers');
});
