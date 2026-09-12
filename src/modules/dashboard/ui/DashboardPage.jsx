import { useState, useEffect } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { ActionMenu } from '../../../shared/ui/ActionMenu.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { FilterChip } from '../../../shared/ui/FilterChip.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { plural } from '../../../shared/ui/plural.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { CURRENT_USER, NOTIFICATIONS, OPERATORS, RETURN_TYPE, financeOverview } from '../../../legacy/data/index.jsx';
import { SLA_QUEUE, slaLabel, slaTone } from '../../../legacy/data/access-control.jsx';
import { UfOrderRow, UfPersonRow, ufOrderPickRows } from '../../clients/index.js';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { PAX_DEFAULT_OPTIONS } from '../../services/index.js';
import { PanelSub, StackPanel } from '../../locations/index.js';
import { AddServicePanel } from '../../orders/index.js';
import { ErrorCodesDrawer } from '../../notifications/index.js';
import { SHIFT_DEMO_OPS, SHIFT_REQUESTS_HANDLED, motivationFor, shiftDate, shiftDuration, shiftFmtTime, shiftTotals } from '../../workforce/index.js';
import { toLegacyProposal, toLegacyReturn } from '../../../legacy/adapters/legacy-adapters.js';
import { messageForApiError, resultsOf } from '../../../shared/api/client.js';
import { communicationsApi } from '../../chats/api.js';
import { integrationsApi } from '../../integrations/api.js';
import { ordersApi } from '../../orders/api.js';
import { proposalsApi } from '../../proposals/api.js';
import { servicesApi } from '../../services/api.js';
import { toUiOrder } from '../../orders/model.js';
import { DashboardKpiGrid } from './DashboardKpiGrid.jsx';
import { OperatorsPerformance } from './OperatorsPerformance.jsx';
import { SalesChart } from './SalesChart.jsx';
import { TodayAgenda } from './TodayAgenda.jsx';
import { WorkCenter } from './WorkCenter.jsx';
import { dashToneColor } from './DashboardCard.jsx';
import { addDays, buildAgenda, dailySeries, formatPercent, isoDayKey, isoDayRange, percentChange, percentTone, sameDay, seriesTotal } from '../model/dashboard-metrics.js';
import { formatMoney, getDefaultCurrency, resolveCurrency } from '../../../shared/lib/money.js';
import { RU_DATE_TIME } from '../../../shared/lib/datetime.js';





function FreeBookingFinalize({ draft, onClose, onDone, onOpenOrder, onNavigate, clients = [], companies = [], orders = [] }) {
  const toast = useToast();
  const [step, setStep] = useState('menu');
  const [entity, setEntity] = useState('legal');
  const [q, setQ] = useState('');
  const [recipient, setRecipient] = useState('');
  const [proposal, setProposal] = useState(null);
  const [busy, setBusy] = useState(false);
  const kpNo = proposal?.number || 'Новое КП';

  const svcTitle = (x) => x.title || x.route || x.fareName || (x.from && x.to ? x.from + ' → ' + x.to : x.kind || 'Услуга');
  const svcSum = (x) => x.fareDeltaUsd || x.total || x.cost || x.price || x.sum || 0;
  const total = draft.reduce((s, x) => s + svcSum(x), 0);
  const finish = (msg, action) => { toast(msg, 'ok', action ? { action, duration: 7000 } : {}); onDone(); };

  const attachDraftToOrder = async (orderId) => {
    await Promise.all(draft.map((svc) => {
      const kindMap = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Отель': 'hotel', 'Трансфер': 'transfer', 'Страховка': 'insurance', 'Виза': 'visa', 'Тур': 'tour', 'Автобус': 'bus' };
      const rawKind = svc.kind || 'avia';
      const kind = kindMap[rawKind] || rawKind;
      const body = {
        kind,
        title: svcTitle(svc),
        currency: resolveCurrency(svc.currency),
        client_total: svcSum(svc),
        supplier_cost: svc.cost || svc.tariff || svcSum(svc),
        agency_fee: svc.fee || 0,
        markup: svc.markup || 0,
      };
      const offerId = svc.offerId || svc.backendOfferId;
      return servicesApi.addToOrder(orderId, offerId ? { offer_id: offerId } : body);
    }));
  };

  const createNewOrder = async (clientName, requestType) => {
    const client = clients.find((item) => item.name === clientName);
    const company = companies.find((item) => item.name === clientName);
    if (!client && !company) { toast('Выберите клиента или компанию из backend-списка', 'err'); return; }
    try {
      const created = await ordersApi.create({
        request_type: requestType === 'Корпоративная' ? 'corporate' : 'individual',
        client_person: client?.id || null,
        client_company: company?.id || null,
        purpose: 'Свободное бронирование',
        base_currency: getDefaultCurrency(),
        source: 'dashboard',
      });
      await attachDraftToOrder(created.id);
      const order = toUiOrder(created);
      toast('Создан заказ № ' + order.no + ' на «' + clientName + '» · услуг: ' + draft.length, 'ok',
        onOpenOrder ? { action: { label: 'Открыть заказ № ' + order.no, onClick: () => onOpenOrder(order) }, duration: 7000 } : {});
      onDone();
    } catch (error) {
      toast(error.message || 'Не удалось создать заказ', 'err');
      return;
    }
  };

  const orderPickRows = (query) => ufOrderPickRows(query, orders);
  const kindCode = (kind) => ({ 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Отель': 'hotel', 'Трансфер': 'transfer', 'Страховка': 'insurance', 'Виза': 'visa', 'Тур': 'tour', 'Автобус': 'bus' }[kind] || kind || 'other');
  const sendDraftToChat = async (order) => {
    setBusy(true);
    try {
      const existing = resultsOf(await communicationsApi.threads({ order: order.id, type: 'client' }))[0];
      const thread = existing || await communicationsApi.createThread({ type: 'client', order: order.id, title: `Заказ № ${order.no}` });
      const lines = draft.map((item, index) => `${index + 1}. ${svcTitle(item)} — ${svcSum(item) || 'цена не указана'} ${resolveCurrency(item.currency)}`);
      await communicationsApi.send(thread.id, { body: `Подборка услуг:\n${lines.join('\n')}` });
      finish(`Подборка отправлена в чат по заказу № ${order.no}`, { label: `Открыть заказ № ${order.no}`, onClick: () => onOpenOrder?.(order) });
    } catch (error) { toast(error.message || 'Не удалось отправить подборку в чат', 'err'); }
    finally { setBusy(false); }
  };
  const createProposal = async (sendNow = false) => {
    setBusy(true);
    try {
      let current = proposal;
      if (!current) {
        const currency = resolveCurrency(draft.find((item) => item.currency)?.currency);
        current = await proposalsApi.create({
          type: 'standard', purpose: 'Свободное бронирование', source: 'dashboard', recipient: recipient.trim(), currency,
          brief: { source: 'dashboard_free_booking' },
          variants: [{ name: 'Вариант 1', items: draft.map((item) => ({
            ...(item.offerId || item.backendOfferId ? { offer: item.offerId || item.backendOfferId } : {}),
            service_kind: kindCode(item.kind), title: svcTitle(item), description: item.supplier || '', quantity: 1,
            price_amount: svcSum(item), price_currency: item.currency || currency,
          })) }],
        });
        current = await proposalsApi.prepare(current.id, current.version);
      }
      if (sendNow) current = await proposalsApi.send(current.id, current.version);
      setProposal(current);
      toast(sendNow ? `КП ${current.number} отправлено клиенту` : `КП ${current.number} сформировано`, 'ok');
    } catch (error) { toast(error.message || 'Не удалось сформировать КП', 'err'); }
    finally { setBusy(false); }
  };
  const proposalPdf = () => proposal ? proposalsApi.pdfUrl(proposal.id, proposal.current_version) : '';
  const openProposalPdf = () => { const url = proposalPdf(); if (url) window.open(url, '_blank', 'noopener,noreferrer'); };
  const copyProposalLink = async () => {
    if (!proposal) return;
    try { await navigator.clipboard.writeText(new URL(proposalPdf(), window.location.origin).href); toast('Ссылка на PDF скопирована', 'ok'); }
    catch { toast('Не удалось скопировать ссылку', 'err'); }
  };


  if (step === 'order') {
    const rows = orderPickRows(q);
    return (
      <Drawer open onClose={onClose} title="Привязать к заказу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <UfOrderRow key={o.id} order={o} onClick={async () => {
              try {
                await attachDraftToOrder(o.id);
                finish('Услуги (' + draft.length + ') привязаны к заказу № ' + o.no);
              } catch (error) {
                toast(error.message || 'Не удалось привязать услуги к заказу', 'err');
              }
            }} />
          ))}
          {!rows.length && <EmptyState icon="briefcase" title="Заказы не найдены" />}
        </div>
      </Drawer>
    );
  }


  if (step === 'chat') {
    const rows = orderPickRows(q);
    return (
      <Drawer open onClose={onClose} title="Отправить в чат по заказу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Подборка ({draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])}) уйдёт в чат выбранного заказа без формирования КП.
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <UfOrderRow key={o.id} order={o} icon="chat" tone="var(--green)" onClick={() => !busy && sendDraftToChat(o)} />
          ))}
          {!rows.length && <EmptyState icon="chat" title="Заказы не найдены" />}
        </div>
      </Drawer>
    );
  }


  if (step === 'person') {
    const list = clients.filter((client) => client.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <Drawer open onClose={onClose} title="Привязать к физ. лицу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск клиента" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((client) => (
            <UfPersonRow key={client.id} name={client.name} onClick={() => createNewOrder(client.name, 'Индивидуальная')} />
          ))}
          {!list.length && <EmptyState icon="user" title="Клиенты не найдены" />}
        </div>
      </Drawer>
    );
  }


  if (step === 'newOrder') {
    const legal = entity === 'legal';
    const list = (legal
      ? companies.map((c) => c.name)
      : clients.map((c) => c.name))
      .filter((n) => n.toLowerCase().includes(q.toLowerCase()));
    return (
      <Drawer open onClose={onClose} title="Создать новый заказ"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          {draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])} будут перенесены в новый заказ на выбранное лицо.
        </div>
        <div className="seg-toggle" style={{ marginBottom: 12 }}>
          <button type="button" className={'seg-btn' + (legal ? ' active' : '')} onClick={() => { setEntity('legal'); setQ(''); }}>Юридическое лицо</button>
          <button type="button" className={'seg-btn' + (!legal ? ' active' : '')} onClick={() => { setEntity('person'); setQ(''); }}>Физическое лицо</button>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder={legal ? 'Поиск компании' : 'Поиск клиента'} style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((name) => (
            <button key={name} type="button" style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => createNewOrder(name, legal ? 'Корпоративная' : 'Индивидуальная')}>
              {legal
                ? <span className="oc-svc-ic" style={{ background: '#2566ff', width: 34, height: 34 }}><Icon name="building" style={{ width: 16, height: 16 }} /></span>
                : <Avatar name={name} size={34} />}
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: 'var(--ink)' }}>{name}</div>
              <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>Создать заказ</span>
              <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
            </button>
          ))}
          {!list.length && <EmptyState icon={legal ? 'building' : 'user'} title={legal ? 'Компании не найдены' : 'Клиенты не найдены'} />}
        </div>
      </Drawer>
    );
  }


  if (step === 'kp') {
    return (
      <Drawer open onClose={onClose} title="Коммерческое предложение"
        footer={<>
          <Button variant="secondary" onClick={() => setStep('menu')}>Назад</Button>
          <Button icon="send" style={{ flex: 1 }} disabled={busy || (proposal && !recipient.trim())} onClick={() => createProposal(Boolean(proposal && recipient.trim()))}>
            {busy ? 'Сохраняем…' : proposal ? 'Отправить клиенту' : 'Сформировать КП'}
          </Button>
        </>}>

        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 40, height: 40, borderRadius: 11 }}><Icon name="template" style={{ width: 20, height: 20 }} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{kpNo}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])} · черновик</div>
          </div>
          <Pill tone="amber">Черновик</Pill>
        </div>

        <PanelSub style={{ marginTop: 0 }}>Получатель</PanelSub>
        <SearchBox value={recipient} onChange={setRecipient} placeholder="Клиент или организация (необязательно)" style={{ width: '100%', marginBottom: 6 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {[...clients.map((client) => client.name), ...companies.map((company) => company.name)].slice(0, 4).map((name) => (
            <button key={name} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => setRecipient(name)}>{name}</button>
          ))}
        </div>

        <PanelSub>Состав предложения</PanelSub>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          {draft.map((x, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < draft.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{svcTitle(x)}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.kind || 'Авиа'}{x.supplier ? ' · ' + x.supplier : ''}</div></div>
              <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{svcSum(x) ? svcSum(x).toLocaleString('ru-RU') + ' $' : '—'}</div>
            </div>
          ))}
          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontWeight: 700, color: 'var(--ink)' }}>
              <span>Итого</span><span>{total.toLocaleString('ru-RU')} $</span>
            </div>
          )}
        </div>

        <PanelSub>Действия с КП</PanelSub>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[['Скачать / открыть PDF', 'download', openProposalPdf], ['Открыть в разделе КП', 'template', () => onNavigate?.('offers')], ['Копировать ссылку', 'docs', copyProposalLink], ['Печать PDF', 'clipboard', openProposalPdf]].map(([label, icon, action]) => (
            <button key={label} className="doc-chip" disabled={!proposal} onClick={action} style={{ width: '100%', opacity: proposal ? 1 : 0.55, cursor: proposal ? 'pointer' : 'not-allowed' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} style={{ width: 16, height: 16 }} />{label}</span>
            </button>
          ))}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open onClose={onClose} title="Оформление свободного бронирования"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>
        В подборке {draft.length} {plural(draft.length, ['услуга', 'услуги', 'услуг'])}. Выберите, что сделать дальше.
      </div>
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        {draft.map((x, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: i < draft.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{svcTitle(x)}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{x.kind || 'Авиа'}{x.supplier ? ' · ' + x.supplier : ''}</div></div>
            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{svcSum(x) ? svcSum(x).toLocaleString('ru-RU') + ' $' : '—'}</div>
          </div>
        ))}
        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontWeight: 700, color: 'var(--ink)' }}>
            <span>Итого</span><span>{total.toLocaleString('ru-RU')} $</span>
          </div>
        )}
      </div>
      <PanelSub style={{ marginTop: 0 }}>Итог</PanelSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button variant="secondary" icon="briefcase" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('order'); }}>Привязать к существующему заказу</Button>
        <Button icon="plus" style={{ width: '100%' }} onClick={() => { setQ(''); setEntity('legal'); setStep('newOrder'); }}>Создать новый заказ (юр. / физ. лицо)</Button>
        <Button variant="secondary" icon="template" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('kp'); }}>Сформировать КП</Button>
        <Button variant="secondary" icon="chat" style={{ width: '100%' }} onClick={() => { setQ(''); setStep('chat'); }}>Отправить в чат по заказу</Button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
        Подбор можно перенести в существующий заказ или сразу создать новый заказ на юридическое / физическое лицо.
      </div>
    </Drawer>
  );
}



function DetailedSearchPanel({ onClose, initialKind, onOpenOrder, onCreateOrder, onNavigate, clients = [], companies = [], orders = [] }) {
  const toast = useToast();
  const [kind, setKind] = useState(initialKind || 'Авиа');
  const [aviaParams, setAviaParams] = useState({ trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null, pax: { adt: 1, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} }, cabin: 'Эконом', baggage: false, flex: false, direct: false, airline: '', ...PAX_DEFAULT_OPTIONS });
  const [draft, setDraft] = useState([]);
  const [finalize, setFinalize] = useState(false);
  const add = (svc, k) => { setDraft((d) => [...d, { kind: k || 'Авиа', ...(svc || {}) }]); toast('Добавлено в свободное бронирование', 'ok'); };
  return (
    <StackPanel title="Свободное бронирование" width="min(1320px,96vw)" onClose={onClose}
      footer={draft.length ? (
        <>
          <div style={{ flex: 1, alignSelf: 'center', color: 'var(--muted)', fontSize: 14 }}>В подборке: <b style={{ color: 'var(--ink)' }}>{draft.length}</b> {plural(draft.length, ['услуга', 'услуги', 'услуг'])}</div>
          <Button variant="secondary" onClick={() => setDraft([])}>Очистить</Button>
          <Button icon="check" onClick={() => setFinalize(true)}>Оформить</Button>
        </>
      ) : null}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        Поиск без привязки к заказу. Можно добавить несколько услуг, затем сформировать КП, привязать к заказу или к физ. лицу.
      </div>
      <AddServicePanel kind={kind} setKind={setKind} aviaParams={aviaParams} setAviaParams={setAviaParams}
        paxCount={aviaParams.pax.adt + aviaParams.pax.chd}
        onAddAvia={(r) => add(r, 'Авиа')}
        onAddOther={(o, k) => add(o, k)} />
      {finalize && <FreeBookingFinalize draft={draft} onClose={() => setFinalize(false)} onDone={() => { setFinalize(false); onClose(); }} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onNavigate={onNavigate} clients={clients} companies={companies} orders={orders} />}
    </StackPanel>
  );
}






const SUPPLIER_STATS = [
  { name: 'Amadeus GDS',      apiErrors: 3, failed: 2, retries: 5, avgResp: '1.8 с', lastOk: '2 мин назад', lastErr: '4 мин назад', services: 'Авиа', integ: 'Частичные ошибки', crit: 'Критическая', ordersAffected: 2, tone: 'red' },
  { name: 'Sirena',          apiErrors: 0, failed: 0, retries: 0, avgResp: '0.9 с', lastOk: 'только что', lastErr: '—', services: 'Авиа, ЖД', integ: 'Работает стабильно', crit: '—', ordersAffected: 0, tone: 'green' },
  { name: 'Ratehawk',        apiErrors: 1, failed: 0, retries: 2, avgResp: '2.4 с', lastOk: '1 мин назад', lastErr: '12 мин назад', services: 'Гостиницы', integ: 'Замедление', crit: 'Информационная', ordersAffected: 0, tone: 'amber' },
  { name: 'Air Astana (NDC)', apiErrors: 0, failed: 1, retries: 1, avgResp: '1.2 с', lastOk: 'только что', lastErr: '38 мин назад', services: 'Авиа', integ: 'Работает стабильно', crit: 'Важная', ordersAffected: 1, tone: 'green' },
  { name: 'Qatar (API)',     apiErrors: 2, failed: 1, retries: 3, avgResp: '3.1 с', lastOk: '5 мин назад', lastErr: '2 мин назад', services: 'Авиа', integ: 'Авторизация истекла', crit: 'Критическая', ordersAffected: 1, tone: 'amber' },
];
const ERR_CRIT_TONE = { 'Критическая': 'red', 'Важная': 'amber', 'Информационная': 'gray' };
const INTEG_TONE = { 'Работает стабильно': 'green', 'Замедление': 'amber', 'Частичные ошибки': 'amber', 'Недоступен': 'red', 'Авторизация истекла': 'red', 'Технические работы': 'blue', 'Отключён вручную': 'gray' };

const SUPPLIER_ERRORS = [
  { id: 'E-4821', supplier: 'Amadeus GDS', service: 'Авиа', op: 'Бронирование', time: '14.07.2026 11:38', order: 51170, orderTL: 'до 18:40', client: 'Гранд лимитед', operator: 'Даниель', code: 'AMA-3021', crmCode: 'BOOK_TIMEOUT', crit: 'Критическая', reason: 'Тайм-аут ответа при подтверждении брони — место удержано до 18:40.', tech: 'HTTP 504 Gateway Timeout · reqId=amx-9f2a11 · endpoint /v2/booking/confirm', repeats: 4, first: '14.07 09:05', last: '14.07 11:38', impact: 'Не завершена выписка билета', status: 'Новая' },
  { id: 'E-4822', supplier: 'Qatar (API)', service: 'Авиа', op: 'Выписка', time: '14.07.2026 11:36', order: 51171, orderTL: 'до 16:00', client: 'Асылов Айбек', operator: 'Адилет Медербеков', code: 'QR-401', crmCode: 'AUTH_EXPIRED', crit: 'Критическая', reason: 'Токен авторизации истёк — требуется переподключение интеграции.', tech: 'HTTP 401 Unauthorized · reqId=qr-55c1 · token expired', repeats: 28, first: '14.07 08:12', last: '14.07 11:36', impact: 'Выписка невозможна по 6 заказам', status: 'В работе' },
  { id: 'E-4823', supplier: 'Qatar (API)', service: 'Авиа', op: 'Проверка цены', time: '14.07.2026 11:20', order: null, orderTL: null, client: '—', operator: 'Даниель', code: 'QR-409', crmCode: 'PRICE_CHANGED', crit: 'Важная', reason: 'Стоимость изменилась с момента последнего поиска.', tech: 'HTTP 409 Conflict · priceDelta=+18$', repeats: 3, first: '14.07 10:40', last: '14.07 11:20', impact: 'Требуется переподтверждение цены', status: 'Новая' },
  { id: 'E-4824', supplier: 'Ratehawk', service: 'Гостиницы', op: 'Поиск', time: '14.07.2026 11:02', order: null, orderTL: null, client: '—', operator: '—', code: 'RH-503', crmCode: 'SUPPLIER_SLOW', crit: 'Информационная', reason: 'Замедление ответа поставщика (>2.4 с).', tech: 'HTTP 200 · latency=2410ms', repeats: 1, first: '14.07 11:02', last: '14.07 11:02', impact: 'Без влияния на заказ', status: 'Новая' },
  { id: 'E-4825', supplier: 'Amadeus GDS', service: 'Авиа', op: 'Отмена', time: '14.07.2026 10:50', order: 51155, orderTL: null, client: 'ИП Мамажанов', operator: 'Даниель', code: 'AMA-3021', crmCode: 'BOOK_TIMEOUT', crit: 'Важная', reason: 'Тайм-аут при аннуляции — повторите операцию.', tech: 'HTTP 504 Gateway Timeout · reqId=amx-77b2', repeats: 4, first: '14.07 09:05', last: '14.07 10:50', impact: 'Аннуляция не подтверждена', status: 'Отложена' },
];
const ENABLE_DEMO_BUSINESS_DATA = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
if (!ENABLE_DEMO_BUSINESS_DATA) {
  SUPPLIER_STATS.splice(0, SUPPLIER_STATS.length);
  SUPPLIER_ERRORS.splice(0, SUPPLIER_ERRORS.length);
}


const ERR_STATUS_TONE = { 'Новая': 'red', 'В работе': 'blue', 'Отложена': 'amber', 'Решена': 'green' };
function errNow() { return new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function errCurOp() { return (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) || 'Оператор'; }
function errLog(err, text) { (err.history = err.history || []).push({ t: errNow(), text, who: errCurOp() }); }
function errActiveCount() { return SUPPLIER_ERRORS.filter((e) => e.status !== 'Решена').length; }
function errPushNotif(err, title, desc) {
  if (typeof NOTIFICATIONS === 'undefined') return;

  if (NOTIFICATIONS.some((n) => n.link && n.link.errId === err.id && n.title === title)) return;
  NOTIFICATIONS.unshift({ id: 'NE-' + Math.random().toString(36).slice(2, 6), cat: 'Интеграции', priority: err.crit === 'Критическая' ? 'Критический' : 'Важный',
    source: 'Интеграции', title, desc, time: 'сейчас', order: err.order || null, resp: err.assignee || err.operator,
    link: { type: 'error', errId: err.id }, act: 'Открыть ошибку', read: false, pinned: err.crit === 'Критическая' });
}

function errRetry(err) {
  err.attempts = (err.attempts || err.repeats || 0) + 1; err.lastTry = errNow();
  errLog(err, 'Повторный запрос отправлен поставщику (попытка ' + err.attempts + ')');
  const unfixable = err.crmCode === 'AUTH_EXPIRED';
  const success = !unfixable && (err.attempts % 2 === 0 || err.crmCode === 'PRICE_CHANGED' || err.crmCode === 'SUPPLIER_SLOW');
  if (success) { err.status = 'Решена'; err.resolvedBy = errCurOp(); err.resolvedAt = errNow(); errLog(err, 'Повтор успешен — ошибка закрыта автоматически'); }
  else { if (err.status === 'Новая') err.status = 'В работе'; errLog(err, unfixable ? 'Повтор не помог: истекла авторизация — требуется переподключение интеграции' : 'Повтор не удался — ошибка остаётся активной'); }
  return success;
}
function errAssign(err, who) { err.assignee = who; if (err.status === 'Новая') err.status = 'В работе'; errLog(err, 'Назначен ответственный: ' + who); errPushNotif(err, 'Вам назначена ошибка ' + err.id, err.reason); }
function errResolve(err) { err.status = 'Решена'; err.resolvedBy = errCurOp(); err.resolvedAt = errNow(); errLog(err, 'Ошибка отмечена решённой'); }
function errReopen(err) { err.status = 'В работе'; err.snoozeUntil = null; err.resolvedBy = null; errLog(err, 'Ошибка возвращена в работу'); }
function errSnooze(err, label) { err.status = 'Отложена'; err.snoozeUntil = label; errLog(err, 'Обработка отложена: ' + label + ' (по истечении вернётся в работу с повышением приоритета)'); }
function errChooseSupplier(err, sup) { err.altSupplier = sup; if (err.status === 'Новая') err.status = 'В работе'; errLog(err, 'Выбран другой поставщик: ' + sup + ' — операция будет переоформлена через него'); }
function errSendDev(err) { err.devTicket = err.devTicket || ('DEV-' + (4000 + Math.floor(Math.random() * 900))); errLog(err, 'Передано разработчику · тикет ' + err.devTicket); errPushNotif(err, 'Ошибка ' + err.id + ' передана разработчику', err.crmCode + ' · ' + err.code); }
function errAltSuppliers(err) { return SUPPLIER_STATS.map((s) => s.name).filter((n) => n !== err.supplier); }

const OPERATORS_WORK = [
  { name: 'Даниель',           handled: 21, orders: 6, issued: 8, earn: 142, profit: 470, sla: 'ok' },
  { name: 'Куба',              handled: 17, orders: 4, issued: 5, earn: 96,  profit: 320, sla: 'red' },
  { name: 'Адилет Медербеков',  handled: 14, orders: 5, issued: 6, earn: 88,  profit: 260, sla: 'ok' },
  { name: 'Кими Райкконен',     handled: 9,  orders: 2, issued: 3, earn: 54,  profit: 140, sla: 'amber' },
];
const MY_TASKS = [
  { title: 'Выписать билеты по заказу № 51170', due: 'до 18:00',  tone: 'red',   order: 51170 },
  { title: 'Ответить клиенту в чате · Гранд лимитед', due: '15 мин', tone: 'red', order: 51162 },
  { title: 'Согласовать КП-1033 с клиентом', due: 'сегодня', tone: 'amber', order: 51156 },
  { title: 'Загрузить паспорт · Аттокуров Эрбол', due: 'до 15.06', tone: 'amber', order: 51163 },
];



const INCIDENT_STATUS_LABEL = { open: 'Новая', assigned: 'В работе', retrying: 'В работе', reopened: 'В работе', escalated: 'В работе', snoozed: 'Отложена', resolved: 'Решена' };
const INCIDENT_SEVERITY_LABEL = { critical: 'Критическая', high: 'Важная', medium: 'Важная', low: 'Информационная', info: 'Информационная' };
function backendIncidentToUi(row, { orders = [], suppliers = [], users = [], services = [] } = {}) {
  const supplier = suppliers.find((item) => String(item.id || item.no) === String(row.supplier));
  const order = orders.find((item) => String(item.id) === String(row.order));
  const service = services.find((item) => String(item.id || item.serverId) === String(row.service));
  const assignee = users.find((item) => String(item.id) === String(row.assignee));
  const created = row.created_at ? new Date(row.created_at) : null;
  const updated = row.updated_at ? new Date(row.updated_at) : created;
  return {
    backend: true, backendId: row.id, raw: row, id: `INC-${row.id}`,
    supplier: supplier?.name || row.provider_adapter || 'Поставщик не указан', supplierId: row.supplier || null,
    service: service?.kind || service?.title || (row.service ? String(row.service) : '—'), op: row.operation || 'Операция API',
    time: created ? created.toLocaleString('ru-RU', RU_DATE_TIME) : '—', order: order?.no || null, orderId: row.order || null,
    client: order?.client || '—', operator: order?.operator || '—', assignee: assignee?.name || '', assigneeId: row.assignee || null,
    code: row.correlation_id || '—', crmCode: row.error_code || 'UNKNOWN', crit: INCIDENT_SEVERITY_LABEL[row.severity] || row.severity,
    reason: row.sanitized_error || row.error_code || 'Ошибка интеграции', tech: [row.sanitized_error, row.correlation_id ? `correlation_id=${row.correlation_id}` : ''].filter(Boolean).join('\n'),
    repeats: Number(row.retry_count || row.occurrences || 0), attempts: Number(row.retry_count || 0),
    first: created ? created.toLocaleString('ru-RU') : '—', last: updated ? updated.toLocaleString('ru-RU', RU_DATE_TIME) : '—', impact: order ? `Затронут заказ № ${order.no}` : 'Заказ не связан',
    status: INCIDENT_STATUS_LABEL[row.status] || row.status, snoozeUntil: row.snoozed_until ? new Date(row.snoozed_until).toLocaleString('ru-RU', RU_DATE_TIME) : null,
    altSupplier: suppliers.find((item) => String(item.id || item.no) === String(row.fallback_supplier))?.name || '',
    devTicket: row.developer_ticket || '', resolutionCode: row.resolution_code || '',
    history: (row.timeline || []).map((entry) => ({ t: new Date(entry.created_at).toLocaleString('ru-RU', RU_DATE_TIME), text: entry.action, who: entry.actor_name || 'Система' })),
  };
}

function SupplierErrorCard({ err, onClose, onOpenOrder, onChange, users = [], suppliers = [] }) {
  const toast = useToast();
  const [showTech, setShowTech] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const rerender = () => { force((x) => x + 1); onChange && onChange(); };
  const resolved = err.status === 'Решена';

  const applyBackend = async (request, message) => {
    setBusy(true);
    try {
      const result = await request();
      onChange?.(result?.id ? result : { ...err.raw, status: 'retrying', retry_count: Number(err.raw?.retry_count || 0) + 1 }, err.backendId);
      toast(message, 'ok');
    } catch (error) { toast(error.message || 'Не удалось выполнить действие', 'err'); }
    finally { setBusy(false); }
  };
  const doRetry = () => err.backend
    ? applyBackend(() => integrationsApi.retry(err.backendId), 'Повторный запрос поставлен в очередь')
    : (() => { const ok = errRetry(err); rerender(); toast(ok ? 'Повтор успешен — ошибка закрыта' : 'Повтор выполнен — ошибка ещё активна', ok ? 'ok' : 'warn'); })();
  const doAssign = (person) => err.backend
    ? applyBackend(() => integrationsApi.assign(err.backendId, person.id), `Назначен: ${person.name}`)
    : (() => { errAssign(err, person.name || person); rerender(); toast('Назначен: ' + (person.name || person), 'ok'); })();
  const doSupplier = (supplier) => err.backend
    ? applyBackend(() => integrationsApi.switchSupplier(err.backendId, supplier.id || supplier.no), `Поставщик переключён: ${supplier.name}`)
    : (() => { errChooseSupplier(err, supplier.name || supplier); rerender(); toast('Поставщик переключён: ' + (supplier.name || supplier), 'ok'); })();
  const doSnooze = (minutes, label) => err.backend
    ? applyBackend(() => integrationsApi.snooze(err.backendId, new Date(Date.now() + minutes * 60000).toISOString()), `Отложено: ${label}`)
    : (() => { errSnooze(err, label); rerender(); toast('Отложено: ' + label, 'info'); })();
  const doResolve = () => err.backend
    ? applyBackend(() => integrationsApi.resolve(err.backendId, 'resolved_manually'), 'Инцидент закрыт')
    : (() => { errResolve(err); rerender(); toast('Ошибка закрыта и убрана из активных', 'ok'); })();
  const doReopen = () => err.backend
    ? applyBackend(() => integrationsApi.reopen(err.backendId), 'Инцидент возвращён в работу')
    : (() => { errReopen(err); rerender(); toast('Ошибка возвращена в работу', 'info'); })();
  const doDev = () => err.backend
    ? applyBackend(() => integrationsApi.escalate(err.backendId, { developer_ticket: `incident-${err.backendId}` }), 'Инцидент передан разработчику')
    : (() => { errSendDev(err); rerender(); toast('Передано разработчику · тикет ' + err.devTicket, 'ok'); })();
  const doCopy = async () => { try { await navigator.clipboard.writeText(err.tech || ''); toast('Технические данные скопированы', 'ok'); } catch { toast('Не удалось скопировать данные', 'err'); } };

  const kv = [
    ['Поставщик', err.altSupplier ? err.supplier + ' → ' + err.altSupplier : err.supplier], ['Тип услуги', err.service], ['Операция', err.op],
    ['Дата и время', err.time], ['Номер заказа', err.order ? '№ ' + err.order : '—'],
    ['Клиент', err.client], ['Оператор', err.operator],
    ['Ответственный', err.assignee || 'не назначен'],
    ['Код поставщика', err.code], ['Внутренний код CRM', err.crmCode],
    ['Попыток повтора', String(err.attempts != null ? err.attempts : err.repeats)], ['Первое возникновение', err.first], ['Последнее', err.last],
    ['Влияние на заказ', err.impact],
    err.devTicket ? ['Тех-тикет', err.devTicket] : null,
    err.snoozeUntil ? ['Отложено', err.snoozeUntil] : null,
    resolved ? ['Закрыл', (err.resolvedBy || errCurOp()) + ' · ' + (err.resolvedAt || '')] : null,
  ].filter(Boolean);

  return (
    <Drawer open onClose={onClose} width="min(720px,96vw)" title={'Ошибка ' + err.id} sub={err.supplier + ' · ' + err.op}
      footer={<>
        <Button variant="secondary" icon="zap" disabled={resolved || busy} onClick={doRetry}>Повторить запрос</Button>
        {err.order && <Button variant="secondary" icon="orders" onClick={() => { onOpenOrder && onOpenOrder(err.order); onClose(); }}>Открыть заказ</Button>}
        {resolved
          ? <Button variant="secondary" icon="refund" disabled={busy} onClick={doReopen}>Вернуть в работу</Button>
          : <Button variant="primary" icon="check" disabled={busy} onClick={doResolve}>Отметить решённой</Button>}
      </>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <Pill tone={ERR_STATUS_TONE[err.status] || 'gray'}>Статус: {err.status}</Pill>
        <Pill tone={ERR_CRIT_TONE[err.crit] || 'gray'}>Критичность: {err.crit}</Pill>
        {err.assignee && <Pill tone="blue">Ответственный: {err.assignee}</Pill>}
        {err.order && <Pill tone="red">Затронут заказ № {err.order}{err.orderTL ? ' · ' + err.orderTL : ''}</Pill>}
      </div>
      <div className="card card-pad" style={{ marginBottom: 14, background: 'var(--surface-2)' }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Причина</div>
        <div style={{ fontSize: 14, color: 'var(--body)' }}>{err.reason}</div>
      </div>
      <div className="kv" style={{ marginBottom: 14 }}>
        {kv.map(([k, v], i) => <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>)}
      </div>


      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>Действия</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="zap" disabled={resolved || busy} onClick={doRetry}>Повторно проверить цену и наличие</Button>
        <ActionMenu trigger={<Button variant="secondary" size="sm" icon="suppliers" disabled={resolved}>Выбрать другого поставщика</Button>}
          items={(err.backend ? suppliers.filter((item) => String(item.id || item.no) !== String(err.supplierId)) : errAltSuppliers(err).map((name) => ({ name }))).map((supplier) => ({ icon: 'suppliers', label: supplier.name, onClick: () => doSupplier(supplier) }))} />
        <ActionMenu trigger={<Button variant="secondary" size="sm" icon="user" disabled={resolved}>Назначить ответственного</Button>}
          items={(err.backend ? users : (typeof OPERATORS !== 'undefined' ? OPERATORS.map((name) => ({ name })) : [])).map((person) => ({ icon: 'user', label: person.name, onClick: () => doAssign(person) }))} />
        <ActionMenu trigger={<Button variant="secondary" size="sm" icon="clock" disabled={resolved}>Отложить обработку</Button>}
          items={[[30, '30 минут'], [120, '2 часа'], [1440, 'до завтра']].map(([minutes, label]) => ({ icon: 'clock', label, onClick: () => doSnooze(minutes, label) }))} />
        <Button variant="secondary" size="sm" icon="template" onClick={doCopy}>Скопировать технические данные</Button>
        <Button variant="secondary" size="sm" icon="send" onClick={doDev}>Отправить разработчику</Button>
      </div>


      <button className="doc-chip" onClick={() => setShowTech((s) => !s)} style={{ width: '100%' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="template" style={{ width: 16, height: 16 }} />Технический ответ API</span>
        <Icon name={showTech ? 'chevUp' : 'chevDown'} />
      </button>
      {showTech && (
        <div style={{ marginTop: 8, padding: 12, borderRadius: 10, background: '#0e1726', color: '#c7d2e0', fontFamily: 'monospace', fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {err.tech}
        </div>
      )}


      {err.history && err.history.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>История обработки</div>
          <div style={{ display: 'grid', gap: 7 }}>
            {err.history.slice().reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted-2)', flexShrink: 0, minWidth: 92 }}>{h.t}</span>
                <span style={{ color: 'var(--body)', flex: 1 }}>{h.text}</span>
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{h.who}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function SupplierErrorsDrawer({ supplier, onClose, onOpenOrder, errors, users = [], suppliers = [], onIncidentChange }) {
  const [flt, setFlt] = useState({ supplier: supplier || '', service: '', op: '', crit: '', status: '', activeOnly: false, grouped: true });
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [, bump] = useState(0);
  const sourceErrors = errors || SUPPLIER_ERRORS;
  let list = sourceErrors.filter((e) =>
    (!flt.supplier || e.supplier === flt.supplier) &&
    (!flt.service || e.service === flt.service) &&
    (!flt.op || e.op === flt.op) &&
    (!flt.crit || e.crit === flt.crit) &&
    (!flt.status || e.status === flt.status) &&
    (!flt.activeOnly || !!e.order) &&
    (!q || (String(e.order || '') + e.code + e.supplier + e.reason).toLowerCase().includes(q.toLowerCase())));

  let groups = null;
  if (flt.grouped) {
    const m = {};
    list.forEach((e) => { (m[e.code] = m[e.code] || []).push(e); });
    groups = Object.keys(m).map((code) => ({ code, items: m[code] }));
  }
  const critOrder = { 'Критическая': 0, 'Важная': 1, 'Информационная': 2 };
  list = [...list].sort((a, b) => (critOrder[a.crit] - critOrder[b.crit]) || (b.order ? 1 : 0) - (a.order ? 1 : 0));

  const chip = (label, key, opts) => (
    <FilterChip label={label} options={opts} value={flt[key]} onChange={(v) => setFlt((f) => ({ ...f, [key]: v }))} />
  );
  const errRow = (e) => (
    <div key={e.id} onClick={() => setSel(e)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--field-line)', cursor: 'pointer', background: 'var(--surface)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--' + (ERR_CRIT_TONE[e.crit] || 'gray') + ')', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{e.reason}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{e.supplier} · {e.op} · {e.time}{e.order ? ' · заказ № ' + e.order : ''}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <Pill tone={ERR_STATUS_TONE[e.status] || 'gray'}>{e.status}</Pill>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {e.assignee && <span style={{ fontSize: 11, color: 'var(--blue)' }}>{e.assignee}</span>}
          <Pill tone={ERR_CRIT_TONE[e.crit] || 'gray'}>{e.crit}</Pill>
        </div>
      </div>
    </div>
  );
  return (
    <Drawer open onClose={onClose} width="min(920px,97vw)"
      title="Ошибки поставщиков" sub={(flt.supplier || 'Все поставщики') + ' · активных: ' + list.filter((e) => e.status !== 'Решена').length}
      footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {chip('Поставщик', 'supplier', [...new Set(sourceErrors.map((e) => e.supplier))])}
        {chip('Тип услуги', 'service', [...new Set(sourceErrors.map((e) => e.service))])}
        {chip('Операция', 'op', [...new Set(sourceErrors.map((e) => e.op))])}
        {chip('Критичность', 'crit', ['Критическая', 'Важная', 'Информационная'])}
        {chip('Статус', 'status', [...new Set(sourceErrors.map((e) => e.status))])}
        <div className="topbar-spacer" />
        <SearchBox value={q} onChange={setQ} placeholder="Заказ, код, поставщик" style={{ width: 220 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--body)' }}>
          <Checkbox on={flt.activeOnly} onChange={() => setFlt((f) => ({ ...f, activeOnly: !f.activeOnly }))} />Только по активным заказам
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--body)' }}>
          <Checkbox on={flt.grouped} onChange={() => setFlt((f) => ({ ...f, grouped: !f.grouped }))} />Группировать одинаковые
        </label>
      </div>
      {list.length === 0 && <EmptyState icon="check" title="Активных ошибок нет" sub="По выбранным фильтрам ошибок не найдено" />}
      {flt.grouped
        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {groups.filter((g) => g.items.some((e) => list.includes(e))).map((g) => {
              const items = g.items.filter((e) => list.includes(e));
              const head = items[0];
              const totalRepeats = items.reduce((s, e) => s + e.repeats, 0);
              const ordersAff = new Set(items.filter((e) => e.order).map((e) => e.order)).size;
              return (
                <div key={g.code}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                    <Pill tone={ERR_CRIT_TONE[head.crit] || 'gray'}>{head.crmCode}</Pill>
                    {head.reason.split('—')[0].trim()} — {totalRepeats} повторений{ordersAff ? ' · затронуто ' + ordersAff + ' заказ(ов)' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{items.map(errRow)}</div>
                </div>
              );
            })}
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{list.map(errRow)}</div>}
      {sel && <SupplierErrorCard err={sel} users={users} suppliers={suppliers} onClose={() => setSel(null)} onOpenOrder={onOpenOrder} onChange={(raw, id) => { onIncidentChange?.(raw, id); setSel(null); bump((v) => v + 1); }} />}
    </Drawer>
  );
}


const WORK_TAB_ROUTE = { attention: 'orders', newreq: 'orders', deadlines: 'orders', approvals: 'offers' };
const ORDER_CLOSED_STATUS = ['completed', 'cancelled'];
const serviceSales = (service) => Number(service.calc?.total ?? service.client_total ?? service.sum ?? 0);
const serviceProfit = (service) => Number(service.calc?.total ?? service.client_total ?? 0) - Number(service.calc?.tariff ?? service.supplier_cost ?? 0);

function DashboardPage({ role, user, orders = [], orderServices = [], clients = [], companies = [], proposals = [], returns = [], chats = [], dashboard, calendar, finance, resources, incidents = [], slaQueue = [], currentShift, motivationAccruals = [], users = [], suppliers = [], onNavigate, onAddOrder, onOpenOrder, onCreateOrder, onOpenChat, onReload }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [errCodeOpen, setErrCodeOpen] = useState(null);
  const [errDrawer, setErrDrawer] = useState(null);
  const [incidentRows, setIncidentRows] = useState(incidents);
  const [, tick] = useState(0);

  const isMgr = role === 'Админ' || role === 'Менеджер' || role === 'Руководитель';
  const backendMode = !ENABLE_DEMO_BUSINESS_DATA;
  const [tab, setTab] = useState('attention');
  const [agendaDay, setAgendaDay] = useState(() => new Date());
  const today = new Date();
  const shiftSource = window.SHIFT_STATE || currentShift || null;
  const openedAt = shiftDate(shiftSource?.openedAt || shiftSource?.started_at);
  const shift = shiftSource && openedAt ? { ...shiftSource, openedAt } : null;

  useEffect(() => {
    const onShift = () => tick((t) => t + 1);
    window.addEventListener('shift-change', onShift);
    const id = setInterval(() => tick((t) => t + 1), 60000);
    return () => { window.removeEventListener('shift-change', onShift); clearInterval(id); };
  }, []);

  useEffect(() => { setIncidentRows(incidents); }, [incidents]);

  const money = (n) => formatMoney(n);
  const liveProposals = proposals.map((item) => toLegacyProposal(item, orders));
  const liveReturns = returns.map((item) => toLegacyReturn(item, orders));
  const receivable = dashboard?.finance?.receivable || finance?.client_receivable || [];
  const fin = backendMode ? {
    deposits: 0,
    debt: receivable.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    overdue: 0,
    overdueCount: dashboard?.finance?.overdue_obligations || 0,
    urgent: [],
  } : financeOverview();
  const slaSource = backendMode ? slaQueue.map((entry) => {
    const order = orders.find((item) => String(item.id) === String(entry.resource_id));
    const limit = Number(entry.limit_minutes || user?.slaResponseMin || 15);
    const waited = entry.started_at ? Math.max(0, Math.round((Date.now() - new Date(entry.started_at).getTime()) / 60000)) : 0;
    return { no: order?.no || entry.resource_id, client: order?.client || entry.resource_type, operator: order?.operator || 'Не назначен', waited, limit, breached: entry.breached };
  }) : SLA_QUEUE;
  const slaRows = slaSource.map((q) => ({ ...q, tone: q.breached ? 'red' : slaTone(q.waited, q.limit) }));
  const slaOverdue = slaRows.filter((r) => r.tone === 'red').length;
  const supErrTotal = backendMode ? incidentRows.filter((item) => item.status !== 'resolved').length : errActiveCount();

  const taskRows = backendMode ? (dashboard?.my_tasks || []).map((task) => {
    const order = orders.find((item) => item.id === task.order);
    const due = task.due_at ? new Date(task.due_at) : null;
    return { title: task.title, due: due ? due.toLocaleString('ru-RU') : 'без срока', tone: task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'amber' : 'blue', order: order?.no || task.order };
  }) : MY_TASKS;
  const activeIncidents = incidentRows.map((row) => backendIncidentToUi(row, { orders, suppliers, users, services: orderServices }));
  const operatorRows = backendMode ? users.map((operator) => {
    const operatorOrders = orders.filter((order) => String(order.operatorId || order.operator) === String(operator.id));
    const operatorServices = orderServices.filter((service) => operatorOrders.some((order) => String(order.id) === String(service.orderId || service.order)));
    const accruals = motivationAccruals.filter((item) => String(item.user) === String(operator.id) && !item.reversed_at);
    const breached = slaQueue.some((entry) => String(entry.assignee) === String(operator.id) && entry.breached);
    const orderedIn = (days, from) => operatorOrders.filter((order) => isoDayRange(days, from).includes(isoDayKey(order.created_at))).length;
    return { id: operator.id, name: operator.name, handled: slaQueue.filter((entry) => String(entry.assignee) === String(operator.id)).length, orders: operatorOrders.length, issued: operatorServices.filter((service) => service.status === 'Выписано' || service.status === 'issued').length, earn: accruals.reduce((sum, item) => sum + Number(item.amount || 0), 0), profit: operatorServices.reduce((sum, service) => sum + Number(service.calc?.total || service.client_total || 0) - Number(service.calc?.tariff || service.supplier_cost || 0), 0), sla: breached ? 'red' : 'ok', last7: orderedIn(7, today), prev7: orderedIn(7, addDays(today, -7)) };
  }) : OPERATORS_WORK;


  const todayKey = new Date().toISOString().slice(0, 10);
  const todayServices = backendMode ? orderServices.filter((service) => String(service.created_at || '').slice(0, 10) === todayKey) : [];
  const shOps = backendMode ? [] : (shift ? shift.ops : SHIFT_DEMO_OPS);
  const shT = backendMode ? {
    orders: new Set(todayServices.map((service) => service.orderId || service.order)).size,
    earn: motivationAccruals.filter((item) => !item.reversed_at && String(item.created_at || '').slice(0, 10) === todayKey).reduce((sum, item) => sum + Number(item.amount || 0), 0),
    profit: todayServices.reduce((sum, service) => sum + Number(service.calc?.total || service.client_total || 0) - Number(service.calc?.tariff || service.supplier_cost || 0), 0),
  } : shiftTotals(shOps, motivationFor(user?.name || 'Оператор'));
  const issuedToday = backendMode ? todayServices.filter((service) => service.status === 'Выписано' || service.status === 'issued').length : shOps.filter((o) => o.type === 'Выписка').length;
  const salesToday = backendMode ? todayServices.reduce((sum, service) => sum + Number(service.calc?.total || service.client_total || service.sum || 0), 0) : shOps.reduce((sum, operation) => sum + Math.max(0, operation.cost), 0);

  const isActive = (s) => s !== 'Завершено' && s !== 'Отменено' && s !== 'Отклонено';
  const returnsActive = liveReturns.filter((r) => isActive(r.status));
  const approvals = [
    ...liveProposals.filter((p) => p.status === 'На согласовании' || p.status === 'Отправлено клиенту').map((p) => ({ label: p.id, who: p.client, kind: 'КП', order: p.order })),
    ...liveReturns.filter((r) => r.status === 'Ожидает согласования клиента').map((r) => ({ label: r.no + ' · ' + r.type, who: r.client, kind: 'Возврат', order: r.order })),
  ];
  const deadlines = [
    ...returnsActive.map((r) => ({ label: r.type + ' · ' + r.no, who: r.client, date: r.deadline, tone: 'red', order: r.order, icon: 'refund' })),
    ...liveProposals.filter((p) => p.validUntil && p.status !== 'Согласовано' && p.status !== 'Отклонено').map((p) => ({ label: 'Срок КП · ' + p.id, who: p.client, date: p.validUntil, tone: 'amber', order: p.order, icon: 'template' })),
  ];

  const openErr = (code) => setErrCodeOpen(code || '');
  const goOrder = (reference) => { const order = orders.find((item) => String(item.no) === String(reference) || String(item.id) === String(reference)); order ? onOpenOrder(order) : onNavigate('orders'); };
  const updateIncident = (raw, id) => setIncidentRows((current) => current.map((item) => String(item.id) === String(id) ? { ...item, ...raw } : item));

  const dashChats = chats.filter((t) => t.type === 'client' || t.type === 'supplier').map((t) => {
    const m = (t.messages || [])[(t.messages || []).length - 1] || {};
    return { id: t.id, order: t.order, name: t.name, client: t.client, channel: t.channel, type: t.type, unread: t.unread || 0,
      lastText: m.text || (m.attach ? '📎 ' + m.attach.name : '—'), lastTime: m.time || '', mine: m.from === 'me' };
  }).sort((a, b) => (b.unread > 0) - (a.unread > 0));
  const critErr = backendMode ? activeIncidents.filter((error) => error.crit === 'Критическая' && error.status !== 'Решена') : (typeof SUPPLIER_ERRORS !== 'undefined' ? SUPPLIER_ERRORS : []).filter((e) => e.crit === 'Критическая');
  const redRisk = fin.urgent.filter((u) => u.tone === 'red');
  const tonePri = { red: 0, amber: 1, teal: 2, blue: 3, green: 4, gray: 5 };


  // ——— Рабочий центр: одни и те же источники, что и раньше, сгруппированные по вкладкам ———
  const attention = [];
  if (isMgr) {
    slaRows.filter((r) => r.tone !== 'green').forEach((r) => attention.push({ icon: 'inbox', tone: r.tone, title: 'Заявка ждёт отклик', sub: '№' + r.no + ' · Клиент: ' + r.client, right: r.waited + ' мин', order: r.no, cat: 'newreq' }));
    critErr.forEach((e) => attention.push({ icon: 'api', tone: 'red', title: e.reason, sub: e.supplier + (e.order ? ' · №' + e.order : ''), right: e.orderTL || 'критично', order: null, supplier: e.supplier, cat: 'suppliers' }));
    returnsActive.forEach((r) => attention.push({ icon: RETURN_TYPE[r.type] ? RETURN_TYPE[r.type].icon : 'refund', tone: 'amber', title: r.type + ' · ' + r.no, sub: [r.client, r.service].filter(Boolean).join(' · '), right: r.status, order: r.order, cat: 'returns' }));
    redRisk.forEach((u) => attention.push({ icon: 'bank', tone: 'red', title: u.co, sub: u.text, right: money(u.value), order: null, cat: 'overdue' }));
    deadlines.filter((d) => d.tone === 'red').forEach((d) => attention.push({ icon: d.icon, tone: 'red', title: d.label, sub: d.who, right: d.date, order: d.order, cat: 'deadlines' }));
    approvals.slice(0, 2).forEach((a) => attention.push({ icon: 'template', tone: 'amber', title: 'Согласование · ' + a.label, sub: a.who, right: a.kind, order: a.order, cat: 'approvals' }));
  } else {
    taskRows.forEach((t) => attention.push({ icon: 'clipboard', tone: t.tone, title: t.title, sub: 'Заказ №' + t.order, right: t.due, order: t.order, cat: 'mytasks' }));
    dashChats.filter((c) => c.unread > 0).forEach((c) => attention.push({ icon: c.type === 'supplier' ? 'api' : 'chat', tone: 'amber', title: 'Ответить · ' + c.name, sub: c.lastText, right: c.lastTime, order: c.order, chat: c, cat: 'chats' }));
    deadlines.forEach((d) => attention.push({ icon: d.icon, tone: d.tone, title: d.label, sub: d.who, right: d.date, order: d.order, cat: 'deadlines' }));
  }
  attention.sort((a, b) => tonePri[a.tone] - tonePri[b.tone]);

  const badgeFor = (tone) => tone === 'red' ? 'Срочно' : tone === 'amber' ? 'Требует действия' : tone === 'blue' ? 'Новая' : 'В работе';
  const workRows = {
    attention: attention.map((a, i) => ({ ...a, id: 'att-' + i, badge: badgeFor(a.tone) })),
    newreq: slaRows.map((r, i) => ({ id: 'req-' + i, icon: 'inbox', tone: r.tone, title: 'Заявка ждёт отклик', sub: '№' + r.no + ' · Клиент: ' + r.client, right: r.waited + ' мин', badge: slaLabel(r.tone), order: r.no, cat: 'newreq' })),
    deadlines: deadlines.map((d, i) => ({ id: 'dl-' + i, icon: d.icon, tone: d.tone, title: d.label, sub: d.who, right: d.date, badge: d.tone === 'red' ? 'Срочно' : 'Дедлайн', order: d.order, cat: 'deadlines' })),
    approvals: approvals.map((a, i) => ({ id: 'ap-' + i, icon: 'template', tone: 'amber', title: 'Согласование · ' + a.label, sub: a.who, right: a.kind, badge: 'На согласовании', order: a.order, cat: 'approvals' })),
  };
  const workTabs = [
    { key: 'attention', label: isMgr ? 'Требуют внимания' : 'Мои задачи', count: attention.length, tone: attention.some((a) => a.tone === 'red') ? 'red' : 'gray' },
    { key: 'newreq', label: 'Новые заявки', count: slaRows.length, tone: slaOverdue ? 'red' : 'gray' },
    { key: 'deadlines', label: 'Дедлайны', count: deadlines.length, tone: deadlines.some((d) => d.tone === 'red') ? 'red' : 'gray' },
    { key: 'approvals', label: 'Согласования', count: approvals.length, tone: 'gray' },
  ];
  const activeRows = workRows[tab] || [];
  const openWorkItem = (item) => {
    if (item.cat === 'suppliers') { setErrDrawer(item.supplier || ''); return; }
    if (item.cat === 'chats') { onOpenChat ? onOpenChat(item.chat) : onNavigate('chats'); return; }
    if (item.cat === 'overdue' || item.cat === 'risk') { onNavigate('companies'); return; }
    if (item.cat === 'returns' && !item.order) { onNavigate('returns'); return; }
    if (item.order) { goOrder(item.order); return; }
    onNavigate(WORK_TAB_ROUTE[item.cat] || 'orders');
  };


  // ——— Сегодня: поездки и события календаря + тайм-лимиты из dashboard-пейлоада ———
  const agendaTrips = calendar?.trips?.length ? calendar.trips : (dashboard?.trips_today || []);
  const agendaItems = buildAgenda({
    day: agendaDay, trips: agendaTrips, events: calendar?.events || [],
    deadlines: dashboard?.deadlines || [], orders,
  });
  if (sameDay(agendaDay, today) && fin.overdueCount > 0) {
    agendaItems.push({
      id: 'overdue-alert', time: 'Сейчас', icon: 'bank', tone: 'red', title: 'Просрочка оплаты',
      sub: fin.overdueCount + ' ' + plural(fin.overdueCount, ['обязательство', 'обязательства', 'обязательств']) + (fin.debt ? ' · ' + money(fin.debt) : ''),
      route: 'finance',
    });
  }
  const openAgendaItem = (item) => {
    if (item.order) { goOrder(item.order); return; }
    onNavigate(item.route || 'calendar');
  };


  // ——— Аналитика: ряды строятся из уже загруженных услуг и заказов ———
  const salesSeries = dailySeries(orderServices, { days: 7, now: today, key: (s) => s.created_at, value: serviceSales });
  const salesPrevSeries = dailySeries(orderServices, { days: 7, now: addDays(today, -7), key: (s) => s.created_at, value: serviceSales });
  const profitSeries = dailySeries(orderServices, { days: 7, now: today, key: (s) => s.created_at, value: serviceProfit });
  const ordersSeries = dailySeries(orders, { days: 7, now: today, key: (o) => o.created_at });
  const salesWeek = seriesTotal(salesSeries);
  const salesWeekDelta = percentChange(salesWeek, seriesTotal(salesPrevSeries));
  const salesDayDelta = percentChange(salesSeries[6]?.value, salesSeries[5]?.value);
  const profitDayDelta = percentChange(profitSeries[6]?.value, profitSeries[5]?.value);

  const ordersTotal = dashboard?.kpi?.orders_total ?? orders.length;
  const ordersNewToday = dashboard?.orders?.new_today ?? ordersSeries[6]?.value ?? 0;
  const ordersActive = dashboard?.kpi?.orders_active ?? orders.filter((order) => !ORDER_CLOSED_STATUS.includes(order.statusCode || order.status)).length;
  const overdueCount = fin.overdueCount;

  const kpiItems = [
    { key: 'orders', icon: 'orders', tone: 'blue', label: 'Заказы', value: ordersTotal, series: ordersSeries,
      delta: ordersNewToday ? '+' + ordersNewToday + ' за день' : 'без новых', deltaTone: ordersNewToday ? 'green' : 'gray',
      deltaIcon: ordersNewToday ? 'arrowUpRight' : null, onClick: () => onNavigate('orders'), title: 'Все заказы' },
    { key: 'sales', icon: 'finance', tone: 'blue', label: 'Продажи', value: money(salesToday), series: salesSeries,
      delta: formatPercent(salesDayDelta) || 'за сегодня', deltaTone: percentTone(salesDayDelta),
      deltaIcon: salesDayDelta > 0 ? 'arrowUpRight' : null, onClick: () => onNavigate('finance'), title: 'Продажи за сегодня' },
    isMgr
      ? { key: 'profit', icon: 'bank', tone: 'green', label: 'Прибыль', value: money(shT.profit), series: profitSeries,
          delta: formatPercent(profitDayDelta) || 'за сегодня', deltaTone: percentTone(profitDayDelta),
          deltaIcon: profitDayDelta > 0 ? 'arrowUpRight' : null, onClick: () => onNavigate('finance'), title: 'Прибыль за сегодня' }
      : { key: 'earn', icon: 'finance', tone: 'green', label: 'Мой заработок', value: money(shT.earn), series: null,
          delta: 'за смену', deltaTone: 'gray', onClick: () => onNavigate('profile'), title: 'Заработок за смену' },
    { key: 'active', icon: 'briefcase', tone: 'teal', label: 'В работе', value: ordersActive,
      delta: ordersNewToday ? ordersNewToday + ' ' + plural(ordersNewToday, ['новый', 'новых', 'новых']) : 'новых нет',
      deltaTone: 'blue', onClick: () => onNavigate('orders'), title: 'Заказы в работе' },
    { key: 'overdue', icon: 'alertCircle', tone: overdueCount ? 'red' : 'green', label: 'Просрочки', value: overdueCount,
      delta: overdueCount ? 'требуют оплаты' : 'все оплаты в срок', deltaTone: overdueCount ? 'red' : 'green',
      onClick: () => onNavigate('finance'), title: 'Просрочки оплат' },
  ];

  const operatorCards = [...operatorRows].sort((a, b) => (b.orders || 0) - (a.orders || 0)).slice(0, 5).map((operator) => {
    const change = percentChange(operator.last7, operator.prev7);
    return { id: operator.id || operator.name, name: operator.name, orders: operator.orders || 0, sla: operator.sla,
      delta: formatPercent(change), deltaTone: percentTone(change) };
  });


  // ——— Состояния блоков берутся из статусов ресурсов workspace ———
  const statusOf = (key) => resources?.[key]?.status;
  const blockLoading = (...keys) => keys.some((key) => statusOf(key) === 'loading' || statusOf(key) === 'idle');
  const blockError = (...keys) => {
    const failed = keys.map((key) => resources?.[key]).find((entry) => entry?.status === 'error' || entry?.status === 'forbidden');
    if (!failed) return null;
    return failed.status === 'forbidden' ? 'Нет доступа к этим данным' : messageForApiError(failed.error);
  };
  const workLoading = blockLoading('slaQueue', 'proposals', 'returns', 'integrationIncidents');
  const workError = blockError('slaQueue', 'proposals', 'returns', 'integrationIncidents');
  const agendaLoading = blockLoading('calendar');
  const agendaError = blockError('calendar');
  const salesLoading = blockLoading('orderServices');
  const salesError = blockError('orderServices');
  const operatorsLoading = blockLoading('users', 'orderServices');
  const operatorsError = blockError('users', 'orderServices');

  const shiftStat = (label, value, accent) => (
    <span key={label} className="dsh-shift-stat">
      <span className="dsh-shift-stat-label">{label}</span>
      <span className="dsh-shift-stat-value" style={accent ? { color: dashToneColor(accent) } : undefined}>{value}</span>
    </span>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0 }}>
      <Topbar title={isMgr ? `Добрый день${user?.name ? `, ${user.name.split(' ')[1] || user.name.split(' ')[0]}` : ''}` : 'Мой рабочий день'}>
        <div className="topbar-spacer" />
        <SearchBox value={search} onChange={setSearch} placeholder="Поиск" style={{ width: 220 }} />
        <Button variant="secondary" icon="calendar" onClick={() => onNavigate('calendar')}>Календарь поездок</Button>
        <Button variant="secondary" icon="search" onClick={() => setSearchOpen(true)}>Поиск услуг</Button>
        <Button variant="primary" icon="plus" onClick={onAddOrder}>Добавить заказ</Button>
      </Topbar>

      {searchOpen && <DetailedSearchPanel onClose={() => setSearchOpen(false)} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onNavigate={onNavigate} clients={clients} companies={companies} orders={orders} />}

      <div className="dsh scroll">
        {shift && (
          <div className="card dsh-shift">
            <span className="dsh-shift-dot" />
            <span className="dsh-shift-title">Моя смена</span>
            <Pill tone="green">открыта · с {shiftFmtTime(shift.openedAt)}</Pill>
            <span className="dsh-spacer" />
            {shiftStat('Продолжительность', shiftDuration(shift.openedAt))}
            {shiftStat('Операций', backendMode ? (shiftSource.operations || []).length : SHIFT_REQUESTS_HANDLED)}
            {shiftStat('Заказов', shT.orders)}
            {shiftStat('Выписано', issuedToday)}
            {shiftStat('Заработок', money(shT.earn), 'blue')}
          </div>
        )}

        <DashboardKpiGrid items={kpiItems} />

        <div className="dsh-main">
          <WorkCenter
            tabs={workTabs} tab={tab} onTabChange={setTab}
            items={activeRows.slice(0, 5)} total={activeRows.length}
            loading={workLoading} error={workError} onRetry={onReload}
            onOpenAll={() => onNavigate(WORK_TAB_ROUTE[tab] || 'orders')}
            onShowAll={() => onNavigate(WORK_TAB_ROUTE[tab] || 'orders')}
            onOpenItem={openWorkItem}
            emptyTitle={tab === 'attention' ? 'Ничего не требует внимания' : 'В этой вкладке пусто'}
          />
          <TodayAgenda
            day={agendaDay} today={today} items={agendaItems}
            loading={agendaLoading} error={agendaError} onRetry={onReload}
            onSelectDay={setAgendaDay} onOpenItem={openAgendaItem}
            onOpenCalendar={() => onNavigate('calendar')}
          />
        </div>

        <div className="dsh-analytics">
          <SalesChart
            series={salesSeries} total={money(salesWeek)} format={money}
            delta={formatPercent(salesWeekDelta)} deltaTone={percentTone(salesWeekDelta)}
            loading={salesLoading} error={salesError} onRetry={onReload}
            onOpenAll={() => onNavigate('finance')}
          />
          <OperatorsPerformance
            rows={operatorCards} loading={operatorsLoading} error={operatorsError} onRetry={onReload}
            onOpenAll={() => onNavigate('settings')}
          />
        </div>

        {supErrTotal > 0 && (
          <button type="button" className="dsh-api-alert" onClick={() => setErrDrawer('')}>
            <Icon name="api" />
            <span>Ошибки поставщиков (API): <b>{supErrTotal}</b></span>
            <span className="dsh-spacer" />
            <span className="dsh-api-alert-go">Разобрать<Icon name="chevRight" /></span>
          </button>
        )}
      </div>

      <ErrorCodesDrawer open={errCodeOpen !== null} focusCode={errCodeOpen} onClose={() => setErrCodeOpen(null)} />
      {errDrawer !== null && <SupplierErrorsDrawer supplier={errDrawer || null} errors={backendMode ? activeIncidents : undefined} users={users} suppliers={suppliers} onIncidentChange={updateIncident} onClose={() => setErrDrawer(null)} onOpenOrder={goOrder} />}
    </div>
  );
}

Object.assign(window, { DashboardPage, DetailedSearchPanel });



export { FreeBookingFinalize, DetailedSearchPanel, SUPPLIER_STATS, ERR_CRIT_TONE, INTEG_TONE, SUPPLIER_ERRORS, ERR_STATUS_TONE, errNow, errCurOp, errLog, errActiveCount, errPushNotif, errRetry, errAssign, errResolve, errReopen, errSnooze, errChooseSupplier, errSendDev, errAltSuppliers, OPERATORS_WORK, MY_TASKS, SupplierErrorCard, SupplierErrorsDrawer, DashboardPage };
