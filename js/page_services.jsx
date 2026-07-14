// ===== Сервисные модули (ЖД / гостиницы / трансферы / автобусы / туры) =====
// Единый каркас на шаблоне авиамодуля: реестр → поиск → выдача → карточка.

function svM(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }

/* Аэроэкспресс — направления (аэропорт ⇄ городской терминал) и вариации проезда.
   Тариф флотовый: от направления не зависит, отличается видом проезда (разово / туда-обратно / абонемент). */
const AERO_DIRS = [
  { id: 'svo', label: 'Шереметьево (SVO) ⇄ Белорусский вокзал' },
  { id: 'dme', label: 'Домодедово (DME) ⇄ Павелецкий вокзал' },
  { id: 'vko', label: 'Внуково (VKO) ⇄ Киевский вокзал' },
];
const AERO_FARES = [['single', 'Разовый'], ['rt', 'Туда и обратно'], ['pass', 'Абонемент']];

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
  aero: { title: 'Аэроэкспресс', kind: 'Аэроэкспресс', searchTitle: 'Поиск билетов Аэроэкспресс', mainLabel: 'Направление', qtyLabel: 'Пасс.',
    fields: [{ k: 'dir', l: 'Направление', t: 'select', w: 300, o: AERO_DIRS.map((d) => d.label) }, { k: 'date', l: 'Дата', t: 'date', w: 156 }, { k: 'pax', l: 'Пассажиров', t: 'stepper', w: 150 }] },
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
  const fmt = o.currency === 'RUB' ? rub : svM;
  return (
    <div className="off-card" style={{ marginBottom: 14 }}>
      <div className="off-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="oc-svc-ic" style={{ background: k.color, width: 44, height: 44 }}><Icon name={k.icon} /></span>
          <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{o.title}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{o.sub}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          {o.info.map((r, i) => (<div key={i}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.l}</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{r.v}</div></div>))}
        </div>
        <div className="off-meta">{o.tags.map((t, i) => <span key={i} className="off-tag">{t}</span>)}</div>
      </div>
      <div className="off-side">
        <div>
          <div className="off-supplier"><Icon name="api" style={{ width: 14, height: 14, verticalAlign: -2 }} /> {o.supplier}</div>
          <div className="off-price-line"><span>Тариф</span><span>{fmt(o.cost)}</span></div>
          <div className="off-price-line"><span>Сервисный сбор</span><span>{fmt(o.fee)}</span></div>
          <div className="off-total">{Math.round(total).toLocaleString('ru-RU')} <small>{o.currency === 'RUB' ? '₽' : '$'}</small></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="sm" onClick={() => onSelect(o)}>{selectLabel || 'Выбрать'}</Button>
          <Button variant="secondary" size="sm" icon="star" onClick={() => onSave(o)}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- service card — единая структура с авиа-карточкой (вкладки: участники / детали /
   поставщик / финансы / документы / комментарии / история), чтобы все услуги выглядели одинаково ---------- */
/* Строки внутренних финполей, которые компания РАЗРЕШИЛА показывать клиенту (настройка видимости). */
function clientFinRows(fin, vis, fmt) {
  const rows = [
    ['supplierPrice', 'Цена поставщика', fin.supplierPrice],
    ['cost', 'Себестоимость', fin.cost],
    ['commission', 'Комиссия поставщика', fin.commission],
    ['serviceFee', 'Сервисный сбор', fin.fee],
    ['markup', 'Наценка', fin.markup],
    ['profit', 'Прибыль', fin.profit],
  ].filter(([k]) => vis && vis[k]);
  return rows.map(([k, label, val]) => (<div className="kv-row" key={k}><span className="k">{label}</span><span className="v">{fmt(val)}</span></div>));
}

/* ---------- Карточка услуги: индикатор жизненного цикла (создана → … → оформлена) ---------- */
function CardLifecycle({ current }) {
  const done = CARD_STATUS_FLOW.indexOf(current);
  return (
    <div className="timeline">
      {CARD_STATUS_FLOW.map((s, i) => {
        const st = CARD_STATUS[s];
        const state = i < done ? 'past' : i === done ? 'cur' : 'future';
        return (
          <div className="tl-item" key={s}>
            <span className="tl-dot" style={{ background: state === 'future' ? 'var(--line)' : (state === 'cur' ? 'var(--blue)' : 'var(--green)') }} />
            {i < CARD_STATUS_FLOW.length - 1 && <span className="tl-line" />}
            <div><div className="tl-text" style={{ fontWeight: state === 'cur' ? 700 : 500, color: state === 'future' ? 'var(--muted-2)' : 'var(--ink)' }}>
              {st.label}{state === 'cur' ? ' · текущий' : ''}</div></div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Универсальный конструктор карточки услуги (ТЗ «Карточки заказа») ----------
   Карточка собирается из трёх параметров: вид услуги + сценарий + состояние.
   Оператор не пишет сообщение вручную: выбирает сценарий → система подставляет ярлык,
   финансовую логику и действия клиента, показывает предпросмотр под конкретный канал.
   Отправка фиксирует неизменяемую версию, регистрирует доставки и историю. */

// Финансовая модель карточки по сценарию (§7, §9): 'full' | 'exchange' | 'none' | 'refund'.
function cardFinModel(sc, fin, ex, exFin) {
  if (sc.fin === 'exchange') {
    const diff = ex ? (ex.diff || 0) : 0;
    const penalty = exFin.supplierPenalty || 0;
    const serviceFee = sc.noAutoFee ? 0 : (exFin.serviceFee || 0); // §9: при вынужденном обмене сбор не добавляется автоматически
    const total = diff + penalty + serviceFee + (exFin.extraHold || 0);
    return { mode: 'exchange', diff, penalty, serviceFee, total };
  }
  if (sc.fin === 'refund') return { mode: 'refund', refund: (exFin.refund != null ? exFin.refund : fin.clientTotal) };
  if (sc.fin === 'none') return { mode: 'none' };
  return { mode: 'full', base: Math.max(0, fin.clientTotal - (fin.fee || 0)), fee: fin.fee || 0, total: fin.clientTotal };
}

// Финансовый блок карточки (то, что видит клиент) — рендерится в предпросмотре по всем каналам.
function CardFinancialBlock({ vm, fmt, compact }) {
  const f = vm.finModel, signed = (n) => (n > 0 ? '+ ' : n < 0 ? '− ' : '') + fmt(Math.abs(n || 0));
  if (f.mode === 'none') return null;
  const rows = [];
  if (f.mode === 'exchange') {
    rows.push(['Разница стоимости', signed(f.diff)]);
    if (f.penalty) rows.push(['Сбор поставщика', fmt(f.penalty)]);
    if (f.serviceFee) rows.push(['Сервисный сбор', fmt(f.serviceFee)]);
  } else if (f.mode === 'refund') {
    // основная строка — итог ниже
  } else {
    rows.push(['Стоимость услуги', fmt(f.base)]);
    if (f.fee) rows.push(['Сервисный сбор', fmt(f.fee)]);
  }
  const totalLbl = f.mode === 'exchange' ? (f.total >= 0 ? 'Итого к доплате' : 'Итого к возврату')
    : f.mode === 'refund' ? 'Сумма к возврату' : 'Итоговая стоимость';
  const totalVal = f.mode === 'exchange' ? Math.abs(f.total) : f.mode === 'refund' ? f.refund : f.total;
  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 5, paddingTop: 8 }}>
      {rows.map(([l, v], i) => (<div className="kv-row" key={i}><span className="k">{l}</span><span className="v">{v}</span></div>))}
      {vm.showTotal && <div className="kv-row" style={{ paddingTop: 10, marginTop: 3, borderTop: '1px solid var(--line)' }}>
        <span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>{totalLbl}</span>
        <span className="v" style={{ fontSize: compact ? 15 : 18, fontWeight: 800, color: 'var(--ink)' }}>{fmt(totalVal)}</span></div>}
    </div>
  );
}

// Кнопки действий клиента — по сценарию (§16). primary — акцентная, ghost — текстовая.
function CardActionButtons({ actions, size = 'sm', asLinks }) {
  if (!actions || !actions.length) return null;
  if (asLinks) return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {actions.map((a) => { const m = cardAction(a); return (
        <a key={a} href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 13, fontWeight: 600, color: m.kind === 'primary' ? 'var(--blue)' : 'var(--muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon name={m.icon} style={{ width: 14, height: 14 }} />{m.label}</a>); })}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {actions.map((a) => { const m = cardAction(a); return (
        <Button key={a} size={size} icon={m.icon} variant={m.kind === 'primary' ? 'primary' : m.kind === 'ghost' ? 'ghost' : 'secondary'} style={{ flex: m.kind === 'primary' ? 1 : '0 0 auto' }}>{m.label}</Button>); })}
    </div>
  );
}

// Ядро карточки — состав данных зависит от вида услуги, наполнение и блоки — от сценария.
function CardCore({ vm, fmt, kindMeta }) {
  const sc = vm.sc, showBlock = (b) => sc.blocks.includes(b);
  return (
    <div className="card" style={{ padding: 16, borderRadius: 15, boxShadow: '0 5px 18px rgba(25,45,80,.08)' }}>
      {/* ЯРЛЫК + доп. статусы (§5) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Pill tone={sc.tone}><Icon name={kindMeta.icon} style={{ width: 13, height: 13, verticalAlign: -2 }} /> {vm.badge}</Pill>
        {vm.statuses.map((s, i) => <Pill key={i} tone="gray">{s}</Pill>)}
      </div>
      {/* Предупреждение форс-мажора / обмена (§15) */}
      {vm.warning && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', marginBottom: 13, borderRadius: 11, background: sc.tone === 'red' ? '#fdecec' : 'var(--blue-soft)', border: '1px solid ' + (sc.tone === 'red' ? '#f3c2c2' : '#bfd2ff'), color: sc.tone === 'red' ? 'var(--red)' : 'var(--blue)' }}>
          <Icon name={sc.tone === 'red' ? 'alertCircle' : 'swap'} style={{ width: 18, height: 18, marginTop: 1, flex: '0 0 18px' }} />
          <div><div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.04em' }}>{vm.warning.title}</div><div style={{ fontSize: 12, color: 'var(--body)', marginTop: 2 }}>{vm.warning.text}</div></div>
        </div>
      )}
      {/* Заголовок услуги */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
        <span className="oc-svc-ic" style={{ background: kindMeta.color, width: 42, height: 42 }}><Icon name={kindMeta.icon} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 15 }}>{vm.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{vm.sub}</div>
        </div>
      </div>
      {/* Сравнение исходного и нового варианта (§9) */}
      {(showBlock('source_variant') || showBlock('comparison')) && vm.ex && vm.ex.oldP && vm.ex.newP && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 9, alignItems: 'stretch', marginBottom: 13 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Исходный вариант</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{vm.ex.oldP.route}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{vm.ex.oldP.date} · {vm.ex.oldP.fare}</div></div>
          <Icon name="arrowRight" style={{ width: 17, color: 'var(--blue)', alignSelf: 'center' }} />
          <div style={{ background: 'var(--blue-soft)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 4 }}>Новый вариант</div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{vm.ex.newP.route}</div><div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{vm.ex.newP.date} · {vm.ex.newP.fare}</div></div>
        </div>
      )}
      {/* Форс-мажорный блок (§15) — структурированное описание события */}
      {vm.fmRows && vm.fmRows.length > 0 && (
        <div style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 11, background: '#fdf3f0', border: '1px solid #f3d4c9' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>Форс-мажор</div>
          <div className="kv">{vm.fmRows.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}</div>
        </div>
      )}
      {/* Доступные альтернативы — отдельными блоками (ТЗ #1): по основной услуге и по связанным */}
      {vm.altBlocks && vm.altBlocks.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--blue)', margin: '8px 0 5px' }}>Доступные альтернативы</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {vm.altBlocks.map((a, i) => {
              const cheaper = String(a.delta).startsWith('−') || String(a.delta).startsWith('-');
              return (
                <div key={i} style={{ padding: '9px 11px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 1 }}>{a.scope}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{a.title}</div>
                    {a.meta && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.meta}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {a.price ? <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fmt(a.price)}</div> : null}
                    {a.delta && a.delta !== '=' && <div style={{ fontSize: 11.5, fontWeight: 600, color: cheaper ? 'var(--green)' : 'var(--amber)' }}>{a.delta}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Параметры услуги — состав данных зависит от вида (§8–14), сгруппирован по блокам */}
      {vm.fieldBlocks && vm.fieldBlocks.map((b, bi) => (
        <div key={bi} style={{ marginBottom: 6 }}>
          {b.title && <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', margin: '8px 0 3px' }}>{b.title}</div>}
          <div className="kv">{b.rows.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}</div>
        </div>
      ))}
      <div className="kv">
        {vm.extras.length > 0 && <div className="kv-row"><span className="k">Включено</span><span className="v">{vm.extras.join(', ')}</span></div>}
        {vm.passengers.length > 0 && <div className="kv-row"><span className="k">{vm.paxLabel}</span><span className="v">{vm.passengers.join(', ')}</span></div>}
        <div className="kv-row"><span className="k">Предложение действует</span><span className="v">{vm.validity}</span></div>
        {vm.responseDeadline && <div className="kv-row"><span className="k">Ответ до</span><span className="v" style={{ color: 'var(--amber-ink,var(--amber))', fontWeight: 600 }}>{vm.responseDeadline}</span></div>}
      </div>
      <CardFinancialBlock vm={vm} fmt={fmt} />
      {vm.accompanyingText && <div style={{ fontSize: 12.5, color: 'var(--body)', marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>{vm.accompanyingText}</div>}
      {showBlock('contacts') && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="phone" style={{ width: 13, height: 13 }} />Ваш менеджер: {vm.operator}</div>}
      {vm.attachments.length > 0 && <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>{vm.attachments.map((a, i) => <Pill key={i} tone="gray"><Icon name="paperclip" style={{ width: 12, height: 12, verticalAlign: -2 }} /> {a.name || a}</Pill>)}</div>}
      <CardActionButtons actions={vm.actions} />
    </div>
  );
}

// Предпросмотр, адаптированный под канал (§18): internal / messenger / email.
function ChannelPreview({ mode, channel, vm, fmt, kindMeta }) {
  if (mode === 'email') {
    const tpl = cardEmailTemplate(vm.sc.sys);
    const subst = (s) => (s || '').replace('{label}', vm.badge).replace('{title}', vm.title).replace('{sys}', vm.sc.sys);
    return (
      <div style={{ background: '#f1f4f8', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid var(--line)', padding: '12px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Тема письма</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{subst(tpl.subject)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>от Travel Hub &lt;service@travelhub.app&gt; · кому: клиент</div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 12 }}>{vm.accompanyingText || subst(tpl.body)}</div>
          <CardCore vm={{ ...vm, accompanyingText: '' }} fmt={fmt} kindMeta={kindMeta} />
          <div style={{ marginTop: 12 }}><CardActionButtons actions={[]} /></div>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--blue)', textDecoration: 'none' }}><Icon name="arrowUpRight" style={{ width: 14, height: 14 }} />Открыть и подтвердить на защищённой странице</a>
        </div>
      </div>
    );
  }
  if (mode === 'messenger') {
    const acts = vm.actions.map((a) => cardAction(a));
    return (
      <div style={{ background: 'linear-gradient(#e7ebf1,#eef2f6)', border: '1px solid var(--line)', borderRadius: 16, padding: 14, minHeight: 120 }}>
        <div style={{ maxWidth: 340, marginLeft: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '14px 14px 4px 14px', boxShadow: '0 2px 8px rgba(25,45,80,.08)', padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: sc_tone_color(vm.sc.tone) }}>{vm.badge}</div>
            {vm.statuses.length > 0 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{vm.statuses.join(' · ')}</div>}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>{vm.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{vm.sub}</div>
            <div style={{ fontSize: 12, color: 'var(--body)', marginTop: 8, whiteSpace: 'pre-line' }}>{messengerBody(vm, fmt)}</div>
            {vm.attachments.length > 0 && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>📎 {vm.attachments.map((a) => a.name || a).join(', ')}</div>}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {acts.slice(0, 3).map((m, i) => <button key={i} type="button" style={{ width: '100%', textAlign: 'center', padding: '8px', borderRadius: 9, border: '1px solid ' + (m.kind === 'primary' ? 'var(--blue)' : 'var(--line)'), background: m.kind === 'primary' ? 'var(--blue)' : '#fff', color: m.kind === 'primary' ? '#fff' : 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'default' }}>{m.label}</button>)}
              <a href="#" onClick={(e) => e.preventDefault()} style={{ textAlign: 'center', fontSize: 12, color: 'var(--blue)', textDecoration: 'none', marginTop: 2 }}>Открыть полную карточку →</a>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right', marginTop: 3 }}>{channel} · адаптированная карточка</div>
        </div>
      </div>
    );
  }
  // internal — полноценная интерактивная карточка внутри CRM
  return (
    <div style={{ background: '#eef3f8', border: '1px solid var(--line)', borderRadius: 16, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--muted)', fontSize: 12 }}>
        <span className="avatar-ph" style={{ width: 26, height: 26, background: 'var(--blue)', color: '#fff', fontSize: 10 }}>TH</span>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Travel Hub</span>
        <span>· интерактивная карточка во внутреннем чате</span>
      </div>
      <CardCore vm={vm} fmt={fmt} kindMeta={kindMeta} />
    </div>
  );
}
function sc_tone_color(t) { return ({ blue: 'var(--blue)', teal: 'var(--teal, var(--blue))', amber: 'var(--amber)', red: 'var(--red)', gray: 'var(--muted)' })[t] || 'var(--blue)'; }
function messengerBody(vm, fmt) {
  const lines = [];
  if (vm.ex && vm.ex.oldP && vm.ex.newP) { lines.push('Было: ' + vm.ex.oldP.route + ' · ' + vm.ex.oldP.date); lines.push('Станет: ' + vm.ex.newP.route + ' · ' + vm.ex.newP.date); }
  else vm.info.slice(0, 4).forEach((r) => lines.push(r.l + ': ' + r.v));
  const f = vm.finModel;
  if (vm.showTotal && f.mode !== 'none') {
    if (f.mode === 'exchange') lines.push((f.total >= 0 ? 'К доплате: ' : 'К возврату: ') + fmt(Math.abs(f.total)));
    else if (f.mode === 'refund') lines.push('К возврату: ' + fmt(f.refund));
    else lines.push('Итого: ' + fmt(f.total));
  }
  if (vm.responseDeadline) lines.push('Ответ до ' + vm.responseDeadline);
  return lines.join('\n');
}

/* Ручное добавление конкретной альтернативы (ТЗ #1) — оператор находит и вставляет
   любой вариант по запросу заказчика, даже если он не попал в авто-подбор. */
function ManualAltForm({ onAdd, compact }) {
  const [t, setT] = useState('');
  const [m, setM] = useState('');
  const [p, setP] = useState('');
  const [d, setD] = useState('');
  const add = () => {
    if (!t.trim()) return;
    onAdd({ title: t.trim(), meta: m.trim() || 'Добавлено вручную оператором', price: parseFloat(p) || 0, delta: d.trim() || '=' });
    setT(''); setM(''); setP(''); setD('');
  };
  return (
    <div style={{ display: 'grid', gap: 6, padding: 10, borderRadius: 10, border: '1px dashed var(--field-line)', background: 'var(--surface-2)' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>Добавить свой вариант (по запросу клиента)</div>
      <Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Рейс / вариант (напр. FRU → IST · Turkish TK 371)" />
      {!compact && <Input value={m} onChange={(e) => setM(e.target.value)} placeholder="Детали (время, багаж, пересадки)" />}
      <div style={{ display: 'flex', gap: 6 }}>
        <Input value={p} onChange={(e) => setP(e.target.value)} placeholder="Цена" type="number" style={{ flex: 1 }} />
        <Input value={d} onChange={(e) => setD(e.target.value)} placeholder="Разница (напр. +21 $)" style={{ flex: 1 }} />
        <Button size="sm" icon="plus" onClick={add} disabled={!t.trim()}>Добавить</Button>
      </div>
    </div>
  );
}

function ServiceCardSendPanel({ item, kind, participants = [], orderNo, currency, serviceId, onSent, onClose }) {
  const toast = useToast();
  const oNo = orderNo || item.order;
  const svcId = serviceId || item.id || (kind + '-' + (item.title || item.main || ''));
  const operator = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.name) || 'Оператор';
  const fmt = (n) => (currency === 'RUB' || currency === '₽') ? rub(n) : svM(n);
  const kindMeta = SERVICE_KIND[kind] || { icon: 'briefcase', color: 'var(--blue)' };

  // Исходные финансы + данные обмена (связь с исходной услугой, §24)
  const fin = cardInternals(item);
  const exchangeOp = (item.exchange && { exchange: item.exchange, fin: item.exchangeFin || {} }) ||
    ((typeof RETURNS !== 'undefined') ? RETURNS.find((r) => r.order === oNo && r.type === 'Обмен билета' && (!r.service || r.service.indexOf(kind) === 0)) : null);
  const ex = exchangeOp && exchangeOp.exchange;
  const exFin = (exchangeOp && exchangeOp.fin) || {};
  const looksExchange = item.status === 'Обмен' || item.operationType === 'exchange' || !!exchangeOp;

  // Сценарии, доступные для вида услуги; по умолчанию — обмен, если это обмен, иначе новая услуга.
  const available = scenariosForKind(kind);
  const defScenario = looksExchange ? (available.includes('voluntary_exchange') ? 'voluntary_exchange' : available[0]) : (available.includes('new_offer') ? 'new_offer' : available[0]);
  const [scenarioSys, setScenarioSys] = useState(defScenario);
  const sc = cardScenario(scenarioSys);

  // Настраиваемые в предпросмотре поля (§19). При смене сценария — сброс ярлыка и действий.
  const [clientLabel, setClientLabel] = useState(scenarioBadge(defScenario, kind));
  const [actions, setActions] = useState(scenarioActions(defScenario));
  const changeScenario = (sys) => { setScenarioSys(sys); setClientLabel(scenarioBadge(sys, kind)); setActions(scenarioActions(sys)); };

  const [statuses, setStatuses] = useState(looksExchange ? ['Требуется подтверждение'] : []);
  const [accompanyingText, setAccompanyingText] = useState('');
  const [selectedPax, setSelectedPax] = useState(() => new Set(participants.map((p) => p.name)));
  const [validity, setValidity] = useState(item.validUntil || '3 дня с момента отправки');
  const [responseDeadline, setResponseDeadline] = useState(looksExchange ? 'сегодня 18:00' : '');
  const [vis, setVis] = useState(() => ({ ...(window.CARD_CLIENT_VISIBILITY || {}) }));
  const [attachments, setAttachments] = useState([]);
  const [channels, setChannels] = useState([orderClientChannel(oNo)]);
  const [previewMode, setPreviewMode] = useState(channelMode(orderClientChannel(oNo)));
  const [previewChannel, setPreviewChannel] = useState(orderClientChannel(oNo));

  // §26 — права оператора по карточкам этого вида услуги
  const rights = operatorCardRights(operator, kind);
  const readOnly = !rights.clientFields; // без права «изменение клиентских полей» настройки только для чтения
  // §15 — данные форс-мажорной карточки (если сценарий — форс-мажор)
  const [fm, setFm] = useState(() => defaultForceMajeure(item, operator));
  const setFmType = (t) => { setFm((f) => ({ ...f, fmType: t })); setActions(FORCE_MAJEURE_TYPES[t].actions.slice()); };
  // ТЗ #1 — умный подбор альтернатив при отмене/недоступности (как при вынужденном обмене)
  const [altOpts, setAltOpts] = useState([]);
  const [manualAlts, setManualAlts] = useState([]);   // ТЗ #1 — варианты, добавленные оператором вручную
  const [altSel, setAltSel] = useState(() => new Set());
  const [picksOpen, setPicksOpen] = useState(false);   // ТЗ #2 — вложенная панель подбора (внахлёст)
  const allAlts = [...altOpts, ...manualAlts];
  const syncAltText = (sel, opts) => {
    const chosen = opts.filter((o) => sel.has(o.id));
    setFm((f) => ({ ...f, alternatives: chosen.map((o) => o.title + ' (' + o.delta + ')').join('; ') }));
  };
  const findAlternatives = () => {
    const opts = smartAlternatives(item, kind);
    setAltOpts(opts);
    const sel = new Set([...opts.map((o) => o.id), ...manualAlts.map((o) => o.id)]); // подставляем найденные + сохраняем ручные
    setAltSel(sel); syncAltText(sel, [...opts, ...manualAlts]);
    toast('Подобрано ' + opts.length + ' альтернатив (умный поиск)', 'ok');
  };
  const toggleAlt = (id) => { setAltSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); syncAltText(n, [...altOpts, ...manualAlts]); return n; }); };
  const addManualAlt = (v) => {
    const alt = { id: 'man-' + Math.random().toString(36).slice(2, 7), manual: true, ...v };
    setManualAlts((m) => [...m, alt]);
    setAltSel((s) => { const n = new Set(s); n.add(alt.id); syncAltText(n, [...allAlts, alt]); return n; });
    toast('Вариант добавлен вручную', 'ok');
  };
  const removeManualAlt = (id) => { setManualAlts((m) => m.filter((x) => x.id !== id)); setAltSel((s) => { const n = new Set(s); n.delete(id); return n; }); };
  // ТЗ #2 — по каждой затронутой услуге свой подбор (авто/ручной) + инфо клиенту
  const [chain] = useState(() => affectedServiceChain(oNo, kind));
  const [chainState, setChainState] = useState(() => affectedServiceChain(oNo, kind).map(() => ({ alts: [], sel: new Set(), include: false })));
  const chainAuto = (i) => setChainState((cs) => cs.map((c, idx) => { if (idx !== i) return c; const alts = smartAlternatives({ title: chain[i].service }, chain[i].kind); return { alts, sel: new Set(alts.map((a) => a.id)), include: true }; }));
  const chainAddManual = (i, v) => setChainState((cs) => cs.map((c, idx) => { if (idx !== i) return c; const alt = { id: 'cm-' + Math.random().toString(36).slice(2, 7), manual: true, ...v }; const sel = new Set(c.sel); sel.add(alt.id); return { alts: [...c.alts, alt], sel, include: true }; }));
  const chainToggleAlt = (i, id) => setChainState((cs) => cs.map((c, idx) => { if (idx !== i) return c; const sel = new Set(c.sel); sel.has(id) ? sel.delete(id) : sel.add(id); return { ...c, sel }; }));
  const chainRemoveManual = (i, id) => setChainState((cs) => cs.map((c, idx) => { if (idx !== i) return c; const sel = new Set(c.sel); sel.delete(id); return { ...c, alts: c.alts.filter((a) => a.id !== id), sel }; }));
  const chainToggleInclude = (i) => setChainState((cs) => cs.map((c, idx) => idx === i ? { ...c, include: !c.include } : c));
  const chainPicksCount = chainState.reduce((n, c) => n + (c.include ? c.sel.size : 0), 0);

  const finModel = cardFinModel(sc, fin, ex, exFin);
  // Состав данных зависит от вида услуги (§8–14): типизированные блоки полей.
  const cardFields = buildCardFields(kind, item, scenarioSys);
  const info = cardFields.flat;
  const paxNames = participants.filter((p) => selectedPax.has(p.name)).map((p) => p.name);
  const warning = sc.forceMajeure ? { title: 'ВНИМАНИЕ ПО УСЛУГЕ', text: 'Информация от поставщика об изменении. Требуется ваше решение.' }
    : sc.fin === 'exchange' ? { title: 'ОБМЕН УСЛУГИ', text: 'После подтверждения прежняя услуга будет заменена на новую.' } : null;

  // альтернативы уходят клиенту отдельными блоками (ТЗ #1), поэтому убираем дублирующую строку-текст
  const fmRows = sc.forceMajeure ? buildForceMajeureRows(fm).filter((r) => r.l !== 'Доступные альтернативы') : [];
  // Структурированные блоки альтернатив для клиента: по основной услуге + по затронутым связанным услугам (ТЗ #1/#2)
  const selMainAlts = allAlts.filter((a) => altSel.has(a.id));
  const altBlocks = [
    ...selMainAlts.map((a) => ({ scope: item.title || item.main || 'Основная услуга', title: a.title, meta: a.meta, price: a.price, delta: a.delta })),
    ...chain.flatMap((c, i) => (chainState[i] && chainState[i].include)
      ? chainState[i].alts.filter((a) => chainState[i].sel.has(a.id)).map((a) => ({ scope: c.kind + ' · ' + c.service, title: a.title, meta: a.meta, price: a.price, delta: a.delta }))
      : []),
  ];
  const vm = {
    sc, badge: clientLabel, statuses, title: item.title || item.main, sub: item.sub, warning,
    info, fieldBlocks: cardFields.blocks, fmRows, altBlocks, extras: item.tags || [], passengers: paxNames, paxLabel: (kind === 'Гостиница' || kind === 'Гостиницы') ? 'Гости' : 'Пассажиры',
    validity, responseDeadline, accompanyingText, attachments, actions, operator,
    ex, finModel, showTotal: vis.clientTotal !== false,
  };

  const toggle = (set, val, on) => { const n = new Set(set); on ? n.add(val) : n.delete(val); return n; };
  const toggleChannel = (c) => setChannels((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]);
  const toggleAction = (a) => setActions((as) => as.includes(a) ? as.filter((x) => x !== a) : [...as, a]);
  const addAttachment = () => setAttachments((a) => [...a, { name: 'Ваучер_' + (a.length + 1) + '.pdf' }]);

  const send = () => {
    if (!rights.send) { toast('Нет права на отправку карточек по услуге «' + kind + '»', 'err'); return; }
    if (!channels.length) { toast('Выберите хотя бы один канал отправки', 'warn'); return; }
    const draft = {
      kind, scenario: scenarioSys, clientLabel, statuses, accompanyingText, passengers: paxNames,
      validity, responseDeadline, actions, attachments, visibility: vis, channels,
      fin: { ...fin, model: finModel }, source: sc.linksSource ? { service: item.title || item.main, ex } : null,
      forceMajeure: sc.forceMajeure ? fm : null,
      snapshot: { title: item.title || item.main, info, badge: clientLabel },
    };
    const card = sendServiceCard(oNo, svcId, draft, operator);
    // Демо: имитируем подтверждения каналов (§21) — доставлено → просмотрено.
    setTimeout(() => channels.forEach((ch) => advanceDelivery(card, ch, 'delivered')), 900);
    setTimeout(() => channels.forEach((ch) => advanceDelivery(card, ch, 'viewed')), 2100);
    onSent && onSent(channels.join(', '), card);
    onClose && onClose();
  };

  const modeLabel = { internal: 'Внутренний чат', messenger: 'Мессенджер', email: 'Email' };
  const chanList = enabledChannels();

  // §26 — без права создания карточки конструктор не открывается
  if (!rights.create) {
    return (
      <StackPanel title="Карточка услуги" width="min(560px,96vw)" onClose={onClose}
        footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
        <div className="card card-pad" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <Icon name="lock" style={{ width: 40, height: 40, color: 'var(--muted-2)' }} strokeWidth={1.4} />
          <h3 style={{ margin: '14px 0 6px', fontSize: 16 }}>Нет доступа к карточкам по услуге «{kind}»</h3>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Оператор {operator} не имеет права создавать карточки этого вида услуги. Обратитесь к администратору (Настройки → Карточки услуг → Права операторов).</div>
        </div>
      </StackPanel>
    );
  }

  return (
    <StackPanel title="Карточка услуги · предпросмотр перед отправкой" width="min(1180px,97vw)" onClose={onClose}
      footer={<>
        <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" style={{ width: 14, height: 14 }} />Внутренние расчёты клиенту не отправляются · при отправке фиксируется версия
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="send" onClick={send} disabled={!rights.send} title={!rights.send ? 'Нет права на отправку' : undefined}>Отправить{channels.length > 1 ? ' (' + channels.length + ' канала)' : channels.length === 1 ? ' · ' + channels[0] : ''}</Button>
      </>}>

      <div className="grid-2" style={{ alignItems: 'start', gap: 16, gridTemplateColumns: '1.05fr .95fr' }}>
        {/* ЛЕВО — ПРЕДПРОСМОТР ПО КАНАЛУ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px 2px', flexWrap: 'wrap' }}>
            <Icon name="eye" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Предпросмотр для клиента</h3>
            <div style={{ flex: 1 }} />
            <div className="seg-toggle">
              {['internal', 'messenger', 'email'].map((m) => (
                <button key={m} type="button" className={'seg-btn' + (previewMode === m ? ' active' : '')} style={{ padding: '6px 11px', fontSize: 12.5 }} onClick={() => setPreviewMode(m)}>{modeLabel[m]}</button>
              ))}
            </div>
          </div>
          {previewMode === 'messenger' && (
            <div className="seg-toggle" style={{ marginBottom: 10 }}>
              {['Telegram', 'WhatsApp', 'MAX'].map((c) => (
                <button key={c} type="button" className={'seg-btn' + (previewChannel === c ? ' active' : '')} style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setPreviewChannel(c)}>{c}</button>
              ))}
            </div>
          )}
          <ChannelPreview mode={previewMode} channel={previewMode === 'messenger' ? previewChannel : (previewMode === 'email' ? 'Email' : 'Внутренний чат')} vm={vm} fmt={fmt} kindMeta={kindMeta} />

          {/* ВНУТРЕННЯЯ ИНФОРМАЦИЯ (не для клиента, §7) */}
          <div className="card card-pad" style={{ background: 'var(--surface-2)', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="lock" style={{ width: 16, height: 16, color: 'var(--muted)' }} />
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Внутренняя информация</h3>
              <Pill tone="gray">не для клиента</Pill>
            </div>
            <div className="kv">
              <div className="kv-row"><span className="k">Цена поставщика</span><span className="v">{fmt(fin.supplierPrice)}</span></div>
              <div className="kv-row"><span className="k">Себестоимость</span><span className="v">{fmt(fin.cost)}</span></div>
              <div className="kv-row"><span className="k">Комиссия поставщика</span><span className="v" style={{ color: 'var(--green)' }}>+ {fmt(fin.commission)}</span></div>
              <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{fmt(fin.fee)}</span></div>
              {fin.markup ? <div className="kv-row"><span className="k">Наценка</span><span className="v">{fmt(fin.markup)}</span></div> : null}
              <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Прибыль</span><span className="v" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(fin.profit)}</span></div>
            </div>
          </div>
        </div>

        {/* ПРАВО — НАСТРОЙКИ КАРТОЧКИ (§19) */}
        <div className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="settings" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
            <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Настройки карточки</h3>
            <div style={{ flex: 1 }} />
            {/* §26 — доступ оператора по этому виду услуги */}
            <Pill tone={rights.clientFields ? 'green' : 'amber'}><Icon name={rights.clientFields ? 'checkCircle' : 'lock'} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {operator}</Pill>
          </div>
          {readOnly && <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 12, display: 'flex', gap: 6 }}><Icon name="lock" style={{ width: 13, height: 13 }} />Нет права «изменение клиентских полей» — настройки только для чтения</div>}

          {/* Сценарий */}
          <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Сценарий карточки</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, pointerEvents: readOnly ? 'none' : 'auto', opacity: readOnly ? 0.6 : 1 }}>
            {available.map((s) => { const scn = cardScenario(s); return (
              <button key={s} type="button" onClick={() => changeScenario(s)}
                className={'seg-btn' + (scenarioSys === s ? ' active' : '')} style={{ padding: '6px 10px', fontSize: 12.5, borderRadius: 8 }}>{scn.name}</button>); })}
          </div>

          {/* §15 — Форс-мажорная карточка: структурированное описание события */}
          {sc.forceMajeure && (
            <div className="card card-pad" style={{ background: '#fdf3f0', border: '1px solid #f3d4c9', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Icon name="alertCircle" style={{ width: 15, height: 15, color: 'var(--red)' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Форс-мажор</span>
              </div>
              <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Тип карточки</label>
              <Select options={Object.keys(FORCE_MAJEURE_TYPES).map((k) => FORCE_MAJEURE_TYPES[k].label)}
                value={FORCE_MAJEURE_TYPES[fm.fmType].label}
                onChange={(e) => setFmType(Object.keys(FORCE_MAJEURE_TYPES).find((k) => FORCE_MAJEURE_TYPES[k].label === e.target.value))} />
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                <Input value={fm.event} onChange={(e) => setFm((f) => ({ ...f, event: e.target.value }))} placeholder="Что произошло (напр. рейс задержан)" />
                <div className="grid-2" style={{ gap: 8 }}>
                  <Input value={fm.source} onChange={(e) => setFm((f) => ({ ...f, source: e.target.value }))} placeholder="Источник информации" />
                  <Input value={fm.affectedPax} onChange={(e) => setFm((f) => ({ ...f, affectedPax: e.target.value }))} placeholder="Затронутые пассажиры" />
                </div>
                <Input value={fm.whatChanged} onChange={(e) => setFm((f) => ({ ...f, whatChanged: e.target.value }))} placeholder="Что изменилось" />
                <Input value={fm.operatorActions} onChange={(e) => setFm((f) => ({ ...f, operatorActions: e.target.value }))} placeholder="Действия оператора" />
                {/* ТЗ #1/#2 — подбор альтернатив и связанных услуг вынесен в отдельную панель (внахлёст), чтобы не перегружать экран */}
                <div style={{ border: '1px solid var(--field-line)', borderRadius: 12, padding: 12, background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>Альтернативы и связанные услуги</span>
                    <Button size="sm" icon="refund" onClick={() => setPicksOpen(true)}>Открыть подбор</Button>
                  </div>
                  {(selMainAlts.length + chainPicksCount) > 0
                    ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>В письмо клиента: {selMainAlts.length} по основной услуге{chainPicksCount ? ' + ' + chainPicksCount + ' по связанным' : ''}. Изменить — «Открыть подбор».</div>
                    : <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Подберите варианты авто-поиском или добавьте конкретный рейс вручную — по основной и связанным услугам, не покидая карточку.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ТЗ #2 — затронутая цепочка связанных услуг (общая рамка события); подбор по каждой — в панели */}
          {(sc.forceMajeure || sc.fin === 'exchange') && chain.length > 0 && (
            <div className="card card-pad" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Icon name="route" style={{ width: 16, height: 16, color: 'var(--amber)' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', flex: 1 }}>
                  Изменение по «{kind}» повлияло на {chain.length} {plural(chain.length, ['услугу', 'услуги', 'услуг'])}
                </span>
                <Button size="sm" variant="secondary" icon="refund" onClick={() => setPicksOpen(true)}>Подбор по цепочке</Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chain.map((c, i) => {
                  const st = CHAIN_STATUS[c.status] || CHAIN_STATUS.ok;
                  const picks = chainState[i] && chainState[i].include ? chainState[i].sel.size : 0;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--field-line)', background: '#fff' }}>
                      <span style={{ width: 78, flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{c.kind}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.service}</span>
                      {picks > 0 && <Pill tone="blue">{picks} для клиента</Pill>}
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>По каждой связанной услуге можно подобрать варианты (авто или вручную) и включить их в письмо клиенту — «Подбор по цепочке».</div>
            </div>
          )}

          {/* Клиентский ярлык (§5) */}
          <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Клиентский ярлык</label>
          <Select options={[...new Set([clientLabel, ...sc.labels])]} value={clientLabel} onChange={(e) => setClientLabel(e.target.value)} />
          <div style={{ marginTop: 6 }}><Input value={clientLabel} onChange={(e) => setClientLabel(e.target.value)} placeholder="Свой текст ярлыка" /></div>

          {/* Доп. статусы (§5) */}
          <label className="lbl" style={{ display: 'block', margin: '12px 0 6px' }}>Дополнительные статусы</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Требуется подтверждение', 'Ответ до ' + (responseDeadline || '18:00'), 'Затронуты ' + (paxNames.length || 1) + ' пасс.', 'Срочно'].map((s) => (
              <button key={s} type="button" onClick={() => setStatuses((st) => st.includes(s) ? st.filter((x) => x !== s) : [...st, s])}
                className={'chip' + (statuses.includes(s) ? ' chip-on' : '')} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--line)', background: statuses.includes(s) ? 'var(--blue-soft)' : '#fff', color: statuses.includes(s) ? 'var(--blue)' : 'var(--muted)', cursor: 'pointer' }}>{s}</button>
            ))}
          </div>

          {/* Действия клиента (§16) */}
          <label className="lbl" style={{ display: 'block', margin: '14px 0 6px' }}>Действия клиента <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· по сценарию</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...new Set([...sc.actions, ...actions])].map((a) => (
              <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <Checkbox on={actions.includes(a)} onChange={() => toggleAction(a)} />
                <Icon name={cardAction(a).icon} style={{ width: 14, height: 14, color: 'var(--muted)' }} />{cardAction(a).label}
              </label>
            ))}
          </div>

          {/* Пассажиры (§19) */}
          {participants.length > 0 && (<>
            <label className="lbl" style={{ display: 'block', margin: '14px 0 6px' }}>{vm.paxLabel}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {participants.map((p) => (
                <label key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <Checkbox on={selectedPax.has(p.name)} onChange={(on) => setSelectedPax((s) => toggle(s, p.name, on))} />{p.name}
                </label>
              ))}
            </div>
          </>)}

          {/* Сроки */}
          <div className="grid-2" style={{ gap: 10, marginTop: 14 }}>
            <div><label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Срок действия</label><Input value={validity} onChange={(e) => setValidity(e.target.value)} /></div>
            <div><label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Срок ответа клиента</label><Input value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} placeholder="напр. сегодня 18:00" /></div>
          </div>

          {/* Сопровождающий текст */}
          <label className="lbl" style={{ display: 'block', margin: '14px 0 6px' }}>Сопровождающий текст</label>
          <textarea className="input" rows={2} value={accompanyingText} onChange={(e) => setAccompanyingText(e.target.value)} placeholder="Необязательный текст к карточке" style={{ width: '100%', resize: 'vertical' }} />

          {/* Видимость итоговой стоимости клиенту (§7) */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 14, cursor: 'pointer' }}>
            <Toggle on={vis.clientTotal !== false} onChange={(on) => setVis((v) => ({ ...v, clientTotal: on }))} />Показывать клиенту итоговую стоимость
          </label>

          {/* Вложения */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" icon="paperclip" onClick={addAttachment}>Добавить вложение</Button>
            {attachments.map((a, i) => <Pill key={i} tone="gray">{a.name}</Pill>)}
          </div>

          {/* Каналы отправки (§20) — можно выбрать несколько */}
          <label className="lbl" style={{ display: 'block', margin: '16px 0 6px' }}>Каналы отправки <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· по умолчанию — закреплённый за заказом</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chanList.map((c) => (
              <button key={c} type="button" onClick={() => toggleChannel(c)}
                className={'seg-btn' + (channels.includes(c) ? ' active' : '')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', fontSize: 13, borderRadius: 8 }}>
                <Icon name={SEND_CHANNELS[c].icon} style={{ width: 14, height: 14 }} />{c}{channels.includes(c) && <Icon name="check" style={{ width: 13, height: 13 }} />}
              </button>
            ))}
          </div>
          {channels.length > 0 && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{channels.map((c) => sendChannelMeta(c).adapt).join(' · ')}</div>}
        </div>
      </div>

      {/* ТЗ #1/#2 — вложенная панель подбора (внахлёст): авто + ручной подбор по основной и связанным услугам */}
      {picksOpen && (
        <StackPanel title="Подбор альтернатив и связанных услуг" width="min(720px,97vw)" onClose={() => setPicksOpen(false)}
          footer={<><div style={{ flex: 1, fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="eye" style={{ width: 14, height: 14 }} />Отмеченные варианты уйдут клиенту отдельными блоками</div><Button icon="check" onClick={() => setPicksOpen(false)}>Готово</Button></>}>

          {/* Основная услуга */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Icon name={kindMeta.icon || 'briefcase'} style={{ width: 16, height: 16, color: 'var(--blue)' }} />
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Основная услуга</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 10 }}>{item.title || item.main}</div>
          <Button size="sm" variant="secondary" icon="refund" onClick={findAlternatives} style={{ marginBottom: 10 }}>{altOpts.length ? 'Обновить авто-подбор' : 'Подобрать автоматически'}</Button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {allAlts.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Нажмите «Подобрать автоматически» — система предложит близкие варианты; либо добавьте конкретный рейс вручную ниже.</div>}
            {allAlts.map((o) => {
              const on = altSel.has(o.id);
              const cheaper = String(o.delta).startsWith('−') || String(o.delta).startsWith('-');
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 10, border: '1px solid ' + (on ? 'var(--blue)' : 'var(--field-line)'), background: on ? 'var(--blue-soft)' : '#fff' }}>
                  <Checkbox on={on} onChange={() => toggleAlt(o.id)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{o.title}{o.manual && <span style={{ marginLeft: 6 }}><Pill tone="gray">вручную</Pill></span>}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.meta}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {o.price ? <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{fmt(o.price)}</div> : null}
                    <div style={{ fontSize: 12, fontWeight: 600, color: o.delta === '=' ? 'var(--muted)' : cheaper ? 'var(--green)' : 'var(--amber)' }}>{o.delta}</div>
                  </div>
                  {o.manual && <button type="button" onClick={() => removeManualAlt(o.id)} title="Удалить" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 4 }}><Icon name="x" style={{ width: 14, height: 14 }} /></button>}
                </div>
              );
            })}
          </div>
          <ManualAltForm onAdd={addManualAlt} />

          {/* Связанные услуги — подбор по каждой (ТЗ #2) */}
          {chain.length > 0 && <PanelSub style={{ marginTop: 22 }}>Связанные услуги · {chain.length}</PanelSub>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chain.map((c, i) => {
              const cs = chainState[i] || { alts: [], sel: new Set(), include: false };
              const st = CHAIN_STATUS[c.status] || CHAIN_STATUS.ok;
              return (
                <div key={i} className="card card-pad" style={{ border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{c.kind}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.service}</span>
                    <Pill tone={st.tone}>{st.label}</Pill>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: cs.alts.length ? 8 : 0, flexWrap: 'wrap' }}>
                    <Button size="sm" variant="secondary" icon="refund" onClick={() => chainAuto(i)}>{cs.alts.length ? 'Обновить' : 'Подобрать авто'}</Button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: cs.include ? 'var(--blue)' : 'var(--muted)', cursor: 'pointer', marginLeft: 'auto' }}>
                      <Checkbox on={cs.include} onChange={() => chainToggleInclude(i)} />Показать клиенту
                    </label>
                  </div>
                  {cs.alts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                      {cs.alts.map((a) => {
                        const on = cs.sel.has(a.id);
                        const cheaper = String(a.delta).startsWith('−') || String(a.delta).startsWith('-');
                        return (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, border: '1px solid ' + (on ? 'var(--blue)' : 'var(--field-line)'), background: on ? 'var(--blue-soft)' : '#fff' }}>
                            <Checkbox on={on} onChange={() => chainToggleAlt(i, a.id)} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{a.title}{a.manual && <span style={{ marginLeft: 6 }}><Pill tone="gray">вручную</Pill></span>}</div>
                              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.meta}</div>
                            </div>
                            {a.price ? <div style={{ fontSize: 12.5, fontWeight: 700, color: cheaper ? 'var(--green)' : 'var(--ink)' }}>{fmt(a.price)}{a.delta && a.delta !== '=' ? ' · ' + a.delta : ''}</div> : null}
                            {a.manual && <button type="button" onClick={() => chainRemoveManual(i, a.id)} title="Удалить" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 3 }}><Icon name="x" style={{ width: 13, height: 13 }} /></button>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <ManualAltForm compact onAdd={(v) => chainAddManual(i, v)} />
                </div>
              );
            })}
          </div>
        </StackPanel>
      )}
    </StackPanel>
  );
}

/* ---------- История и версии карточки услуги (§23, §25) ----------
   Отправленные карточки фиксируются неизменяемыми версиями. Значимые изменения создают
   новую версию, прежняя помечается «неактуальна». Здесь — версии, доставки по каналам,
   ответы клиента и полный журнал действий. */
function ServiceCardHistoryDrawer({ orderNo, serviceId, title, onClose }) {
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const cards = cardsFor(orderNo, serviceId).slice().sort((a, b) => b.version - a.version);
  const simDeliver = (card, ch, st) => { advanceDelivery(card, ch, st); rerender(); };
  const simResponse = (card, act, ch) => { recordCardResponse(card, act, ch); rerender(); };

  return (
    <Drawer open onClose={onClose} title="История карточки услуги" sub={title} width="min(560px, 96vw)"
      footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
      {cards.length === 0 ? (
        <EmptyState icon="clock" title="Карточка ещё не отправлялась" sub="После отправки клиенту здесь появятся версии, доставки и ответы." />
      ) : cards.map((card) => {
        const sc = cardScenario(card.scenario), cst = cardStatus(card.status === 'sent' ? 'sent' : card.status);
        return (
          <div key={card.id} className="card card-pad" style={{ marginBottom: 14, opacity: card.actual ? 1 : 0.85, borderLeft: '3px solid ' + (card.actual ? 'var(--blue)' : 'var(--line)') }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Pill tone={card.actual ? 'blue' : 'gray'}>Версия {card.version}</Pill>
              <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{card.clientLabel}</span>
              {!card.actual && <Pill tone="amber">неактуальна</Pill>}
              <div style={{ flex: 1 }} />
              <Pill tone={cst.tone || 'gray'}>{cardStatus(card.status) ? cardStatus(card.status).label : card.status}</Pill>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Сценарий: {sc.name} · отправлено {card.sentAt} · {card.operator}</div>
            {!card.actual && card.staleNote && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 9, background: 'var(--surface-2)', fontSize: 12, color: 'var(--muted)' }}>
                <Icon name="alertCircle" style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} />{card.staleNote}
              </div>
            )}

            {/* Доставки по каналам (§21) */}
            <div style={{ marginTop: 10 }}>
              <div className="lbl" style={{ marginBottom: 6 }}>Доставка по каналам</div>
              {card.deliveries.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <Icon name={sendChannelMeta(d.channel).icon} style={{ width: 14, height: 14, color: 'var(--muted)' }} />
                  <span style={{ fontSize: 13 }}>{d.channel}</span>
                  <div style={{ flex: 1 }} />
                  <Pill tone={DELIVERY_TONE[d.status] || 'gray'}>{DELIVERY_STATUS[d.status] || d.status}</Pill>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.at}</span>
                </div>
              ))}
            </div>

            {/* Ответы клиента (§16) */}
            {card.responses.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="lbl" style={{ marginBottom: 6 }}>Ответы клиента</div>
                {card.responses.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 0' }}>
                    <Icon name={cardAction(r.action).icon} style={{ width: 14, height: 14, color: 'var(--green)' }} />{r.label}
                    <div style={{ flex: 1 }} /><span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.channel} · {r.at}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Демо-действия: имитация доставки и ответа клиента */}
            {card.actual && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {card.deliveries.some((d) => d.status !== 'viewed') && <Button size="sm" variant="secondary" icon="eye" onClick={() => card.deliveries.forEach((d) => simDeliver(card, d.channel, 'viewed'))}>Отметить просмотр</Button>}
                {card.responses.length === 0 && card.actions.slice(0, 2).map((a) => (
                  <Button key={a} size="sm" variant="secondary" icon={cardAction(a).icon} onClick={() => simResponse(card, a, card.channels[0])}>Клиент: {cardAction(a).label}</Button>
                ))}
              </div>
            )}

            {/* Полный журнал действий (§25) */}
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--blue)' }}>Журнал действий ({card.history.length})</summary>
              <div style={{ marginTop: 8 }}>
                {card.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '4px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span style={{ color: 'var(--muted)', flex: '0 0 96px' }}>{h.at}</span>
                    <span style={{ flex: 1 }}>{h.action}{h.channel ? ' · ' + h.channel : ''}{h.note ? ' ' + h.note : ''}</span>
                    <span style={{ color: 'var(--muted)' }}>{h.user}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      })}
    </Drawer>
  );
}

/* Боковое окно загрузки документа в карточку услуги. Демонстрационное: файл выбирается через
   системный диалог (или перетаскивается), но не отправляется на сервер. */
function SvcDocUploadDrawer({ open, isHotel, participants = [], orderNo, onClose, onUploaded }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);        // { name, size } | null
  const docTypes = [isHotel ? 'Ваучер на отель' : 'Ваучер / билет', 'Счёт на оплату', 'Подтверждение', 'Прочее'];
  const [type, setType] = useState(docTypes[0]);
  const [participant, setParticipant] = useState('—');
  const [drag, setDrag] = useState(false);
  // при каждом открытии — сброс формы
  useEffect(() => { if (open) { setFile(null); setType(docTypes[0]); setParticipant('—'); setDrag(false); } }, [open, isHotel]);

  const fmtSize = (bytes) => (bytes / 1024 < 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' КБ' : (bytes / 1048576).toFixed(1) + ' МБ');
  const takeFile = (f) => { if (f) setFile({ name: f.name, size: fmtSize(f.size) }); };
  const onFile = (e) => { takeFile(e.target.files && e.target.files[0]); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files && e.dataTransfer.files[0]); };
  const pickFile = () => fileRef.current && fileRef.current.click();

  const submit = () => {
    if (!file) return;
    onUploaded({
      id: 'u' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: file.name, size: file.size, type,
      participant: participant !== '—' ? participant : null,
      date: new Date().toLocaleDateString('ru-RU'),
    });
  };

  const paxOptions = ['—', ...participants.map((p) => p.name)];
  return (
    <Drawer open={open} onClose={onClose} title="Загрузка документа" sub={orderNo ? 'Заказ № ' + orderNo : 'Документ карточки услуги'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="plus" disabled={!file} onClick={submit}>Загрузить</Button>
      </>}>
      <div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFile} />
        <button type="button" className="doc-preview" onClick={pickFile}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          style={{ width: '100%', cursor: 'pointer', border: '1px dashed ' + (drag ? 'var(--blue)' : 'var(--line)'), background: drag ? 'var(--hover)' : undefined, textAlign: 'center' }}>
          <Icon name={file ? 'docs' : 'plus'} style={{ width: 40, height: 40 }} strokeWidth={1.4} />
          <span style={{ fontSize: 13, color: file ? 'var(--ink)' : 'var(--blue)', fontWeight: 600 }}>
            {file ? file.name : 'Выберите файл или перетащите сюда'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{file ? file.size : 'PDF, JPG, PNG · до 15 МБ'}</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: participants.length ? '1fr 1fr' : '1fr', gap: 12, marginTop: 16 }}>
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Тип документа</label>
            <Select options={docTypes} value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          {participants.length > 0 && (
            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Участник</label>
              <Select options={paxOptions} value={participant} onChange={(e) => setParticipant(e.target.value)} />
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function SvcCard({ item, kind, participants = [], hideBackRow, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('details');
  const [corrOpen, setCorrOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);   // документы, загруженные вручную в карточку услуги
  const [pax, setPax] = useState(participants);           // участники/гости услуги — можно добавлять прямо из карточки (ТЗ #5)
  const [addPaxOpen, setAddPaxOpen] = useState(false);    // боковая форма «Добавить пассажира»
  // Жизненный цикл карточки услуги — свой, независимый от статуса услуги в заказе.
  const initCard = (item.status === 'Выписано' || item.status === 'Подтверждено') ? 'issued' : (item.cardStatus || 'created');
  const [cardSt, setCardSt] = useState(initCard);
  const [version, setVersion] = useState(item.version || 1);
  const [versions, setVersions] = useState(item.versions || []);
  const [cardLog, setCardLog] = useState(() => [{ t: 'сейчас', txt: 'Карточка услуги создана' }]);
  const [opConfirm, setOpConfirm] = useState(null); // ТЗ #11 — подтверждение необратимых операций по услуге
  const k = SERVICE_KIND[kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const isOffer = !!item.cost;
  const cur = item.currency || (item.svcOffer && item.svcOffer.currency);
  const fmt = (n) => (cur === 'RUB' || cur === '₽') ? rub(n) : svM(n);
  const title = item.title || item.main;
  const sub = item.sub;
  const status = item.status || (isOffer ? 'Предложение' : '—');
  const total = isOffer ? item.cost + item.fee : item.sum;
  const info = (item.info || [{ l: 'Описание', v: item.sub }, { l: 'Дата', v: item.date }, { l: 'Количество', v: item.qty }]).filter((r) => r.v != null);
  const supplier = item.supplier || '—';
  const no = item.no || item.id || (String(kind).slice(0, 2).toUpperCase() + '-00000');
  const calc = item.calc || {};
  const tariff = calc.tariff != null ? calc.tariff : (isOffer ? item.cost : total);
  const fee = calc.fee != null ? calc.fee : (isOffer ? item.fee : 0);
  const isHotel = kind === 'Гостиница';
  const paxLabel = isHotel ? 'Гости' : 'Участники';

  // Корректировка документов доступна не только для авиа, но и для прочих услуг (запрос клиента).
  const corrCfg = docCorrKind(kind);
  const corrSubjects = (pax.length ? pax : [{ name: 'Основной заказчик', role: '—' }]).map((pp, i) => ({
    name: pp.name, type: pp.role || 'Взрослый',
    docNo: (no || 'DOC') + '-' + String(i + 1).padStart(2, '0'),
    ref: item.pnr || item.ref || (no || '—'),
  }));
  const corrMeta = { cfg: corrCfg, supplier, route: sub || title, dates: item.date || '—', carrierName: supplier && supplier !== '—' ? supplier : title, baseFareTotal: isOffer ? item.cost : (item.sum || tariff || 0) };
  const orderNo = item.order || null;
  const channel = orderClientChannel(orderNo);
  const chMeta = sendChannelMeta(channel);
  const fin = cardInternals(item);
  const cst = cardStatus(cardSt);

  const sendCard = (ch) => {
    setCardSt('sent');
    setCardLog((l) => [...l, { t: 'сейчас', txt: 'Отправлена клиенту · канал «' + ch + '» · v' + version }]);
    toast('Карточка услуги отправлена клиенту по каналу «' + ch + '»', 'ok');
    setTimeout(() => { setCardSt('delivered'); setCardLog((l) => [...l, { t: '+1 мин', txt: 'Доставлена клиенту' }]); }, 1000);
    setTimeout(() => { setCardSt('viewed'); setCardLog((l) => [...l, { t: '+3 мин', txt: 'Просмотрена клиентом' }]); }, 2200);
  };
  const bumpVersion = () => {
    const nv = version + 1;
    setVersions((vs) => [...vs, { v: version, note: 'Прежняя версия сохранена в истории' }]);
    setVersion(nv);
    setCardSt('price_changed');
    setCardLog((l) => [...l, { t: 'сейчас', txt: 'Изменены параметры — создана версия v' + nv + ' (прежняя сохранена)' }]);
    toast('Создана новая версия карточки v' + nv + ' — прежняя сохранена в истории', 'ok');
  };
  // Ручная простановка статуса (в проде часть приходит из канала/по таймеру — здесь кнопки-симуляции).
  const markCard = (key) => {
    const st = cardStatus(key);
    setCardSt(key);
    setCardLog((l) => [...l, { t: 'сейчас', txt: 'Статус карточки: ' + st.label }]);
    toast('Статус карточки: ' + st.label, key === 'declined' || key === 'unavailable' || key === 'expired' ? 'info' : 'ok');
  };

  const TABS = [
    { key: 'pax', label: paxLabel, count: pax.length || undefined },
    { key: 'details', label: 'Детали' },
    { key: 'card', label: 'Карточка услуги' },
    { key: 'supplier', label: 'Поставщик' },
    { key: 'finance', label: 'Финансы' },
    { key: 'docs', label: 'Документы' },
    { key: 'comments', label: 'Комментарии' },
    { key: 'history', label: 'История' },
  ];

  return (
    <div className="fade-in">
      {!hideBackRow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>Назад</Button>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>{SVC_CFG_TITLE(kind)} / {no}</span>
        </div>
      )}

      {/* header — 1-в-1 со структурой авиа-карточки */}
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="card-title">{title}</h2>
            <Pill tone={SERVICE_STATUS[status] || 'gray'}>{status}</Pill>
            <Pill tone={cst.tone}><Icon name={cst.icon} style={{ width: 12, height: 12, verticalAlign: -2 }} /> Карточка: {cst.label}</Pill>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>v{version}</span>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{sub}{supplier && supplier !== '—' ? ' · ' + supplier : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, color: 'var(--muted)' }}>Итого к оплате</div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{total ? fmt(total) : '—'}</div></div>
        <Button icon="send" onClick={() => setSendOpen(true)}>Отправить клиенту</Button>
        {status === 'Предложение' && <Button variant="secondary" icon="check" onClick={() => setOpConfirm({ action: 'book', onConfirm: () => toast('Отправлено на бронирование', 'ok') })}>Забронировать</Button>}
        {status === 'Забронировано' && <Button variant="secondary" icon="check" onClick={() => setOpConfirm({ action: 'issue', onConfirm: () => toast('Услуга оформлена', 'ok') })}>Оформить</Button>}
        <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>}
          items={[
            { icon: 'send', label: 'Отправить карточку клиенту', onClick: () => setSendOpen(true) },
            { icon: 'edit', label: 'Изменить параметры → новая версия', onClick: bumpVersion },
            { sep: true },
            { icon: 'template', label: 'Корректировка документов', onClick: () => setCorrOpen(true) },
            { icon: 'download', label: 'Скачать документы', onClick: () => toast('Загрузка…') },
          ]} />
      </div>

      <div style={{ marginBottom: 18, overflowX: 'auto' }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>

      {tab === 'pax' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>{pax.length ? pax.length + (isHotel ? ' гост.' : ' участ.') + ' в услуге' : (isHotel ? 'Гости не указаны' : 'Участники не указаны')}</div>
            <Button size="sm" icon="plus" onClick={() => setAddPaxOpen(true)}>{isHotel ? 'Добавить гостя' : 'Добавить пассажира'}</Button>
          </div>
          <div className="table-card">
            {pax.length ? (
              <table className="tbl">
                <thead><tr><th>{isHotel ? 'Гость' : 'Участник'}</th><th>Тип</th><th>Документ</th><th>Дата рожд.</th></tr></thead>
                <tbody>{pax.map((p, i) => (
                  <tr key={i}><td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.role || 'Взрослый'}</td><td>{p.doc || '—'}</td><td>{p.dob || '—'}</td></tr>
                ))}</tbody>
              </table>
            ) : (
              <EmptyState icon="users" title={isHotel ? 'Гости не указаны' : 'Участники не указаны'} sub="Добавьте их прямо здесь — кнопкой справа сверху — или во вкладке «Пассажиры» заказа."
                action={<Button size="sm" icon="plus" onClick={() => setAddPaxOpen(true)}>{isHotel ? 'Добавить гостя' : 'Добавить пассажира'}</Button>} />
            )}
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="card card-pad" style={{ maxWidth: 640 }}>
          <div className="kv">
            {info.map((r, i) => (<div className="kv-row" key={i}><span className="k">{r.l}</span><span className="v">{r.v}</span></div>))}
            {item.tags && item.tags.length > 0 && <div className="kv-row"><span className="k">Включено</span><span className="v">{item.tags.join(', ')}</span></div>}
            {item.railSeats && (<>
              <div className="kv-row"><span className="k">Обслуживание</span><span className="v">{item.railSeats.clsName} · вагон {item.railSeats.wagonNo}</span></div>
              {(item.railSeats.list || []).map((r, i) => (<div className="kv-row" key={'seat' + i}><span className="k">{r.name}</span><span className="v">{r.seat ? 'место ' + r.seat + ' · ' + (RAIL_SEAT_LABEL[r.kind] || '') : '—'}</span></div>))}
            </>)}
          </div>
        </div>
      )}

      {tab === 'card' && (
        <div className="grid-2" style={{ alignItems: 'start', gap: 16 }}>
          <div>
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Отправка клиенту</h3>
                <Pill tone={cst.tone}>{cst.label}</Pill>
              </div>
              <div className="kv">
                <div className="kv-row"><span className="k">Закреплённый канал</span><span className="v"><Pill tone={chMeta.tone}><Icon name={chMeta.icon} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {channel}</Pill></span></div>
                <div className="kv-row"><span className="k">Версия карточки</span><span className="v">v{version}</span></div>
                <div className="kv-row"><span className="k">Итоговая стоимость клиенту</span><span className="v" style={{ fontWeight: 700 }}>{fmt(fin.clientTotal)}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button size="sm" icon="send" onClick={() => setSendOpen(true)}>Отправить клиенту</Button>
                <Button size="sm" variant="secondary" icon="edit" onClick={bumpVersion}>Новая версия</Button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" style={{ width: 14, height: 14 }} />Внутренние расчёты (себестоимость, комиссия, прибыль) клиенту не отправляются.
              </div>
            </div>
            {/* Смена статуса карточки. В проде «выбрана/отклонена» приходят из канала, «срок истёк» — по таймеру. */}
            <div className="card card-pad" style={{ marginTop: 16 }}>
              <h3 className="card-title" style={{ fontSize: 14, marginBottom: 4 }}>Ответ клиента / статус</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>В реальной работе приходит из канала связи или по таймеру. Здесь — вручную.</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant="secondary" icon="check" onClick={() => markCard('chosen')}>Клиент выбрал</Button>
                <Button size="sm" variant="secondary" icon="x" onClick={() => markCard('declined')}>Отклонил</Button>
                <Button size="sm" variant="secondary" icon="clock" onClick={() => markCard('expired')}>Срок истёк</Button>
                <Button size="sm" variant="secondary" icon="alertCircle" onClick={() => markCard('unavailable')}>Недоступна</Button>
                <Button size="sm" variant="secondary" icon="checkCircle" onClick={() => markCard('issued')}>Оформлена</Button>
              </div>
            </div>
            {versions.length > 0 && (
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>История версий</h3>
                <div className="kv">
                  {versions.map((vv, i) => (<div className="kv-row" key={i}><span className="k">Версия v{vv.v}</span><span className="v" style={{ color: 'var(--muted)' }}>{vv.note}</span></div>))}
                  <div className="kv-row"><span className="k" style={{ fontWeight: 700 }}>Версия v{version}</span><span className="v"><Pill tone="green">актуальная</Pill></span></div>
                </div>
              </div>
            )}
          </div>
          <div className="card card-pad">
            <h3 className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>Жизненный цикл карточки</h3>
            <CardLifecycle current={cardSt} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '14px 0' }} />
            <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Журнал</h3>
            <div className="timeline">
              {cardLog.map((l, i) => (<div className="tl-item" key={i}><span className="tl-dot" />{i < cardLog.length - 1 && <span className="tl-line" />}<div><div className="tl-time">{l.t}</div><div className="tl-text">{l.txt}</div></div></div>))}
            </div>
          </div>
        </div>
      )}

      {tab === 'supplier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Бланк поставщика: сохранить оригинал + корректировать математику (единично/группово), закрыть тариф на IT (авиа) */}
          <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderLeft: '4px solid var(--blue)' }}>
            <span className="oc-svc-ic" style={{ background: 'var(--blue)', flex: '0 0 auto' }}><Icon name="template" /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Бланк поставщика</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Оригинал сохраняется без изменений (v1). Клиентская версия — с правкой математики{corrCfg.mode === 'avia' ? ', закрытием тарифа на «IT»' : ''} единично или группово.
              </div>
            </div>
            <Button icon="edit" onClick={() => setCorrOpen(true)}>Корректировать бланк</Button>
            <Button variant="secondary" icon="clock" onClick={() => setCorrOpen(true)}>Версии</Button>
          </div>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card card-pad"><div className="kv">
              <div className="kv-row"><span className="k">Поставщик</span><span className="v">{supplier}</span></div>
              <div className="kv-row"><span className="k">Канал</span><span className="v">{(item.svcOffer && item.svcOffer.channel) || 'API / B2B'}</span></div>
              <div className="kv-row"><span className="k">Номер брони</span><span className="v">{no}</span></div>
              <div className="kv-row"><span className="k">Даты</span><span className="v">{item.date || '—'}</span></div>
            </div></div>
            <div className="card card-pad"><div className="kv">
              <div className="kv-row"><span className="k">Статус оплаты поставщику</span><span className="v"><Pill tone="amber">Ожидает</Pill></span></div>
              <div className="kv-row"><span className="k">Тайм-лимит</span><span className="v"><TimeLimitBadge>сегодня 18:00</TimeLimitBadge></span></div>
            </div></div>
          </div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="grid-2" style={{ alignItems: 'start', gap: 16 }}>
          {/* Для клиента — только разрешённые поля */}
          <div className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="eye" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Для клиента</h3>
            </div>
            <div className="kv">
              {clientFinRows(fin, (typeof CARD_CLIENT_VISIBILITY !== 'undefined' ? CARD_CLIENT_VISIBILITY : {}), fmt)}
              <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итоговая стоимость</span><span className="v" style={{ fontSize: 18 }}>{fmt(fin.clientTotal)}</span></div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Клиент видит только разрешённые настройками компании поля.</div>
          </div>
          {/* Внутреннее — не для клиента */}
          <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="lock" style={{ width: 16, height: 16, color: 'var(--muted)' }} />
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>Внутреннее — не для клиента</h3>
            </div>
            <div className="kv">
              <div className="kv-row"><span className="k">Цена поставщика</span><span className="v">{fmt(fin.supplierPrice)}</span></div>
              <div className="kv-row"><span className="k">Себестоимость</span><span className="v">{fmt(fin.cost)}</span></div>
              {fin.commission ? <div className="kv-row"><span className="k">Комиссия поставщика</span><span className="v" style={{ color: 'var(--green)' }}>+ {fmt(fin.commission)}</span></div> : null}
              <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{fmt(fin.fee)}</span></div>
              {fin.markup ? <div className="kv-row"><span className="k">Наценка</span><span className="v">{fmt(fin.markup)}</span></div> : null}
              <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Прибыль</span><span className="v" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(fin.profit)}</span></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div className="grid-4">
          {[isHotel ? 'Ваучер на отель' : 'Ваучер / билет', 'Счёт на оплату', 'Подтверждение'].map((d) => (<button key={d} className="doc-chip" onClick={() => toast('Скачивание · ' + d)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>))}
          {uploadedDocs.map((d) => (
            <div key={d.id} className="doc-chip" title={d.name}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Icon name="docs" style={{ flexShrink: 0 }} />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.type}{d.size ? ' · ' + d.size : ''}</span>
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button className="icon-btn" onClick={() => toast('Скачивание · ' + d.name)} title="Скачать"><Icon name="download" /></button>
                <button className="icon-btn" onClick={() => { setUploadedDocs((cur) => cur.filter((x) => x.id !== d.id)); toast('Документ удалён'); }} title="Удалить"><Icon name="trash" /></button>
              </span>
            </div>
          ))}
          <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => setUploadOpen(true)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
        </div>
      )}

      {tab === 'comments' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Input placeholder="Внутренний комментарий…" style={{ flex: 1 }} />
            <Button icon="send" onClick={() => toast('Комментарий добавлен')}>Отправить</Button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div className="timeline">
            {[['14:32', 'Услуга добавлена в заказ'], ['14:40', 'Запрос отправлен поставщику'], ['15:10', 'Получено подтверждение']].map(([t, txt], i) => (
              <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" /><div><div className="tl-time">{t}</div><div className="tl-text">{txt}</div></div></div>
            ))}
          </div>
        </div>
      )}

      {corrOpen && <DocCorrectionPanel subjects={corrSubjects} meta={corrMeta} currency={cur || 'USD'} orderNo={item.order || null} onClose={() => setCorrOpen(false)} />}
      {sendOpen && <ServiceCardSendPanel item={item} kind={kind} participants={pax} orderNo={orderNo} currency={cur} onSent={sendCard} onClose={() => setSendOpen(false)} />}
      <SvcDocUploadDrawer open={uploadOpen} isHotel={isHotel} participants={pax} orderNo={orderNo} onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => { setUploadedDocs((cur) => [...cur, doc]); setUploadOpen(false); toast('Документ загружен', 'ok'); }} />
      <SvcAddPaxDrawer open={addPaxOpen} isHotel={isHotel} onClose={() => setAddPaxOpen(false)}
        onAdd={(person) => { setPax((cur) => [...cur, person]); setAddPaxOpen(false); toast((isHotel ? 'Гость' : 'Пассажир') + ' добавлен', 'ok'); }} />
      {opConfirm && <OperationConfirmModal open action={opConfirm.action} kind={kind} service={title}
        fin={{ currency: cur || '$', price: tariff, fee, total }}
        warnings={opConfirm.action === 'issue' ? ['Проверьте актуальность цены перед выпиской'] : []}
        onConfirm={opConfirm.onConfirm} onClose={() => setOpConfirm(null)} needComment={opConfirm.action === 'issue'} />}
    </div>
  );
}

/* Боковая форма добавления участника/гостя прямо из карточки услуги (ТЗ #5). */
// Добавление пассажира/гостя в подборе услуг — единая форма (forms_unified.jsx).
function SvcAddPaxDrawer({ open, isHotel, onClose, onAdd }) {
  return (
    <UnifiedPersonDrawer open={open} kind="person" mode="create" showRole
      title={isHotel ? 'Добавить гостя' : 'Добавить пассажира'}
      onClose={onClose}
      onSave={(person, client) => onAdd({ name: client.name, role: person.role, doc: person.docNo || '—', dob: person.dob || '—', documents: person.documents })} />
  );
}
function SVC_CFG_TITLE(kind) { const c = Object.values(SVC_CFG).find((x) => x.kind === kind); return c ? c.title : kind; }

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
  const selCount = flt.sup.length + flt.tags.length + ((flt.priceMax != null && flt.priceMax < bounds.max) ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={() => setFlt({ sup: [], tags: [], priceMax: bounds.max })}>Очистить</button>
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
function ServiceFlow({ routeKey, searchIntent, onConsumeSearch }) {
  const cfg = SVC_CFG[routeKey];
  const data = SVC_DATA[routeKey];
  const k = SERVICE_KIND[cfg.kind];
  const toast = useToast();
  // Приходим из бокового окна подбора → сразу в выдачу с заполненной маской
  const [view, setView] = useState(searchIntent ? 'results' : 'registry');
  const [form, setForm] = useState(searchIntent ? (searchIntent.form || {}) : {});
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(!!searchIntent);
  useEffect(() => {
    if (!searchIntent) return;
    const t = setTimeout(() => setLoading(false), 700);
    onConsumeSearch && onConsumeSearch();
    return () => clearTimeout(t);
  }, []);
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
      <Topbar title={TITLES[view]} sub={view === 'card' && item ? cfg.title + ' · ' + (item.no || item.id || '') : undefined}>
        <div className="topbar-spacer" />
        {view === 'registry' && <Button icon="search" onClick={() => setView('search')}>{cfg.searchTitle === 'Подбор тура' ? 'Подобрать тур' : 'Новый поиск'}</Button>}
        {view === 'card' && item && <Button variant="secondary" icon="chevLeft" onClick={() => setView(item.cost ? 'results' : 'registry')}>{item.cost ? 'К результатам' : 'К реестру'}</Button>}
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
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
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

        {view === 'card' && item && <SvcCard item={item} kind={cfg.kind} hideBackRow onBack={() => setView(item.cost ? 'results' : 'registry')} />}
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
          {/* ТЗ #4/#5 — у трансфера и автобуса: в одну сторону / туда и обратно */}
          {(cfg.kind === 'Трансфер' || cfg.kind === 'Автобус') && (
            <div className="trip-toggle" style={{ marginBottom: 12 }}>
              {[['ow', 'В одну сторону'], ['rt', 'Туда и обратно']].map(([k, l]) => (
                <button key={k} className={(form.trip || 'ow') === k ? 'on' : ''} onClick={() => setF('trip', k)}>{l}</button>
              ))}
            </div>
          )}
          <div className="av-bar">
            {cfg.fields.map((f) => <SvcField key={f.k} f={f} form={form} set={setF} />)}
            {(cfg.kind === 'Трансфер' || cfg.kind === 'Автобус') && form.trip === 'rt' && (
              <div className="av-field" style={{ width: 156 }}><span className="label">Обратно</span><DateField value={form.retDate} onChange={(d) => setF('retDate', d)} placeholder="Дата" /></div>
            )}
            <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
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

/* ---------- Аэроэкспресс add-flow (доп. услуга) ----------
   Направление (аэропорт ⇄ вокзал) + вариация проезда: разово / туда-обратно / абонемент.
   Выдача тарифов фильтруется под выбранную вариацию — как на крупных тревел-платформах. */
function AeroAddFlow({ onAdd }) {
  const toast = useToast();
  const data = SVC_DATA.aero;
  const [view, setView] = useState('search');
  const [fare, setFare] = useState('single');
  const [dir, setDir] = useState(AERO_DIRS[0].label);
  const [date, setDate] = useState(null);
  const [retDate, setRetDate] = useState(null);
  const [start, setStart] = useState(null);
  const [pax, setPax] = useState(1);
  const [loading, setLoading] = useState(false);
  const runSearch = () => { setView('results'); setLoading(true); setTimeout(() => setLoading(false), 800); };

  const offers = data.offers.filter((o) => o.fareType === fare);
  const fareLabel = (AERO_FARES.find(([k]) => k === fare) || [])[1];

  const addOffer = (o) => {
    const route = fare === 'single' ? dir.replace('⇄', '→') : dir;
    const info = fare === 'pass'
      ? [{ l: 'Направление', v: dir }, { l: 'Тариф', v: o.title }, { l: 'Начало действия', v: start ? fmtDate(start) : '—' }]
      : [{ l: 'Направление', v: route }, { l: 'Тариф', v: o.title }, { l: 'Дата', v: date ? fmtDate(date) : '—' }]
          .concat(fare === 'rt' ? [{ l: 'Обратно', v: retDate ? fmtDate(retDate) : '—' }] : [])
          .concat([{ l: 'Пассажиров', v: pax }]);
    onAdd({ ...o, sub: route + ' · ' + fareLabel, info }, 'Аэроэкспресс');
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        {view === 'results' && <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('search')}>Изменить поиск</Button>}
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Аэроэкспресс — билеты и абонементы</span>
      </div>

      {view === 'search' && (
        <>
          {/* вариация проезда: разово / туда-обратно / абонемент */}
          <div className="trip-toggle" style={{ marginBottom: 12 }}>
            {AERO_FARES.map(([k, l]) => (
              <button key={k} className={fare === k ? 'on' : ''} onClick={() => setFare(k)}>{l}</button>
            ))}
          </div>
          <div className="av-bar">
            <div className="av-field" style={{ width: 320 }}><span className="label">Направление</span>
              <Select options={AERO_DIRS.map((d) => d.label)} value={dir} onChange={(e) => setDir(e.target.value)} /></div>
            {fare === 'pass' ? (
              <div className="av-field" style={{ width: 156 }}><span className="label">Начало действия</span>
                <DateField value={start} onChange={setStart} placeholder="Дата" /></div>
            ) : (
              <>
                <div className="av-field" style={{ width: 156 }}><span className="label">{fare === 'rt' ? 'Туда' : 'Дата'}</span>
                  <DateField value={date} onChange={setDate} placeholder="Дата" /></div>
                {fare === 'rt' && <div className="av-field" style={{ width: 156 }}><span className="label">Обратно</span>
                  <DateField value={retDate} onChange={setRetDate} placeholder="Дата" /></div>}
                <div className="av-field" style={{ width: 150 }}><span className="label">Пассажиров</span>
                  <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <button className="btn btn-secondary btn-icon btn-sm" disabled={pax <= 1} onClick={() => setPax(pax - 1)}>−</button>
                    <span style={{ fontWeight: 700 }}>{pax}</span>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setPax(pax + 1)}>+</button>
                  </div>
                </div>
              </>
            )}
            <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
            <Icon name="api" style={{ width: 16, height: 16 }} />Билеты и абонементы Аэроэкспресс · цены в ₽
          </div>
        </>
      )}

      {view === 'results' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{dir} · {fareLabel}</span>
            <div style={{ flex: 1 }} />
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
          </div>
          {loading
            ? [0, 1, 2].map((i) => (<div key={i} className="off-card" style={{ marginBottom: 14 }}><div className="off-main"><div className="sk" style={{ height: 44, width: '55%' }} /><div className="sk" style={{ height: 26, width: '85%' }} /></div><div className="off-side"><div className="sk" style={{ height: 56 }} /></div></div>))
            : offers.map((o) => <SvcOfferCard key={o.id} o={o} kind="Аэроэкспресс" onSelect={addOffer} onSave={() => toast('Предложение сохранено', 'ok')} />)}
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
  const selCount = flt.times.length + flt.classes.length + flt.carriers.length + (flt.trainNo && flt.trainNo.trim() ? 1 : 0) + ((flt.priceMax != null && flt.priceMax < bounds.max) ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={() => setFlt({ priceMax: bounds.max, times: [], classes: [], carriers: [], trainNo: '' })}>Очистить</button>
      </div>
      {/* ТЗ #2 — строка поиска по номеру поезда, как «Номер рейса» у авиа */}
      <SearchBox value={flt.trainNo || ''} onChange={(v) => setFlt((f) => ({ ...f, trainNo: v }))} placeholder="Номер поезда" style={{ minWidth: 0, width: '100%', height: 42, margin: '4px 0 10px' }} />
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
  const [form, setForm] = useState({ trip: 'ow', from: 'Москва', to: 'Санкт-Петербург', dep: null, ret: null, pax: Math.max(1, participants.length) });
  const [sort, setSort] = useState('best');
  const [flt, setFlt] = useState({ priceMax: bounds.max, times: [], classes: [], carriers: [], trainNo: '' });
  const [seatOffer, setSeatOffer] = useState(null);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const swap = () => setForm((f) => ({ ...f, from: f.to, to: f.from }));

  const trainNoMatch = (o, q) => { const n = q.replace(/\s+/g, '').toLowerCase(); return `${o.number} ${o.name}`.replace(/\s+/g, '').toLowerCase().includes(n); };
  let offers = offersAll.filter((o) => {
    if (flt.trainNo && flt.trainNo.trim() && !trainNoMatch(o, flt.trainNo)) return false;
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
      {/* ТЗ #5 — у ЖД: в одну сторону / туда и обратно */}
      <div className="trip-toggle" style={{ marginBottom: 12 }}>
        {[['ow', 'В одну сторону'], ['rt', 'Туда и обратно']].map(([k, l]) => (
          <button key={k} className={form.trip === k ? 'on' : ''} onClick={() => setF('trip', k)}>{l}</button>
        ))}
      </div>
      <div className="av-bar">
        <div className="av-field" style={{ width: 190 }}><span className="label">Откуда</span><Input value={form.from} onChange={(e) => setF('from', e.target.value)} /></div>
        {/* ТЗ #4 — стрелка переключения городов, как у авиа */}
        <button className="av-swap" onClick={swap} title="Поменять местами" style={{ alignSelf: 'flex-end', marginBottom: 0 }}><Icon name="swap" style={{ width: 18, height: 18 }} /></button>
        <div className="av-field" style={{ width: 190 }}><span className="label">Куда</span><Input value={form.to} onChange={(e) => setF('to', e.target.value)} /></div>
        <div className="av-field" style={{ width: 150 }}><span className="label">{form.trip === 'rt' ? 'Туда' : 'Дата'}</span><DateField value={form.dep} onChange={(d) => setF('dep', d)} placeholder="Дата" /></div>
        {form.trip === 'rt' && <div className="av-field" style={{ width: 150 }}><span className="label">Обратно</span><DateField value={form.ret} onChange={(d) => setF('ret', d)} placeholder="—" /></div>}
        <div className="av-field" style={{ width: 130 }}><span className="label">Пассажиры</span>
          <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-icon btn-sm" disabled={form.pax <= 1} onClick={() => setF('pax', form.pax - 1)}>−</button>
            <span style={{ fontWeight: 700 }}>{form.pax}</span>
            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => setF('pax', form.pax + 1)}>+</button>
          </div>
        </div>
        <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={() => toast('Поиск обновлён по подключённым поставщикам', 'info')}>Найти</Button>
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

/* =====================================================================
   ЕДИНЫЙ ЭКРАН «Подбор услуг» (ТЗ-2 п.4) — раньше пункт меню только
   раскрывал список раздроблённых услуг и сам по себе не нёс функции.
   Теперь это осмысленная посадочная страница: выбор вида услуги.
   ===================================================================== */
const SERVICES_HUB = [
  { key: 'flights', icon: 'plane', title: 'Авиабилеты', desc: 'Поиск и бронирование перелётов, тарифы и доп. услуги.' },
  { key: 'rail', icon: 'train', title: 'ЖД билеты', desc: 'Железнодорожные билеты, выбор вагона и мест.' },
  { key: 'hotels', icon: 'building', title: 'Гостиницы', desc: 'Подбор отелей, категории, питание и условия.' },
  { key: 'transfers', icon: 'car', title: 'Трансферы', desc: 'Индивидуальные и групповые трансферы, такси.' },
  { key: 'buses', icon: 'bus', title: 'Автобусы', desc: 'Автобусные и маршрутные перевозки.' },
  { key: 'tours', icon: 'users', title: 'Туры и группы', desc: 'Групповые поездки и туристические пакеты.' },
];
/* Маска подбора авиабилетов для бокового окна хаба (у авиа нет записи в SVC_CFG). */
const FLIGHTS_HUB_FIELDS = [
  { k: 'trip', l: 'Тип поездки', t: 'select', o: ['Туда и обратно', 'В одну сторону'] },
  { k: 'from', l: 'Откуда', t: 'text' },
  { k: 'to', l: 'Куда', t: 'text' },
  { k: 'depDate', l: 'Дата вылета', t: 'date' },
  { k: 'retDate', l: 'Дата возврата', t: 'date' },
  { k: 'pax', l: 'Пассажиров', t: 'stepper' },
  { k: 'cabin', l: 'Класс', t: 'select', o: ['Эконом', 'Комфорт', 'Бизнес', 'Первый'] },
];

/* Боковое окно с поисковой маской — открывается по клику на блок услуги в хабе.
   Заполнив маску, менеджер сразу попадает в выдачу выбранного раздела (без реестра). */
function ServiceSearchDrawer({ svc, onClose, onSubmit, onOpenRegistry }) {
  const open = !!svc;
  const [form, setForm] = useState({});
  const key = svc && svc.key;
  useEffect(() => { setForm({}); }, [key]);
  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const cfg = key === 'flights'
    ? { title: 'Авиабилеты', fields: FLIGHTS_HUB_FIELDS }
    : { title: SVC_CFG[key].title, fields: SVC_CFG[key].fields };
  let fields = cfg.fields;
  if (key === 'flights' && form.trip === 'В одну сторону') fields = fields.filter((f) => f.k !== 'retDate');
  return (
    <Drawer open={open} onClose={onClose} title={'Подбор: ' + cfg.title}
      sub="Заполните параметры — покажем подходящие варианты" width="min(460px,96vw)"
      footer={<>
        <Button variant="ghost" icon="clipboard" onClick={() => onOpenRegistry(key)}>Реестр услуг</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button variant="primary" icon="search" onClick={() => onSubmit(key, form)}>Найти</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {fields.map((f) => <SvcField key={f.k} f={{ ...f, w: '100%' }} form={form} set={set} />)}
      </div>
    </Drawer>
  );
}

/* Соответствие блока хаба вкладке единой маски бронирования (ADD_SVC_CATS). */
const HUB_KIND = { flights: 'Авиа', rail: 'ЖД', hotels: 'Гостиница', transfers: 'Трансфер', buses: 'Автобус', tours: 'Доп. услуга' };

function ServicesHubPage({ onNavigate, onAddOrder, onOpenOrder }) {
  // Единая маска бронирования со вкладками. Клик по блоку открывает её на нужной вкладке.
  const [maskKind, setMaskKind] = useState(null);
  return (
    <>
      <Topbar title="Подбор услуг" sub="Единая маска бронирования — выберите вкладку услуги">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="search" onClick={() => setMaskKind('Авиа')}>Открыть подбор</Button>
        {onAddOrder && <Button icon="plus" onClick={onAddOrder}>Новый заказ</Button>}
      </Topbar>
      <div className="content fade-in">
        <div className="svc-hub-grid">
          {SERVICES_HUB.map((s) => (
            <button key={s.key} type="button" className="svc-hub-card" onClick={() => setMaskKind(HUB_KIND[s.key] || 'Авиа')}>
              <span className="svc-hub-ic"><Icon name={s.icon} /></span>
              <span className="svc-hub-body">
                <span className="svc-hub-t">{s.title}</span>
                <span className="svc-hub-d">{s.desc}</span>
              </span>
              <Icon name="arrowRight" className="svc-hub-go" />
            </button>
          ))}
        </div>
        <div className="svc-hub-note">
          <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--blue)', flex: '0 0 18px' }} />
          <span>Все виды услуг — в одной маске бронирования с вкладками. Подбор можно оформить в КП, привязать к заказу, к клиенту или отправить в чат.</span>
        </div>
      </div>
      {maskKind && <DetailedSearchPanel initialKind={maskKind} onClose={() => setMaskKind(null)} onOpenOrder={onOpenOrder} />}
    </>
  );
}

Object.assign(window, { ServiceFlow, SVC_CFG, ServiceAddFlow, AeroAddFlow, routeKeyForKind, SvcCard, SvcOfferCard, ServiceCardSendPanel, ServiceCardHistoryDrawer, CardCore, ChannelPreview, CardActionButtons, CardFinancialBlock, cardFinModel, CardLifecycle, RailSeatPanel, RailAddFlow, RailOfferCard, ServicesHubPage, SERVICES_HUB });
