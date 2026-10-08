import test from 'node:test';
import assert from 'node:assert/strict';
import { freeBookingServiceBody, freeBookingTotals } from '../src/modules/dashboard/model/free-booking.js';
import { hotelBreakfastIncluded } from '../src/modules/services/hotels/search-criteria.js';

test('hotel picker offers attach through the backend offer, retaining HB snapshot and adapter routing', () => {
  assert.deepEqual(freeBookingServiceBody({ _backendOfferId: 'crm-offer', kind: 'Гостиница', cost: 1345530, currency: 'RUB' }), { offer_id: 'crm-offer' });
  assert.deepEqual(freeBookingServiceBody({ backendOfferId: 'existing-offer' }), { offer_id: 'existing-offer' });
  assert.deepEqual(freeBookingServiceBody({ offerId: 'avia-offer' }), { offer_id: 'avia-offer' });
});

test('free booking totals preserve supplier currencies without summing different currencies', () => {
  assert.deepEqual(freeBookingTotals([{ cost: 100, currency: 'RUB' }, { cost: '200', currency: 'RUB' }, { cost: 50, currency: 'EUR' }]), { RUB: 300, EUR: 50 });
});

test('manual services retain the manual workflow', () => {
  const body = freeBookingServiceBody({ kind: 'Гостиница', title: 'Manual', cost: 100, currency: 'RUB' });
  assert.equal(body.kind, 'hotel');
  assert.equal(body.supplier_cost, 100);
  assert.equal(body.currency, 'RUB');
  assert.equal(body.offer_id, undefined);
});

test('HB no-meal descriptions never promise included breakfast', () => {
  for (const value of ['Без питания', 'RO', 'Room only', '', undefined]) assert.equal(hotelBreakfastIncluded(value), false);
  for (const value of ['BB', 'Завтрак', 'Breakfast', 'HB', 'Полупансион']) assert.equal(hotelBreakfastIncluded(value), true);
});

const { freeFlightCriteria, validateFreeFlightSearch, freeFlightDraft, searchFreeFlightOffers } = await import('../src/modules/services/flights/free-flight-search.js');
const flightParams = () => ({
  trip: 'rt', from: 'FRU', to: 'IST', depDate: new Date(2026, 9, 15), retDate: new Date(2026, 9, 20),
  pax: { adt: 2, chd: 1, infNoSeat: 1, infSeat: 1, special: { youth: 1, disabledChild: 1 }, subsidized: { dvoResident: 1, kldChild: 1 } },
  cabin: 'Комфорт', currency: 'EUR', sameClass: true, allowDiffClasses: true, seekSubsidized: true, seekGroupFares: true,
  baggage: true, direct: true, flex: true, airline: 'TK',
});

test('free avia searches without order participants, retaining every passenger type and option', () => {
  const p = flightParams();
  assert.equal(validateFreeFlightSearch(p), null);
  const criteria = freeFlightCriteria(p);
  assert.equal(criteria.passengers, 5);
  assert.deepEqual(criteria.passenger_types, { adults: 2, children: 1, infants_without_seat: 1, infants_with_seat: 1 });
  assert.deepEqual(criteria.special_categories, p.pax.special);
  assert.deepEqual(criteria.subsidized_programs, p.pax.subsidized);
  for (const key of ['same_class', 'allow_different_classes', 'seek_subsidized', 'seek_group_fares', 'baggage', 'flexible_dates', 'direct_only']) assert.equal(criteria[key], true);
  assert.equal(criteria.cabin, 'premium_economy');
  assert.equal(criteria.date, '2026-10-15');
  assert.equal(criteria.return_date, '2026-10-20');
  assert.equal(criteria.currency, 'EUR');
  assert.equal(criteria.airline, 'TK');
  assert.equal(criteria.order, undefined);
});

test('one way ignores a previously chosen return date; multi city sends its own route and dates', () => {
  const p = flightParams();
  p.trip = 'ow';
  assert.equal(freeFlightCriteria(p).return_date, undefined);
  p.trip = 'mc';
  p.segments = [{ from: 'SVO', to: 'IST', date: new Date(2026, 10, 1) }, { from: 'IST', to: 'FRU', date: new Date(2026, 10, 4) }];
  const criteria = freeFlightCriteria(p);
  assert.equal(criteria.origin, 'SVO');
  assert.equal(criteria.date, '2026-11-01');
  assert.deepEqual(criteria.segments, [{ origin: 'SVO', destination: 'IST', date: '2026-11-01' }, { origin: 'IST', destination: 'FRU', date: '2026-11-04' }]);
  assert.equal(validateFreeFlightSearch(p), null);
  p.segments[1].date = new Date(2026, 9, 1);
  assert.match(validateFreeFlightSearch(p), /по порядку/);
});

test('free search validates missing dates and reversed ranges before calling providers', () => {
  const p = flightParams();
  p.retDate = null;
  assert.match(validateFreeFlightSearch(p), /даты/);
  p.retDate = new Date(2026, 9, 1);
  assert.match(validateFreeFlightSearch(p), /не раньше/);
});

test('free avia retains provider offer, actual currency and snapshot through selection and attachment', async () => {
  const raw = { id: 'real-offer', provider: 'provider-id', provider_offer: 'supplier-id', price: { amount: '123.45', currency: 'EUR' }, fare: { booking_class: 'Y' }, itinerary: { segments: [{ origin: 'FRU', destination: 'IST' }] } };
  const requests = [];
  const api = {
    search: async (body) => { requests.push(body); return { search_id: 'search-1' }; },
    searchStatus: async () => ({ status: 'completed' }),
    offers: async () => ({ count: 1, results: [raw] }),
  };
  const rows = await searchFreeFlightOffers(flightParams(), api);
  assert.deepEqual(rows, [raw]);
  assert.equal(requests[0].kind, 'avia');
  assert.equal(requests[0].criteria.passengers, 5);
  const draft = freeFlightDraft({ ...raw, backendOffer: raw, fare: 123.45, currency: 'EUR' }, flightParams());
  assert.equal(draft.cost, 123.45);
  assert.equal(draft.provider_offer, 'supplier-id');
  assert.deepEqual(draft.selectedOffer, raw);
  assert.deepEqual(freeBookingServiceBody(draft), { offer_id: 'real-offer' });
  assert.deepEqual(freeBookingTotals([draft]), { EUR: 123.45 });
});

test('manual free-booking categories and chosen dates use backend service contracts', () => {
  for (const [kind, code] of [['Аэроэкспресс', 'aeroexpress'], ['Бизнес-зал', 'lounge'], ['Доп. услуга', 'other'], ['Страховка', 'insurance']]) {
    const body = freeBookingServiceBody({ kind, starts_at: '2026-10-15T12:00:00+06:00', cost: 100, currency: 'KGS' });
    assert.equal(body.kind, code);
    assert.equal(body.starts_at, '2026-10-15T12:00:00+06:00');
  }
});

test('only free booking routes through historical masks; order pages retain their existing panel', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = async (file) => readFile(new URL('../' + file, import.meta.url), 'utf8');
  const dashboard = await source('src/modules/dashboard/ui/DashboardPage.jsx');
  const card = await source('src/modules/orders/ui/OrderCard.jsx');
  const flights = await source('src/modules/services/flights/FlightsPage.jsx');
  assert.match(dashboard, /<FreeBookingPanel kind=\{kind\}/);
  assert.doesNotMatch(dashboard, /<AddServicePanel/);
  assert.match(card, /<AddServicePanel kind=\{addKind\}/);
  const freeForm = card.slice(card.indexOf('function FreeBookingFlightPanel'), card.indexOf('function FreeBookingPanel'));
  assert.match(freeForm, /<DateRangeField/);
  assert.match(freeForm, /<FreeBookingPaxField/);
  const picker = flights.slice(flights.indexOf('function FreeBookingPaxClassPicker'), flights.indexOf('function FreeBookingPaxField'));
  assert.match(picker, /FREE_BOOKING_SPECIAL_CATEGORIES\.map/);
  assert.match(flights, /key: 'disabledChild', label: 'Дети-инвалиды'/);
  assert.match(flights, /key: 'disabledEscort', label: 'Сопровождающие инвалидов'/);
  const wrapper = card.slice(card.indexOf('function FreeBookingPanel'), card.indexOf('function TabOffers'));
  assert.match(wrapper, /hidden=\{kind !== cat.kind\}/);
  assert.match(wrapper, /<HotelPicker/);
  assert.match(wrapper, /<FreeBookingAeroAddFlow/);
  assert.match(wrapper, /<FreeBookingRailFlow/);
  assert.match(freeForm, /svcp-search-bar avia-search-bar/);
  assert.match(freeForm, /avia-mc-head/);
  assert.match(freeForm, /<AviaFilters/);
  assert.match(freeForm, /<AviaListTable/);
  assert.doesNotMatch(freeForm, /\* 0\.6|\* 0\.4|\* 0\.045/);
  const services = await source('src/modules/services/ui/ServicesPage.jsx');
  const rail = services.slice(services.indexOf('function FreeBookingRailFlow'), services.indexOf('function RailAddFlow'));
  assert.match(rail, /<FreeBookingRailFilters/);
  assert.match(rail, /form.trip === 'rt' \? \{ return_date:/);
  assert.match(rail, /selectedOffer: offer/);
  assert.match(wrapper, /<FreeBookingServiceAddFlow/);
  const css = await source('src/styles/components/free-booking.css');
  const { default: postcss } = await import('postcss');
  postcss.parse(css).walkRules((rule) => {
    for (const selector of rule.selectors) assert.match(selector, /\.free-booking(?:[ .:]|$)/);
  });
});

test('free flight pagination keeps all provider offers and cancelled searches do not attach stale results', async () => {
  const calls = [];
  const api = {
    search: async () => ({ search_id: 'search' }),
    searchStatus: async () => ({ status: 'completed' }),
    offers: async (_, query) => { calls.push(query); return { count: 2, results: [{ id: query.page === 2 ? 'second' : 'first' }] }; },
  };
  assert.deepEqual((await searchFreeFlightOffers(flightParams(), api)).map((o) => o.id), ['first', 'second']);
  assert.equal(calls[1].page, 2);
  api.searchStatus = async () => ({ status: 'cancelled' });
  await assert.rejects(searchFreeFlightOffers(flightParams(), api), /отменён/);
  assert.equal(calls.length, 2);
});

const { freeFlightFareOptions, freeFlightFareDetails, freeFlightLocalPassengers } = await import('../src/modules/services/flights/free-flight-search.js');
test('historical fare cards choose actual offers only for the same provider, itinerary and currency', () => {
  const params = flightParams();
  const make = (id, amount, changes = {}) => {
    const raw = { id, provider: 5, price: { amount, currency: 'EUR' }, itinerary: { segments: [{ origin: 'FRU', destination: 'IST', departure: '2026-10-15T10:00:00Z', arrival: '2026-10-15T14:00:00Z', airline: 'TK', flight_number: '349' }] }, fare: { name: id, booking_class: 'Y', cabin: 'economy', baggage: '1PC', refundable: true }, ...changes };
    return { ...raw, fare: amount, fee: 0, currency: raw.price.currency, backendOffer: raw };
  };
  const base = make('light', 100);
  const higher = make('optimum', 121);
  const otherProvider = make('other-provider', 90, { provider: 6 });
  const otherCurrency = make('other-currency', 90, { price: { amount: 90, currency: 'USD' } });
  const otherFlight = make('other-flight', 90, { itinerary: { segments: [{ origin: 'FRU', destination: 'IST', flight_number: '777' }] } });
  assert.deepEqual(freeFlightFareOptions(base, [base, higher, otherProvider, otherCurrency, otherFlight]).map((o) => o.id), ['light', 'optimum']);
  const draft = freeFlightDraft(higher, params);
  assert.equal(draft.cost, 121); // Quoted total, never multiplied by five passengers.
  assert.deepEqual(freeBookingServiceBody(draft), { offer_id: 'optimum' });
  assert.deepEqual(draft.selectedOffer, higher.backendOffer);
  const details = freeFlightFareDetails(higher);
  assert.equal(details.name, 'optimum');
  assert.equal(details.cabin, 'Эконом');
  assert.equal(details.features.some((f) => /23|10 кг/.test(f.text)), false);
  const passengers = freeFlightLocalPassengers(params.pax);
  assert.equal(passengers.length, 5);
  assert.deepEqual(passengers.map((p) => p.role), ['Взрослый', 'Взрослый', 'Ребёнок 2–11', 'Младенец без места', 'Младенец с местом']);
});

test('free booking uses the historical class/tariff/extras panels without synthetic fares or passenger defaults', async () => {
  const { readFile } = await import('node:fs/promises');
  const card = await readFile(new URL('../src/modules/orders/ui/OrderCard.jsx', import.meta.url), 'utf8');
  const panel = card.slice(card.indexOf('function FreeBookingFlightFarePanel'), card.indexOf('// AviaSearchPanel mask'));
  assert.match(panel, /title="Класс и тариф по рейсу"/);
  assert.match(panel, /fare-class-grid/);
  assert.match(panel, /fare-grid/);
  assert.match(panel, /Багаж, выбор места, питание, страховка/);
  assert.match(panel, /servicesApi\.fareRules\(fare.id\)/);
  assert.match(panel, /<FreeBookingExtrasTabs currency=\{selected.currency\}/);
  assert.doesNotMatch(panel, /AVIA_FARE_TIERS|AVIA_BOOKING_CLASSES|RUB_PER_USD/);
  const source = await readFile(new URL('../src/modules/services/flights/AviaPicker.jsx', import.meta.url), 'utf8');
  const extras = source.slice(source.indexOf('function FreeBookingExtrasTabs'), source.indexOf('function fareClassGroup'));
  assert.match(extras, /state.insurance\[i\] \|\| 'none'/);
  assert.match(extras, /formatMoney\(amount, currency\)/);
});

const { freeBookingDate, validateFreeServiceSearch, waitFreeBookingOffers, freeBookingAvailabilityTags } = await import('../src/modules/services/free-booking-search.js');
test('free service dates preserve the selected local day and reject missing or reversed dates', () => {
  const date = new Date(2026, 9, 15);
  assert.equal(freeBookingDate(date), '2026-10-15');
  assert.equal(freeBookingDate(new Date(NaN)), undefined);
  assert.equal(validateFreeServiceSearch('transfers', { from: 'SVO', to: 'Москва', date, pax: 1 }), null);
  assert.match(validateFreeServiceSearch('buses', { from: 'Москва', to: 'Казань', date, pax: 0 }), /пассажира/);
  assert.match(validateFreeServiceSearch('transfers', { from: 'SVO', to: 'Москва', date, pax: 1, trip: 'rt', retDate: new Date(2026,9,14) }), /возвращения/);
  assert.equal(validateFreeServiceSearch('lounge', { airport: 'SVO', date, pax: 2 }), null);
  assert.match(validateFreeFlightSearch({ ...flightParams(), depDate: new Date(NaN) }), /даты/);
});
test('free service polling retains every page and does not accept cancelled or failed searches', async () => {
  const calls = [];
  const api = { searchStatus: async () => ({ status: 'partial' }), offers: async (_, query) => { calls.push(query); return { count: 2, results: [{ id: query.page || 1 }] }; } };
  assert.deepEqual((await waitFreeBookingOffers(api, 'id')).map(o => o.id), [1,2]);
  assert.equal(calls[1].page, 2);
  api.searchStatus = async () => ({ status: 'cancelled' });
  await assert.rejects(waitFreeBookingOffers(api, 'id'), /отменён/);
  api.searchStatus = async () => ({ status: 'failed' });
  await assert.rejects(waitFreeBookingOffers(api, 'id'), /Поставщики/);
  assert.deepEqual(freeBookingAvailabilityTags([{ seats: 18 }, 'Возвратный', undefined]), ['Возвратный']);
});
test('free booking preserves zero quotes and never treats a fare surcharge as a total', () => {
  assert.deepEqual(freeBookingTotals([{ cost: 0, total: 100, currency: 'EUR' }, { price: { amount: '21' }, currency: 'EUR', fareDeltaUsd: 5 }]), { EUR: 21 });
  assert.equal(freeBookingServiceBody({ kind: 'Доп. услуга', cost: 0, tariff: 100 }).supplier_cost, 0);
});
test('offers without an itinerary are not combined into synthetic tariff alternatives', () => {
  const selected = { id: 'one', provider: 5, currency: 'EUR' };
  assert.deepEqual(freeFlightFareOptions(selected, [selected, { ...selected, id: 'two' }]), [selected]);
});

test('free rail selection cannot change a provider offer to an unquoted class or invent a seat map', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/modules/services/ui/ServicesPage.jsx', import.meta.url), 'utf8');
  const panel = source.slice(source.indexOf('function FreeBookingRailSeatPanel'), source.indexOf('function FreeBookingRailFlow'));
  assert.match(panel, /availableClasses = tagClass \? \[tagClass\]/);
  assert.match(panel, /length: seatMapKnown \? cls.seats : 0/);
  assert.match(panel, /Схема мест недоступна/);
  assert.doesNotMatch(panel, /\{RAIL_SERVICE_CLASSES.map/);
});
