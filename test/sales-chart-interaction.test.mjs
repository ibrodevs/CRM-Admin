import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as ranges from '../src/modules/dashboard/model/sales-chart.js';
import * as metrics from '../src/modules/dashboard/model/dashboard-metrics.js';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function chartHarness(onZoom, onSelectDay) {
  const cells = [], effects = [], events = new Map();
  let cursor = 0;
  const node = { getBoundingClientRect: () => ({ left: 100, width: 720 }), addEventListener: (key, handler) => events.set(key, handler), removeEventListener: (key) => events.delete(key) };
  const react = { ...require('react'), useId: () => 'chart-test', useEffect: (fn) => effects.push(fn),
    useState(initial) { const index = cursor++; if (!(index in cells)) cells[index] = initial; return [cells[index], (next) => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }]; },
    useRef(initial) { const index = cursor++; return cells[index] ||= { current: initial === null ? node : initial }; },
  };
  const filename = fileURLToPath(new URL('../src/modules/dashboard/ui/SalesChart.jsx', import.meta.url));
  const mod = new Module(filename);
  mod.require = (name) => {
    if (name === 'react') return react;
    if (name.includes('sales-chart.js')) return ranges;
    if (name.includes('dashboard-metrics')) return metrics;
    if (name.includes('DashboardCard')) return { dashToneColor: () => '#2566ff' };
    if (name.includes('Overlays')) return { Drawer: 'Drawer' };
    if (name.includes('Button')) return { Button: 'button' };
    if (name.includes('icons')) return { Icon: 'svg' };
    if (name.includes('DateFields')) return { DateRangeField: 'DateRangeField' };
    return require(name);
  };
  mod._compile(babel.transformSync(readFileSync(filename, 'utf8'), { filename, presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, filename);
  const series = [0, 50, 0].map((value, index) => ({ key: `2026-11-${14 + index}`, label: String(index), value, count: value ? 2 : 0 }));
  return { events, effects, render() { cursor = 0; return mod.exports.LineChart({ series, format: (value) => `${value} ₽`, onZoom, onSelectDay }); } };
}
test('hover anywhere above a date displays that day amount, including zero, and keyboard can move dates', () => {
  const chart = chartHarness();
  let tree = chart.render();
  tree.props.children[0].props.onPointerMove({ clientX: 100 + 76 + (720 - 76 - 22) / 2 });
  tree = chart.render();
  assert.equal(tree.props.children[1].props.children[1].props.children, '50 ₽');
  tree.props.children[0].props.onKeyDown({ key: 'End', preventDefault() {} });
  tree = chart.render();
  assert.equal(tree.props.children[1].props.children[1].props.children, '0 ₽');
  assert.match(tree.props.children[1].props.children[0].props.children, /16 ноября/);
  tree.props.children[0].props.onPointerLeave();
  assert.equal(chart.render().props.children[1], null);
});
test('wheel zoom uses the cursor date as anchor and cancels page scrolling', () => {
  const calls = [], chart = chartHarness((...args) => calls.push(args));
  chart.render();
  const cleanup = chart.effects[0]();
  let prevented = false;
  chart.events.get('wheel')({ deltaY: -100, clientX: 100 + 76, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(calls, [[-100, 0]]);
  cleanup();
  assert.equal(chart.events.has('wheel'), false);
});

test('clicking a plotted date opens that day statistics; Enter also opens zero-sales days', () => {
  const selected = [], chart = chartHarness(undefined, (key) => selected.push(key));
  let tree = chart.render();
  tree.props.children[0].props.onClick({ clientX: 100 + 76 + (720 - 76 - 22) / 2 });
  assert.deepEqual(selected, ['2026-11-15']);
  tree.props.children[0].props.onKeyDown({ key: 'End', preventDefault() {} });
  tree = chart.render();
  tree.props.children[0].props.onKeyDown({ key: 'Enter', preventDefault() {} });
  assert.deepEqual(selected, ['2026-11-15', '2026-11-16']);
});
