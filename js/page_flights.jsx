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

function PaxField({ pax, setPax, cabin, setCabin, options = PAX_DEFAULT_OPTIONS, setOptions }) {
  const [open, setOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const total = paxTotal(pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n < 5 ? 'пассажира' : 'пассажиров');
  const specialCount = Object.values(pax.special || {}).reduce((a, n) => a + (n || 0), 0)
    + Object.values(pax.subsidized || {}).reduce((a, n) => a + (n || 0), 0);
  const Step = ({ label, sub, val, set, min = 0 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5 }}>{label}</div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{sub}</div>}
      </div>
      <button className="btn btn-secondary btn-icon btn-sm" disabled={val <= min} onClick={() => set(val - 1)}>−</button>
      <span style={{ width: 22, textAlign: 'center', fontWeight: 700 }}>{val}</span>
      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => set(val + 1)}>+</button>
    </div>
  );
  const setBase = (k, min = 0) => (v) => setPax({ ...pax, [k]: Math.max(min, v) });
  const setSpecial = (group, k) => (v) => setPax({ ...pax, [group]: { ...(pax[group] || {}), [k]: Math.max(0, v) } });
  const opt = (k) => (e) => setOptions && setOptions({ [k]: e.target ? e.target.checked : e });
  return (
    <div className="av-field" style={{ position: 'relative', width: 230 }} ref={ref}>
      <span className="label">Пассажиры и класс</span>
      <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }} onClick={() => setOpen((o) => !o)}>
        <Icon name="users" style={{ width: 17, height: 17, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{total} {plural(total)} · {cabin}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </div>
      {open && (
        <div className="dropdown scroll" style={{ top: 74, left: 0, width: 320, maxHeight: 520, overflowY: 'auto', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '.02em' }}>Пассажиры</span>
            <Pill tone="blue">Всего {total}</Pill>
          </div>
          <Step label="Взрослые" sub="от 12 лет" val={pax.adt} set={setBase('adt', 1)} min={1} />
          <Step label="Дети" sub="2–11 лет" val={pax.chd} set={setBase('chd')} />
          <Step label="Младенцы без места" sub="до 2 лет" val={pax.infNoSeat} set={setBase('infNoSeat')} />
          <Step label="Младенцы с местом" sub="до 2 лет" val={pax.infSeat} set={setBase('infSeat')} />

          <button className="dropdown-sep" style={{ width: '100%', border: 'none', background: 'none', padding: 0, margin: '10px 0', cursor: 'pointer' }}
            onClick={() => setSpecialOpen((o) => !o)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>
                <Icon name="plus" style={{ width: 14, height: 14 }} />Специальные категории{specialCount > 0 && <span className="tab-count">{specialCount}</span>}
              </span>
              <Icon name={specialOpen ? 'chevUp' : 'chevDown'} style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
            </div>
          </button>

          {specialOpen && (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '4px 0 2px' }}>Льготные категории</div>
              {SPECIAL_PAX_CATEGORIES.map((c) => (
                <Step key={c.key} label={c.label} val={(pax.special || {})[c.key] || 0} set={setSpecial('special', c.key)} />
              ))}
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', margin: '10px 0 2px' }}>Субсидированные программы</div>
              {SUBSIDIZED_PAX_PROGRAMS.map((c) => (
                <Step key={c.key} label={c.label} val={(pax.subsidized || {})[c.key] || 0} set={setSpecial('subsidized', c.key)} />
              ))}
            </>
          )}

          <div className="dropdown-sep" />
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '8px 0' }}>Класс обслуживания</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {CABIN_CLASSES.map((c) => (
              <button key={c} className={'tab' + (cabin === c ? ' active' : '')} style={{ justifyContent: 'center' }}
                onClick={() => setCabin(c)}>{c}</button>
            ))}
          </div>

          <div className="dropdown-sep" />
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '8px 0' }}>Дополнительные параметры</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
              <Checkbox on={options.sameClass} onChange={() => setOptions && setOptions({ sameClass: !options.sameClass })} />Все пассажиры одного класса
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
              <Checkbox on={options.allowDiffClasses} onChange={() => setOptions && setOptions({ allowDiffClasses: !options.allowDiffClasses })} />Разрешить разные классы
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
              <Checkbox on={options.seekSubsidized} onChange={() => setOptions && setOptions({ seekSubsidized: !options.seekSubsidized })} />Подобрать субсидированные тарифы
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
              <Checkbox on={options.seekGroupFares} onChange={() => setOptions && setOptions({ seekGroupFares: !options.seekGroupFares })} />Искать групповые тарифы авиакомпаний
            </label>
          </div>
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

function FlightCard({ svc, offer, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('segments');
  const air = svc ? svc.airline : (offer ? offer.airline : 'TK');
  const out = offer ? offer.out : { from: 'FRU', to: 'IST', dep: '04:15', arr: '08:40', date: '24 июн', dur: '6ч 25м', stopText: 'Прямой', flightNo: air + ' 131' };
  const back = offer ? offer.back : null;
  const status = svc ? svc.status : 'Предложение';
  const no = svc ? svc.no : 'AV-' + Math.floor(10000 + Math.random() * 90000);
  const pnr = svc ? svc.pnr : '—';
  const ticket = svc ? svc.ticket : '—';
  const fare = offer ? offer.fare : (svc ? svc.sum : 0);
  const fee = offer ? offer.fee : 0;

  const TABS = [
    { key: 'pax', label: 'Пассажиры', count: svc ? svc.pax : (offer ? 1 : 1) },
    { key: 'segments', label: 'Сегменты' },
    { key: 'supplier', label: 'Поставщик / PNR' },
    { key: 'finance', label: 'Финансы' },
    { key: 'docs', label: 'Документы' },
    { key: 'comments', label: 'Комментарии' },
    { key: 'history', label: 'История' },
  ];
  const passengers = [
    { name: 'Аттокуров Эрбол', type: 'Взрослый', doc: 'ID AC1234567', dob: '14.03.1990', ticket: ticket },
    { name: 'Аттокурова Айгерим', type: 'Взрослый', doc: 'ID AC7654321', dob: '02.08.1992', ticket: '—' },
  ].slice(0, svc ? Math.min(svc.pax, 2) : 1);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>Назад</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Авиабилеты / {no}</span>
      </div>

      {/* header card */}
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
        <AirlineLogo code={air} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="card-title">{out.from} → {out.to}{back ? ' → ' + back.to : ''}</h2>
            <Pill tone={AIR_STATUS[status] || 'gray'}>{status}</Pill>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{AIRLINES[air].name} · {out.flightNo} · вылет {out.date}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Итого к оплате</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>{(fare + fee).toLocaleString('ru-RU')} $</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'Предложение' && <Button icon="check" onClick={() => toast('Отправлено на бронирование')}>Забронировать</Button>}
          {status === 'Забронировано' && <Button icon="ticket" onClick={() => toast('Билет выписан')}>Выписать билет</Button>}
          <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>}
            items={[
              { icon: 'template', label: 'В коммерческое предложение', onClick: () => toast('Добавлено в КП') },
              { icon: 'download', label: 'Скачать маршрут-квитанцию', onClick: () => toast('Загрузка…') },
              { icon: 'refund', label: 'Оформить возврат', onClick: () => toast('Открыт модуль возврата') },
              { sep: true },
              { icon: 'trash', label: 'Аннулировать', danger: true, onClick: () => toast('Бронь аннулирована', 'err') },
            ]} />
        </div>
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

      {tab === 'pax' && (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Пассажир</th><th>Тип</th><th>Документ</th><th>Дата рожд.</th><th>Номер билета</th></tr></thead>
            <tbody>{passengers.map((p, i) => (
              <tr key={i}><td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.type}</td><td>{p.doc}</td><td>{p.dob}</td>
                <td>{p.ticket === '—' ? <span style={{ color: 'var(--muted-2)' }}>не выписан</span> : p.ticket}</td></tr>
            ))}</tbody>
          </table>
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
