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
import { ordersApi } from './api/resources';
import { toUiOrder } from './api/adapters';





function FreeBookingFinalize({ draft, onClose, onDone, onOpenOrder, onCreateOrder, clients = [], companies = [] }) {
  const toast = useToast();
  const [step, setStep] = useState('menu');
  const [entity, setEntity] = useState('legal');
  const [q, setQ] = useState('');
  const [recipient, setRecipient] = useState('');
  const kpNo = 'КП из backend';

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
        base_currency: 'USD',
        source: 'dashboard',
      });
      const order = toUiOrder(created);
      toast('Создан заказ № ' + order.no + ' на «' + clientName + '» · услуг: ' + draft.length, 'ok',
        onOpenOrder ? { action: { label: 'Открыть заказ № ' + order.no, onClick: () => onOpenOrder(order) }, duration: 7000 } : {});
      if (onCreateOrder) onCreateOrder(order);
      onDone();
    } catch (error) {
      toast(error.message || 'Не удалось создать заказ', 'err');
      return;
    }
  };
  const svcTitle = (x) => x.title || x.route || x.fareName || (x.from && x.to ? x.from + ' → ' + x.to : x.kind || 'Услуга');
  const svcSum = (x) => x.fareDeltaUsd || x.total || x.cost || x.price || x.sum || 0;
  const total = draft.reduce((s, x) => s + svcSum(x), 0);
  const finish = (msg, action) => { toast(msg, 'ok', action ? { action, duration: 7000 } : {}); onDone(); };

  const orderPickRows = ufOrderPickRows;


  if (step === 'order') {
    const rows = orderPickRows(q);
    return (
      <Drawer open onClose={onClose} title="Привязать к заказу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № заказа или клиент" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((o) => (
            <UfOrderRow key={o.id} order={o} onClick={() => finish('Услуги привязаны к заказу № ' + o.no)} />
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
            <UfOrderRow key={o.id} order={o} icon="chat" tone="var(--green)" onClick={() => finish(
              'Подборка (' + draft.length + ' ' + plural(draft.length, ['услуга', 'услуги', 'услуг']) + ') отправлена в чат по заказу № ' + o.no,
              { label: 'Открыть заказ № ' + o.no, onClick: () => onOpenOrder && onOpenOrder(o) }
            )} />
          ))}
          {!rows.length && <EmptyState icon="chat" title="Заказы не найдены" />}
        </div>
      </Drawer>
    );
  }


  if (step === 'person') {
    const list = CLIENTS.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
    return (
      <Drawer open onClose={onClose} title="Привязать к физ. лицу"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setStep('menu')}>Назад</Button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск клиента" style={{ width: '100%', marginBottom: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c) => (
            <UfPersonRow key={c} name={c} onClick={() => finish('Услуги привязаны к клиенту: ' + c)} />
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
          <Button icon="send" style={{ flex: 1 }} onClick={() => toast('Сначала привяжите подборку к заказу: КП создаётся только по backend-заказу', 'err')}>
            {recipient ? 'Отправить клиенту' : 'Сформировать КП'}
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
          {CLIENTS.slice(0, 4).map((c) => (
            <button key={c} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => setRecipient(c)}>{c}</button>
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
          {[['Скачать PDF', 'download', () => toast('PDF доступен после создания КП по заказу', 'err')],
            ['Открыть в разделе КП', 'template', () => toast('Сначала создайте заказ и КП в backend', 'err')],
            ['Копировать ссылку', 'docs', () => toast('Ссылка появится после создания backend КП', 'err')],
            ['Печать', 'clipboard', () => toast('Печать доступна после создания backend КП', 'err')]].map(([label, icon, on]) => (
            <button key={label} className="doc-chip" style={{ width: '100%' }} onClick={on}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} style={{ width: 16, height: 16 }} />{label}</span>
              <Icon name="chevRight" style={{ width: 16, height: 16 }} />
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



function DetailedSearchPanel({ onClose, initialKind, onOpenOrder, onCreateOrder, clients = [], companies = [] }) {
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
      {finalize && <FreeBookingFinalize draft={draft} onClose={() => setFinalize(false)} onDone={() => { setFinalize(false); onClose(); }} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} clients={clients} companies={companies} />}
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



function SupplierErrorCard({ err, onClose, onOpenOrder, onChange }) {
  const toast = useToast();
  const [showTech, setShowTech] = useState(false);
  const [, force] = useState(0);
  const rerender = () => { force((x) => x + 1); onChange && onChange(); };
  const resolved = err.status === 'Решена';

  const doRetry = () => { const ok = errRetry(err); rerender(); toast(ok ? 'Повтор успешен — ошибка закрыта' : 'Повтор выполнен — ошибка ещё активна', ok ? 'ok' : 'warn'); };
  const doAssign = (who) => { errAssign(err, who); rerender(); toast('Назначен: ' + who + ' · создано уведомление', 'ok'); };
  const doSupplier = (sup) => { errChooseSupplier(err, sup); rerender(); toast('Поставщик переключён: ' + sup, 'ok'); };
  const doSnooze = (label) => { errSnooze(err, label); rerender(); toast('Отложено: ' + label, 'info'); };
  const doResolve = () => { errResolve(err); rerender(); toast('Ошибка закрыта и убрана из активных', 'ok'); };
  const doReopen = () => { errReopen(err); rerender(); toast('Ошибка возвращена в работу', 'info'); };
  const doDev = () => { errSendDev(err); rerender(); toast('Передано разработчику · тикет ' + err.devTicket, 'ok'); };
  const doCopy = () => { try { navigator.clipboard.writeText(err.tech || ''); } catch (e) {} errLog(err, 'Скопированы технические данные'); rerender(); toast('Технические данные скопированы', 'ok'); };

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
        <Button variant="secondary" icon="zap" disabled={resolved} onClick={doRetry}>Повторить запрос</Button>
        {err.order && <Button variant="secondary" icon="orders" onClick={() => { onOpenOrder && onOpenOrder(err.order); onClose(); }}>Открыть заказ</Button>}
        {resolved
          ? <Button variant="secondary" icon="refund" onClick={doReopen}>Вернуть в работу</Button>
          : <Button variant="primary" icon="check" onClick={doResolve}>Отметить решённой</Button>}
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
        <Button variant="secondary" size="sm" icon="zap" disabled={resolved} onClick={doRetry}>Повторно проверить цену и наличие</Button>
        <ActionMenu trigger={<Button variant="secondary" size="sm" icon="suppliers" disabled={resolved}>Выбрать другого поставщика</Button>}
          items={errAltSuppliers(err).map((s) => ({ icon: 'suppliers', label: s, onClick: () => doSupplier(s) }))} />
        <ActionMenu trigger={<Button variant="secondary" size="sm" icon="user" disabled={resolved}>Назначить ответственного</Button>}
          items={(typeof OPERATORS !== 'undefined' ? OPERATORS : ['Оператор']).map((o) => ({ icon: 'user', label: o, onClick: () => doAssign(o) }))} />
        <ActionMenu trigger={<Button variant="secondary" size="sm" icon="clock" disabled={resolved}>Отложить обработку</Button>}
          items={['30 минут', '2 часа', 'до завтра'].map((l) => ({ icon: 'clock', label: l, onClick: () => doSnooze(l) }))} />
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

function SupplierErrorsDrawer({ supplier, onClose, onOpenOrder }) {
  const [flt, setFlt] = useState({ supplier: supplier || '', service: '', op: '', crit: '', status: '', activeOnly: false, grouped: true });
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [, bump] = useState(0);
  let list = SUPPLIER_ERRORS.filter((e) =>
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
        {chip('Поставщик', 'supplier', [...new Set(SUPPLIER_ERRORS.map((e) => e.supplier))])}
        {chip('Тип услуги', 'service', [...new Set(SUPPLIER_ERRORS.map((e) => e.service))])}
        {chip('Операция', 'op', [...new Set(SUPPLIER_ERRORS.map((e) => e.op))])}
        {chip('Критичность', 'crit', ['Критическая', 'Важная', 'Информационная'])}
        {chip('Статус', 'status', [...new Set(SUPPLIER_ERRORS.map((e) => e.status))])}
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
      {sel && <SupplierErrorCard err={sel} onClose={() => setSel(null)} onOpenOrder={onOpenOrder} onChange={() => bump((v) => v + 1)} />}
    </Drawer>
  );
}

function DashboardPage({ role, orders = [], clients = [], companies = [], proposals = [], returns = [], notifications = [], chats = [], dashboard, finance, onNavigate, onAddOrder, onOpenOrder, onCreateOrder }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [errCodeOpen, setErrCodeOpen] = useState(null);
  const [errDrawer, setErrDrawer] = useState(null);
  const [, tick] = useState(0);

  const isMgr = role === 'Админ' || role === 'Менеджер';
  const backendMode = dashboard !== undefined;
  const [sel, setSel] = useState(isMgr ? 'overdue' : 'mytasks');
  const shift = window.SHIFT_STATE || null;

  useEffect(() => {
    const onShift = () => tick((t) => t + 1);
    window.addEventListener('shift-change', onShift);
    const id = setInterval(() => tick((t) => t + 1), 60000);
    return () => { window.removeEventListener('shift-change', onShift); clearInterval(id); };
  }, []);

  useEffect(() => { setSel(isMgr ? 'overdue' : 'mytasks'); }, [isMgr]);

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
  const slaSource = backendMode ? orders.filter((order) => order.statusCode === 'new').map((order) => {
    const waited = Math.max(0, Math.round((Date.now() - new Date(order.created_at || order.createdOn).getTime()) / 60000));
    return { no: order.no, client: order.client, operator: order.operator, waited, limit: 15 };
  }) : SLA_QUEUE;
  const slaRows = slaSource.map((q) => ({ ...q, tone: slaTone(q.waited, q.limit) }));
  const slaOverdue = slaRows.filter((r) => r.tone === 'red').length;
  const errNotifs = notifications.filter((n) => n.source === 'Интеграции');
  const supErrTotal = backendMode ? (dashboard?.integration_incidents?.open || 0) : errActiveCount();

  const taskRows = backendMode ? (dashboard?.my_tasks || []).map((task) => {
    const order = orders.find((item) => item.id === task.order);
    const due = task.due_at ? new Date(task.due_at) : null;
    return { title: task.title, due: due ? due.toLocaleString('ru-RU') : 'без срока', tone: task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'amber' : 'blue', order: order?.no || task.order };
  }) : MY_TASKS;
  const tripRows = backendMode ? (dashboard?.trips_today || []).map((trip) => ({ type: 'Поездка', icon: 'plane', main: trip.title, sub: new Date(trip.starts_at).toLocaleString('ru-RU'), order: trip.order_number })) : TODAY_TRIPS;
  const operatorRows = backendMode ? [] : OPERATORS_WORK;
  const activityRows = backendMode ? [] : RECENT_CHANGES;
  const supplierRows = backendMode ? [] : SUPPLIER_STATS;


  const shOps = shift ? shift.ops : (backendMode ? [] : SHIFT_DEMO_OPS);
  const shT = shiftTotals(shOps, motivationFor('Даниель'));
  const issuedToday = shOps.filter((o) => o.type === 'Выписка').length;
  const salesToday = shOps.reduce((s, o) => s + Math.max(0, o.cost), 0);

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
  const goOrder = (no) => { const o = orders.find((x) => x.no === no); o ? onOpenOrder(o) : onNavigate('orders'); };


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
    { key: 'suppliers', label: 'Поставщики (API)',  value: dashboard?.integration_incidents?.open ?? supErrTotal, sub: 'ошибок', tone: (dashboard?.integration_incidents?.open ?? supErrTotal) ? 'red' : 'green', icon: 'api' },
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
  const critErr = backendMode ? [] : (typeof SUPPLIER_ERRORS !== 'undefined' ? SUPPLIER_ERRORS : []).filter((e) => e.crit === 'Критическая');
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
            onClick={() => goOrder(c.order)} />
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
      <Topbar title={isMgr ? 'Добрый день, Айсулуу' : 'Мой рабочий день'}>
        <div className="topbar-spacer" />
        <SearchBox value={search} onChange={setSearch} placeholder="Поиск" style={{ width: 220 }} />
        <Button variant="secondary" icon="calendar" onClick={() => onNavigate('calendar')}>Календарь поездок</Button>
        <Button variant="secondary" icon="search" onClick={() => setSearchOpen(true)}>Поиск услуг</Button>
        <Button variant="primary" icon="plus" onClick={onAddOrder}>Добавить заказ</Button>
      </Topbar>

      {searchOpen && <DetailedSearchPanel onClose={() => setSearchOpen(false)} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} clients={clients} companies={companies} />}

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
              {shiftStat('Обработано заявок', SHIFT_REQUESTS_HANDLED)}
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
      {errDrawer !== null && <SupplierErrorsDrawer supplier={errDrawer || null} onClose={() => setErrDrawer(null)} onOpenOrder={onOpenOrder} />}
    </div>
  );
}

Object.assign(window, { DashboardPage, DetailedSearchPanel });



export { FreeBookingFinalize, DetailedSearchPanel, FinanceOverviewBlock, StatCardDash, SlaResponseWidget, dashToneColor, DashTile, AttentionMarker, DashDetailEmpty, SUPPLIER_STATS, ERR_CRIT_TONE, INTEG_TONE, SUPPLIER_ERRORS, ERR_STATUS_TONE, errNow, errCurOp, errLog, errActiveCount, errPushNotif, errRetry, errAssign, errResolve, errReopen, errSnooze, errChooseSupplier, errSendDev, errAltSuppliers, OPERATORS_WORK, TODAY_TRIPS, MY_TASKS, SupplierErrorCard, SupplierErrorsDrawer, DashboardPage };
