import { useEffect, useRef, useState } from 'react';
import { useDraftState } from '../../../shared/drafts/Drafts.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { DateRangeField } from '../../../shared/ui/DateFields.jsx';
import { InsuranceTravellersDrawer } from './InsuranceTravellersDrawer.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { suppliersApi } from '../../suppliers/api.js';
import { servicesApi } from '../api/servicesApi.js';
import { resultsOf } from '../../../shared/api/client.js';
import { formatMoney, resolveCurrency } from '../../../shared/lib/money.js';
import { insuranceCriteria, insuranceQuote, insuranceSelection, requestInsuranceQuotes, insurancePerson } from './insurance-search.js';

export function InsuranceSearchPanel({ onAdd, currency, addLabel = 'Добавить в заказ', orderId, participants = [] }) {
  const [form, setForm] = useDraftState('QuickAddForm/Страховка', 'request', () => ({ countries: '', start: null, end: null, citizenship: '', coverage: 30000, coverageCurrency: 'EUR', purpose: 'tourism',
    travellers: participants.length ? participants.map((person) => insurancePerson(person, true)) : [{ birth_date: null }] }));
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const request = useRef(null);
  const version = useRef(0);
  const currentCurrency = resolveCurrency(currency);
  const fingerprint = JSON.stringify({ form, currency: currentCurrency, orderId });
  const latest = useRef(fingerprint); latest.current = fingerprint;
  const set = (patch) => { request.current?.abort(); version.current++; setBusy(false); setError(''); setResult(null); setForm((current) => ({ ...current, ...patch })); };
  useEffect(() => () => { version.current++; request.current?.abort(); }, []);
  useEffect(() => {
    const controller = new AbortController(); setProviderLoading(true); setProviderError('');
    suppliersApi.list({ service_kind: 'insurance', status: 'active' }, controller.signal)
      .then((payload) => { if (!controller.signal.aborted) setProviders(resultsOf(payload)); })
      .catch((failure) => { if (!controller.signal.aborted) setProviderError(failure.message || 'Не удалось загрузить страховые компании'); })
      .finally(() => { if (!controller.signal.aborted) setProviderLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const calculate = async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const id = ++version.current, key = fingerprint;
    let criteria;
    setError(''); setResult(null);
    try { criteria = insuranceCriteria({ ...form, currency: currentCurrency }); }
    catch (failure) { setError(failure.message); return; }
    setBusy(true);
    try {
      const offers = await requestInsuranceQuotes(servicesApi, { kind: 'insurance', ...(orderId ? { order: orderId } : {}), criteria }, { signal: controller.signal });
      if (id === version.current && latest.current === key) setResult({ key, criteria, offers });
    } catch (failure) { if (!controller.signal.aborted && id === version.current) setError(failure.message || 'Не удалось рассчитать страховку'); }
    finally { if (id === version.current) setBusy(false); }
  };
  const choose = async (offer) => {
    if (adding || !result || result.key !== fingerprint) return;
    const key = fingerprint; setAdding(offer.id); setError('');
    try {
      const refreshed = await servicesApi.revalidate(offer.id);
      if (latest.current !== key) return;
      const quote = insuranceQuote(refreshed.offer);
      if (!quote) throw new Error('Страховая компания не подтвердила предложение. Рассчитайте стоимость заново.');
      if (quote.price.amount !== offer.price.amount || quote.price.currency !== offer.price.currency || JSON.stringify(quote.fare) !== JSON.stringify(offer.fare)) {
        setResult((current) => current && ({ ...current, offers: current.offers.map((row) => row.id === offer.id ? quote : row) }));
        setError('Цена или условия изменились. Проверьте обновлённое предложение и выберите его повторно.'); return;
      }
      await onAdd({ ...insuranceSelection(quote, result.criteria, providers), insuredTravellers: form.travellers.map((person) => ({ ...person })), ...(form.travellers.some((person) => person.person_id) ? { insuredPersonIds: form.travellers.map((person) => person.person_id).filter(Boolean) } : {}) }, 'Страховка');
    } catch (failure) { setError(failure.message || 'Не удалось выбрать страховку'); }
    finally { setAdding(null); }
  };
  const visible = result?.key === fingerprint ? result : null;
  return <div className="insurance-search">
    <div className="insurance-search-form">
      <Field label="Страны / территория страхования"><Input value={form.countries} onChange={(event) => set({ countries: event.target.value })} placeholder="Например, Турция, Грузия" /></Field>
      <Field label="Период страхования"><DateRangeField startVal={form.start} endVal={form.end} onChange={(start, end) => set({ start, end })} minDate={new Date()} allowSameDay requireComplete placeholder="Начало — окончание" /></Field>
      <Field label="Застрахованные"><button type="button" className="input insurance-people-trigger" aria-label="Выбрать застрахованных" aria-haspopup="dialog" aria-expanded={peopleOpen} onClick={() => setPeopleOpen(true)}><Icon name="users" /><span>{form.travellers.length} чел.{form.travellers.some((person) => person.name) ? ` · ${form.travellers.map((person) => person.name).filter(Boolean).join(", ")}` : " · выбрать людей"}</span><Icon name="chevRight" /></button></Field>
      <Field label="Гражданство"><Input value={form.citizenship} onChange={(event) => set({ citizenship: event.target.value })} placeholder="Укажите гражданство" /></Field>
      <Field label="Цель поездки"><Select value={form.purpose} onChange={(event) => set({ purpose: event.target.value })} options={[{ value: 'tourism', label: 'Туризм' }, { value: 'business', label: 'Деловая поездка' }, { value: 'study', label: 'Учёба' }, { value: 'sports', label: 'Спорт / активный отдых' }]} /></Field>
      <Field label="Страховое покрытие"><div className="insurance-coverage"><Input type="number" min="1" value={form.coverage} onChange={(event) => set({ coverage: event.target.value })} /><Select aria-label="Валюта страхового покрытия" value={form.coverageCurrency} onChange={(event) => set({ coverageCurrency: event.target.value })} options={['EUR', 'USD'].map((value) => ({ value, label: value }))} /></div></Field>
    </div>
    <div className="insurance-search-actions"><p>Стоимость полиса рассчитывает страховая компания по данным запроса.</p><Button icon="search" onClick={calculate} disabled={busy || providerLoading || !!providerError || !providers.length}>{busy ? 'Рассчитываем…' : 'Рассчитать стоимость'}</Button>{busy && <Button variant="ghost" onClick={() => { request.current?.abort(); version.current++; setBusy(false); }}>Отменить</Button>}</div>
    {providerError && <div className="insurance-search-error" role="alert">{providerError}<Button size="sm" variant="secondary" onClick={() => setRetry((value) => value + 1)}>Повторить</Button></div>}
    {!providerLoading && !providerError && !providers.length && <p role="status">Нет активных страховых компаний. Добавьте страховщика и подключите расчёт в разделе «Поставщики».</p>}
    {error && <p className="insurance-search-error" role="alert">{error}</p>}
    {visible && <section className="insurance-results" aria-label="Предложения страховых компаний"><h3>Предложения страховых компаний</h3>{!visible.offers.length ? <EmptyState icon="shield" title="Предложений нет" sub="Страховые компании не предложили полисы по этим данным. Измените запрос." /> : visible.offers.map((offer) => <div className="insurance-quote" key={offer.id}>
      <div><strong>{providers.find((row) => String(row.id) === String(offer.supplier))?.name || offer.itinerary?.insurer_name || 'Страховая компания'}</strong><span>{offer.itinerary?.program || offer.itinerary?.title || 'Страховка для поездки'}</span>{typeof offer.fare?.coverage === 'string' && <span>{offer.fare.coverage}</span>}{typeof offer.fare?.conditions === 'string' && <span>{offer.fare.conditions}</span>}</div><strong>{formatMoney(offer.price.amount, offer.price.currency)}</strong><Button size="sm" disabled={Boolean(adding)} onClick={() => choose(offer)}>{adding === offer.id ? 'Проверяем…' : addLabel}</Button>
    </div>)}</section>}
    <InsuranceTravellersDrawer open={peopleOpen} onClose={() => setPeopleOpen(false)} travellers={form.travellers} participants={participants} onChange={(travellers) => set({ travellers })} />
  </div>;
}
