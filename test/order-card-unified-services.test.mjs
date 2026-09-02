import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const card = await readFile(new URL('../js/page_order_card.jsx', import.meta.url), 'utf8');
const booking = await readFile(new URL('../js/page_booking.jsx', import.meta.url), 'utf8');
const returns = await readFile(new URL('../js/page_returns.jsx', import.meta.url), 'utf8');
const legacy = await readFile(new URL('../js/api/legacy-adapters.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8');

test('карточка заказа открывается единой лентой услуг, а не вкладками', () => {
  assert.doesNotMatch(card, /className="oc-tabbar"/);
  assert.match(card, /<OrderServicesBoard services=\{services\}/);
  assert.match(card, /Услуги в заказе/);
  assert.match(card, /Добавить ещё услугу в заказ/);
  // Разделы-подробности остаются доступными через единую навигацию, без
  // повторного заголовка и кнопки закрытия внутри страницы.
  assert.doesNotMatch(card, /<BackRow/);
  assert.doesNotMatch(card, /title="Закрыть раздел"/);
  assert.doesNotMatch(card, /ORDER_SECTIONS\[tab\]/);
  assert.match(card, /tab === 'main' \? tabContent\(\) : <div className="fade-in">\{tabContent\(\)\}<\/div>/);
});

test('большой заказ можно отфильтровать по пассажиру, билету и типу услуги', () => {
  assert.match(card, /Пассажир, билет, PNR, маршрут/);
  assert.match(card, /serviceMatchesParticipant/);
  assert.match(card, /focusedParticipant/);
  assert.match(card, /focusedTicket/);
  assert.match(card, /Показано \{visibleServices\.length\} из \{services\.length\}/);
  assert.doesNotMatch(card, /new Set\(\[services\[0\]\.id\]\)/);
});

test('все действия услуги доступны из компактной закрытой строки', () => {
  const head = card.slice(card.indexOf('className="osrv-head"'), card.indexOf('<div className="osrv-body">'));
  for (const label of ['Показать детали', 'Отправить клиенту', 'История услуги', 'Добавить файл', 'Обсудить в чате', 'Запросить обмен', 'Отменить услугу', 'Удалить услугу']) {
    assert.ok(head.includes(label), `в компактной строке нет действия «${label}»`);
  }
});

test('клик по услуге раскрывает её в заказе и не открывает старую карточку', () => {
  assert.match(card, /className="osrv-title" onClick=\{onToggle\}/);
  assert.match(card, /setExpandedSvc\(new Set\(\[s\.id\]\)\)/);
  assert.doesNotMatch(card, /svcView === 'avia-card'/);
  assert.doesNotMatch(card, /svcView === 'svc-card'/);
  assert.doesNotMatch(card, /<FlightCard/);
  assert.doesNotMatch(card, /<SvcCard/);
});

test('правая дублирующая колонка не рендерится, разделы собраны в одной панели', () => {
  assert.doesNotMatch(card, /<OrderAside order=/);
  assert.match(card, /className="oc-workspace-nav"/);
  assert.match(card, /ORDER_WORKSPACE_NAV\.map/);
  assert.match(css, /\.oc-workspace-nav/);
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
  assert.match(card, /documentsApi\.list\(\{ order: (?:orderId|order\.id) \}, signal\)/);
  assert.match(card, /documentsApi\.upload\(file, \{ order: (?:orderId|order\.id), service: svc\.serverId \|\| svc\.id/);
  assert.match(card, /String\(d\.service\) === id/);
});

test('отмена услуги передаёт версию, обмен открывает постпродажу с предзаполненной услугой', () => {
  assert.match(card, /servicesApi\.cancel\(svc\.serverId \|\| svc\.id, \{ version: svc\.version/);
  assert.match(card, /setAftersalePreset\(\{ type: 'Обмен билета', serviceId:[\s\S]*currency: svc\.currency \|\| cardOrder\.currency \|\| cardOrder\.base_currency \|\| 'RUB'/);
  assert.match(card, /initialNew=\{aftersalePreset\}/);
  assert.match(returns, /preset=\{initialNew\}/);
  assert.match(returns, /setType\(\(preset && preset\.type\) \|\| 'Возврат билета'\)/);
  assert.match(returns, /currency: d\.currency \|\| selectedOrder\.currency \|\| selectedOrder\.base_currency \|\| 'RUB'/);
  assert.match(returns, /rUsd\(scoped, currency\)/);
});

test('бронирование не отправляет уже выписанные услуги в workflow', () => {
  assert.match(booking, /const BOOKABLE_SERVICE_STATUSES = new Set/);
  assert.match(booking, /const bookingServices = services\.filter\(isServiceBookable\)/);
  assert.match(booking, /bookingApi\.create\(\{ order: order\.id, services: bookingServices\.map/);
  assert.match(booking, /disabled=\{busy \|\| !bookingServices\.length\}/);
  assert.doesNotMatch(booking, /bookingApi\.create\(\{ order: order\.id, services: services\.map/);
});

test('пассажиры показывают реальный документ, а не id booking_document', () => {
  assert.match(legacy, /item\.booking_document_detail/);
  assert.match(legacy, /docNo: item\.booking_document_detail\.docNo/);
  assert.match(legacy, /docStatus: docNo \? 'ok' : 'missing'/);
  assert.doesNotMatch(legacy, /const docNo = item\.booking_document \|\|/);
});

test('кейс изменения получает id заказа явным пропом, а не из внешней области', () => {
  assert.match(card, /function OrderChangeCase\(\{ orderNo, orderId, services, participants \}\)/);
  assert.doesNotMatch(card, /String\(order\.id \|\| orderNo\)/);
});

test('стили компактной ленты услуг и навигации заказа присутствуют', () => {
  for (const rule of ['.osrv-head', '.osrv-body', '.osrv-sec', '.osrv-actions', '.osrv-add', '.oc-workspace-nav', '.osrv-toolbar']) {
    assert.ok(css.includes(rule), `нет правила ${rule}`);
  }
});
