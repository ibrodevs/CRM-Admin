import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const card = await readFile(new URL('../js/page_order_card.jsx', import.meta.url), 'utf8');
const returns = await readFile(new URL('../js/page_returns.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('карточка заказа открывается единой лентой услуг, а не вкладками', () => {
  assert.doesNotMatch(card, /className="oc-tabbar"/);
  assert.match(card, /<OrderServicesBoard services=\{services\}/);
  assert.match(card, /Услуги в заказе/);
  assert.match(card, /Добавить ещё услугу в заказ/);
  // Разделы-подробности остаются доступными и открываются поверх ленты.
  assert.match(card, /<BackRow label="К заказу"/);
  assert.match(card, /ORDER_SECTIONS\[tab\]/);
});

test('счётчик услуг из списка заказов не принимается за массив услуг', () => {
  assert.match(card, /Array\.isArray\(order\.services\) \? order\.services : \[\]/);
  assert.match(card, /Array\.isArray\(overview\.services\) \? overview\.services : \[\]/);
  assert.doesNotMatch(card, /\(order\.services \|\| \[\]\)\.map/);
});

test('блок услуги показывает пассажиров, документы и действия по услуге', () => {
  assert.match(card, /Пассажиры \(\{pax\.length\}\)/);
  assert.match(card, /Документы \(\{docs\.length\}\)/);
  assert.match(card, /Добавить файл/);
  assert.match(card, /Запросить обмен/);
  assert.match(card, /onCancel=\{askCancelService\}/);
  assert.match(card, /onExchange=\{requestExchange\}/);
});

test('документы услуги грузятся с backend и привязываются к услуге', () => {
  assert.match(card, /documentsApi\.list\(\{ order: order\.id \}, signal\)/);
  assert.match(card, /documentsApi\.upload\(file, \{ order: order\.id, service: svc\.serverId \|\| svc\.id/);
  assert.match(card, /String\(d\.service\) === id/);
});

test('отмена услуги передаёт версию, обмен открывает постпродажу с предзаполненной услугой', () => {
  assert.match(card, /servicesApi\.cancel\(svc\.serverId \|\| svc\.id, \{ version: svc\.version/);
  assert.match(card, /setAftersalePreset\(\{ type: 'Обмен билета', serviceId/);
  assert.match(card, /initialNew=\{aftersalePreset\}/);
  assert.match(returns, /preset=\{initialNew\}/);
  assert.match(returns, /setType\(\(preset && preset\.type\) \|\| 'Возврат билета'\)/);
});

test('кейс изменения получает id заказа явным пропом, а не из внешней области', () => {
  assert.match(card, /function OrderChangeCase\(\{ orderNo, orderId, services, participants \}\)/);
  assert.doesNotMatch(card, /String\(order\.id \|\| orderNo\)/);
});

test('стили ленты услуг и фактов заказа присутствуют', () => {
  for (const rule of ['.osrv-head', '.osrv-body', '.osrv-sec', '.osrv-actions', '.osrv-add', '.oc-facts', '.oc-hint']) {
    assert.ok(css.includes(rule), `нет правила ${rule}`);
  }
});
