import test from 'node:test';
import assert from 'node:assert/strict';
import { aandaHotelLines } from '../src/modules/services/hotels/aanda-details.js';

test('A&A hotel details show supplied terms and confirmation without inventing missing fields', () => {
  const lines = aandaHotelLines({ provider: 'aanda', itinerary: { property_name: 'Пастель', check_in_time: '14:00', check_out_time: '12:00', meal_plan: 'Питание не включено' },
    fare: { information: [{ title: 'Ресепшен', text: 'До 17:00' }], cancellation_rules: 'Штраф 2583 RUB с 11 декабря' },
    rooms: [{ room_amenities: ['Душ', 'Фен'], currency: { name: 'RUB' } }],
    booking: { order_id: '123', reference_number: 'AA123', raw_status: '71', raw_status_name: 'Аннулировано' },
    accommodations: [{ confirmation_number: 'CN1', penalty: '0', allow_cancel: false }], special_requests: 'Тихий номер' });
  assert.ok(lines.some(([label, value]) => label === 'Стандартный заезд' && value === '14:00'));
  assert.ok(lines.some(([label, value]) => label === 'Удобства номера' && value === 'Душ, Фен'));
  assert.ok(lines.some(([label, value]) => label === 'Подтверждение отеля' && value === 'CN1'));
  assert.ok(lines.some(([label, value]) => label === 'Ресепшен' && value === 'До 17:00'));
  assert.deepEqual(aandaHotelLines(null), []);
  assert.deepEqual(aandaHotelLines({ provider: 'hotelbook' }), []);
});

test('selected A&A city stays in A&A namespace and clears when text changes', async () => {
  const { hotelProviderCriteria } = await import('../src/modules/services/hotels/search-criteria.js');
  const city = { source: 'aanda', value: 'Самара', city_code: '18' };
  assert.deepEqual(hotelProviderCriteria(city, 'Самара'), { aanda: { city_code: '18' } });
  assert.deepEqual(hotelProviderCriteria({ ...city, supplier_id: 'local-supplier' }, 'Самара'), { aanda: { city_code: '18' }, provider_selection: { provider_adapter: 'aanda', supplier_id: 'local-supplier' } });
  assert.deepEqual(hotelProviderCriteria(city, 'Москва'), {});
  assert.deepEqual(hotelProviderCriteria({ ...city, source: 'hotelbook' }, 'Самара'), {});
});
