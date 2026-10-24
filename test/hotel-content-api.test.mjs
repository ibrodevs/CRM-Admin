import test from 'node:test';
import assert from 'node:assert/strict';
import { servicesApi } from '../src/modules/services/api/servicesApi.js';

test('hotel catalogue and CSV use read requests; certificate is a separate local document command', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('export=csv')) return new Response('\ufeffОтель,Номер\nОтель,Стандарт', { headers: { 'Content-Type': 'text/csv' } });
    return new Response(JSON.stringify(url.includes('hotel-certificate') ? { id: 'document-id', kind: 'voucher' } : { rooms: [], hotel: { name: 'Hotel' } }), { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const controller = new AbortController();
    const content = await servicesApi.hotelContent({ offerId: 'offer-id' }, controller.signal);
    assert.equal(content.hotel.name, 'Hotel');
    assert.equal(calls[0].options.signal, controller.signal);
    await servicesApi.hotelContent({ serviceId: 'service-id' });
    const csv = await servicesApi.hotelRoomsCsv({ serviceId: 'service-id' });
    assert.match(await csv.text(), /Стандарт/);
    const doc = await servicesApi.hotelCertificate('service-id');
    assert.equal(doc.kind, 'voucher');
    assert.deepEqual(calls.map((c) => [c.url, c.options.method]), [
      ['/api/backend/service-offers/offer-id/hotel-content', 'GET'],
      ['/api/backend/services/service-id/hotel-content', 'GET'],
      ['/api/backend/services/service-id/hotel-content/?export=csv', 'GET'],
      ['/api/backend/services/service-id/hotel-certificate', 'POST'],
    ]);
    assert.ok(calls.every((c) => !/\/(book|cancel|revalidate)(\/|$)/.test(c.url)));
  } finally { globalThis.fetch = original; }
});
