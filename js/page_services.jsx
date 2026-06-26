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
function SvcOfferCard({ o, kind, onSelect, onSave, selectLabel }) {
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
          <Button size="sm" onClick={() => onSelect(o)}>{selectLabel || 'Выбрать'}</Button>
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
  const cur = item.currency || (item.svcOffer && item.svcOffer.currency);
  const fmt = (n) => (cur === 'RUB' || cur === '₽') ? rub(n) : svM(n);
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
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>Стоимость</div><div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{total ? fmt(total) : '—'}</div></div>
        {status === 'Предложение' && <Button icon="check" onClick={() => toast('Отправлено на бронирование', 'ok')}>Забронировать</Button>}
        {status === 'Забронировано' && <Button icon="check" onClick={() => toast('Услуга оформлена', 'ok')}>Оформить</Button>}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Детали услуги</h3>
          <div className="kv">{info.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}{item.tags && <div className="kv-row"><span className="k">Включено</span><span className="v">{item.tags.join(', ')}</span></div>}
            {item.railSeats && (
              <>
                <div className="kv-row"><span className="k">Обслуживание</span><span className="v">{item.railSeats.clsName} · вагон {item.railSeats.wagonNo}</span></div>
                {(item.railSeats.list || []).map((r, i) => (
                  <div className="kv-row" key={'seat' + i}><span className="k">{r.name}</span>
                    <span className="v">{r.seat ? 'место ' + r.seat + ' · ' + (RAIL_SEAT_LABEL[r.kind] || '') : '—'}</span></div>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Поставщик и финансы</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Поставщик</span><span className="v">{supplier}</span></div>
            <div className="kv-row"><span className="k">Тариф</span><span className="v">{fmt(isOffer ? item.cost : total)}</span></div>
            <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{fmt(isOffer ? item.fee : 0)}</span></div>
            <div className="kv-row"><span className="k">Итого</span><span className="v" style={{ fontSize: 17 }}>{total ? fmt(total) : '—'}</span></div>
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

/* ---------- левый фильтр выдачи (как у гостиниц): цена / поставщик / особенности ---------- */
function svcPriceBounds(offers) {
  const totals = offers.map((o) => o.cost + o.fee);
  return { min: Math.floor(Math.min(...totals)), max: Math.ceil(Math.max(...totals)) };
}
function SvcFilters({ allOffers, flt, setFlt, bounds, facetLabel }) {
  const suppliers = [...new Set(allOffers.map((o) => o.supplier))];
  const supCount = (s) => allOffers.filter((o) => o.supplier === s).length;
  const tags = [...new Set(allOffers.flatMap((o) => o.tags || []))];
  const tg = (key, val) => setFlt((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры</span>
        <button className="hp-reset" onClick={() => setFlt({ sup: [], tags: [], priceMax: bounds.max })}>Сбросить всё</button>
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Цена</div>
        <div className="hp-price-range">
          <span className="hp-pr-from">от {svM(bounds.min)}</span>
          <span className="hp-pr-to">{svM(flt.priceMax == null ? bounds.max : flt.priceMax)}</span>
        </div>
        <input type="range" className="hp-slider" min={bounds.min} max={bounds.max} step="1"
          value={flt.priceMax == null ? bounds.max : flt.priceMax}
          onChange={(e) => setFlt((f) => ({ ...f, priceMax: +e.target.value }))} />
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Поставщик</div>
        {suppliers.map((s) => (
          <label key={s} className="hp-check-row">
            <Checkbox on={flt.sup.includes(s)} onChange={() => tg('sup', s)} />
            <span className="hp-check-label">{s}</span>
            <span className="hp-check-cnt">{supCount(s)}</span>
          </label>
        ))}
      </div>
      {tags.length > 0 && (
        <div className="hp-filter-block">
          <div className="hp-filter-title">{facetLabel || 'Особенности'}</div>
          {tags.map((t) => (
            <label key={t} className="hp-check-row">
              <Checkbox on={flt.tags.includes(t)} onChange={() => tg('tags', t)} />
              <span className="hp-check-label">{t}</span>
            </label>
          ))}
        </div>
      )}
    </aside>
  );
}

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
  const bounds = svcPriceBounds(data.offers);
  const [flt, setFlt] = useState({ sup: [], tags: [], priceMax: bounds.max });
  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const TITLES = { registry: cfg.title, search: cfg.searchTitle, results: 'Результаты поиска', card: cfg.title };

  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 900); };

  let offers = data.offers.filter((o) => {
    if (flt.priceMax != null && (o.cost + o.fee) > flt.priceMax) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.tags.length && !(o.tags || []).some((t) => flt.tags.includes(t))) return false;
    return true;
  });
  if (sort === 'cheap') offers = [...offers].sort((a, b) => (a.cost + a.fee) - (b.cost + b.fee));
  if (sort === 'pricey') offers = [...offers].sort((a, b) => (b.cost + b.fee) - (a.cost + a.fee));

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
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.sum ? (r.currency === 'RUB' ? rub(r.sum) : svM(r.sum)) : '—'}</td>
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
            <div className="hp-layout">
              <SvcFilters allOffers={data.offers} flt={flt} setFlt={setFlt} bounds={bounds} facetLabel={cfg.kind === 'ЖД' ? 'Класс и условия' : 'Особенности'} />
              <div>
                {loading
                  ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
                  : offers.length
                    ? offers.map((o) => cfg.kind === 'ЖД'
                        ? <RailOfferCard key={o.id} o={o} onSelect={(x) => { setItem(x); setView('card'); toast('Открыто без привязки к заказу — добавить можно из карточки заказа', 'info'); }} />
                        : <SvcOfferCard key={o.id} o={o} kind={cfg.kind} onSelect={(x) => { setItem(x); setView('card'); toast('Открыто без привязки к заказу — добавить можно из карточки заказа', 'info'); }} onSave={() => toast('Предложение сохранено', 'ok')} />)
                    : <EmptyState icon={k.icon} title="Нет вариантов по фильтрам" sub="Смягчите условия фильтрации слева" />}
              </div>
            </div>
          </div>
        )}

        {view === 'card' && item && <SvcCard item={item} kind={cfg.kind} onBack={() => setView(item.cost ? 'results' : 'registry')} />}
      </div>
    </>
  );
}

/* ---------- embeddable add-flow (search → results) for the order card ---------- */
function routeKeyForKind(kind) { return Object.keys(SVC_CFG).find((k) => SVC_CFG[k].kind === kind); }

function ServiceAddFlow({ routeKey, onAdd }) {
  const cfg = SVC_CFG[routeKey];
  const data = SVC_DATA[routeKey];
  const toast = useToast();
  const [view, setView] = useState('search');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('best');
  const bounds = svcPriceBounds(data.offers);
  const [flt, setFlt] = useState({ sup: [], tags: [], priceMax: bounds.max });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 800); };

  let offers = data.offers.filter((o) => {
    if (flt.priceMax != null && (o.cost + o.fee) > flt.priceMax) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.tags.length && !(o.tags || []).some((t) => flt.tags.includes(t))) return false;
    return true;
  });
  if (sort === 'cheap') offers = [...offers].sort((a, b) => (a.cost + a.fee) - (b.cost + b.fee));
  if (sort === 'pricey') offers = [...offers].sort((a, b) => (b.cost + b.fee) - (a.cost + a.fee));

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        {view === 'results' && <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('search')}>Изменить поиск</Button>}
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
          <div className="hp-layout">
            <SvcFilters allOffers={data.offers} flt={flt} setFlt={setFlt} bounds={bounds} facetLabel={cfg.kind === 'ЖД' ? 'Класс и условия' : 'Особенности'} />
            <div>
              {loading
                ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
                : offers.length
                  ? offers.map((o) => <SvcOfferCard key={o.id} o={o} kind={cfg.kind} onSelect={(x) => onAdd(x, cfg.kind)} onSave={() => toast('Предложение сохранено', 'ok')} />)
                  : <EmptyState icon={SERVICE_KIND[cfg.kind].icon} title="Нет вариантов по фильтрам" sub="Смягчите условия фильтрации слева" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ====================================================================
   RAIL «Выбор вагона и мест» — class → wagon → per-passenger seat assignment.
   Opens as a side panel after a train is picked in the order's ЖД add-flow.
   Passengers are shown «по спискам» (subgroups) and each gets a specific seat.
   ==================================================================== */
const RAIL_SEAT_LABEL = { low: 'Нижнее', up: 'Верхнее', win: 'У окна', aisle: 'У прохода' };
function railSeatKind(cls, n) { const ks = cls.kinds; return ks.length === 1 ? ks[0] : (n % 2 === 1 ? ks[0] : ks[1]); }
function railChunk(arr, n) { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; }
function railSections(pax, groups) {
  if (groups && groups.length) {
    const used = new Set();
    const secs = groups.map((g) => {
      const m = (g.members || []).filter((i) => i < pax.length && !used.has(i));
      m.forEach((i) => used.add(i));
      return { id: g.id, name: g.name, members: m };
    }).filter((s) => s.members.length);
    const rest = pax.map((_, i) => i).filter((i) => !used.has(i));
    if (rest.length) secs.push({ id: '__rest', name: 'Без подгруппы', members: rest });
    return secs;
  }
  return [{ id: '__all', name: null, members: pax.map((_, i) => i) }];
}

/* search-result row (1-в-1 с экраном ЖД-поиска) */
function RailOfferCard({ o, onSelect }) {
  return (
    <div className="rail-offer">
      <div className="ro-train">
        <span className={'ro-logo ' + (o.carrier === 'РЖД' ? 'rzd' : 'alt')}>{o.carrier}</span>
        <div style={{ minWidth: 0 }}>
          <div className="ro-no">{o.number}<span className="ro-name">{o.name}</span></div>
          <div className="ro-tags">{(o.tags || []).map((t, i) => <span key={i} className="ro-tag">{t}</span>)}</div>
        </div>
      </div>
      <div className="ro-leg">
        <div className="ro-time">{o.dep.time}</div>
        <div className="ro-date">{o.dep.date}</div>
        <div className="ro-city">{o.dep.city}</div>
        <div className="ro-station">{o.dep.station}</div>
      </div>
      <div className="ro-mid">
        <div className="ro-dur">{o.dur}</div>
        <div className="ro-line"><span /></div>
        <div className="ro-stops">{o.stops}</div>
      </div>
      <div className="ro-leg">
        <div className="ro-time">{o.arr.time}</div>
        <div className="ro-date">{o.arr.date}</div>
        <div className="ro-city">{o.arr.city}</div>
        <div className="ro-station">{o.arr.station}</div>
      </div>
      <div className="ro-side">
        <div className="ro-price">от {rub(o.priceRub)}</div>
        <div className="ro-per">за 1 человека</div>
        <div className="ro-clsline">{o.cls} · <span className="ro-free">{o.freeSeats} мест</span></div>
        <Button size="sm" onClick={() => onSelect(o)}>Выбрать поезд</Button>
        <button type="button" className="ro-more">Подробнее</button>
      </div>
    </div>
  );
}

/* left filter rail for ЖД search (price ₽ / время / класс / перевозчик) */
function RailFilters({ flt, setFlt, bounds }) {
  const carriers = [...new Set(SVC_DATA.rail.offers.map((o) => o.carrier))];
  const classes = [...new Set(SVC_DATA.rail.offers.map((o) => o.cls))];
  const tg = (key, val) => setFlt((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры</span>
        <button className="hp-reset" onClick={() => setFlt({ priceMax: bounds.max, times: [], classes: [], carriers: [] })}>Сбросить всё</button>
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Цена</div>
        <div className="hp-price-range"><span className="hp-pr-from">от {rub(bounds.min)}</span><span className="hp-pr-to">{rub(flt.priceMax == null ? bounds.max : flt.priceMax)}</span></div>
        <input type="range" className="hp-slider" min={bounds.min} max={bounds.max} step="100"
          value={flt.priceMax == null ? bounds.max : flt.priceMax} onChange={(e) => setFlt((f) => ({ ...f, priceMax: +e.target.value }))} />
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Время отправления</div>
        {[['morning', 'Утро · 06–12'], ['day', 'День · 12–18'], ['evening', 'Вечер · 18–00'], ['night', 'Ночь · 00–06']].map(([v, l]) => (
          <label key={v} className="hp-check-row"><Checkbox on={flt.times.includes(v)} onChange={() => tg('times', v)} /><span className="hp-check-label">{l}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Класс обслуживания</div>
        {classes.map((c) => (
          <label key={c} className="hp-check-row"><Checkbox on={flt.classes.includes(c)} onChange={() => tg('classes', c)} /><span className="hp-check-label">{c}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Перевозчик</div>
        {carriers.map((c) => (
          <label key={c} className="hp-check-row"><Checkbox on={flt.carriers.includes(c)} onChange={() => tg('carriers', c)} /><span className="hp-check-label">{c}</span></label>
        ))}
      </div>
    </aside>
  );
}

const railTimeBucket = (t) => { const h = +(t || '0').split(':')[0]; return h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : 'evening'; };

/* full ЖД add-flow inside the order: search bar + filters + result rows → seat panel */
function RailAddFlow({ participants = [], groups, onAdd }) {
  const toast = useToast();
  const offersAll = SVC_DATA.rail.offers;
  const bounds = { min: Math.floor(Math.min(...offersAll.map((o) => o.priceRub))), max: Math.ceil(Math.max(...offersAll.map((o) => o.priceRub))) };
  const [form, setForm] = useState({ from: 'Москва', to: 'Санкт-Петербург', dep: null, ret: null, pax: Math.max(1, participants.length) });
  const [sort, setSort] = useState('best');
  const [flt, setFlt] = useState({ priceMax: bounds.max, times: [], classes: [], carriers: [] });
  const [seatOffer, setSeatOffer] = useState(null);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  let offers = offersAll.filter((o) => {
    if (flt.priceMax != null && o.priceRub > flt.priceMax) return false;
    if (flt.times.length && !flt.times.includes(railTimeBucket(o.dep.time))) return false;
    if (flt.classes.length && !flt.classes.includes(o.cls)) return false;
    if (flt.carriers.length && !flt.carriers.includes(o.carrier)) return false;
    return true;
  });
  if (sort === 'cheap') offers = [...offers].sort((a, b) => a.priceRub - b.priceRub);
  if (sort === 'fast') offers = [...offers].sort((a, b) => a.dur.localeCompare(b.dur));

  const applySeats = (res) => {
    const aug = { ...seatOffer, sub: seatOffer.sub + ' · ' + res.summary, cost: res.total, fee: seatOffer.fee, currency: 'RUB', railSeats: res };
    setSeatOffer(null);
    onAdd(aug, 'ЖД');
  };

  return (
    <div className="fade-in">
      <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Поиск железнодорожных билетов</div>
      <div className="av-bar">
        <div className="av-field" style={{ width: 190 }}><span className="label">Откуда</span><Input value={form.from} onChange={(e) => setF('from', e.target.value)} /></div>
        <div className="av-field" style={{ width: 190 }}><span className="label">Куда</span><Input value={form.to} onChange={(e) => setF('to', e.target.value)} /></div>
        <div className="av-field" style={{ width: 150 }}><span className="label">Туда</span><DateField value={form.dep} onChange={(d) => setF('dep', d)} placeholder="Дата" /></div>
        <div className="av-field" style={{ width: 150 }}><span className="label">Обратно</span><DateField value={form.ret} onChange={(d) => setF('ret', d)} placeholder="—" /></div>
        <div className="av-field" style={{ width: 130 }}><span className="label">Пассажиры</span>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-icon btn-sm" disabled={form.pax <= 1} onClick={() => setF('pax', form.pax - 1)}>−</button>
            <span style={{ fontWeight: 700 }}>{form.pax}</span>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setF('pax', form.pax + 1)}>+</button>
          </div>
        </div>
        <Button icon="search" style={{ height: 46, marginBottom: 0 }}>Найти</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 14px' }}>
        <div className="tabs">
          {[['best', 'Рекомендуемые'], ['cheap', 'Дешевле'], ['fast', 'Быстрее']].map(([k, l]) => (
            <button key={k} className={'tab' + (sort === k ? ' active' : '')} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Результаты поиска ({offers.length})</span>
      </div>

      <div className="hp-layout">
        <RailFilters flt={flt} setFlt={setFlt} bounds={bounds} />
        <div style={{ minWidth: 0 }}>
          {offers.length ? offers.map((o) => <RailOfferCard key={o.id} o={o} onSelect={setSeatOffer} />)
            : <EmptyState icon="train" title="Нет поездов по фильтрам" sub="Смягчите условия фильтрации слева" />}
        </div>
      </div>

      {seatOffer && (
        <RailSeatPanel offer={seatOffer} participants={participants} groups={groups}
          onClose={() => setSeatOffer(null)} onApply={applySeats} />
      )}
    </div>
  );
}

function RailSeatPanel({ offer, participants, groups, onClose, onApply }) {
  const PAX = participants && participants.length ? participants : [{ name: 'Пассажир 1', role: 'Взрослый' }];
  const tagClass = RAIL_SERVICE_CLASSES.find((c) => c.name === offer.cls) || RAIL_SERVICE_CLASSES.find((c) => (offer.tags || []).some((t) => t === c.type));
  const [clsId, setClsId] = useState(tagClass ? tagClass.id : 'kupe');
  const cls = RAIL_SERVICE_CLASSES.find((c) => c.id === clsId);
  const wagons = RAIL_WAGONS[clsId] || [];
  const [wagonNo, setWagonNo] = useState(wagons[0] ? wagons[0].no : '01');
  const [wagShow, setWagShow] = useState(8);
  const [seats, setSeats] = useState({});     // paxIdx -> seat number
  const [activePax, setActivePax] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const changeClass = (id) => { setClsId(id); const w = RAIL_WAGONS[id] || []; setWagonNo(w[0] ? w[0].no : '01'); setSeats({}); setWagShow(8); };
  const changeWagon = (no) => { setWagonNo(no); setSeats({}); };

  const occupied = new Set(RAIL_OCCUPIED[clsId + ':' + wagonNo] || []);
  const seatOwner = (n) => { const e = Object.entries(seats).find(([, v]) => v === n); return e ? +e[0] : null; };
  const assignSeat = (i, val) => {
    const n = val ? +val : null;
    setSeats((s) => { const x = { ...s }; if (!n) { delete x[i]; return x; } Object.keys(x).forEach((k) => { if (x[k] === n) delete x[k]; }); x[i] = n; return x; });
  };
  const pickSeat = (n) => { if (occupied.has(n)) return; const owner = seatOwner(n); assignSeat(activePax, (owner === activePax) ? '' : String(n)); };

  const assignedCount = Object.values(seats).filter(Boolean).length;
  const total = cls.priceRub * PAX.length;
  const seatNumbers = Array.from({ length: cls.seats }, (_, i) => i + 1);
  const comps = cls.perComp ? railChunk(seatNumbers, cls.perComp) : null;
  const seatOptions = (i) => [{ value: '', label: '— выбрать —' }].concat(
    seatNumbers.filter((n) => !occupied.has(n) && (seatOwner(n) === null || seatOwner(n) === i))
      .map((n) => ({ value: String(n), label: 'Место ' + n + ' · ' + RAIL_SEAT_LABEL[railSeatKind(cls, n)] })));
  const visiblePax = showAll ? PAX.map((_, i) => i) : PAX.map((_, i) => i).slice(0, 5);

  const seatNode = (n) => {
    const kind = railSeatKind(cls, n);
    const owner = seatOwner(n);
    const isOcc = occupied.has(n);
    const isSel = owner != null;
    const mine = seats[activePax] === n;
    return (
      <button key={n} type="button" disabled={isOcc}
        className={'rail-seat ' + kind + (isOcc ? ' occupied' : '') + (isSel ? ' sel' : '') + (mine ? ' mine' : '')}
        title={isOcc ? 'Занято' : ('Место ' + n + ' · ' + RAIL_SEAT_LABEL[kind] + (isSel ? ' · ' + PAX[owner].name : ''))}
        onClick={() => pickSeat(n)}>{n}</button>
    );
  };

  const apply = () => onApply({
    clsId, clsName: cls.name, wagonNo, seats, total,
    summary: cls.name + ' · ваг. ' + wagonNo + ' · места ' + (PAX.map((_, i) => seats[i]).filter(Boolean).join(', ') || '—'),
    list: PAX.map((p, i) => ({ name: p.name, seat: seats[i] || null, kind: seats[i] ? railSeatKind(cls, seats[i]) : null })),
  });

  return (
    <StackPanel title="Выбор вагона и мест" width="min(1380px,97vw)" onClose={onClose}
      footer={<>
        <div className="rail-foot-note">Цены указаны за 1 человека. Включая налоги и сборы.</div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" disabled={assignedCount < PAX.length} onClick={apply}>
          {assignedCount < PAX.length ? `Назначьте места (${assignedCount}/${PAX.length})` : 'Применить и продолжить'}
        </Button></>}>
      <div className="rail-head">
        <span className={'ro-logo ' + (offer.carrier === 'РЖД' ? 'rzd' : 'alt')} style={{ height: 34 }}>{offer.carrier}</span>
        <div style={{ minWidth: 0 }}>
          <div className="t">{offer.number} · {offer.name}</div>
          <div className="s">{offer.dep.city} → {offer.arr.city} · {offer.dep.time}–{offer.arr.time} · {offer.dur}</div>
        </div>
      </div>

      <div className="rail-layout">
        {/* 1. класс обслуживания */}
        <div className="rail-col">
          <div className="rail-col-h">1. Выберите класс обслуживания</div>
          <div className="rail-class-list">
            {RAIL_SERVICE_CLASSES.map((c) => (
              <button key={c.id} type="button" className={'rail-class' + (clsId === c.id ? ' sel' : '')} onClick={() => changeClass(c.id)}>
                <span className="rc-ic"><Icon name={c.icon} /></span>
                <div className="rc-body">
                  <div className="rc-name">{c.name}</div>
                  <div className="rc-price">от {rub(c.priceRub)}</div>
                  <div className="rc-per">за 1 человека</div>
                  <div className="rc-free">Свободно мест: {c.freeSeats}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. вагон */}
        <div className="rail-col">
          <div className="rail-col-h">2. Выберите вагон</div>
          <div className="rail-col-sub">Вагоны класса {cls.name}</div>
          <div className="rail-wlist">
            {wagons.slice(0, wagShow).map((w) => (
              <button key={w.no} type="button" className={'rail-wrow' + (wagonNo === w.no ? ' sel' : '')} onClick={() => changeWagon(w.no)}>
                <Radio on={wagonNo === w.no} onChange={() => changeWagon(w.no)} />
                <span className="wno">{w.no}</span>
                <span className="wtype">{cls.type}</span>
                <span className={'wseats' + (w.seatsLeft <= 4 ? ' low' : '')}>{w.seatsLeft}</span>
              </button>
            ))}
            {wagons.length > wagShow && <button type="button" className="rail-link" onClick={() => setWagShow(wagons.length)}>Показать ещё вагоны ({wagons.length - wagShow})</button>}
          </div>
        </div>

        {/* 3. места + назначение пассажирам */}
        <div className="rail-col grow">
          <div className="rail-col-h">3. Выберите места и назначьте их пассажирам</div>
          <div className="rail-wagon-line">Вагон {wagonNo} · {cls.type}</div>
          <div className="rail-amenities">{cls.amenities.map((a) => <span key={a} className="rail-am"><Icon name="check" />{a}</span>)}</div>

          <div className="rail-car">
            <div className="rail-wc">WC</div>
            {comps
              ? comps.map((seatsInComp, ci) => {
                  const top = seatsInComp.filter((n) => n % 2 === 0);
                  const bottom = seatsInComp.filter((n) => n % 2 === 1);
                  return (
                    <div className="rail-comp" key={ci}>
                      <div className="rail-comp-row">{top.map(seatNode)}</div>
                      <div className="rail-comp-row">{bottom.map(seatNode)}</div>
                      <div className="rail-comp-n">{ci + 1}</div>
                    </div>
                  );
                })
              : <div className="rail-sit-grid">{seatNumbers.map(seatNode)}</div>}
          </div>
          <div className="rail-legend">
            {cls.kinds.map((kk) => <span key={kk} className="rail-leg"><span className={'rail-seat ' + kk} />{RAIL_SEAT_LABEL[kk]}</span>)}
            <span className="rail-leg"><span className="rail-seat sel" />Выбрано</span>
            <span className="rail-leg"><span className="rail-seat occupied" />Занято</span>
          </div>

          <div className="rail-assign">
            <div className="rail-assign-head">
              <span className="ttl">Назначьте места пассажирам</span>
              <span className="ok">Назначено: {assignedCount} из {PAX.length}</span>
              <span className="warn">Не назначено: {PAX.length - assignedCount}</span>
              <div style={{ flex: 1 }} />
              <button type="button" className="rail-link" onClick={() => setSeats({})}>Сбросить все места</button>
            </div>
            <table className="rail-ptbl">
              <thead><tr><th>№</th><th>Пассажир</th><th>Тип</th><th>Место</th><th>Статус</th></tr></thead>
              <tbody>
                {visiblePax.map((i) => (
                  <tr key={i} className={activePax === i ? 'active' : ''} onClick={() => setActivePax(i)}>
                    <td className="t-muted">{i + 1}</td>
                    <td className="t-strong">{PAX[i].name}</td>
                    <td>{PAX[i].role || 'Взрослый'}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ width: 180 }}>
                      <Select options={seatOptions(i)} value={seats[i] ? String(seats[i]) : ''} onChange={(e) => assignSeat(i, e.target.value)} />
                    </td>
                    <td>
                      {seats[i]
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pill tone="green">Назначено</Pill><button type="button" className="rail-clear" onClick={(e) => { e.stopPropagation(); assignSeat(i, ''); }}><Icon name="x" /></button></span>
                        : <Pill tone="amber">Не назначено</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {PAX.length > 5 && <button type="button" className="rail-link" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Свернуть' : `Показать ещё ${PAX.length - 5} пассажиров`}</button>}
          </div>
        </div>
      </div>
    </StackPanel>
  );
}

Object.assign(window, { ServiceFlow, SVC_CFG, ServiceAddFlow, routeKeyForKind, SvcCard, SvcOfferCard, RailSeatPanel, RailAddFlow, RailOfferCard });
