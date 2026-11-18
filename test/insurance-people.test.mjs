import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
import { insurancePerson, addInsurancePerson } from '../src/modules/services/insurance/insurance-search.js';
import { resolveHotelParticipants } from '../src/modules/services/hotels/guests.js';
const require = createRequire(import.meta.url), babel = require('next/dist/compiled/babel/core');
const nodes = (node) => Array.isArray(node) ? node.flatMap(nodes) : node?.props ? [node, ...nodes(node.props.children)] : [];
const content = (node) => Array.isArray(node) ? node.map(content).join(' ') : node?.props ? content(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';

test('insured people reuse CRM identities, fill empty slots and never duplicate or mutate a card', () => {
  const card = { id: 'person-a', surname: 'Иванов', given_name: 'Пётр', middle_name: 'Сергеевич', birth_date: '1990-03-15' };
  const person = insurancePerson(card);
  assert.deepEqual(person, { person_id: 'person-a', name: 'Иванов Пётр Сергеевич', birth_date: '1990-03-15' });
  const initial = [{ birth_date: null }];
  const selected = addInsurancePerson(initial, card);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].person_id, card.id);
  assert.equal(initial[0].birth_date, null);
  assert.equal(addInsurancePerson(selected, card), selected);
  const other = { id: 'person-b', full_name: 'Петрова Анна', birth_date: null };
  assert.equal(addInsurancePerson(selected, other).length, 2);
  const replaced = addInsurancePerson(selected, other, 0);
  assert.equal(replaced[0].person_id, 'person-b');
  assert.equal(replaced[0].birth_date, null, 'replacement must not retain the previous person birth date');
  assert.equal(card.birth_date, '1990-03-15');
  assert.equal(insurancePerson({ id: 'participant', person: 'crm-person', name: 'Гость', dob: '1991-01-01' }, true).person_id, 'crm-person');
  assert.equal(insurancePerson({ id: 'participant', name: 'Гость' }, true).person_id, null, 'an order participant id is not a CRM person id');
});

test('insured CRM people attach to an order using existing participants and create only missing links', async () => {
  const added = [];
  const ids = await resolveHotelParticipants('order', { insuredPersonIds: ['known', 'new', 'known'] }, { participants: async () => [{ id: 'participant-known', person: 'known' }], addParticipant: async (order, body) => { added.push({ order, ...body }); return { id: 'participant-new', ...body }; } });
  assert.deepEqual(ids, ['participant-known', 'participant-new']);
  assert.deepEqual(added, [{ order: 'order', person: 'new', role: 'passenger' }]);
});

function harness(fail = false) {
  const values = [], dependencies = [], effects = [];
  let cursor = 0, calls = 0;
  const props = { open: true, travellers: [{ birth_date: null }], onClose() {}, onChange: (rows) => { props.travellers = rows; } };
  const react = { ...require('react'), useState: (initial) => { const i = cursor++; if (!(i in values)) values[i] = initial; return [values[i], (next) => { values[i] = typeof next === 'function' ? next(values[i]) : next; }]; }, useEffect: (effect, deps) => { const i = cursor++; if (!dependencies[i] || deps.some((value, j) => value !== dependencies[i][j])) { dependencies[i] = deps; effects.push(effect); } } };
  const mod = new Module(import.meta.filename);
  mod.require = (name) => name === 'react' ? react : name.includes('clients/api') ? { clientsApi: { async persons() { calls++; if (fail) throw new Error('Нет доступа к картотеке'); return { results: Array.from({ length: 12 }, (_, i) => ({ id: `person-${i}`, full_name: `Иванов Пётр ${i}`, birth_date: i === 0 ? '1990-03-15' : null, phone: `+799900000${i}`, email: `person${i}@example.test` })) }; } } }
    : name.includes('insurance-search.js') ? { insurancePerson, addInsurancePerson } : name.includes('client.js') ? { resultsOf: (data) => data.results || data }
    : name.includes('Overlays') ? { Drawer: 'Drawer' } : name.includes('DateFields') ? { DateField: 'DateField' } : name.includes('icons') ? { Icon: 'Icon' }
    : Object.fromEntries(['Button', 'Input', 'Field', 'SearchBox'].map((key) => [key, key]))[name.split('/').at(-1).replace('.jsx', '')] ? { [name.split('/').at(-1).replace('.jsx', '')]: name.split('/').at(-1).replace('.jsx', '') } : require(name);
  mod._compile(babel.transformSync(readFileSync(new URL('../src/modules/services/insurance/InsuranceTravellersDrawer.jsx', import.meta.url), 'utf8'), { filename: 'InsuranceTravellersDrawer.jsx', presets: ['next/babel'], configFile: false, babelrc: false, envName: 'test' }).code, import.meta.filename);
  return { render: () => { cursor = 0; return nodes(mod.exports.InsuranceTravellersDrawer(props)); }, async load() { effects.splice(0).forEach((effect) => effect()); await new Promise(setImmediate); }, props, calls: () => calls };
}

test('cart search paginates, selects DOB, blocks duplicates and retains identity when DOB is corrected', async () => {
  const h = harness(); let tree = h.render(); await h.load(); assert.equal(h.calls(), 0);
  tree.find((node) => node.type === 'Button' && node.props.children === 'Из картотеки').props.onClick();
  h.render(); await h.load(); tree = h.render();
  const options = () => tree.filter((node) => node.props.className === 'insurance-person-option');
  assert.equal(options().length, 8);
  options()[0].props.onClick(); tree = h.render();
  assert.equal(h.props.travellers.length, 1);
  assert.equal(h.props.travellers[0].birth_date, '1990-03-15');
  assert.equal(options()[0].props.disabled, true);
  tree.find((node) => node.type === 'DateField').props.onChange('1991-04-16'); tree = h.render();
  assert.equal(h.props.travellers[0].person_id, 'person-0');
  assert.equal(h.props.travellers[0].name, 'Иванов Пётр 0');
  tree.find((node) => node.type === 'SearchBox').props.onChange('person11@example.test'); tree = h.render();
  assert.equal(options().length, 1); assert.match(content(options()[0]), /Пётр 11/);
  options()[0].props.onClick(); tree = h.render();
  assert.equal(h.props.travellers.length, 2);
  assert.match(content(tree), /Укажите дату рождения для расчёта/);
  tree.find((node) => node.type === 'Button' && node.props.children === 'Ввести вручную').props.onClick(); tree = h.render();
  assert.equal(h.props.travellers.length, 3);
  assert.ok(tree.some((node) => node.type === 'Input' && node.props.placeholder === 'Фамилия Имя Отчество'));
});

test('cart failure keeps manual insured entry available', async () => {
  const h = harness(true); let tree = h.render();
  tree.find((node) => node.type === 'Button' && node.props.children === 'Из картотеки').props.onClick();
  h.render(); await h.load(); tree = h.render();
  assert.match(content(tree), /Нет доступа к картотеке/);
  assert.ok(tree.some((node) => node.type === 'Button' && node.props.children === 'Повторить'));
  assert.ok(tree.some((node) => node.type === 'Button' && node.props.children === 'Ввести вручную'));
});
