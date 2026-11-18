import { countryCode } from '../../../shared/lib/countries.js';
import { parseCalendarDate } from '../../../shared/ui/date-range.js';
import { freeBookingDate } from '../free-booking-search.js';

export function insuranceCriteria(form, today = new Date()) {
  const start = parseCalendarDate(freeBookingDate(form.start));
  const end = parseCalendarDate(freeBookingDate(form.end));
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const countries = [...new Set(String(form.countries || '').split(/[,;\n]/).map((value) => value.trim()).filter(Boolean))];
  if (!countries.length) throw new Error('Укажите страны или территорию страхования');
  if (!start || !end || start < now || end < start) throw new Error('Выберите период страхования не раньше сегодняшнего дня');
  if (!form.travellers?.length) throw new Error('Добавьте хотя бы одного застрахованного');
  const travellers = form.travellers.map((person, index) => {
    const birth = parseCalendarDate(freeBookingDate(person.birth_date));
    if (!birth || birth > now) throw new Error(`Укажите корректную дату рождения застрахованного № ${index + 1}`);
    return { birth_date: freeBookingDate(birth) };
  });
  if (!countryCode(form.citizenship)) throw new Error('Укажите гражданство застрахованных');
  const coverage = Number(form.coverage);
  if (!Number.isFinite(coverage) || coverage <= 0) throw new Error('Укажите страховое покрытие больше нуля');
  return { destination_countries: countries, start_date: freeBookingDate(start), end_date: freeBookingDate(end), travellers,
    citizenship: countryCode(form.citizenship), coverage_amount: coverage, coverage_currency: form.coverageCurrency,
    purpose: form.purpose, currency: form.currency };
}

export function insuranceQuote(offer, now = Date.now()) {
  const amount = offer?.price?.amount;
  const currency = offer?.price?.currency;
  if (!offer?.id || offer.kind !== 'insurance' || !offer.provider_adapter || /mock|demo|sandbox/i.test(offer.provider_adapter)
      || offer.is_manual || !offer.supplier || amount == null || amount === '' || !Number.isFinite(Number(amount)) || Number(amount) < 0
      || !/^[A-Z]{3}$/.test(currency || '') || ['unavailable', 'sold_out', 'expired'].includes(offer.availability)
      || (offer.expires_at && (!Number.isFinite(Date.parse(offer.expires_at)) || Date.parse(offer.expires_at) <= now))) return null;
  return { ...offer, price: { amount: Number(amount), currency } };
}

export function insuranceSelection(offer, criteria, providers = []) {
  const quote = insuranceQuote(offer);
  if (!quote) throw new Error('Расчёт недоступен или устарел. Рассчитайте стоимость заново.');
  const insurer = providers.find((row) => String(row.id) === String(quote.supplier));
  return { _backendOfferId: quote.id, kind: 'Страховка', title: quote.itinerary?.title || quote.itinerary?.program || 'Страховка для поездки',
    sub: `${criteria.destination_countries.join(', ')} · ${criteria.start_date} — ${criteria.end_date}`,
    cost: quote.price.amount, fee: 0, currency: quote.price.currency, supplierId: quote.supplier,
    supplier: insurer?.name || quote.itinerary?.insurer_name || quote.supplier_name || 'Страховая компания',
    starts_at: `${criteria.start_date}T00:00:00`, ends_at: `${criteria.end_date}T23:59:59`, insuranceCriteria: criteria };
}

export async function requestInsuranceQuotes(api, body, { signal, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const active = () => { if (signal?.aborted) throw new DOMException('Расчёт отменён', 'AbortError'); };
  active();
  const session = await api.search(body);
  if (!session.search_id) throw new Error('Не удалось создать запрос на расчёт');
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      active();
      const state = await api.searchStatus(session.search_id, signal);
      active();
      if (state.status === 'cancelled') throw new Error('Расчёт отменён');
      if (state.status === 'failed') {
        const unconfigured = (state.provider_runs || []).some((run) => /CONFIGUR|ADAPTER|UNSUPPORTED/i.test(run.error_code || '') || run.provider_adapter === 'mock');
        throw new Error(unconfigured ? 'Расчёт страховки недоступен: требуется подключение страховой компании.' : 'Страховые компании не вернули расчёт. Проверьте данные и повторите запрос.');
      }
      if (['completed', 'partial'].includes(state.status)) {
        const offers = [];
        for (let page = 1; ; page++) {
          active();
          const payload = await api.offers(session.search_id, { page_size: 100, page }, signal);
          active();
          offers.push(...(Array.isArray(payload) ? payload : payload.results || []));
          if (!payload.next && (!payload.count || offers.length >= payload.count)) break;
          if (!(payload.results || []).length) break;
        }
        const real = offers.map((offer) => insuranceQuote(offer)).filter(Boolean);
        if (!real.length && offers.some((offer) => /mock|demo|sandbox/i.test(offer.provider_adapter || ''))) throw new Error('Для расчёта стоимости подключите страховую компанию. Тестовые предложения недоступны для оформления.');
        return real;
      }
      await pause(500);
    }
    throw new Error('Страховая компания не завершила расчёт. Повторите запрос позже.');
  } catch (error) {
    if (signal?.aborted || /не завершила расчёт/.test(error.message)) await api.cancelSearch?.(session.search_id).catch(() => {});
    throw error;
  }
}

export function insurancePerson(person, participant = false) {
  return {
    person_id: person.person?.id || person.person || person.person_id || (participant ? null : person.id) || null,
    name: person.full_name || person.name || [person.surname, person.given_name, person.middle_name].filter(Boolean).join(' '),
    birth_date: person.birth_date || person.dob || null,
  };
}

export function addInsurancePerson(travellers, person, replaceIndex = null) {
  const entry = insurancePerson(person);
  const duplicate = travellers.findIndex((row) => entry.person_id && String(row.person_id) === String(entry.person_id));
  if (duplicate >= 0 && duplicate !== replaceIndex) return travellers;
  const target = replaceIndex ?? travellers.findIndex((row) => !row.person_id && !row.name && !row.birth_date);
  return target >= 0 ? travellers.map((row, i) => i === target ? entry : row) : [...travellers, entry];
}
