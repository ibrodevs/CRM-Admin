import assert from 'node:assert/strict';
import test from 'node:test';

import { kpBriefItems, parseKpRequest } from '../js/kp_request_parser.js';

test('распознаёт маршрут, даты, пассажиров и услуги из заявки', () => {
  const result = parseKpRequest(
    'Нужны авиабилеты Бишкек — Стамбул с 12 по 18 августа на 2 пассажиров, без пересадок, с багажом. Отель с завтраком.',
  );
  assert.equal(result.route, 'Бишкек — Стамбул');
  assert.equal(result.dates, '12–18 августа');
  assert.equal(result.passengers, 2);
  assert.deepEqual(result.services.map((item) => item.kind), ['avia', 'hotel']);
  assert.deepEqual(result.preferences, ['Без пересадок', 'С багажом', 'Завтрак включён']);
});

test('понимает свободный текст чата и бюджет', () => {
  const result = parseKpRequest(
    'Добрый день! Для: ОсОО Альфа. Из Москвы в Алматы на двоих 14.09.2026, нужен трансфер. Бюджет до 120000 сом.',
  );
  assert.equal(result.route, 'Москва — Алматы');
  assert.equal(result.passengers, 2);
  assert.equal(result.currency, 'KGS');
  assert.equal(result.budget, '120000');
  assert.equal(result.contact, 'ОсОО Альфа');
  assert.ok(result.services.some((item) => item.kind === 'transfer'));
});

test('не выдумывает данные, которых нет в тексте', () => {
  const result = parseKpRequest('Нужно подготовить предложение для клиента.');
  assert.equal(result.route, '');
  assert.equal(result.passengers, null);
  assert.equal(result.hasData, false);
  assert.ok(result.missing.includes('даты'));
});

test('создаёт редактируемые нулевые позиции из распознанных услуг', () => {
  const brief = parseKpRequest('FRU-IST, авиабилет и гостиница на 3 пассажиров');
  const items = kpBriefItems(brief, 'USD', 'FRU-IST, авиабилет и гостиница');
  assert.equal(items.length, 2);
  assert.equal(items[0].price_amount, '0');
  assert.match(items[0].description, /3 пасс\./);
});
