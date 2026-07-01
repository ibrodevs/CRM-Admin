// ===== AVIA module: registry → search → results → service card =====

/* ---------- helpers ---------- */
function AirlineLogo({ code, size = 'md' }) {
  const a = AIRLINES[code] || { name: code, color: '#7e889a' };
  return (
    <span className={'airline-logo' + (size === 'sm' ? ' sm' : '')}
      style={{ background: a.color }} title={a.name}>{code}</span>
  );
}
function durMin(s) {
  const h = (s.match(/(\d+)ч/) || [])[1] || 0;
  const m = (s.match(/(\d+)м/) || [])[1] || 0;
  return (+h) * 60 + (+m);
}
function money(n, c) { return n.toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }

/* ---------- airport autocomplete ---------- */
function AirportField({ label, value, onChange, placeholder = 'Город или аэропорт' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const sel = AIRPORTS.find((a) => a.code === value);
  const s = q.trim().toLowerCase();
  const list = AIRPORTS.filter((a) => !s || a.city.toLowerCase().includes(s) || a.code.toLowerCase().includes(s) || a.name.toLowerCase().includes(s));
  return (
    <div className="av-field" style={{ position: 'relative', width: 196 }} ref={ref}>
      {label && <span className="label">{label}</span>}
      <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}
        onClick={() => setOpen((o) => !o)}>
        <Icon name="plane" style={{ width: 17, height: 17, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ color: sel ? 'var(--ink)' : 'var(--faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sel ? `${sel.city} · ${sel.code}` : placeholder}
        </span>
      </div>
      {open && (
        <div className="dropdown scroll" style={{ top: 74, left: 0, right: 0, maxHeight: 280, overflowY: 'auto', padding: 8 }}>
          <input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск аэропорта" style={{ marginBottom: 6 }} />
          {list.map((a) => (
            <div key={a.code} className="dropdown-item" onClick={() => { onChange(a.code); setOpen(false); setQ(''); }}>
              <span style={{ width: 34, fontWeight: 700, color: 'var(--blue)' }}>{a.code}</span>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.city}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.name}, {a.country}</div>
              </span>
            </div>
          ))}
          {!list.length && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 14 }}>Ничего не найдено</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- passengers + cabin popover ---------- */
const PAX_DEFAULT_OPTIONS = { sameClass: true, allowDiffClasses: false, seekSubsidized: false, seekGroupFares: false };

function paxTotal(pax) { return pax.adt + pax.chd + pax.infNoSeat + pax.infSeat; }

/* per-type / per-category visuals so the picker looks identical everywhere it's used */
const PAX_BASE_TYPES = [
  { k: 'adt', label: 'Взрослые', sub: 'от 12 лет', icon: 'user', tone: 'blue', min: 1 },
  { k: 'chd', label: 'Дети', sub: '2–11 лет', icon: 'baby', tone: 'green', min: 0 },
  { k: 'infNoSeat', label: 'Младенцы без места', sub: 'до 2 лет', icon: 'baby', tone: 'violet', min: 0 },
  { k: 'infSeat', label: 'Младенцы с местом', sub: 'до 2 лет', icon: 'baby', tone: 'amber', min: 0 },
];
const SPECIAL_PAX_ICONS = { youth: 'user', seniorM: 'user', seniorF: 'user', largeFamily: 'users', disabled: 'user', disabledEscort: 'users', disabledChild: 'baby' };
const SPECIAL_PAX_INFO = {
  largeFamily: 'Льгота для семей с тремя и более детьми', disabled: 'Требуется подтверждающий документ',
  disabledChild: 'Требуется подтверждающий документ', disabledEscort: 'Сопровождающий лица с инвалидностью',
};
const SUBSIDIZED_PAX_ICONS = { dvoResident: 'mapPin', dvoChild: 'baby', kldResident: 'building', kldChild: 'baby' };
const CABIN_ICONS = { 'Эконом': 'user', 'Комфорт': 'coffee', 'Бизнес': 'briefcase', 'Первый': 'sparkles' };
const PAX_OPTION_META = [
  { k: 'sameClass', label: 'Все пассажиры одного класса', icon: 'users', info: 'Все места будут забронированы в одном классе обслуживания' },
  { k: 'allowDiffClasses', label: 'Разрешить разные классы', icon: 'idcard', info: 'Можно назначить разным пассажирам разные классы' },
  { k: 'seekSubsidized', label: 'Подобрать субсидированные тарифы', icon: 'finance', info: 'Поиск с учётом субсидированных программ' },
  { k: 'seekGroupFares', label: 'Искать групповые тарифы авиакомпаний', icon: 'users', info: 'Специальные тарифы для групп от 10 человек' },
];

function PaxStepper({ val, min = 0, onChange }) {
  return (
    <div className="pcp-stepper">
      <button type="button" disabled={val <= min} onClick={() => onChange(Math.max(min, val - 1))}>−</button>
      <span className="n">{val}</span>
      <button type="button" onClick={() => onChange(val + 1)}>+</button>
    </div>
  );
}

/* единый компонент выбора пассажиров и класса — используется во всех авиапоисках */
function PaxClassPicker({ pax, setPax, cabin, setCabin, options = PAX_DEFAULT_OPTIONS, setOptions }) {
  const [specialOpen, setSpecialOpen] = useState(false);
  const [paxOpen, setPaxOpen] = useState(true);
  const total = paxTotal(pax);
  const setBase = (k, min) => (v) => setPax({ ...pax, [k]: Math.max(min, v) });
  const setGrp = (grp, k) => (v) => setPax({ ...pax, [grp]: { ...(pax[grp] || {}), [k]: Math.max(0, v) } });
  const specialCount = Object.values(pax.special || {}).reduce((a, n) => a + (n || 0), 0)
    + Object.values(pax.subsidized || {}).reduce((a, n) => a + (n || 0), 0);
  const opt = (k) => () => setOptions && setOptions({ [k]: !options[k] });

  return (
    <div className="pcp">
      <div className="pcp-sec-head">
        <span className="t">Пассажиры</span>
        <span className="pcp-total">Всего: {total}</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="pcp-link" onClick={() => setPaxOpen((o) => !o)}>{paxOpen ? 'Свернуть' : 'Развернуть'}<Icon name={paxOpen ? 'chevUp' : 'chevDown'} style={{ width: 14, height: 14 }} /></button>
      </div>

      {paxOpen && PAX_BASE_TYPES.map((t) => (
        <div className="pcp-row" key={t.k}>
          <span className={'pcp-ic ' + t.tone}><Icon name={t.icon} /></span>
          <div className="pcp-row-body"><div className="l">{t.label}</div><div className="s">{t.sub}</div></div>
          <PaxStepper val={pax[t.k] || 0} min={t.min} onChange={setBase(t.k, t.min)} />
        </div>
      ))}

      <button type="button" className={'pcp-special-toggle' + (specialOpen ? ' open' : '')} onClick={() => setSpecialOpen((o) => !o)}>
        <span className="pm">{specialOpen ? '−' : '+'}</span>Специальные категории
        {specialCount > 0 && <span className="tab-count">{specialCount}</span>}
        <span style={{ flex: 1 }} />
        <Icon name={specialOpen ? 'chevUp' : 'chevDown'} style={{ width: 16, height: 16 }} />
      </button>
      {specialOpen && (
        <div className="pcp-special">
          <div className="pcp-special-col">
            <div className="pcp-col-h">Льготные категории</div>
            {SPECIAL_PAX_CATEGORIES.map((c) => (
              <div className="pcp-srow" key={c.key}>
                <span className="pcp-sic"><Icon name={SPECIAL_PAX_ICONS[c.key] || 'user'} /></span>
                <span className="pcp-slabel">{c.label}{SPECIAL_PAX_INFO[c.key] && <Icon name="alertCircle" className="pcp-info" title={SPECIAL_PAX_INFO[c.key]} />}</span>
                <PaxStepper val={(pax.special || {})[c.key] || 0} onChange={setGrp('special', c.key)} />
              </div>
            ))}
          </div>
          <div className="pcp-special-col">
            <div className="pcp-col-h">Субсидированные программы</div>
            {SUBSIDIZED_PAX_PROGRAMS.map((c) => (
              <div className="pcp-srow" key={c.key}>
                <span className="pcp-sic"><Icon name={SUBSIDIZED_PAX_ICONS[c.key] || 'mapPin'} /></span>
                <span className="pcp-slabel">{c.label}</span>
                <PaxStepper val={(pax.subsidized || {})[c.key] || 0} onChange={setGrp('subsidized', c.key)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pcp-block-h">Класс обслуживания</div>
      <div className="pcp-class-grid">
        {CABIN_CLASSES.map((c) => (
          <button type="button" key={c} className={'pcp-class' + (cabin === c ? ' sel' : '')} onClick={() => setCabin(c)}>
            {cabin === c && <span className="pcp-class-check"><Icon name="check" /></span>}
            <span className="pcp-class-ic"><Icon name={CABIN_ICONS[c] || 'user'} /></span>
            <span className="pcp-class-l">{c}</span>
          </button>
        ))}
      </div>

      <div className="pcp-block-h">Дополнительные параметры</div>
      <div className="pcp-opts">
        {PAX_OPTION_META.map((o) => (
          <label key={o.k} className={'pcp-opt' + (options[o.k] ? ' on' : '')}>
            <Checkbox on={!!options[o.k]} onChange={opt(o.k)} />
            <Icon name={o.icon} className="pcp-opt-ic" />
            <span className="pcp-opt-l">{o.label}</span>
            <Icon name="alertCircle" className="pcp-info" title={o.info} />
          </label>
        ))}
      </div>
    </div>
  );
}

function PaxField({ pax, setPax, cabin, setCabin, options = PAX_DEFAULT_OPTIONS, setOptions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const total = paxTotal(pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n < 5 ? 'пассажира' : 'пассажиров');
  return (
    <div className="av-field" style={{ position: 'relative', width: 230 }} ref={ref}>
      <span className="label">Пассажиры и класс</span>
      <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => setOpen((o) => !o)}>
        <Icon name="users" style={{ width: 17, height: 17, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{total} {plural(total)} · {cabin}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </div>
      {open && (
        <div className="dropdown scroll pcp-pop" style={{ top: 74, left: 0, width: 'min(620px,86vw)', maxHeight: 560, overflowY: 'auto', padding: 16 }}>
          <PaxClassPicker pax={pax} setPax={setPax} cabin={cabin} setCabin={setCabin} options={options} setOptions={setOptions} />
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   SEARCH VIEW
   ==================================================================== */
function FlightSearch({ params, setParams, onSearch, onBack }) {
  const p = params;
  const set = (patch) => setParams({ ...p, ...patch });
  const swap = () => set({ from: p.to, to: p.from });
  const TRIPS = [['ow', 'В одну сторону'], ['rt', 'Туда-обратно'], ['mc', 'Сложный маршрут']];
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <div className="trip-toggle">
          {TRIPS.map(([k, l]) => (
            <button key={k} className={p.trip === k ? 'on' : ''} onClick={() => set({ trip: k })}>{l}</button>
          ))}
        </div>
      </div>

      <div className="av-bar">
        <AirportField label="Откуда" value={p.from} onChange={(v) => set({ from: v })} />
        <button className="av-swap" onClick={swap} title="Поменять местами"><Icon name="swap" style={{ width: 20, height: 20 }} /></button>
        <AirportField label="Куда" value={p.to} onChange={(v) => set({ to: v })} />
        {p.trip === 'rt' ? (
          <div className="av-field" style={{ width: 230 }}>
            <span className="label">Даты поездки</span>
            <DateRangeField startVal={p.depDate} endVal={p.retDate} onChange={(s, e) => set({ depDate: s, retDate: e })} placeholder="Туда — обратно" />
          </div>
        ) : (
          <div className="av-field" style={{ width: 156 }}>
            <span className="label">Дата вылета</span>
            <DateField value={p.depDate} onChange={(d) => set({ depDate: d })} placeholder="Выбрать" />
          </div>
        )}
        <PaxField pax={p.pax} setPax={(v) => set({ pax: v })} cabin={p.cabin} setCabin={(v) => set({ cabin: v })}
          options={p} setOptions={(patch) => set(patch)} />
        <Button icon="search" style={{ height: 46, marginBottom: 0 }} onClick={onSearch}>Найти билеты</Button>
      </div>

      {/* secondary options */}
      <div className="card card-pad" style={{ marginTop: 16, display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <Toggle on={p.baggage} onChange={(v) => set({ baggage: v })} /> <span style={{ fontWeight: 500 }}>Только с багажом</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <Toggle on={p.flex} onChange={(v) => set({ flex: v })} /> <span style={{ fontWeight: 500 }}>Гибкие даты ±3 дня</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <Toggle on={p.direct} onChange={(v) => set({ direct: v })} /> <span style={{ fontWeight: 500 }}>Только прямые</span>
        </label>
        <div style={{ flex: 1 }} />
        <div style={{ minWidth: 240 }}>
          <Field label="Предпочтительные авиакомпании">
            <Select placeholder="Любые авиакомпании"
              options={Object.entries(AIRLINES).map(([code, a]) => ({ value: code, label: a.name }))}
              value={p.airline} onChange={(e) => set({ airline: e.target.value })} />
          </Field>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13.5 }}>
        <Icon name="api" style={{ width: 16, height: 16 }} />
        Поиск выполняется одновременно по: Amadeus GDS · Sirena-Travel · Air Astana · Pegasus · Qatar API
      </div>
    </div>
  );
}

/* ====================================================================
   RESULTS VIEW
   ==================================================================== */
function OfferLeg({ leg }) {
  return (
    <div className="off-leg">
      <div className="off-time">{leg.dep}<div className="ap">{leg.from} · {leg.date}</div></div>
      <div className="off-mid">
        <div className="off-dur">{leg.dur}</div>
        <div className="off-route-line">{leg.stops > 0 && <span className="off-stop-dot" />}</div>
        <div className={'off-stop ' + (leg.stops ? 'via' : 'direct')}>{leg.stopText}</div>
      </div>
      <div className="off-time">{leg.arr}<div className="ap">{leg.to} · {leg.date}</div></div>
    </div>
  );
}

function OfferCard({ o, picked, onPick, onSelect, onSave, onCompare, compared }) {
  const total = o.fare + o.fee;
  return (
    <div className={'off-card' + (compared ? ' sel' : '')} style={{ marginBottom: 14 }}>
      <div className="off-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AirlineLogo code={o.airline} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{AIRLINES[o.airline].name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{o.out.flightNo}{o.back ? ' · ' + o.back.flightNo : ''} · {o.fareName}</div>
          </div>
        </div>
        <OfferLeg leg={o.out} />
        {o.back && <OfferLeg leg={o.back} />}
        <div className="off-meta">
          <span className="off-tag"><Icon name="briefcase" />{o.cabin}</span>
          <span className={'off-tag ' + (o.baggage === 'Без багажа' ? 'no' : 'ok')}><Icon name="luggage" />{o.baggage}</span>
          <span className={'off-tag ' + (o.refundable ? 'ok' : 'no')}><Icon name={o.refundable ? 'refund' : 'x'} />{o.refundable ? 'Возвратный' : 'Невозвратный'}</span>
          {o.seatsLeft <= 5 && <span className="off-tag no"><Icon name="alertCircle" />Осталось {o.seatsLeft} мест</span>}
        </div>
      </div>
      <div className="off-side">
        <div>
          <div className="off-supplier"><Icon name="api" style={{ width: 13, height: 13, verticalAlign: -2 }} /> {o.supplier}</div>
          <div className="off-price-line"><span>Тариф</span><span>{money(o.fare, o.currency)}</span></div>
          <div className="off-price-line"><span>Сервисный сбор</span><span>{money(o.fee, o.currency)}</span></div>
          <div className="off-total">{total.toLocaleString('ru-RU')} <small>$</small></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="sm" onClick={() => onSelect(o)}>Выбрать</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => onSave(o)} title="Сохранить"><Icon name="star" /></Button>
            <Button variant={compared ? 'primary' : 'secondary'} size="sm" style={{ flex: 1 }} onClick={() => onCompare(o)} title="Сравнить"><Icon name="share" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterRail({ flt, setFlt }) {
  const airlines = [...new Set(FLIGHT_OFFERS.map((o) => o.airline))];
  const tg = (key, val) => {
    const cur = flt[key];
    setFlt({ ...flt, [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] });
  };
  return (
    <div className="flt-rail">
      <div className="card card-pad" style={{ padding: '8px 20px' }}>
        <div className="flt-block">
          <div className="flt-h">Поиск рейса</div>
          <SearchBox value={flt.flightNo || ''} onChange={(v) => setFlt({ ...flt, flightNo: v })}
            placeholder="Номер рейса, напр. KC 131" style={{ minWidth: 0, width: '100%', height: 42 }} />
        </div>
        <div className="flt-block">
          <div className="flt-h">Пересадки</div>
          {[['0', 'Без пересадок'], ['1', '1 пересадка']].map(([v, l]) => (
            <label key={v} className="flt-opt"><Checkbox on={flt.stops.includes(v)} onChange={() => tg('stops', v)} />{l}</label>
          ))}
        </div>
        <div className="flt-block">
          <div className="flt-h">Багаж</div>
          <label className="flt-opt"><Checkbox on={flt.bagOnly} onChange={() => setFlt({ ...flt, bagOnly: !flt.bagOnly })} />Только с багажом</label>
          <label className="flt-opt"><Checkbox on={flt.refundOnly} onChange={() => setFlt({ ...flt, refundOnly: !flt.refundOnly })} />Только возвратные</label>
        </div>
        <div className="flt-block">
          <div className="flt-h">Авиакомпании</div>
          {airlines.map((a) => (
            <label key={a} className="flt-opt"><Checkbox on={flt.air.includes(a)} onChange={() => tg('air', a)} />{AIRLINES[a].name}
              <span className="cnt">{FLIGHT_OFFERS.filter((o) => o.airline === a).length}</span></label>
          ))}
        </div>
        <div className="flt-block">
          <div className="flt-h">Поставщики</div>
          {[...new Set(FLIGHT_OFFERS.map((o) => o.supplier))].map((s) => (
            <label key={s} className="flt-opt"><Checkbox on={flt.sup.includes(s)} onChange={() => tg('sup', s)} />{s}</label>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareModal({ open, offers, onClose, onSelect }) {
  if (!open) return null;
  const rows = [
    ['Авиакомпания', (o) => AIRLINES[o.airline].name],
    ['Маршрут', (o) => `${o.out.from} → ${o.out.to}`],
    ['Вылет', (o) => `${o.out.dep} · ${o.out.date}`],
    ['В пути', (o) => o.out.dur],
    ['Пересадки', (o) => o.out.stops ? o.out.stopText : 'Прямой'],
    ['Тариф', (o) => o.fareName],
    ['Багаж', (o) => o.baggage],
    ['Возврат', (o) => o.refundable ? 'Да' : 'Нет'],
    ['Поставщик', (o) => o.supplier],
    ['Итого', (o) => <b style={{ fontSize: 17 }}>{(o.fare + o.fee).toLocaleString('ru-RU')} $</b>],
  ];
  return (
    <Modal open={open} onClose={onClose} className="modal-lg">
      <div style={{ padding: '24px 26px', minWidth: 640 }}>
        <ModalHeader title="Сравнение предложений" sub={`${offers.length} варианта`} onClose={onClose} />
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th></th>{offers.map((o) => <th key={o.id}><AirlineLogo code={o.airline} size="sm" /></th>)}</tr></thead>
            <tbody>
              {rows.map(([label, fn]) => (
                <tr key={label}><td style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</td>
                  {offers.map((o) => <td key={o.id}>{fn(o)}</td>)}</tr>
              ))}
              <tr><td></td>{offers.map((o) => <td key={o.id}><Button size="sm" onClick={() => onSelect(o)}>Выбрать</Button></td>)}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function FlightResults({ params, onSelect, onBackToSearch }) {
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('best');
  const [flt, setFlt] = useState({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, flightNo: '' });
  const [compare, setCompare] = useState([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const toast = useToast();

  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 1100); return () => clearTimeout(t); }, []);

  const flightNoMatch = (o, q) => { const n = q.replace(/\s+/g, '').toLowerCase(); return [o.out, o.back].some((l) => l && l.flightNo && l.flightNo.replace(/\s+/g, '').toLowerCase().includes(n)); };
  let offers = FLIGHT_OFFERS.filter((o) => {
    if (flt.flightNo && flt.flightNo.trim() && !flightNoMatch(o, flt.flightNo)) return false;
    if (flt.stops.length && !flt.stops.includes(String(o.out.stops))) return false;
    if (flt.air.length && !flt.air.includes(o.airline)) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.bagOnly && o.baggage === 'Без багажа') return false;
    if (flt.refundOnly && !o.refundable) return false;
    return true;
  });
  const SORTS = { cheap: (a, b) => (a.fare + a.fee) - (b.fare + b.fee), fast: (a, b) => durMin(a.out.dur) - durMin(b.out.dur), early: (a, b) => a.out.dep.localeCompare(b.out.dep), best: (a, b) => (a.fare + a.fee + durMin(a.out.dur)) - (b.fare + b.fee + durMin(b.out.dur)) };
  offers = [...offers].sort(SORTS[sort]);

  const fromCity = (AIRPORTS.find((a) => a.code === params.from) || {}).city || params.from;
  const toCity = (AIRPORTS.find((a) => a.code === params.to) || {}).city || params.to;
  const toggleCompare = (o) => setCompare((c) => c.find((x) => x.id === o.id) ? c.filter((x) => x.id !== o.id) : (c.length >= 3 ? (toast('Можно сравнить до 3 вариантов', 'err'), c) : [...c, o]));

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBackToSearch}>Изменить поиск</Button>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{fromCity} → {toCity}</div>
        <span className="pill pill-gray">{params.depDate ? fmtDate(params.depDate) : '24.06'}{params.trip === 'rt' ? ' — ' + (params.retDate ? fmtDate(params.retDate) : '01.07') : ''}</span>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{paxTotal(params.pax)} пасс. · {params.cabin}</span>
      </div>

      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
        <FilterRail flt={flt} setFlt={setFlt} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* sort bar */}
          <div className="tabs" style={{ marginBottom: 16 }}>
            {[['best', 'Оптимальные'], ['cheap', 'Дешевле'], ['fast', 'Быстрее'], ['early', 'Ранний вылет']].map(([k, l]) => (
              <button key={k} className={'tab' + (sort === k ? ' active' : '')} onClick={() => setSort(k)}>{l}</button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ color: 'var(--muted)', fontSize: 14, alignSelf: 'center' }}>{loading ? 'Поиск…' : `Найдено ${offers.length}`}</span>
          </div>

          {loading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="off-card" style={{ marginBottom: 14 }}>
                <div className="off-main"><div className="sk" style={{ height: 44, width: '60%' }} /><div className="sk" style={{ height: 28, width: '90%' }} /><div className="sk" style={{ height: 20, width: '50%' }} /></div>
                <div className="off-side"><div className="sk" style={{ height: 60 }} /></div>
              </div>
            ))
          ) : offers.length ? offers.map((o) => (
            <OfferCard key={o.id} o={o} compared={!!compare.find((x) => x.id === o.id)}
              onSelect={onSelect} onSave={(x) => toast('Предложение сохранено: ' + AIRLINES[x.airline].name)}
              onCompare={toggleCompare} />
          )) : <EmptyState icon="search" title="Нет вариантов по фильтрам" sub="Смягчите условия фильтрации слева" />}
        </div>
      </div>

      {compare.length > 0 && (
        <div className="cmp-tray">
          <div style={{ display: 'flex', gap: 8 }}>{compare.map((o) => <AirlineLogo key={o.id} code={o.airline} size="sm" />)}</div>
          <span style={{ fontWeight: 600 }}>{compare.length} к сравнению</span>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={() => setCompare([])}>Очистить</Button>
          <Button size="sm" icon="share" disabled={compare.length < 2} onClick={() => setCmpOpen(true)}>Сравнить</Button>
        </div>
      )}
      <CompareModal open={cmpOpen} offers={compare} onClose={() => setCmpOpen(false)}
        onSelect={(o) => { setCmpOpen(false); onSelect(o); }} />
    </div>
  );
}

/* ====================================================================
   SERVICE CARD VIEW
   ==================================================================== */
function SegmentRow({ leg }) {
  return (
    <div className="seg">
      <div className="seg-time"><div className="t">{leg.dep}</div><div className="d">{leg.date}</div></div>
      <div className="seg-rail"><span className="o" /><span className="l" /><span className="o" /></div>
      <div className="seg-body">
        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{leg.from} → {leg.to}</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', margin: '3px 0' }}>{leg.flightNo} · {leg.dur} · {leg.stopText}</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>Прибытие {leg.arr}, {leg.date}</div>
      </div>
    </div>
  );
}

/* ====================================================================
   FLIGHT SERVICE CARD — helpers (ТЗ пп. 2–6)
   ==================================================================== */
/* статус услуги → удобные булевы флаги для ветвления интерфейса */
function flightStatusFlags(status, svc, offer) {
  const issued = status === 'Выписано' || status === 'Возврат' || status === 'Обмен';
  const booked = status === 'Забронировано';
  const offered = status === 'Предложение' || status === 'Согласование' || status === 'Поиск';
  const free = !svc && !!offer; // свободный поиск: карточка открыта из выдачи, не привязана к заказу
  return { issued, booked, offered, free };
}

/* Пассажиры с индивидуальным набором данных (ТЗ #5): свой № билета, PNR и документы у каждого. */
function flightPassengers(svc, offer, status) {
  const { issued } = flightStatusFlags(status, svc, offer);
  const air = svc ? svc.airline : (offer ? offer.airline : 'KC');
  const pnr = (svc && svc.pnr && svc.pnr !== '—') ? svc.pnr : 'A7H5KD';
  const base = [
    { name: 'Аттокуров Эрбол',    type: 'Взрослый', doc: 'ID AC1234567',       dob: '14.03.1990', tkt: '2410567890' },
    { name: 'Аттокурова Айгерим', type: 'Взрослый', doc: 'ID AC7654321',       dob: '02.08.1992', tkt: '2410567891' },
    { name: 'Аттокуров Тимур',    type: 'Ребёнок',  doc: 'Св-во IV-АБ 553012', dob: '11.09.2016', tkt: '2410567892' },
    { name: 'Аттокурова Амина',   type: 'Ребёнок',  doc: 'Св-во IV-АБ 553013', dob: '04.02.2019', tkt: '2410567893' },
    { name: 'Джумабеков Нурлан',  type: 'Взрослый', doc: 'ID AC2233445',       dob: '20.07.1985', tkt: '2410567894' },
    { name: 'Осмонова Гульнара',  type: 'Взрослый', doc: 'ID AC5566778',       dob: '30.11.1988', tkt: '2410567895' },
  ];
  const n = Math.max(1, svc ? svc.pax : 1);
  return base.slice(0, Math.min(n, base.length)).map((p) => ({
    ...p, airline: air, pnr,
    ticket: issued ? ('465-' + p.tkt) : '—',
    docs: issued
      ? ['Маршрут-квитанция', 'Электронный билет', 'Посадочный талон']
      : ['Подтверждение брони (PNR)'],
  }));
}

/* Панель «Возврат» (ТЗ #4): тип (добровольный/вынужденный), объём (полный/частичный),
   расчёт суммы возврата и подтверждение. */
function RefundPanel({ passengers, base, currency, onClose, onDone }) {
  const toast = useToast();
  const [voluntary, setVoluntary] = useState(true);
  const [scope, setScope] = useState('full');            // full | partial
  const [sel, setSel] = useState(passengers.map((_, i) => i));
  const [calc, setCalc] = useState(null);
  const perTicket = base / Math.max(1, passengers.length);
  const chosen = scope === 'full' ? passengers.map((_, i) => i) : sel;
  const toggle = (i) => setSel((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const doCalc = () => {
    const cnt = chosen.length;
    if (!cnt) { toast('Выберите хотя бы одного пассажира', 'err'); return; }
    const gross = Math.round(perTicket * cnt);
    const penalty = voluntary ? Math.round(gross * 0.15) : 0; // вынужденный возврат — без штрафа
    const fee = voluntary ? 15 : 0;                           // сервисный сбор агентства
    setCalc({ cnt, gross, penalty, fee, refund: Math.max(0, gross - penalty - fee) });
  };
  useEffect(() => { setCalc(null); }, [voluntary, scope, sel]);
  const cur = ' ' + (currency === 'USD' ? '$' : currency);
  return (
    <StackPanel title="Оформление возврата" width="min(680px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={doCalc}>Рассчитать сумму возврата</Button>
        <Button icon="check" style={{ flex: 1 }} disabled={!calc}
          onClick={() => { if (!calc) return; onDone && onDone(); toast('Возврат подтверждён и отправлен поставщику', 'ok'); onClose(); }}>
          Подтвердить возврат
        </Button>
      </>}>
      <PanelSub style={{ marginTop: 0 }}>Тип возврата</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (voluntary ? ' active' : '')} onClick={() => setVoluntary(true)}>Добровольный</button>
        <button className={'seg-btn' + (!voluntary ? ' active' : '')} onClick={() => setVoluntary(false)}>Вынужденный</button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
        {voluntary ? 'Удерживается штраф авиакомпании и сервисный сбор.' : 'Вынужденный возврат — по правилам без штрафа (болезнь, отмена рейса и т.п.).'}
      </div>

      <PanelSub>Объём</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (scope === 'full' ? ' active' : '')} onClick={() => setScope('full')}>Полный возврат</button>
        <button className={'seg-btn' + (scope === 'partial' ? ' active' : '')} onClick={() => setScope('partial')}>Частичный возврат</button>
      </div>
      {scope === 'partial' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {passengers.map((p, i) => (
            <label key={i} className="hp-check-row" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
              <Checkbox on={sel.includes(i)} onChange={() => toggle(i)} />
              <span className="hp-check-label" style={{ flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{p.ticket}</span>
            </label>
          ))}
        </div>
      )}

      {calc && (
        <div className="card card-pad" style={{ marginTop: 18 }}>
          <div className="kv">
            <div className="kv-row"><span className="k">Билетов к возврату</span><span className="v">{calc.cnt}</span></div>
            <div className="kv-row"><span className="k">Стоимость билетов</span><span className="v">{calc.gross.toLocaleString('ru-RU')}{cur}</span></div>
            <div className="kv-row"><span className="k">Штраф авиакомпании</span><span className="v" style={{ color: calc.penalty ? 'var(--red)' : 'var(--muted)' }}>− {calc.penalty.toLocaleString('ru-RU')}{cur}</span></div>
            <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v" style={{ color: calc.fee ? 'var(--red)' : 'var(--muted)' }}>− {calc.fee.toLocaleString('ru-RU')}{cur}</span></div>
            <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>К возврату клиенту</span><span className="v" style={{ fontSize: 18, color: 'var(--green)' }}>{calc.refund.toLocaleString('ru-RU')}{cur}</span></div>
          </div>
        </div>
      )}
    </StackPanel>
  );
}

/* Панель «Обмен» (ТЗ #4): тип (добровольный/вынужденный), сценарий (доплата/возврат разницы),
   расчёт стоимости обмена и подтверждение. */
function ExchangePanel({ passengers, base, currency, onClose, onDone }) {
  const toast = useToast();
  const [voluntary, setVoluntary] = useState(true);
  const [mode, setMode] = useState('surcharge');   // surcharge | refundDiff
  const [newFare, setNewFare] = useState('');
  const [calc, setCalc] = useState(null);
  const cur = ' ' + (currency === 'USD' ? '$' : currency);
  const doCalc = () => {
    const nf = parseFloat(newFare);
    if (isNaN(nf)) { toast('Укажите стоимость нового тарифа', 'err'); return; }
    const diff = Math.round(nf - base);
    const penalty = voluntary ? 25 : 0;             // сбор за обмен
    if (mode === 'surcharge') {
      setCalc({ diff, penalty, payable: Math.max(0, diff) + penalty, refundable: 0 });
    } else {
      setCalc({ diff, penalty, payable: penalty, refundable: Math.max(0, -diff) });
    }
  };
  useEffect(() => { setCalc(null); }, [voluntary, mode, newFare]);
  return (
    <StackPanel title="Обмен билета" width="min(680px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={doCalc}>Рассчитать стоимость обмена</Button>
        <Button icon="check" style={{ flex: 1 }} disabled={!calc}
          onClick={() => { if (!calc) return; onDone && onDone(); toast('Обмен подтверждён и отправлен поставщику', 'ok'); onClose(); }}>
          Подтвердить обмен
        </Button>
      </>}>
      <PanelSub style={{ marginTop: 0 }}>Тип обмена</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (voluntary ? ' active' : '')} onClick={() => setVoluntary(true)}>Добровольный</button>
        <button className={'seg-btn' + (!voluntary ? ' active' : '')} onClick={() => setVoluntary(false)}>Вынужденный</button>
      </div>

      <PanelSub>Сценарий</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (mode === 'surcharge' ? ' active' : '')} onClick={() => setMode('surcharge')}>Обмен с доплатой</button>
        <button className={'seg-btn' + (mode === 'refundDiff' ? ' active' : '')} onClick={() => setMode('refundDiff')}>Обмен с возвратом разницы</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <Field label="Стоимость нового тарифа" hint={'Текущий тариф: ' + base.toLocaleString('ru-RU') + cur}>
          <Input type="number" value={newFare} onChange={(e) => setNewFare(e.target.value)} placeholder="0" />
        </Field>
      </div>

      {calc && (
        <div className="card card-pad" style={{ marginTop: 8 }}>
          <div className="kv">
            <div className="kv-row"><span className="k">Разница тарифа</span><span className="v" style={{ color: calc.diff >= 0 ? 'var(--red)' : 'var(--green)' }}>{calc.diff >= 0 ? '+ ' : '− '}{Math.abs(calc.diff).toLocaleString('ru-RU')}{cur}</span></div>
            <div className="kv-row"><span className="k">Сбор за обмен</span><span className="v">{calc.penalty ? '+ ' + calc.penalty.toLocaleString('ru-RU') + cur : '—'}</span></div>
            <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>К доплате клиентом</span><span className="v" style={{ fontSize: 18 }}>{calc.payable.toLocaleString('ru-RU')}{cur}</span></div>
            {calc.refundable > 0 && <div className="kv-row"><span className="k">К возврату клиенту</span><span className="v" style={{ color: 'var(--green)' }}>{calc.refundable.toLocaleString('ru-RU')}{cur}</span></div>}
          </div>
        </div>
      )}
    </StackPanel>
  );
}

/* ====================================================================
   МОДУЛЬ «КОРРЕКТИРОВКА ДОКУМЕНТОВ» (ТЗ #6, расширенная постановка клиента)
   Формирует клиентскую версию документа на фирменном бланке агентства на основе
   документа поставщика. Оригинал поставщика не меняется. Поддерживает индивидуальную
   и групповую корректировку, выбор шаблона, живой предпросмотр, проверку перед
   сохранением, версионирование и действия после сохранения.
   ==================================================================== */
const DOC_TEMPLATES = [
  { id: 'agency', name: 'Фирменный бланк агентства', logo: true },
  { id: 'client', name: 'Фирменный бланк клиента', logo: true },
  { id: 'nologo', name: 'Без логотипа', logo: false },
  { id: 'custom', name: 'Пользовательский шаблон', logo: true },
];
const AGENCY_ENTITIES = ['ОсОО «ПСЦ Travel Hub»', 'ОсОО «Гранд Лимитед»', 'ИП Акимова А.Т.'];
// Поля, доступные для изменения в клиентской версии (отображение документа)
const CORR_FIELDS = [
  { key: 'baseFare',    label: 'Базовый тариф' },
  { key: 'taxes',       label: 'Таксы' },
  { key: 'agentMarkup', label: 'Агентская надбавка' },
  { key: 'serviceFee',  label: 'Сервисный сбор' },
  { key: 'discount',    label: 'Скидка' },
];
const corrCur = (c) => (c === 'USD' ? '$' : c);
const corrComputed = (d) => d.baseFare + d.taxes + d.agentMarkup + d.serviceFee - d.discount;
const corrTotal = (d) => (d.totalOverride != null ? d.totalOverride : corrComputed(d));
function corrChanges(d) {
  const chg = [];
  CORR_FIELDS.forEach((f) => { if (d[f.key] !== d.src[f.key]) chg.push(f.label); });
  if (corrTotal(d) !== d.src.total) chg.push('Итоговая стоимость');
  if ((d.comment || '').trim()) chg.push('Комментарий');
  return chg;
}

/* Живой предпросмотр итогового документа (как PDF-лист) — обновляется мгновенно, без сохранения. */
function CorrectionPreview({ doc, template, entity, currency }) {
  const tpl = DOC_TEMPLATES.find((t) => t.id === template) || DOC_TEMPLATES[0];
  const cur = corrCur(currency);
  const rows = [
    ['Базовый тариф', doc.baseFare], ['Таксы и сборы', doc.taxes],
    ['Агентская надбавка', doc.agentMarkup], ['Сервисный сбор', doc.serviceFee],
  ];
  if (doc.discount) rows.push(['Скидка', -doc.discount]);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '22px 24px', fontSize: 13 }}>
      {/* шапка бланка */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '2px solid var(--ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tpl.logo && <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>P</span>}
          <div>
            <div style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 14 }}>{tpl.id === 'client' ? 'Клиентский бланк' : (tpl.logo ? entity : 'Документ без логотипа')}</div>
            <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>Маршрут-квитанция электронного билета</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 11.5 }}>Клиентская версия<br />{new Date().toLocaleDateString('ru-RU')}</div>
      </div>
      {/* неизменяемые данные поставщика */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px', margin: '14px 0' }}>
        {[['Пассажир', doc.name], ['Номер билета', doc.ticket], ['PNR', doc.pnr], ['Маршрут', doc.route], ['Авиакомпания', doc.airlineName], ['Дата вылета', doc.dates]].map(([k, v]) => (
          <div key={k}><span style={{ color: 'var(--muted)' }}>{k}: </span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{v}</span></div>
        ))}
      </div>
      {/* финансовая таблица (клиентская версия) */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: v < 0 ? 'var(--green)' : 'var(--ink)' }}>{v < 0 ? '− ' : ''}{Math.abs(v).toLocaleString('ru-RU')} {cur}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '2px solid var(--ink)', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>
          <span>Итого к оплате</span><span>{corrTotal(doc).toLocaleString('ru-RU')} {cur}</span>
        </div>
      </div>
      {doc.comment && doc.comment.trim() && <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, color: 'var(--body)' }}>{doc.comment}</div>}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}>{tpl.logo ? entity : ''} · Документ сформирован в PSC Travel Hub</div>
    </div>
  );
}

/* История версий документа. */
function CorrectionHistoryDrawer({ open, versions, onClose }) {
  const toast = useToast();
  return (
    <Drawer open={open} onClose={onClose} title="История корректировок"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div className="timeline">
        {versions.map((v, i) => (
          <div className="tl-item" key={i}>
            <span className="tl-dot" /><span className="tl-line" />
            <div style={{ paddingBottom: 6 }}>
              <div className="tl-time">{v.date} · {v.user}</div>
              <div className="tl-text" style={{ fontWeight: 600 }}>{v.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '2px 0' }}>{v.fields.join(', ')}</div>
              {v.comment && <div style={{ fontSize: 12.5, color: 'var(--body)' }}>«{v.comment}»</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toast('Версия ' + v.title + ' открыта')}>Открыть</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toast('Скачивание версии ' + v.title)}>Скачать</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function DocCorrectionPanel({ passengers, offer, svc, currency, orderNo, onClose }) {
  const toast = useToast();
  const air = svc ? svc.airline : (offer ? offer.airline : 'KC');
  const airlineName = (AIRLINES[air] || { name: air }).name;
  const supplier = svc ? svc.supplier : (offer ? offer.supplier : '—');
  const route = svc ? svc.route : (offer ? (offer.out.from + ' → ' + offer.out.to + (offer.back ? ' → ' + offer.back.to : '')) : '—');
  const dates = svc ? svc.dep : (offer ? offer.out.date : '—');
  const baseFareTotal = offer ? offer.fare : (svc ? svc.sum : 0);
  const farePerPax = Math.round(baseFareTotal / Math.max(1, passengers.length));

  // Источник данных (данные поставщика) заполняется автоматически, оригинал неизменяем.
  const buildDoc = (p) => {
    const src = { baseFare: farePerPax, taxes: 45, agentMarkup: 0, serviceFee: 0, discount: 0, total: farePerPax + 45 };
    return { id: p.ticket + p.name, name: p.name, ticket: p.ticket, pnr: p.pnr, supplier, route, airlineName, dates,
      src, baseFare: src.baseFare, taxes: src.taxes, agentMarkup: 20, serviceFee: 15, discount: 0, totalOverride: null, comment: '' };
  };
  const [docs, setDocs] = useState(() => passengers.map(buildDoc));
  const [mode, setMode] = useState(passengers.length > 1 ? 'group' : 'single'); // индивидуальная | групповая
  const [sel, setSel] = useState(() => passengers.map((_, i) => i));   // выбранные для групповой
  const [active, setActive] = useState(0);                              // активная строка для предпросмотра
  const [template, setTemplate] = useState('agency');
  const [entity, setEntity] = useState(AGENCY_ENTITIES[0]);
  const [view, setView] = useState('edit');                            // edit | confirm | done
  const [historyOpen, setHistoryOpen] = useState(false);
  const [massField, setMassField] = useState('agentMarkup');
  const [massVal, setMassVal] = useState('');
  const [versions, setVersions] = useState([
    { date: '20.06.2026 14:10', user: 'Акимова Айсулуу', title: 'v1 · Оригинал поставщика', fields: ['Импортирован бланк поставщика (' + supplier + ')'], comment: '' },
  ]);

  const cur = corrCur(currency);
  const setField = (i, key, v) => setDocs((ds) => ds.map((d, j) => (j === i ? { ...d, [key]: (parseFloat(v) || 0) } : d)));
  const setTotal = (i, v) => setDocs((ds) => ds.map((d, j) => (j === i ? { ...d, totalOverride: v === '' ? null : (parseFloat(v) || 0) } : d)));
  const setComment = (i, v) => setDocs((ds) => ds.map((d, j) => (j === i ? { ...d, comment: v } : d)));
  const toggleSel = (i) => setSel((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const allSel = sel.length === docs.length;

  // Массовые действия — применяют значение сразу ко всем выбранным документам
  const applyMass = () => {
    if (!sel.length) { toast('Не выбрано ни одного документа', 'err'); return; }
    if (massField === 'sameAsActive') {
      const a = docs[active];
      setDocs((ds) => ds.map((d, j) => sel.includes(j) ? { ...d, baseFare: a.baseFare, taxes: a.taxes, agentMarkup: a.agentMarkup, serviceFee: a.serviceFee, discount: a.discount, totalOverride: a.totalOverride } : d));
      toast('Значения активной строки применены к выбранным', 'ok'); return;
    }
    const v = parseFloat(massVal); if (isNaN(v)) { toast('Укажите значение', 'err'); return; }
    setDocs((ds) => ds.map((d, j) => sel.includes(j) ? (massField === 'total' ? { ...d, totalOverride: v } : { ...d, [massField]: v }) : d));
    toast('Изменения применены к ' + sel.length + ' документам', 'ok');
  };

  // Итог проверки перед сохранением
  const changedDocs = docs.filter((d) => corrChanges(d).length);
  const tplChanged = template !== 'agency';
  const changeSummary = [...new Set(changedDocs.flatMap((d) => corrChanges(d)))];

  const doSave = () => {
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fields = [...changeSummary]; if (tplChanged) fields.push('Шаблон: ' + (DOC_TEMPLATES.find((t) => t.id === template) || {}).name);
    setVersions((vs) => [{ date: now, user: 'Акимова Айсулуу', title: 'v' + (vs.length + 1) + ' · Клиентская версия', fields: fields.length ? fields : ['Без изменений'], comment: (docs[active].comment || '').trim() }, ...vs]);
    setView('done');
    toast('Клиентская версия документа сохранена', 'ok');
  };

  const activeDoc = docs[active] || docs[0];

  // ---- Экран результата после сохранения ----
  if (view === 'done') {
    const actions = [
      ['Предпросмотр', 'eye', () => toast('Предпросмотр документа')],
      ['Скачать PDF', 'download', () => toast('Скачивание PDF')],
      ['Скачать все документы', 'download', () => toast('Скачивание всех документов')],
      ['Отправить пассажиру', 'send', () => toast('Отправлено пассажиру', 'ok')],
      ['Отправить заказчику', 'send', () => toast('Отправлено заказчику', 'ok')],
      ['Распечатать', 'clipboard', () => toast('Отправлено на печать')],
      ['Создать новую корректировку', 'edit', () => { setView('edit'); }],
      ['Открыть историю корректировок', 'clock', () => setHistoryOpen(true)],
    ];
    return (
      <StackPanel title="Корректировка сохранена" width="min(680px,96vw)" onClose={onClose}
        footer={<Button style={{ width: '100%' }} icon="check" onClick={onClose}>Готово</Button>}>
        <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, borderLeft: '4px solid var(--green)', marginBottom: 18 }}>
          <span className="oc-svc-ic" style={{ background: 'var(--green)' }}><Icon name="checkCircle" /></span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Создана новая клиентская версия документа</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Оригинал поставщика сохранён без изменений. Обе версии хранятся в заказе {orderNo ? '№ ' + orderNo : ''}.</div>
          </div>
        </div>
        <PanelSub style={{ marginTop: 0 }}>Доступные действия</PanelSub>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {actions.map(([label, icon, on]) => (
            <button key={label} className="doc-chip" style={{ width: '100%' }} onClick={on}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} style={{ width: 15, height: 15 }} />{label}</span>
              <Icon name="chevRight" style={{ width: 15, height: 15 }} />
            </button>
          ))}
        </div>
        <CorrectionHistoryDrawer open={historyOpen} versions={versions} onClose={() => setHistoryOpen(false)} />
      </StackPanel>
    );
  }

  // ---- Экран проверки перед сохранением ----
  if (view === 'confirm') {
    return (
      <StackPanel title="Проверка перед сохранением" width="min(680px,96vw)" onClose={onClose}
        footer={<>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setView('edit')}>Назад</Button>
          <Button icon="check" style={{ flex: 1 }} onClick={doSave}>Сохранить версию</Button>
        </>}>
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Будет создана клиентская версия</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
            <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Изменённых документов</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{changedDocs.length} / {docs.length}</div></div>
            <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Шаблон</div><div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{(DOC_TEMPLATES.find((t) => t.id === template) || {}).name}</div></div>
          </div>
        </div>
        <PanelSub style={{ marginTop: 0 }}>Что было изменено</PanelSub>
        {changeSummary.length || tplChanged ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {changeSummary.map((c) => <Pill key={c} tone="blue">{c}</Pill>)}
            {tplChanged && <Pill tone="teal">Выбран новый шаблон</Pill>}
          </div>
        ) : <div style={{ color: 'var(--muted)' }}>Изменений в отображаемых данных нет.</div>}
        <PanelSub>Документы</PanelSub>
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Пассажир</th><th>Билет</th><th>Изменения</th><th style={{ textAlign: 'right' }}>Итог</th></tr></thead>
            <tbody>
              {changedDocs.map((d) => (
                <tr key={d.id}><td style={{ fontWeight: 600 }}>{d.name}</td><td style={{ fontSize: 13 }}>{d.ticket}</td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{corrChanges(d).join(', ')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{corrTotal(d).toLocaleString('ru-RU')} {cur}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </StackPanel>
    );
  }

  // ---- Основной экран корректировки ----
  const singleFieldEditor = (i) => (
    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {CORR_FIELDS.map((f) => (
        <Field key={f.key} label={f.label}>
          <Input type="number" value={docs[i][f.key]} onChange={(e) => setField(i, f.key, e.target.value)} />
        </Field>
      ))}
      <Field label={'Итоговая стоимость (' + cur + ')'} hint={docs[i].totalOverride != null ? 'Задано вручную' : 'Авто: ' + corrComputed(docs[i]).toLocaleString('ru-RU')}>
        <Input type="number" value={docs[i].totalOverride != null ? docs[i].totalOverride : corrComputed(docs[i])} onChange={(e) => setTotal(i, e.target.value)} />
      </Field>
    </div>
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Отмена</Button>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" icon="clock" onClick={() => setHistoryOpen(true)}>История</Button>
      <Button variant="secondary" icon="download" onClick={() => toast('Скачивание PDF предпросмотра')}>Скачать PDF</Button>
      <Button icon="check" onClick={() => setView('confirm')}>Сохранить</Button>
    </>
  );

  return (
    <StackPanel title="Корректировка документов" width={mode === 'group' ? 'min(1200px,97vw)' : 'min(1040px,96vw)'} onClose={onClose} footer={footer}>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 12 }}>
        Формирование клиентской версии документа на фирменном бланке. Данные поставщика неизменяемы —
        корректируется только отображение (тариф, таксы, надбавка, сбор, скидка, итог, комментарий, реквизиты).
      </div>

      <PanelSub style={{ marginTop: 0 }}>Вид корректировки</PanelSub>
      <div className="seg-toggle" style={{ maxWidth: 360 }}>
        <button className={'seg-btn' + (mode === 'single' ? ' active' : '')} onClick={() => setMode('single')}>Индивидуальная</button>
        <button className={'seg-btn' + (mode === 'group' ? ' active' : '')} onClick={() => setMode('group')}>Групповая</button>
      </div>

      {/* 1. Исходный документ (данные поставщика) */}
      <PanelSub>Исходный документ · данные поставщика</PanelSub>
      <div className="card card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
        {[['Поставщик', supplier], ['PNR', activeDoc.pnr], ['Номер билета', activeDoc.ticket], ['Маршрут', route], ['Пассажир', activeDoc.name], ['Авиакомпания', airlineName], ['Базовый тариф', farePerPax.toLocaleString('ru-RU') + ' ' + cur], ['Таксы', activeDoc.src.taxes.toLocaleString('ru-RU') + ' ' + cur], ['Валюта', currency]].map(([k, v]) => (
          <div key={k}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{v}</div></div>
        ))}
      </div>

      {/* 3. Выбор фирменного шаблона + реквизиты */}
      <PanelSub>Шаблон и реквизиты</PanelSub>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Фирменный шаблон">
          <Select options={DOC_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} value={template} onChange={(e) => setTemplate(e.target.value)} />
        </Field>
        <Field label="Реквизиты агентства (юр. лицо)">
          <Select options={AGENCY_ENTITIES} value={entity} onChange={(e) => setEntity(e.target.value)} />
        </Field>
      </div>

      {/* 2. Настройки корректировки */}
      {mode === 'single' ? (
        <>
          {docs.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <Field label="Документ пассажира">
                <Select options={docs.map((d, i) => ({ value: String(i), label: d.name + ' · ' + d.ticket }))} value={String(active)} onChange={(e) => setActive(+e.target.value)} />
              </Field>
            </div>
          )}
          <PanelSub>Настройки корректировки</PanelSub>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div>
              {singleFieldEditor(active)}
              <Field label="Комментарий" style={{ marginTop: 6 }}>
                <textarea className="input" style={{ minHeight: 70, resize: 'vertical', padding: '10px 12px' }} value={activeDoc.comment} onChange={(e) => setComment(active, e.target.value)} placeholder="Комментарий к документу…" />
              </Field>
            </div>
            {/* 4. Предпросмотр */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Предпросмотр (обновляется мгновенно)</div>
              <CorrectionPreview doc={activeDoc} template={template} entity={entity} currency={currency} />
            </div>
          </div>
        </>
      ) : (
        <>
          <PanelSub>Массовые действия</PanelSub>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--surface-2)', padding: 12, borderRadius: 12 }}>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Действие</div>
              <Select value={massField} onChange={(e) => setMassField(e.target.value)}
                options={[...CORR_FIELDS.map((f) => ({ value: f.key, label: 'Изменить: ' + f.label })), { value: 'total', label: 'Изменить итоговую сумму' }, { value: 'sameAsActive', label: 'Применить одинаковые значения' }]} />
            </div>
            {massField !== 'sameAsActive' && (
              <div style={{ width: 150 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Значение ({cur})</div>
                <Input type="number" value={massVal} onChange={(e) => setMassVal(e.target.value)} placeholder="0" />
              </div>
            )}
            <Button icon="check" onClick={applyMass}>Применить к выбранным ({sel.length})</Button>
          </div>

          {/* Таблица массовой корректировки */}
          <div className="table-card" style={{ marginTop: 14, overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 34 }}><Checkbox on={allSel} onChange={() => setSel(allSel ? [] : docs.map((_, i) => i))} /></th>
                <th>Пассажир</th><th>Номер билета</th><th>Поставщик</th>
                <th style={{ width: 110 }}>Базовый тариф</th><th style={{ width: 90 }}>Таксы</th>
                <th style={{ width: 110 }}>Агент. надбавка</th><th style={{ width: 100 }}>Серв. сбор</th>
                <th style={{ textAlign: 'right' }}>Итог</th><th style={{ width: 34 }}></th>
              </tr></thead>
              <tbody>
                {docs.map((d, i) => (
                  <tr key={d.id} style={{ background: active === i ? 'var(--blue-soft)' : undefined }}>
                    <td><Checkbox on={sel.includes(i)} onChange={() => toggleSel(i)} /></td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ fontSize: 13 }}>{d.ticket}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{d.supplier}</td>
                    <td><Input type="number" value={d.baseFare} onChange={(e) => setField(i, 'baseFare', e.target.value)} style={{ height: 32, padding: '4px 6px' }} /></td>
                    <td><Input type="number" value={d.taxes} onChange={(e) => setField(i, 'taxes', e.target.value)} style={{ height: 32, padding: '4px 6px' }} /></td>
                    <td><Input type="number" value={d.agentMarkup} onChange={(e) => setField(i, 'agentMarkup', e.target.value)} style={{ height: 32, padding: '4px 6px' }} /></td>
                    <td><Input type="number" value={d.serviceFee} onChange={(e) => setField(i, 'serviceFee', e.target.value)} style={{ height: 32, padding: '4px 6px' }} /></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{corrTotal(d).toLocaleString('ru-RU')} {cur}</td>
                    <td><button className="btn btn-ghost btn-icon btn-sm" title="Предпросмотр" onClick={() => setActive(i)}><Icon name="eye" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Предпросмотр активной строки */}
          <PanelSub>Предпросмотр · {activeDoc.name}</PanelSub>
          <div style={{ maxWidth: 560 }}><CorrectionPreview doc={activeDoc} template={template} entity={entity} currency={currency} /></div>
        </>
      )}

      <CorrectionHistoryDrawer open={historyOpen} versions={versions} onClose={() => setHistoryOpen(false)} />
    </StackPanel>
  );
}

/* Панель «Отправить пассажиру» (ТЗ #4) — выбор канала и документов для отправки. */
function SendToPaxDrawer({ open, passengers, onClose }) {
  const toast = useToast();
  const [channel, setChannel] = useState('email');
  const CHANNELS = [['email', 'E-mail', 'mail'], ['whatsapp', 'WhatsApp', 'chat'], ['telegram', 'Telegram', 'send']];
  return (
    <Drawer open={open} onClose={onClose} title="Отправить пассажиру"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="send" onClick={() => { toast('Документы отправлены пассажиру', 'ok'); onClose(); }}>Отправить</Button></>}>
      <PanelSub style={{ marginTop: 0 }}>Канал отправки</PanelSub>
      <div style={{ display: 'flex', gap: 8 }}>
        {CHANNELS.map(([k, label, icon]) => (
          <button key={k} type="button" className={'seg-btn' + (channel === k ? ' active' : '')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px' }} onClick={() => setChannel(k)}>
            <Icon name={icon} style={{ width: 15, height: 15 }} />{label}
          </button>
        ))}
      </div>
      <PanelSub>Получатели</PanelSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {passengers.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
            <Avatar name={p.name} size={30} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{p.ticket !== '—' ? 'Билет ' + p.ticket : 'Бронь ' + p.pnr}</div></div>
            <Pill tone="blue">{p.docs.length} док.</Pill>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function FlightCard({ svc, offer, onBack, onFormKp, onAttachOrder, onAttachPerson }) {
  const toast = useToast();
  const [tab, setTab] = useState('segments');
  // доп. услуги авиакомпании доступны и в карточке услуги — до и после выписки (боковое окно)
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [extras, setExtras] = useState({ seats: {}, baggage: {}, meal: {}, insurance: {}, special: {}, comfort: {} });
  const [refundOpen, setRefundOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [brandedOpen, setBrandedOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const air = svc ? svc.airline : (offer ? offer.airline : 'TK');
  const out = offer ? offer.out : { from: 'FRU', to: 'IST', dep: '04:15', arr: '08:40', date: '24 июн', dur: '6ч 25м', stopText: 'Прямой', flightNo: air + ' 131' };
  const back = offer ? offer.back : null;
  const [status, setStatus] = useState(svc ? svc.status : 'Предложение');
  const no = svc ? svc.no : 'AV-' + Math.floor(10000 + Math.random() * 90000);
  const fare = offer ? offer.fare : (svc ? svc.sum : 0);
  const fee = offer ? offer.fee : 0;
  const currency = (svc && svc.currency) || (offer && offer.currency) || 'USD';

  const { issued, booked, offered, free } = flightStatusFlags(status, svc, offer);
  const passengers = flightPassengers(svc, offer, status);
  const pnr = passengers[0] ? passengers[0].pnr : (svc ? svc.pnr : '—');
  const supplier = svc ? svc.supplier : (offer ? offer.supplier : '—');
  // тайминг выписки для забронированной услуги (ТЗ #2)
  const ticketingDeadline = 'сегодня 18:00';

  const TABS = [
    { key: 'pax', label: 'Пассажиры / билеты', count: svc ? svc.pax : (offer ? 1 : 1) },
    { key: 'segments', label: 'Сегменты' },
    { key: 'supplier', label: 'Поставщик / PNR' },
    { key: 'finance', label: 'Финансы' },
    { key: 'docs', label: 'Документы' },
    { key: 'comments', label: 'Комментарии' },
    { key: 'history', label: 'История' },
  ];

  const extrasPax = passengers.map((p) => ({ name: p.name, role: p.type }));

  // Пункты выпадающего меню, зависящие от статуса услуги (ТЗ #4)
  const bookedMenu = [
    { icon: 'luggage', label: 'Снять места', onClick: () => toast('Места сняты') },
    { icon: 'loader', label: 'Обновить статус бронирования', onClick: () => toast('Статус брони обновлён') },
    { icon: 'api', label: 'Запросить статус у поставщика', onClick: () => toast('Запрос статуса отправлен') },
    { icon: 'edit', label: 'Изменить бронирование', onClick: () => toast('Изменение бронирования') },
    { icon: 'swap', label: 'Сменить поставщика', onClick: () => toast('Смена поставщика') },
    { icon: 'user', label: 'Изменить пассажира (до выписки)', onClick: () => toast('Изменение пассажира') },
    { icon: 'template', label: 'Добавить в коммерческое предложение', onClick: () => toast('Добавлено в КП') },
    { icon: 'clock', label: 'История изменений', onClick: () => setTab('history') },
    { sep: true },
    { icon: 'trash', label: 'Аннулировать бронирование', danger: true, onClick: () => { setStatus('Аннуляция'); toast('Бронь аннулирована', 'err'); } },
  ];
  const issuedMenu = [
    { icon: 'refund', label: 'Добровольный возврат', onClick: () => setRefundOpen(true) },
    { icon: 'refund', label: 'Вынужденный возврат', onClick: () => setRefundOpen(true) },
    { icon: 'refund', label: 'Частичный возврат', onClick: () => setRefundOpen(true) },
    { icon: 'refund', label: 'Полный возврат', onClick: () => setRefundOpen(true) },
    { sep: true },
    { icon: 'swap', label: 'Добровольный обмен', onClick: () => setExchangeOpen(true) },
    { icon: 'swap', label: 'Вынужденный обмен', onClick: () => setExchangeOpen(true) },
    { sep: true },
    { icon: 'template', label: 'Корректировка документов', onClick: () => setBrandedOpen(true) },
    { icon: 'loader', label: 'Обновить статус билета', onClick: () => toast('Статус билета обновлён') },
    { icon: 'api', label: 'Запросить статус у поставщика', onClick: () => toast('Запрос статуса отправлен') },
    { sep: true },
    { icon: 'trash', label: 'Аннулировать', danger: true, onClick: () => { setStatus('Аннуляция'); toast('Билет аннулирован', 'err'); } },
  ];
  const offerMenu = [
    { icon: 'template', label: 'В коммерческое предложение', onClick: () => (onFormKp ? onFormKp() : toast('Добавлено в КП')) },
    { icon: 'download', label: 'Скачать маршрут-квитанцию', onClick: () => toast('Загрузка…') },
    { sep: true },
    { icon: 'trash', label: 'Аннулировать', danger: true, onClick: () => toast('Предложение снято', 'err') },
  ];
  return (
    <>
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>Назад</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Авиабилеты / {no}</span>
      </div>

      {/* header card */}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <AirlineLogo code={air} />
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="card-title" style={{ whiteSpace: 'nowrap' }}>{out.from} → {out.to}{back ? ' → ' + back.to : ''}</h2>
              <Pill tone={AIR_STATUS[status] || 'gray'}>{status}</Pill>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{AIRLINES[air].name} · {out.flightNo} · вылет {out.date}</div>
          </div>
          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Итого к оплате</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{(fare + fee).toLocaleString('ru-RU')} $</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Свободное бронирование (ТЗ #1): сформировать КП / привязать к заказу / к физлицу */}
            {free && (<>
              <Button icon="template" onClick={() => (onFormKp ? onFormKp() : toast('КП сформировано'))}>Сформировать КП</Button>
              <ActionMenu trigger={<button className="btn btn-secondary">Привязать <Icon name="chevDown" style={{ width: 14, height: 14 }} /></button>}
                items={[
                  { icon: 'briefcase', label: 'Привязать к заказу', onClick: () => (onAttachOrder ? onAttachOrder() : toast('Привязано к заказу', 'ok')) },
                  { icon: 'user', label: 'Привязать к физ. лицу', onClick: () => (onAttachPerson ? onAttachPerson() : toast('Привязано к физ. лицу', 'ok')) },
                ]} />
            </>)}
            {/* Предложение → бронирование */}
            {!free && offered && <Button icon="check" onClick={() => { setStatus('Забронировано'); toast('Забронировано, PNR создан', 'ok'); }}>Забронировать</Button>}
            {/* Забронировано (ТЗ #4): выписать / доп.услуги / отправить + меню */}
            {booked && (<>
              <Button icon="ticket" onClick={() => { setStatus('Выписано'); toast('Билет выписан', 'ok'); }}>Выписать билет</Button>
              <Button variant="secondary" icon="briefcase" onClick={() => setExtrasOpen(true)}>Доп. услуги</Button>
              <Button variant="secondary" icon="send" onClick={() => setSendOpen(true)}>Отправить пассажиру</Button>
              <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>} items={bookedMenu} />
            </>)}
            {/* Выписано (ТЗ #4): обмен / возврат / доп.услуги / отправить + меню */}
            {issued && (<>
              <Button icon="swap" onClick={() => setExchangeOpen(true)}>Обменять билет</Button>
              <Button variant="secondary" icon="refund" onClick={() => setRefundOpen(true)}>Возврат</Button>
              <Button variant="secondary" icon="briefcase" onClick={() => setExtrasOpen(true)}>Доп. услуги</Button>
              <Button variant="secondary" icon="send" onClick={() => setSendOpen(true)}>Отправить пассажиру</Button>
              <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>} items={issuedMenu} />
            </>)}
            {/* Предложение / прочие статусы — базовое меню */}
            {!free && offered && <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>} items={offerMenu} />}
          </div>
        </div>

        {/* Под маршрутом: PNR, № билета, поставщик + тайминг выписки (ТЗ #2, #3) */}
        {(booked || issued) && (
          <div className="fc-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 28px', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Рейс</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{AIRLINES[air].name} • {out.flightNo}</div></div>
            <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>PNR (код брони)</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontFamily: 'monospace', letterSpacing: '.03em' }}>{pnr}</div></div>
            {issued && <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Пассажир / билет</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{passengers[0].name.split(' ')[0]} · {passengers[0].ticket}</div></div>}
            <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Поставщик</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{supplier}</div></div>
            {booked && <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Тайминг выписки</div><TimeLimitBadge>{ticketingDeadline}</TimeLimitBadge></div>}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 18, overflowX: 'auto' }}>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'segments' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card card-pad">
            <div className="section-title" style={{ fontSize: 18, marginBottom: 8 }}>Маршрут</div>
            <SegmentRow leg={out} />
            {back && <SegmentRow leg={back} />}
          </div>
          <div className="card card-pad">
            <div className="section-title" style={{ fontSize: 18, marginBottom: 14 }}>Тариф</div>
            <div className="kv">
              <div className="kv-row"><span className="k">Тариф</span><span className="v">{offer ? offer.fareName : 'Economy'}</span></div>
              <div className="kv-row"><span className="k">Класс</span><span className="v">{offer ? offer.cabin : 'Эконом'}</span></div>
              <div className="kv-row"><span className="k">Багаж</span><span className="v">{offer ? offer.baggage : '23 кг'}</span></div>
              <div className="kv-row"><span className="k">Возврат</span><span className="v">{offer ? (offer.refundable ? 'Возвратный' : 'Невозвратный') : '—'}</span></div>
              <div className="kv-row"><span className="k">Тайм-лимит</span><span className="v"><TimeLimitBadge>сегодня 18:00</TimeLimitBadge></span></div>
            </div>
          </div>
        </div>
      )}

      {/* ТЗ #5 — у каждого пассажира свой набор: № билета, PNR, документы и действия с билетом */}
      {tab === 'pax' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {passengers.map((p, i) => {
            const paxActions = issued
              ? [
                  { icon: 'download', label: 'Маршрут-квитанция', onClick: () => toast('Маршрут-квитанция ' + p.name) },
                  { icon: 'ticket', label: 'Электронный билет', onClick: () => toast('Электронный билет ' + p.name) },
                  { sep: true },
                  { icon: 'refund', label: 'Возврат билета', onClick: () => setRefundOpen(true) },
                  { icon: 'swap', label: 'Обмен билета', onClick: () => setExchangeOpen(true) },
                ]
              : [
                  { icon: 'user', label: 'Изменить пассажира', onClick: () => toast('Изменение пассажира') },
                  { icon: 'download', label: 'Подтверждение брони', onClick: () => toast('Подтверждение брони ' + p.name) },
                ];
            return (
              <div key={i} className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <Avatar name={p.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{p.type} · {p.doc} · {p.dob}</div>
                  </div>
                  <Pill tone={p.ticket === '—' ? 'amber' : 'green'}>{p.ticket === '—' ? 'Ожидает выписки' : 'Билет выписан'}</Pill>
                  <ActionMenu trigger={<button className="btn btn-secondary btn-sm">Действия с билетом <Icon name="chevDown" style={{ width: 14, height: 14 }} /></button>} items={paxActions} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Номер билета</div><div style={{ fontWeight: 600, color: p.ticket === '—' ? 'var(--muted-2)' : 'var(--ink)' }}>{p.ticket === '—' ? 'не выписан' : p.ticket}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>PNR (код брони)</div><div style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--ink)' }}>{p.pnr}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Тип</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.type}</div></div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Документы</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {p.docs.map((d) => (
                      <button key={d} className="doc-chip" style={{ width: 'auto', flex: '0 0 auto' }} onClick={() => toast('Документ: ' + d)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" style={{ width: 15, height: 15 }} />{d}</span>
                        <Icon name="download" style={{ width: 15, height: 15 }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'supplier' && (
        <div className="grid-2">
          <div className="card card-pad"><div className="kv">
            <div className="kv-row"><span className="k">Поставщик</span><span className="v">{svc ? svc.supplier : (offer ? offer.supplier : '—')}</span></div>
            <div className="kv-row"><span className="k">Канал</span><span className="v">API / GDS</span></div>
            <div className="kv-row"><span className="k">PNR (локатор)</span><span className="v">{pnr}</span></div>
            <div className="kv-row"><span className="k">Номер билета</span><span className="v">{ticket}</span></div>
            <div className="kv-row"><span className="k">Дата брони</span><span className="v">14.06.2026</span></div>
          </div></div>
          <div className="card card-pad"><div className="kv">
            <div className="kv-row"><span className="k">Статус оплаты поставщику</span><span className="v"><Pill tone="amber">Ожидает</Pill></span></div>
            <div className="kv-row"><span className="k">Комиссия</span><span className="v">8% + 15 EUR</span></div>
            <div className="kv-row"><span className="k">Тайм-лимит выписки</span><span className="v"><TimeLimitBadge>сегодня 18:00</TimeLimitBadge></span></div>
          </div></div>
        </div>
      )}

      {tab === 'finance' && (
        <div className="card card-pad" style={{ maxWidth: 520 }}><div className="kv">
          <div className="kv-row"><span className="k">Тариф</span><span className="v">{fare.toLocaleString('ru-RU')} $</span></div>
          <div className="kv-row"><span className="k">Таксы и сборы</span><span className="v">включены</span></div>
          <div className="kv-row"><span className="k">Сервисный сбор агентства</span><span className="v">{fee.toLocaleString('ru-RU')} $</span></div>
          <div className="kv-row"><span className="k">Комиссия поставщика</span><span className="v" style={{ color: 'var(--green)' }}>+ 38 $</span></div>
          <div className="kv-row"><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итого клиенту</span><span className="v" style={{ fontSize: 18 }}>{(fare + fee).toLocaleString('ru-RU')} $</span></div>
          <div className="kv-row"><span className="k">Оплачено</span><span className="v">0 $</span></div>
          <div className="kv-row"><span className="k">Задолженность</span><span className="v" style={{ color: 'var(--red)' }}>{(fare + fee).toLocaleString('ru-RU')} $</span></div>
        </div></div>
      )}

      {tab === 'docs' && (
        <div className="grid-4">
          {['Маршрут-квитанция', 'Электронный билет', 'Счёт на оплату'].map((d) => (
            <button key={d} className="doc-chip"><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>
          ))}
          <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
        </div>
      )}

      {tab === 'comments' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
            <Avatar name="Даниель" size={36} />
            <div><div style={{ fontWeight: 600 }}>Даниель <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>· 14:32</span></div>
              <div style={{ marginTop: 3 }}>Клиент просит место у окна, передал поставщику.</div></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Input placeholder="Внутренний комментарий…" style={{ flex: 1 }} />
            <Button icon="send" onClick={() => toast('Комментарий добавлен')}>Отправить</Button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div className="timeline">
            {[['14:32', 'Создано предложение из поиска', 'Даниель'], ['14:40', 'Отправлено клиенту в составе КП №КП-1042', 'Даниель'], ['15:10', 'Клиент согласовал вариант', 'Система'], ['15:12', 'Отправлен запрос на бронь поставщику', 'Даниель']].map(([t, txt, who], i) => (
              <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
                <div><div className="tl-time">{t} · {who}</div><div className="tl-text">{txt}</div></div></div>
            ))}
          </div>
        </div>
      )}
    </div>
    {extrasOpen && (
      <StackPanel title="Дополнительные услуги" width="min(1040px,96vw)" onClose={() => setExtrasOpen(false)}
        footer={<>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setExtrasOpen(false)}>Отмена</Button>
          <Button icon="check" style={{ flex: 2 }} onClick={() => { setExtrasOpen(false); toast('Доп. услуги сохранены', 'ok'); }}>Применить</Button>
        </>}>
        <ExtrasTabs pax={extrasPax} state={extras} set={setExtras} embedded />
      </StackPanel>
    )}
    {refundOpen && <RefundPanel passengers={passengers} base={fare + fee} currency={currency} onClose={() => setRefundOpen(false)} onDone={() => setStatus('Возврат')} />}
    {exchangeOpen && <ExchangePanel passengers={passengers} base={fare + fee} currency={currency} onClose={() => setExchangeOpen(false)} onDone={() => setStatus('Обмен')} />}
    {brandedOpen && <DocCorrectionPanel passengers={passengers} offer={offer} svc={svc} currency={currency} orderNo={svc ? svc.order : null} onClose={() => setBrandedOpen(false)} />}
    <SendToPaxDrawer open={sendOpen} passengers={passengers} onClose={() => setSendOpen(false)} />
    </>
  );
}

/* ====================================================================
   REGISTRY + PAGE SHELL
   ==================================================================== */
function FlightsRegistry({ onNew, onOpen }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fSup, setFSup] = useState('');
  const { sort, onSort, apply } = useSort({ col: 'dep', dir: 'asc' });

  const TAB_MAP = { all: null, search: 'Поиск', booked: 'Забронировано', issued: 'Выписано', refund: 'Возврат' };
  let rows = AIR_SERVICES.filter((r) => {
    if (TAB_MAP[tab] && r.status !== TAB_MAP[tab]) return false;
    if (fSup && r.supplier !== fSup) return false;
    if (q && !(`${r.no} ${r.route} ${r.supplier} ${r.pnr}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = apply(rows, { sum: (r) => r.sum, no: (r) => r.no, dep: (r) => r.dep });

  const counts = (st) => AIR_SERVICES.filter((r) => !st || r.status === st).length;
  const TABS = [
    { key: 'all', label: 'Все', count: counts() },
    { key: 'search', label: 'В поиске', count: counts('Поиск') },
    { key: 'booked', label: 'Забронировано', count: counts('Забронировано') },
    { key: 'issued', label: 'Выписано', count: counts('Выписано') },
    { key: 'refund', label: 'Возврат', count: counts('Возврат') },
  ];

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {AIR_STATS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="s-label">{s.label}</div>
            <div className="s-value" style={s.tone === 'red' ? { color: 'var(--red)' } : null}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, маршрут, PNR…" style={{ width: 260 }} />
        <FilterChip label="Поставщик" value={fSup} onChange={setFSup}
          options={[...new Set(AIR_SERVICES.map((r) => r.supplier))]} />
      </div>

      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr>
              <Th label="№ услуги" col="no" sort={sort} onSort={onSort} />
              <th>Маршрут</th><th>Пасс.</th><th>Авиакомпания</th><th>PNR</th><th>Билет</th><th>Поставщик</th>
              <Th label="Вылет" col="dep" sort={sort} onSort={onSort} />
              <th>Статус</th>
              <Th label="Стоимость" col="sum" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th></th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpen(r)}>
                  <td style={{ fontWeight: 600 }}>{r.no}</td>
                  <td>{r.route}</td>
                  <td>{r.pax}</td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><AirlineLogo code={r.airline} size="sm" />{AIRLINES[r.airline].name}</span></td>
                  <td>{r.pnr === '—' ? <span style={{ color: 'var(--muted-2)' }}>—</span> : r.pnr}</td>
                  <td style={{ fontSize: 13 }}>{r.ticket}</td>
                  <td style={{ fontSize: 13.5, color: 'var(--muted)' }}>{r.supplier}</td>
                  <td>{r.dep}</td>
                  <td><Pill tone={AIR_STATUS[r.status]}>{r.status}</Pill></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.sum ? money(r.sum, r.currency) : '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[{ icon: 'eye', label: 'Открыть', onClick: () => onOpen(r) }, { icon: 'template', label: 'В КП' }, { sep: true }, { icon: 'refund', label: 'Возврат / обмен', danger: true }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="plane" title="Авиауслуг не найдено" sub="Создайте новый поиск или измените фильтры" />}
      </div>
    </div>
  );
}

function FlightsPage() {
  const [view, setView] = useState('registry'); // registry | search | results | card
  const [svc, setSvc] = useState(null);
  const [offer, setOffer] = useState(null);
  const toast = useToast();
  const [params, setParams] = useState({
    trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null,
    pax: { adt: 1, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} }, cabin: 'Эконом',
    baggage: false, flex: false, direct: false, airline: '',
    ...PAX_DEFAULT_OPTIONS,
  });

  const TITLES = { registry: 'Авиабилеты', search: 'Поиск авиабилетов', results: 'Результаты поиска', card: 'Авиауслуга' };

  return (
    <>
      <Topbar title={TITLES[view]}>
        <div className="topbar-spacer" />
        {view === 'registry' && <Button icon="search" onClick={() => setView('search')}>Новый поиск</Button>}
      </Topbar>
      <div className="content">
        {view === 'registry' && (
          <FlightsRegistry onNew={() => setView('search')}
            onOpen={(r) => { setSvc(r); setOffer(null); setView('card'); }} />
        )}
        {view === 'search' && (
          <FlightSearch params={params} setParams={setParams} onSearch={() => setView('results')} />
        )}
        {view === 'results' && (
          <FlightResults params={params}
            onBackToSearch={() => setView('search')}
            onSelect={(o) => { setOffer(o); setSvc(null); setView('card'); toast('Предложение добавлено в заказ'); }} />
        )}
        {view === 'card' && (
          <FlightCard svc={svc} offer={offer} onBack={() => setView(svc ? 'registry' : 'results')} />
        )}
      </div>
    </>
  );
}

Object.assign(window, { FlightsPage, AirlineLogo, FlightSearch, FlightResults, FlightCard, paxTotal, PAX_DEFAULT_OPTIONS });
