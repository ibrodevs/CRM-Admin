// ===== Сервисные модули (ЖД / гостиницы / трансферы / автобусы / туры) =====
// Единый каркас на шаблоне авиамодуля: реестр → поиск → выдача → карточка.

function svM(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }

const SVC_CFG = {
  rail: { title: 'ЖД билеты', kind: 'ЖД', searchTitle: 'Поиск ЖД билетов', mainLabel: 'Маршрут', qtyLabel: 'Пасс.',
    fields: [{ k: 'from', l: 'Откуда', t: 'text', w: 190 }, { k: 'to', l: 'Куда', t: 'text', w: 190 }, { k: 'date', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиры', t: 'stepper', w: 150 }, { k: 'cls', l: 'Класс', t: 'select', w: 150, o: ['Плацкарт', 'Купе', 'СВ'] }] },
  hotels: { title: 'Гостиницы', kind: 'Гостиница', searchTitle: 'Поиск гостиниц', mainLabel: 'Отель', qtyLabel: 'Гостей',
    fields: [{ k: 'city', l: 'Город', t: 'text', w: 210 }, { k: 'dates', l: 'Заезд — выезд', t: 'daterange', w: 230 }, { k: 'guests', l: 'Гостей', t: 'stepper', w: 140 }, { k: 'rooms', l: 'Номеров', t: 'stepper', w: 140 }, { k: 'stars', l: 'Категория', t: 'select', w: 140, o: ['3★', '4★', '5★'] }] },
  transfers: { title: 'Трансферы', kind: 'Трансфер', searchTitle: 'Поиск трансфера', mainLabel: 'Маршрут', qtyLabel: 'Пасс.',
    fields: [{ k: 'from', l: 'Откуда', t: 'text', w: 210 }, { k: 'to', l: 'Куда', t: 'text', w: 210 }, { k: 'dt', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиров', t: 'stepper', w: 150 }, { k: 'cls', l: 'Класс авто', t: 'select', w: 150, o: ['Эконом', 'Комфорт', 'Минивэн', 'VIP'] }] },
  buses: { title: 'Автобусы', kind: 'Автобус', searchTitle: 'Поиск автобусов', mainLabel: 'Маршрут', qtyLabel: 'Мест',
    fields: [{ k: 'from', l: 'Откуда', t: 'text', w: 210 }, { k: 'to', l: 'Куда', t: 'text', w: 210 }, { k: 'date', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиров', t: 'stepper', w: 150 }] },
  tours: { title: 'Групповые поездки', kind: 'Группа', searchTitle: 'Подбор тура', mainLabel: 'Тур', qtyLabel: 'Чел.',
    fields: [{ k: 'dest', l: 'Направление', t: 'text', w: 230 }, { k: 'dates', l: 'Даты', t: 'daterange', w: 230 }, { k: 'pax', l: 'Туристов', t: 'stepper', w: 150 }, { k: 'board', l: 'Питание', t: 'select', w: 170, o: ['Завтрак', 'Полупансион', 'All Inclusive'] }] },
};

/* ---------- search field renderer ---------- */
function SvcField({ f, form, set }) {
  const v = form[f.k];
  if (f.t === 'date') return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><DateField value={v} onChange={(d) => set(f.k, d)} placeholder="Выбрать" /></div>;
  if (f.t === 'daterange') return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><DateRangeField startVal={v && v.s} endVal={v && v.e} onChange={(s, e) => set(f.k, { s, e })} /></div>;
  if (f.t === 'select') return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><Select options={f.o} value={v || f.o[0]} onChange={(e) => set(f.k, e.target.value)} /></div>;
  if (f.t === 'stepper') {
    const n = v == null ? 1 : v;
    return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span>
      <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <button className="btn btn-secondary btn-icon btn-sm" disabled={n <= 1} onClick={() => set(f.k, n - 1)}>−</button>
        <span style={{ fontWeight: 700 }}>{n}</span>
        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => set(f.k, n + 1)}>+</button>
      </div></div>;
  }
  return <div className="av-field" style={{ width: f.w }}><span className="label">{f.l}</span><Input value={v || ''} onChange={(e) => set(f.k, e.target.value)} placeholder={f.l} /></div>;
}

/* ---------- offer card (reuses off-card) ---------- */
function SvcOfferCard({ o, kind, onSelect, onSave }) {
  const k = SERVICE_KIND[kind];
  const total = o.cost + o.fee;
  return (
    <div className="off-card" style={{ marginBottom: 14 }}>
      <div className="off-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="oc-svc-ic" style={{ background: k.color, width: 44, height: 44 }}><Icon name={k.icon} /></span>
          <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{o.title}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{o.sub}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          {o.info.map((r, i) => (<div key={i}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.l}</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14.5 }}>{r.v}</div></div>))}
        </div>
        <div className="off-meta">{o.tags.map((t, i) => <span key={i} className="off-tag">{t}</span>)}</div>
      </div>
      <div className="off-side">
        <div>
          <div className="off-supplier"><Icon name="api" style={{ width: 13, height: 13, verticalAlign: -2 }} /> {o.supplier}</div>
          <div className="off-price-line"><span>Тариф</span><span>{svM(o.cost)}</span></div>
          <div className="off-price-line"><span>Сервисный сбор</span><span>{svM(o.fee)}</span></div>
          <div className="off-total">{Math.round(total).toLocaleString('ru-RU')} <small>$</small></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="sm" onClick={() => onSelect(o)}>Выбрать</Button>
          <Button variant="secondary" size="sm" icon="star" onClick={() => onSave(o)}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- service card ---------- */
function SvcCard({ item, kind, onBack }) {
  const toast = useToast();
  const k = SERVICE_KIND[kind];
  const isOffer = !!item.cost;
  const title = item.title || item.main;
  const sub = item.sub;
  const status = isOffer ? 'Предложение' : item.status;
  const total = isOffer ? item.cost + item.fee : item.sum;
  const info = item.info || [{ l: 'Детали', v: item.sub }, { l: 'Дата', v: item.date }, { l: 'Количество', v: item.qty }];
  const supplier = item.supplier || '—';
  const no = item.no || (kind.slice(0, 2).toUpperCase() + '-' + Math.floor(10000 + Math.random() * 90000));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>Назад</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{SVC_CFG_TITLE(kind)} / {no}</span>
      </div>
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2 className="card-title">{title}</h2><Pill tone={SERVICE_STATUS[status] || 'gray'}>{status}</Pill></div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{sub} · {supplier}</div>
        </div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>Стоимость</div><div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{total ? svM(total) : '—'}</div></div>
        {status === 'Предложение' && <Button icon="check" onClick={() => toast('Отправлено на бронирование', 'ok')}>Забронировать</Button>}
        {status === 'Забронировано' && <Button icon="check" onClick={() => toast('Услуга оформлена', 'ok')}>Оформить</Button>}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Детали услуги</h3>
          <div className="kv">{info.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}{item.tags && <div className="kv-row"><span className="k">Включено</span><span className="v">{item.tags.join(', ')}</span></div>}</div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Поставщик и финансы</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Поставщик</span><span className="v">{supplier}</span></div>
            <div className="kv-row"><span className="k">Тариф</span><span className="v">{svM(isOffer ? item.cost : total)}</span></div>
            <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{svM(isOffer ? item.fee : 0)}</span></div>
            <div className="kv-row"><span className="k">Итого</span><span className="v" style={{ fontSize: 17 }}>{total ? svM(total) : '—'}</span></div>
          </div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Документы</h3>
      <div className="grid-4">
        {['Ваучер / билет', 'Счёт на оплату', 'Подтверждение'].map((d) => (<button key={d} className="doc-chip"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>))}
        <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => toast('Загрузка', 'info')}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
      </div>
    </div>
  );
}
function SVC_CFG_TITLE(kind) { return Object.values(SVC_CFG).find((c) => c.kind === kind).title; }

/* ====================================================================
   FLOW
   ==================================================================== */
function ServiceFlow({ routeKey }) {
  const cfg = SVC_CFG[routeKey];
  const data = SVC_DATA[routeKey];
  const k = SERVICE_KIND[cfg.kind];
  const toast = useToast();
  const [view, setView] = useState('registry');
  const [form, setForm] = useState({});
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('best');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const TITLES = { registry: cfg.title, search: cfg.searchTitle, results: 'Результаты поиска', card: cfg.title };

  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 900); };

  let offers = [...data.offers];
  if (sort === 'cheap') offers.sort((a, b) => (a.cost + a.fee) - (b.cost + b.fee));
  if (sort === 'pricey') offers.sort((a, b) => (b.cost + b.fee) - (a.cost + a.fee));

  let rows = data.registry.filter((r) => (!fStatus || r.status === fStatus) && (!q || `${r.no} ${r.main} ${r.order}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <Topbar title={TITLES[view]}>
        <div className="topbar-spacer" />
        {view === 'registry' && <Button icon="search" onClick={() => setView('search')}>{cfg.searchTitle === 'Подбор тура' ? 'Подобрать тур' : 'Новый поиск'}</Button>}
      </Topbar>
      <div className="content">
        {view === 'registry' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, маршрут, заказ…" style={{ width: 280 }} />
              <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={[...new Set(data.registry.map((r) => r.status))]} />
            </div>
            <div className="table-card">
              {rows.length ? (
                <table className="tbl">
                  <thead><tr><th>№</th><th>Заказ</th><th>{cfg.mainLabel}</th><th>Детали</th><th>Дата</th><th>{cfg.qtyLabel}</th><th>Статус</th><th style={{ textAlign: 'right' }}>Стоимость</th><th></th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.no} style={{ cursor: 'pointer' }} onClick={() => { setItem(r); setView('card'); }}>
                        <td className="t-strong">{r.no}</td>
                        <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {r.order}</span></td>
                        <td><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span className="airline-logo sm" style={{ background: k.color, width: 30, height: 30, borderRadius: 8 }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span>{r.main}</span></td>
                        <td className="t-muted">{r.sub}</td>
                        <td>{r.date}</td>
                        <td>{r.qty}</td>
                        <td><Pill tone={SERVICE_STATUS[r.status] || 'gray'}>{r.status}</Pill></td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.sum ? svM(r.sum) : '—'}</td>
                        <td onClick={(e) => e.stopPropagation()}><ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>} items={[{ icon: 'eye', label: 'Открыть', onClick: () => { setItem(r); setView('card'); } }, { icon: 'template', label: 'В КП' }]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState icon={k.icon} title="Услуг не найдено" sub="Создайте новый поиск или измените фильтры" />}
            </div>
          </div>
        )}

        {view === 'search' && (
          <div className="fade-in">
            <div className="av-bar">
              {cfg.fields.map((f) => <SvcField key={f.k} f={f} form={form} set={setF} />)}
              <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13.5 }}>
              <Icon name="api" style={{ width: 16, height: 16 }} />Поиск по подключённым поставщикам · {cfg.title}
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('search')}>Изменить поиск</Button>
              <div className="tabs" style={{ marginLeft: 6 }}>
                {[['best', 'Оптимальные'], ['cheap', 'Дешевле'], ['pricey', 'Дороже']].map(([key, l]) => (<button key={key} className={'tab' + (sort === key ? ' active' : '')} onClick={() => setSort(key)}>{l}</button>))}
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
            </div>
            {loading
              ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
              : offers.map((o) => <SvcOfferCard key={o.id} o={o} kind={cfg.kind} onSelect={(x) => { setItem(x); setView('card'); toast('Открыто без привязки к заказу — добавить можно из карточки заказа', 'info'); }} onSave={() => toast('Предложение сохранено', 'ok')} />)}
          </div>
        )}

        {view === 'card' && item && <SvcCard item={item} kind={cfg.kind} onBack={() => setView(item.cost ? 'results' : 'registry')} />}
      </div>
    </>
  );
}

/* ---------- embeddable add-flow (search → results) for the order card ---------- */
function routeKeyForKind(kind) { return Object.keys(SVC_CFG).find((k) => SVC_CFG[k].kind === kind); }

function ServiceAddFlow({ routeKey, onAdd, onCancel }) {
  const cfg = SVC_CFG[routeKey];
  const data = SVC_DATA[routeKey];
  const toast = useToast();
  const [view, setView] = useState('search');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('best');
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 800); };

  let offers = [...data.offers];
  if (sort === 'cheap') offers.sort((a, b) => (a.cost + a.fee) - (b.cost + b.fee));
  if (sort === 'pricey') offers.sort((a, b) => (b.cost + b.fee) - (a.cost + a.fee));

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={view === 'results' ? () => setView('search') : onCancel}>{view === 'results' ? 'Изменить поиск' : 'К услугам заказа'}</Button>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{cfg.searchTitle}</span>
      </div>

      {view === 'search' && (
        <>
          <div className="av-bar">
            {cfg.fields.map((f) => <SvcField key={f.k} f={f} form={form} set={setF} />)}
            <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13.5 }}>
            <Icon name="api" style={{ width: 16, height: 16 }} />Поиск по подключённым поставщикам · {cfg.title}
          </div>
        </>
      )}

      {view === 'results' && (
        <>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {[['best', 'Оптимальные'], ['cheap', 'Дешевле'], ['pricey', 'Дороже']].map(([k, l]) => (<button key={k} className={'tab' + (sort === k ? ' active' : '')} onClick={() => setSort(k)}>{l}</button>))}
            <div style={{ flex: 1 }} /><span style={{ color: 'var(--muted)', fontSize: 14, alignSelf: 'center' }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
          </div>
          {loading
            ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
            : offers.map((o) => <SvcOfferCard key={o.id} o={o} kind={cfg.kind} onSelect={(x) => onAdd(x, cfg.kind)} onSave={() => toast('Предложение сохранено', 'ok')} />)}
        </>
      )}
    </div>
  );
}

Object.assign(window, { ServiceFlow, SVC_CFG, ServiceAddFlow, routeKeyForKind, SvcCard, SvcOfferCard });
