import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, Drawer, EmptyState, FilterChip, Pill, SearchBox, plural, useToast } from './ui';
import { CHAT_THREADS, CLIENTS, COMPANIES_DB, CURRENT_USER, NOTIFICATIONS, OPERATORS, ORDERS, ORDER_STATUS, PROPOSALS, RECENT_CHANGES, RETURNS, RETURN_STATUS, RETURN_TYPE, financeOverview } from './data';
import { SLA_QUEUE, slaLabel, slaTone } from './data/access-control';
import { UfOrderRow, UfPersonRow, ufOrderPickRows } from './forms_unified';
import { Topbar } from './layout';
import { PAX_DEFAULT_OPTIONS } from './page_flights';
import { PanelSub, StackPanel } from './components/shared-panels';
import { AddServicePanel } from './page_order_card';
import { ErrorCodesDrawer } from './page_notifications';
import { SHIFT_DEMO_OPS, SHIFT_REQUESTS_HANDLED, motivationFor, operatorEarn, shiftDuration, shiftFmtTime, shiftTotals } from './page_shifts';
import { toLegacyProposal, toLegacyReturn } from './api/legacy-adapters';
import { resultsOf } from './api/client';
import { communicationsApi, integrationsApi, ordersApi, proposalsApi, servicesApi } from './api/resources';
import { toUiOrder } from './api/adapters';





function FreeBookingFinalize({ draft, onClose, onDone, onOpenOrder, onNavigate, clients = [], companies = [] }) {
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
        currency: svc.currency || 'RUB',
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
        base_currency: 'RUB',
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

  const orderPickRows = ufOrderPickRows;
  const kindCode = (kind) => ({ 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Отель': 'hotel', 'Трансфер': 'transfer', 'Страховка': 'insurance', 'Виза': 'visa', 'Тур': 'tour', 'Автобус': 'bus' }[kind] || kind || 'other');
  const sendDraftToChat = async (order) => {
    setBusy(true);
    try {
      const existing = resultsOf(await communicationsApi.threads({ order: order.id, type: 'client' }))[0];
      const thread = existing || await communicationsApi.createThread({ type: 'client', order: order.id, title: `Заказ № ${order.no}` });
      const lines = draft.map((item, index) => `${index + 1}. ${svcTitle(item)} — ${svcSum(item) || 'цена не указана'} ${item.currency || 'RUB'}`);
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
        const currency = draft.find((item) => item.currency)?.currency || 'RUB';
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
            <button key={name} type="button" style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}
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



function DetailedSearchPanel({ onClose, initialKind, onOpenOrder, onCreateOrder, onNavigate, clients = [], companies = [] }) {
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
      {finalize && <FreeBookingFinalize draft={draft} onClose={() => setFinalize(false)} onDone={() => { setFinalize(false); onClose(); }} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onNavigate={onNavigate} clients={clients} companies={companies} />}
    </StackPanel>
  );
}



function FinanceOverviewBlock({ onNavigate }) {
  const ov = financeOverview();
  const money = (n) => Math.round(n || 0).toLocaleString('ru-RU') + ' $';
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Финансовое состояние клиентов</h2>
        <Button variant="secondary" size="sm" icon="building" onClick={() => onNavigate('companies')}>Все компании</Button>
      </div>
      <div className="grid-4" style={{ marginBottom: ov.urgent.length ? 16 : 0 }}>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('companies')}>
          <div className="s-label">Депозиты (доступно)</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: 'var(--green)' }}>{money(ov.deposits)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('companies')}>
          <div className="s-label">Задолженность (отсрочка)</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: 'var(--amber)' }}>{money(ov.debt)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('finance')}>
          <div className="s-label">Просрочено</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: ov.overdue > 0 ? 'var(--red)' : 'var(--muted)' }}>{money(ov.overdue)}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('finance')}>
          <div className="s-label">Клиентов с просрочкой</div>
          <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: ov.overdueCount > 0 ? 'var(--red)' : 'var(--muted)' }}>{ov.overdueCount}</div>
        </div>
      </div>

      {!!ov.urgent.length && (
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Срочные оплаты и внимание к балансам</h3>
            <Pill tone="amber">{ov.urgent.length}</Pill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ov.urgent.map((u, i) => (
              <button key={i} type="button" onClick={() => onNavigate('companies')}
                style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid var(--line)', borderLeft: '3px solid var(--' + u.tone + ')', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="oc-svc-ic" style={{ background: 'var(--' + u.tone + ')', width: 34, height: 34, opacity: .9 }}><Icon name="bank" style={{ width: 16, height: 16 }} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm" style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.co}</div>
                  <div className="mt" style={{ fontSize: 12, color: 'var(--muted)' }}>{u.text}</div>
                </div>
                <Pill tone={u.tone}>{u.kind}</Pill>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--' + u.tone + ')' }}>{money(u.value)}</span>
                <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCardDash({ s, onGo }) {
  return (
    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={onGo}>
      <div className="s-label">{s.label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div className="s-value" style={{ fontSize: 'var(--fs-display)' }}>{s.value}</div>
        {s.cta
          ? <span className="pill pill-green" style={{ height: 32 }}>{s.cta}<Icon name="arrowRight" style={{ width: 16, height: 16 }} /></span>
          : <span className="go-dot"><Icon name="chevRight" /></span>}
      </div>
    </div>
  );
}


function SlaResponseWidget({ onOpenOrder }) {
  const rows = SLA_QUEUE.map((q) => ({ ...q, tone: slaTone(q.waited, q.limit) }));
  const overdue = rows.filter((r) => r.tone === 'red').length;
  const heating = rows.filter((r) => r.tone === 'amber').length;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Отклик на заявки</h2>
        {overdue > 0 && <Pill tone="red">Просрочено: {overdue}</Pill>}
        {heating > 0 && <Pill tone="amber">Накал тайминга: {heating}</Pill>}
        {!overdue && !heating && <Pill tone="green">Все в норме</Pill>}
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Заявка</th><th>Клиент</th><th>Оператор</th><th>Ожидает</th><th>Норматив</th><th>Статус</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { const o = ORDERS.find((x) => x.no === r.no); o && onOpenOrder && onOpenOrder(o); }}>
                <td className="t-strong">№ {r.no}</td>
                <td>{r.client}</td>
                <td>{r.operator}</td>
                <td style={{ fontWeight: 600, color: r.tone === 'red' ? 'var(--red)' : r.tone === 'amber' ? 'var(--amber)' : 'var(--ink)' }}>{r.waited} мин</td>
                <td className="t-muted">{r.limit} мин</td>
                <td><Pill tone={r.tone}>{slaLabel(r.tone)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function dashToneColor(t) {
  return t === 'red' ? 'var(--red)' : t === 'amber' ? 'var(--amber)' : t === 'green' ? 'var(--green)' : t === 'teal' ? 'var(--teal, var(--blue))' : t === 'gray' ? 'var(--muted-2)' : 'var(--blue)';
}



function DashTile({ w, active, onClick }) {
  const toneColor = dashToneColor(w.tone);
  const pv = w.preview;
  return (
    <button type="button" onClick={onClick}
      style={{
        textAlign: 'left', cursor: 'pointer', background: active ? 'var(--blue-soft, #eef3ff)' : '#fff',
        borderTop: '1px solid ' + (active ? 'var(--blue)' : 'var(--line)'), borderRight: '1px solid ' + (active ? 'var(--blue)' : 'var(--line)'), borderBottom: '1px solid ' + (active ? 'var(--blue)' : 'var(--line)'), borderLeft: '3px solid ' + toneColor, borderRadius: 14, padding: '11px 13px',
        boxShadow: active ? '0 0 0 1px var(--blue) inset, var(--shadow-card)' : 'var(--shadow-card)',
        display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0, transition: 'all .14s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: toneColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={w.icon} style={{ width: 16, height: 16, color: '#fff' }} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.2, flex: 1, minWidth: 0 }}>{w.label}</span>
        <span style={{ fontSize: w.small ? 16 : 20, fontWeight: 800, letterSpacing: '-.02em', color: w.tone === 'green' ? 'var(--ink)' : toneColor }}>{w.value}</span>
      </div>
      {pv ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 7, borderTop: '1px dashed var(--line)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dashToneColor(pv.tone || w.tone), flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: 'var(--body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{pv.text}</span>
          {pv.right && <span style={{ fontSize: 11, fontWeight: 700, color: dashToneColor(pv.tone || w.tone), whiteSpace: 'nowrap' }}>{pv.right}</span>}
        </div>
      ) : (w.sub ? <div style={{ fontSize: 12, color: 'var(--muted)', paddingTop: 7, borderTop: '1px dashed var(--line)' }}>{w.sub}</div> : null)}
    </button>
  );
}


function AttentionMarker({ a, onClick }) {
  const c = dashToneColor(a.tone);
  const badge = a.tone === 'red' ? 'Срочно' : a.tone === 'amber' ? 'Важно' : 'Внимание';
  return (
    <button type="button" onClick={onClick}
      style={{ flex: '0 0 auto', width: 248, textAlign: 'left', cursor: 'pointer', background: '#fff',
        border: '1px solid var(--line)', borderTop: '3px solid ' + c, borderRadius: 12, padding: '11px 13px',
        display: 'flex', gap: 10, boxShadow: 'var(--shadow-card)' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, background: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={a.icon} style={{ width: 16, height: 16, color: '#fff' }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: c }}>{badge}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{a.sub}</span>
          {a.right && <span style={{ fontSize: 11.5, fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>{a.right}</span>}
        </div>
      </div>
    </button>
  );
}


function DashDetailEmpty({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: 8, padding: 40 }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" style={{ width: 24, height: 24, color: '#fff' }} /></span>
      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
    </div>
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
const TODAY_TRIPS = [
  { type: 'Вылет',     icon: 'plane',    main: 'FRU → IST · Turkish TK 4521',   sub: 'Нуралиев Данияр · 09:40',   order: 51162 },
  { type: 'Заселение', icon: 'building', main: 'Jannat Hotel · 3 ночи',          sub: 'Аттокуров Эрбол · заезд 14:00', order: 51163 },
  { type: 'Трансфер',  icon: 'car',      main: 'Аэропорт Манас → отель',         sub: 'Группа · подача 12:30',      order: 51154 },
  { type: 'Поездка',   icon: 'train',    main: 'Москва → СПб · Купе',            sub: 'Сагынбеков Икрам · 11:05',   order: 51156 },
  { type: 'Вылет',     icon: 'plane',    main: 'FRU → DXB · Air Astana',         sub: 'Асылов Айбек · 18:20',       order: 51171 },
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
    time: created ? created.toLocaleString('ru-RU') : '—', order: order?.no || null, orderId: row.order || null,
    client: order?.client || '—', operator: order?.operator || '—', assignee: assignee?.name || '', assigneeId: row.assignee || null,
    code: row.correlation_id || '—', crmCode: row.error_code || 'UNKNOWN', crit: INCIDENT_SEVERITY_LABEL[row.severity] || row.severity,
    reason: row.sanitized_error || row.error_code || 'Ошибка интеграции', tech: [row.sanitized_error, row.correlation_id ? `correlation_id=${row.correlation_id}` : ''].filter(Boolean).join('\n'),
    repeats: Number(row.retry_count || row.occurrences || 0), attempts: Number(row.retry_count || 0),
    first: created ? created.toLocaleString('ru-RU') : '—', last: updated ? updated.toLocaleString('ru-RU') : '—', impact: order ? `Затронут заказ № ${order.no}` : 'Заказ не связан',
    status: INCIDENT_STATUS_LABEL[row.status] || row.status, snoozeUntil: row.snoozed_until ? new Date(row.snoozed_until).toLocaleString('ru-RU') : null,
    altSupplier: suppliers.find((item) => String(item.id || item.no) === String(row.fallback_supplier))?.name || '',
    devTicket: row.developer_ticket || '', resolutionCode: row.resolution_code || '',
    history: (row.timeline || []).map((entry) => ({ t: new Date(entry.created_at).toLocaleString('ru-RU'), text: entry.action, who: entry.actor_name || 'Система' })),
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
    <div key={e.id} onClick={() => setSel(e)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--field-line)', cursor: 'pointer', background: '#fff' }}>
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

function DashboardPage({ role, user, orders = [], orderServices = [], clients = [], companies = [], proposals = [], returns = [], notifications = [], chats = [], dashboard, finance, incidents = [], operations = [], slaQueue = [], currentShift, motivationAccruals = [], users = [], suppliers = [], onNavigate, onAddOrder, onOpenOrder, onCreateOrder, onOpenChat }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [errCodeOpen, setErrCodeOpen] = useState(null);
  const [errDrawer, setErrDrawer] = useState(null);
  const [incidentRows, setIncidentRows] = useState(incidents);
  const [, tick] = useState(0);

  const isMgr = role === 'Админ' || role === 'Менеджер' || role === 'Руководитель';
  const backendMode = !ENABLE_DEMO_BUSINESS_DATA;
  const [sel, setSel] = useState(isMgr ? 'overdue' : 'mytasks');
  const shiftSource = window.SHIFT_STATE || currentShift || null;
  const shift = shiftSource ? { ...shiftSource, openedAt: shiftSource.openedAt || (shiftSource.started_at ? new Date(shiftSource.started_at) : null) } : null;

  useEffect(() => {
    const onShift = () => tick((t) => t + 1);
    window.addEventListener('shift-change', onShift);
    const id = setInterval(() => tick((t) => t + 1), 60000);
    return () => { window.removeEventListener('shift-change', onShift); clearInterval(id); };
  }, []);

  useEffect(() => { setSel(isMgr ? 'overdue' : 'mytasks'); }, [isMgr]);
  useEffect(() => { setIncidentRows(incidents); }, [incidents]);

  const money = (n) => Math.round(n || 0).toLocaleString('ru-RU') + ' $';
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
  const errNotifs = notifications.filter((n) => n.source === 'Интеграции');
  const supErrTotal = backendMode ? incidentRows.filter((item) => item.status !== 'resolved').length : errActiveCount();

  const taskRows = backendMode ? (dashboard?.my_tasks || []).map((task) => {
    const order = orders.find((item) => item.id === task.order);
    const due = task.due_at ? new Date(task.due_at) : null;
    return { title: task.title, due: due ? due.toLocaleString('ru-RU') : 'без срока', tone: task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'amber' : 'blue', order: order?.no || task.order };
  }) : MY_TASKS;
  const tripRows = backendMode ? (dashboard?.trips_today || []).map((trip) => ({ type: 'Поездка', icon: 'plane', main: trip.title, sub: new Date(trip.starts_at).toLocaleString('ru-RU'), order: trip.order_number })) : TODAY_TRIPS;
  const activeIncidents = incidentRows.map((row) => backendIncidentToUi(row, { orders, suppliers, users, services: orderServices }));
  const activityRows = backendMode ? (dashboard?.recent_activity || []).map((row) => ({ desc: row.title || row.type, client: row.description || '', resp: '', dept: '', time: row.created_at ? new Date(row.created_at).toLocaleString('ru-RU') : '' })) : RECENT_CHANGES;
  const operatorRows = backendMode ? users.map((operator) => {
    const operatorOrders = orders.filter((order) => String(order.operatorId || order.operator) === String(operator.id));
    const operatorServices = orderServices.filter((service) => operatorOrders.some((order) => String(order.id) === String(service.orderId || service.order)));
    const accruals = motivationAccruals.filter((item) => String(item.user) === String(operator.id) && !item.reversed_at);
    const breached = slaQueue.some((entry) => String(entry.assignee) === String(operator.id) && entry.breached);
    return { name: operator.name, handled: slaQueue.filter((entry) => String(entry.assignee) === String(operator.id)).length, orders: operatorOrders.length, issued: operatorServices.filter((service) => service.status === 'Выписано' || service.status === 'issued').length, earn: accruals.reduce((sum, item) => sum + Number(item.amount || 0), 0), profit: operatorServices.reduce((sum, service) => sum + Number(service.calc?.total || service.client_total || 0) - Number(service.calc?.tariff || service.supplier_cost || 0), 0), sla: breached ? 'red' : 'ok' };
  }) : OPERATORS_WORK;
  const supplierRows = backendMode ? [...new Set(activeIncidents.map((item) => item.supplier).concat(operations.map((item) => item.provider_adapter).filter(Boolean)))].map((name) => {
    const errors = activeIncidents.filter((item) => item.supplier === name);
    const logs = operations.filter((item) => item.provider_adapter === name);
    const durations = logs.map((item) => Number(item.duration_ms)).filter(Number.isFinite);
    const critical = errors.some((item) => item.crit === 'Критическая') ? 'Критическая' : errors.some((item) => item.crit === 'Важная') ? 'Важная' : errors.length ? 'Информационная' : '—';
    return { name, apiErrors: errors.length, failed: logs.filter((item) => ['error', 'failed'].includes(item.result)).length, avgResp: durations.length ? `${Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)} мс` : '—', integ: errors.length ? 'Частичные ошибки' : 'Работает стабильно', crit: critical, ordersAffected: new Set(errors.map((item) => item.order).filter(Boolean)).size, tone: errors.length ? 'amber' : 'green' };
  }) : SUPPLIER_STATS;


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


  const WIDGETS = isMgr ? [
    { key: 'newreq',    label: 'Новые заявки',      value: dashboard?.sla?.open ?? (backendMode ? 0 : SLA_QUEUE.length), tone: 'blue', icon: 'inbox' },
    { key: 'ordersToday', label: 'Заказы сегодня',  value: dashboard?.orders?.new_today ?? (backendMode ? 0 : shT.orders), tone: 'blue', icon: 'orders' },
    { key: 'issued',    label: 'Выписано услуг',    value: issuedToday, tone: 'green', icon: 'check' },
    { key: 'sales',     label: 'Продажи сегодня',   value: money(salesToday), small: true, tone: 'blue', icon: 'finance' },
    { key: 'profit',    label: 'Прибыль сегодня',   value: money(shT.profit), small: true, tone: 'green', icon: 'bank' },
    { key: 'returns',   label: 'Возвраты и обмены', value: returnsActive.length, tone: returnsActive.length ? 'amber' : 'green', icon: 'refund' },
    { key: 'approvals', label: 'Согласования',      value: approvals.length, tone: approvals.length ? 'amber' : 'green', icon: 'template' },
    { key: 'deadlines', label: 'Дедлайны',          value: deadlines.length, tone: deadlines.length ? 'red' : 'green', icon: 'clock' },
    { key: 'overdue',   label: 'Просрочки оплат',   value: fin.overdueCount, sub: fin.overdue > 0 ? money(fin.overdue) : null, tone: fin.overdue > 0 ? 'red' : 'green', icon: 'alertCircle' },
    { key: 'risk',      label: 'Депозит / лимит',   value: fin.urgent.length, tone: fin.urgent.length ? 'amber' : 'green', icon: 'bank' },
    { key: 'operators', label: 'Работа операторов', value: operatorRows.length, tone: 'blue', icon: 'users' },
    { key: 'suppliers', label: 'Поставщики (API)',  value: supErrTotal, sub: 'ошибок', tone: supErrTotal ? 'red' : 'green', icon: 'api' },
    { key: 'trips',     label: 'Вылеты и заезды',   value: dashboard?.trips_today?.length ?? (backendMode ? 0 : TODAY_TRIPS.length), tone: 'blue', icon: 'plane' },
    { key: 'activity',  label: 'Активность',        value: activityRows.length, tone: 'blue', icon: 'clock' },
  ] : [
    { key: 'mytasks',   label: 'Мои задачи',        value: dashboard?.my_tasks?.length ?? (backendMode ? 0 : MY_TASKS.length), tone: (dashboard?.my_tasks?.length ?? (backendMode ? 0 : MY_TASKS.length)) ? 'amber' : 'green', icon: 'clipboard' },
    { key: 'newreq',    label: 'Мои новые заявки',  value: dashboard?.sla?.open ?? (backendMode ? 0 : SLA_QUEUE.length), tone: 'blue', icon: 'inbox' },
    { key: 'ordersToday', label: 'Заказы сегодня',  value: dashboard?.orders?.new_today ?? (backendMode ? 0 : shT.orders), tone: 'blue', icon: 'orders' },
    { key: 'issued',    label: 'Выписано услуг',    value: issuedToday, tone: 'green', icon: 'check' },
    { key: 'myearn',    label: 'Заработок сегодня', value: money(shT.earn), small: true, tone: 'blue', icon: 'finance' },
    { key: 'approvals', label: 'Мои согласования',  value: approvals.length, tone: approvals.length ? 'amber' : 'green', icon: 'template' },
    { key: 'deadlines', label: 'Мои дедлайны',      value: deadlines.length, tone: deadlines.length ? 'red' : 'green', icon: 'clock' },
    { key: 'returns',   label: 'Возвраты и обмены', value: returnsActive.length, tone: returnsActive.length ? 'amber' : 'green', icon: 'refund' },
  ];

  const DTITLE = {
    newreq: 'Новые заявки · отклик', ordersToday: 'Заказы за сегодня', issued: 'Выписанные услуги за сегодня',
    sales: 'Продажи за сегодня', profit: 'Финансовые показатели за сегодня', returns: 'Возвраты и обмены в обработке',
    approvals: 'Открытые согласования', deadlines: 'Ближайшие дедлайны', overdue: 'Просрочки оплат по клиентам',
    risk: 'Клиенты: депозит и лимит отсрочки', operators: 'Работа операторов', suppliers: 'Статистика по поставщикам',
    trips: 'Вылеты, заселения и поездки сегодня', activity: 'Активность пользователей', mytasks: 'Мои задачи', myearn: 'Мой заработок за смену',
    chats: 'Мои чаты — свежие сообщения',
  };


  const dashChats = chats.filter((t) => t.type === 'client' || t.type === 'supplier').map((t) => {
    const m = (t.messages || [])[(t.messages || []).length - 1] || {};
    return { id: t.id, order: t.order, name: t.name, client: t.client, channel: t.channel, type: t.type, unread: t.unread || 0,
      lastText: m.text || (m.attach ? '📎 ' + m.attach.name : '—'), lastTime: m.time || '', mine: m.from === 'me' };
  }).sort((a, b) => (b.unread > 0) - (a.unread > 0));
  const unreadChats = dashChats.filter((c) => c.unread > 0).length;
  const critErr = backendMode ? activeIncidents.filter((error) => error.crit === 'Критическая' && error.status !== 'Решена') : (typeof SUPPLIER_ERRORS !== 'undefined' ? SUPPLIER_ERRORS : []).filter((e) => e.crit === 'Критическая');
  const redRisk = fin.urgent.filter((u) => u.tone === 'red');


  const previews = {
    mytasks: taskRows[0] && { text: taskRows[0].title, right: taskRows[0].due, tone: taskRows[0].tone },
    newreq: slaRows[0] && { text: '№' + slaRows[0].no + ' · ' + slaRows[0].client, right: slaRows[0].waited + ' мин', tone: slaRows[0].tone },
    deadlines: deadlines[0] && { text: deadlines[0].label, right: deadlines[0].date, tone: deadlines[0].tone },
    approvals: approvals[0] && { text: approvals[0].label + ' · ' + approvals[0].who, right: approvals[0].kind, tone: 'amber' },
    returns: returnsActive[0] && { text: returnsActive[0].type + ' · ' + returnsActive[0].no, right: returnsActive[0].client, tone: 'amber' },
    overdue: redRisk[0] && { text: redRisk[0].co, right: money(redRisk[0].value), tone: 'red' },
    risk: fin.urgent[0] && { text: fin.urgent[0].co, right: fin.urgent[0].kind, tone: fin.urgent[0].tone },
    suppliers: critErr[0] && { text: critErr[0].reason, right: critErr[0].order ? '№' + critErr[0].order : critErr[0].supplier, tone: 'red' },
    trips: tripRows[0] && { text: tripRows[0].main, right: (tripRows[0].sub.split('·').pop() || '').trim(), tone: 'blue' },
    activity: activityRows[0] && { text: activityRows[0].desc + ' · ' + activityRows[0].client, right: activityRows[0].time, tone: 'gray' },
    ordersToday: orders[0] && { text: '№' + orders[0].no + ' · ' + orders[0].client, right: orders[0].status, tone: 'blue' },
    operators: operatorRows[0] && { text: operatorRows[0].name + ' · ' + operatorRows[0].orders + ' заказов', right: money(operatorRows[0].profit), tone: 'blue' },
    chats: dashChats[0] && { text: dashChats[0].name + ': ' + dashChats[0].lastText, right: dashChats[0].unread ? '+' + dashChats[0].unread : dashChats[0].lastTime, tone: dashChats[0].unread ? 'amber' : 'blue' },
  };
  const chatsWidget = { key: 'chats', label: 'Мои чаты', value: unreadChats || dashChats.length, sub: unreadChats ? 'новых' : 'диалогов', tone: unreadChats ? 'amber' : 'blue', icon: 'chat' };
  const tonePri = { red: 0, amber: 1, teal: 2, blue: 3, green: 4, gray: 5 };

  const widgets = WIDGETS.concat([chatsWidget]).map((w) => ({ ...w, preview: previews[w.key] || null }))
    .sort((a, b) => (tonePri[a.tone] - tonePri[b.tone]));


  const attention = [];
  if (isMgr) {
    slaRows.filter((r) => r.tone !== 'green').forEach((r) => attention.push({ icon: 'inbox', tone: r.tone, title: 'Заявка ждёт отклик', sub: '№' + r.no + ' · ' + r.client, right: r.waited + ' мин', order: r.no, cat: 'newreq' }));
    critErr.forEach((e) => attention.push({ icon: 'api', tone: 'red', title: e.reason, sub: e.supplier + (e.order ? ' · №' + e.order : ''), right: e.orderTL || 'критично', order: e.order, cat: 'suppliers' }));
    redRisk.forEach((u) => attention.push({ icon: 'bank', tone: 'red', title: u.co, sub: u.text, right: money(u.value), order: null, cat: 'overdue' }));
    deadlines.filter((d) => d.tone === 'red').forEach((d) => attention.push({ icon: d.icon, tone: 'red', title: d.label, sub: d.who, right: d.date, order: d.order, cat: 'deadlines' }));
    approvals.slice(0, 2).forEach((a) => attention.push({ icon: 'template', tone: 'amber', title: 'Согласование · ' + a.label, sub: a.who, right: a.kind, order: a.order, cat: 'approvals' }));
  } else {
    taskRows.forEach((t) => attention.push({ icon: 'clipboard', tone: t.tone, title: t.title, sub: 'Заказ №' + t.order, right: t.due, order: t.order, cat: 'mytasks' }));
    dashChats.filter((c) => c.unread > 0).forEach((c) => attention.push({ icon: c.type === 'supplier' ? 'api' : 'chat', tone: 'amber', title: 'Ответить · ' + c.name, sub: c.lastText, right: c.lastTime, order: c.order, cat: 'chats' }));
    deadlines.forEach((d) => attention.push({ icon: d.icon, tone: d.tone, title: d.label, sub: d.who, right: d.date, order: d.order, cat: 'deadlines' }));
  }
  attention.sort((a, b) => tonePri[a.tone] - tonePri[b.tone]);
  const attTop = attention.slice(0, 8);


  const Row = ({ icon, iconBg, title, sub, right, tone, onClick }) => (
    <button type="button" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', textAlign: 'left', width: '100%', border: '1px solid var(--line)', borderLeft: '3px solid var(--' + (tone || 'line-strong') + ')', background: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
      {icon && <span className="oc-svc-ic" style={{ background: iconBg || 'var(--blue)', width: 32, height: 32 }}><Icon name={icon} style={{ width: 16, height: 16 }} /></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      </div>
      {right}
      {onClick && <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />}
    </button>
  );
  const List = ({ children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>;


  const renderDetail = () => {
    switch (sel) {
      case 'newreq':
        return (
          <table className="tbl">
            <thead><tr><th>Заявка</th><th>Клиент</th><th>Оператор</th><th>Ожидает</th><th>Норматив</th><th>Статус</th></tr></thead>
            <tbody>{slaRows.map((r, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => goOrder(r.no)}>
                <td className="t-strong">№ {r.no}</td><td>{r.client}</td><td>{r.operator}</td>
                <td style={{ fontWeight: 600, color: r.tone === 'red' ? 'var(--red)' : r.tone === 'amber' ? 'var(--amber)' : 'var(--ink)' }}>{r.waited} мин</td>
                <td className="t-muted">{r.limit} мин</td><td><Pill tone={r.tone}>{slaLabel(r.tone)}</Pill></td>
              </tr>))}</tbody>
          </table>
        );
      case 'ordersToday':
        return (
          <table className="tbl">
            <thead><tr><th style={{ width: 80 }}>№</th><th>Клиент</th><th>Статус</th><th>Ответственный</th><th>Тип</th><th style={{ width: 50 }}></th></tr></thead>
            <tbody>{orders.slice(0, 8).map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                <td className="t-strong">{o.no}</td><td className="t-strong">{o.client}</td>
                <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.operator}</td>
                <td><Pill tone="blue">{o.requestType}</Pill></td><td><span className="go-dot"><Icon name="chevRight" /></span></td>
              </tr>))}</tbody>
          </table>
        );
      case 'issued': case 'sales': case 'myearn':
        return (
          <table className="tbl">
            <thead><tr><th>Время</th><th>Услуга</th><th>Заказ</th><th>Тип</th><th style={{ textAlign: 'right' }}>Стоимость</th><th style={{ textAlign: 'right' }}>{sel === 'myearn' ? 'Заработок' : 'Сборы'}</th></tr></thead>
            <tbody>{shOps.map((o, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => goOrder(o.order)}>
                <td className="t-muted">{o.time}</td><td className="t-strong">{o.title}</td><td>№ {o.order}</td>
                <td><Pill tone={o.type === 'Выписка' ? 'green' : o.type === 'Обмен' ? 'blue' : 'amber'}>{o.type}</Pill></td>
                <td style={{ textAlign: 'right' }}>{money(o.cost)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{sel === 'myearn' ? money(operatorEarn(o, motivationFor('Даниель'))) : money(o.serviceFee + o.markup + o.commission)}</td>
              </tr>))}</tbody>
          </table>
        );
      case 'profit':
        return (
          <div className="grid-4" style={{ gap: 14 }}>
            {[['Сервисные сборы', shT.serviceFee, 'blue'], ['Агентские надбавки', shT.markup, 'teal'], ['Комиссионное вознаграждение', shT.commission, 'amber'], ['Заработок операторов', shT.earn, 'gray'], ['Итого сборы', shT.feesTotal, 'blue'], ['Продажи (оборот)', salesToday, 'gray'], ['Прибыль компании', shT.profit, 'green']].map(([l, v, t], i) => (
              <div key={i} className="stat-card" style={{ borderLeft: '3px solid var(--' + t + ')' }}>
                <div className="s-label">{l}</div>
                <div className="s-value" style={{ fontSize: 'var(--fs-stat)', color: t === 'green' ? 'var(--green)' : 'var(--ink)' }}>{money(v)}</div>
              </div>
            ))}
          </div>
        );
      case 'returns':
        if (!returnsActive.length) return <DashDetailEmpty title="Возвратов и обменов в обработке нет" />;
        return <List>{returnsActive.map((r, i) => (
          <Row key={i} icon={RETURN_TYPE[r.type] ? RETURN_TYPE[r.type].icon : 'refund'} iconBg="var(--blue)" tone="amber"
            title={r.type + ' · ' + r.no} sub={r.client + ' · ' + r.service}
            right={<Pill tone={RETURN_STATUS[r.status]}>{r.status}</Pill>} onClick={() => goOrder(r.order)} />
        ))}</List>;
      case 'approvals':
        if (!approvals.length) return <DashDetailEmpty title="Открытых согласований нет" />;
        return <List>{approvals.map((a, i) => (
          <Row key={i} icon="template" iconBg="var(--blue)" tone="amber" title={a.label} sub={a.who}
            right={<Pill tone="gray">{a.kind}</Pill>} onClick={() => goOrder(a.order)} />
        ))}</List>;
      case 'deadlines':
        if (!deadlines.length) return <DashDetailEmpty title="Ближайших дедлайнов нет" />;
        return <List>{deadlines.map((d, i) => (
          <Row key={i} icon={d.icon} iconBg={'var(--' + d.tone + ')'} tone={d.tone} title={d.label} sub={d.who}
            right={<span style={{ fontWeight: 700, color: 'var(--' + d.tone + ')', whiteSpace: 'nowrap' }}>{d.date}</span>} onClick={() => goOrder(d.order)} />
        ))}</List>;
      case 'overdue': case 'risk': {
        const list = sel === 'overdue' ? fin.urgent.filter((u) => u.tone === 'red') : fin.urgent;
        if (!list.length) return <DashDetailEmpty title={sel === 'overdue' ? 'Просрочек по оплатам нет' : 'Рисков по депозитам и лимитам нет'} />;
        return <List>{list.map((u, i) => (
          <Row key={i} icon="bank" iconBg={'var(--' + u.tone + ')'} tone={u.tone} title={u.co} sub={u.text}
            right={<><Pill tone={u.tone}>{u.kind}</Pill><span style={{ fontWeight: 700, color: 'var(--' + u.tone + ')', whiteSpace: 'nowrap', marginLeft: 8 }}>{money(u.value)}</span></>}
            onClick={() => onNavigate('companies')} />
        ))}</List>;
      }
      case 'operators':
        return (
          <table className="tbl">
            <thead><tr><th>Оператор</th><th>Заявок</th><th>Заказов</th><th>Услуг</th><th style={{ textAlign: 'right' }}>Заработок</th><th style={{ textAlign: 'right' }}>Прибыль компании</th><th>SLA</th></tr></thead>
            <tbody>{operatorRows.map((o, i) => (
              <tr key={i}>
                <td className="t-strong">{o.name}</td><td>{o.handled}</td><td>{o.orders}</td><td>{o.issued}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{money(o.earn)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{money(o.profit)}</td>
                <td><Pill tone={o.sla === 'ok' ? 'green' : o.sla}>{o.sla === 'red' ? 'Просрочка' : o.sla === 'amber' ? 'Накал' : 'В норме'}</Pill></td>
              </tr>))}</tbody>
          </table>
        );
      case 'suppliers':
        return (
          <table className="tbl">
            <thead><tr><th>Поставщик</th><th>Ошибки API</th><th>Неуспешные</th><th>Ср. ответ</th><th>Интеграция</th><th>Критичность</th><th style={{ width: 90 }}>Заказы</th></tr></thead>
            <tbody>{supplierRows.map((s, i) => (

              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setErrDrawer(s.name)} title="Открыть ошибки поставщика">
                <td className="t-strong">{s.name}</td>
                <td style={{ color: s.apiErrors ? 'var(--red)' : 'var(--muted-2)', fontWeight: s.apiErrors ? 700 : 400 }}>{s.apiErrors}</td>
                <td style={{ color: s.failed ? 'var(--amber)' : 'var(--muted-2)', fontWeight: s.failed ? 700 : 400 }}>{s.failed}</td>
                <td>{s.avgResp}</td>
                <td><Pill tone={INTEG_TONE[s.integ] || 'gray'}>{s.integ}</Pill></td>
                <td>{s.crit === '—' ? <span className="t-muted">—</span> : <Pill tone={ERR_CRIT_TONE[s.crit] || 'gray'}>{s.crit}</Pill>}</td>
                <td>{s.ordersAffected ? <Pill tone="red">{s.ordersAffected} затронуто</Pill> : <span className="t-muted">—</span>}</td>
              </tr>))}</tbody>
          </table>
        );
      case 'trips':
        return <List>{tripRows.map((t, i) => (
          <Row key={i} icon={t.icon} iconBg="var(--blue)" tone="blue" title={t.main} sub={t.sub}
            right={<Pill tone="blue">{t.type}</Pill>} onClick={() => goOrder(t.order)} />
        ))}</List>;
      case 'activity':
        return <List>{activityRows.map((r, i) => (
          <Row key={i} icon="clock" iconBg="var(--muted-2)" title={r.desc} sub={r.client + ' · ' + r.resp + ' · ' + r.dept}
            right={<span style={{ fontSize: 12, color: 'var(--muted-2)' }}>{r.time}</span>} />
        ))}</List>;
      case 'mytasks':
        return <List>{taskRows.map((t, i) => (
          <Row key={i} icon="clipboard" iconBg={'var(--' + t.tone + ')'} tone={t.tone} title={t.title} sub={'Заказ № ' + t.order}
            right={<span style={{ fontWeight: 700, color: 'var(--' + t.tone + ')', whiteSpace: 'nowrap' }}>{t.due}</span>} onClick={() => goOrder(t.order)} />
        ))}</List>;
      case 'chats':
        if (!dashChats.length) return <DashDetailEmpty title="Активных чатов нет" />;
        return <List>{dashChats.map((c, i) => (
          <Row key={i} icon={c.type === 'supplier' ? 'api' : 'chat'} iconBg={c.unread ? 'var(--amber)' : 'var(--blue)'} tone={c.unread ? 'amber' : 'blue'}
            title={c.name + (c.channel ? ' · ' + c.channel : '')}
            sub={(c.mine ? 'Вы: ' : '') + c.lastText}
            right={<>{c.unread > 0 && <Pill tone="amber">{c.unread} новых</Pill>}<span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{c.lastTime}</span></>}
            onClick={() => onOpenChat ? onOpenChat(c) : (c.order ? goOrder(c.order) : onNavigate('chats'))} />
        ))}</List>;
      default:
        return <DashDetailEmpty title="Нет данных" />;
    }
  };

  const shiftStat = (l, v, accent) => (
    <div style={{ flex: '1 1 120px', minWidth: 110 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l}</div>
      <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: accent ? 'var(--' + accent + ')' : 'var(--ink)', letterSpacing: '-.01em' }}>{v}</div>
    </div>
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

      {searchOpen && <DetailedSearchPanel onClose={() => setSearchOpen(false)} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onNavigate={onNavigate} clients={clients} companies={companies} />}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '10px 38px 22px', overflowY: 'auto' }}>

        {shift && (
          <div className="card card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--green)', background: 'var(--green-bg, #f2fbf6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--green)' }} />
              <h3 className="card-title" style={{ fontSize: 16, margin: 0 }}>Моя смена</h3>
              <Pill tone="green">открыта · с {shiftFmtTime(shift.openedAt)}</Pill>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Отчёт и закрытие — в меню смены в шапке</span>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {shiftStat('Продолжительность', shiftDuration(shift.openedAt))}
              {shiftStat('Операций в смене', backendMode ? (shiftSource.operations || []).length : SHIFT_REQUESTS_HANDLED)}
              {shiftStat('Оформлено заказов', shT.orders)}
              {shiftStat('Выписано услуг', issuedToday)}
              {shiftStat('Текущий заработок', money(shT.earn), 'blue')}
              {shiftStat('Прибыль компании', money(shT.profit), 'green')}
            </div>
          </div>
        )}


        {attTop.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Сейчас требуют внимания</h3>
              <Pill tone="red">{attention.length}</Pill>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Нажмите — откроется рабочая область</span>
            </div>
            <div className="scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {attTop.map((a, i) => (
                <AttentionMarker key={i} a={a} onClick={() => { setSel(a.cat); if (a.order) goOrder(a.order); }} />
              ))}
            </div>
          </div>
        )}


        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
          {widgets.map((w) => (<DashTile key={w.key} w={w} active={sel === w.key} onClick={() => setSel(w.key)} />))}
        </div>


        <div className="card" style={{ flex: 1, minHeight: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
            <h2 className="card-title" style={{ fontSize: 17, margin: 0 }}>{DTITLE[sel] || ''}</h2>
            <div style={{ flex: 1 }} />
            {sel === 'suppliers' && <Button variant="secondary" size="sm" icon="alertCircle" onClick={() => setErrDrawer('')}>Разбор ошибок</Button>}
            {sel === 'suppliers' && <Button variant="secondary" size="sm" icon="suppliers" onClick={() => onNavigate('suppliers')}>Все поставщики</Button>}
            {(sel === 'overdue' || sel === 'risk') && <Button variant="secondary" size="sm" icon="building" onClick={() => onNavigate('companies')}>Все компании</Button>}
            {(sel === 'returns') && <Button variant="secondary" size="sm" icon="refund" onClick={() => onNavigate('returns')}>Все возвраты</Button>}
            {(sel === 'ordersToday' || sel === 'newreq') && <Button variant="secondary" size="sm" icon="orders" onClick={() => onNavigate('orders')}>Все заказы</Button>}
            {sel === 'activity' && <Button variant="secondary" size="sm" icon="bell" onClick={() => onNavigate('notifications')}>Все события</Button>}
            {sel === 'chats' && <Button variant="secondary" size="sm" icon="chat" onClick={() => onNavigate('chats')}>Все чаты</Button>}
          </div>
          <div className="scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>
            {renderDetail()}
          </div>
        </div>
      </div>

      <ErrorCodesDrawer open={errCodeOpen !== null} focusCode={errCodeOpen} onClose={() => setErrCodeOpen(null)} />
      {errDrawer !== null && <SupplierErrorsDrawer supplier={errDrawer || null} errors={backendMode ? activeIncidents : undefined} users={users} suppliers={suppliers} onIncidentChange={updateIncident} onClose={() => setErrDrawer(null)} onOpenOrder={goOrder} />}
    </div>
  );
}

Object.assign(window, { DashboardPage, DetailedSearchPanel });



export { FreeBookingFinalize, DetailedSearchPanel, FinanceOverviewBlock, StatCardDash, SlaResponseWidget, dashToneColor, DashTile, AttentionMarker, DashDetailEmpty, SUPPLIER_STATS, ERR_CRIT_TONE, INTEG_TONE, SUPPLIER_ERRORS, ERR_STATUS_TONE, errNow, errCurOp, errLog, errActiveCount, errPushNotif, errRetry, errAssign, errResolve, errReopen, errSnooze, errChooseSupplier, errSendDev, errAltSuppliers, OPERATORS_WORK, TODAY_TRIPS, MY_TASKS, SupplierErrorCard, SupplierErrorsDrawer, DashboardPage };
