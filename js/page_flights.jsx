import { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, ConfirmDialog, DateField, DateRangeField, Drawer, EmptyState, Field, FilterChip, Input, Pill, Radio, SearchBox, Select, Tabs, Th, TimeLimitBadge, Toggle, fmtDate, plural, useSort, useToast } from './ui';
import { AIRLINES, AIRPORTS, AIR_SERVICES, AIR_STATS, AIR_STATUS, CABIN_CLASSES, CLIENTS, FLIGHT_OFFERS, ORDERS, SPECIAL_PAX_CATEGORIES, SUBSIDIZED_PAX_PROGRAMS, aviaMarkupAmount } from './data';
import { Topbar } from './layout';
import { ExtrasTabs } from './page_avia_picker';
import { OperationConfirmModal } from './order_ops';
import { PanelSub, StackPanel } from './components/shared-panels';
import { SvcAddPaxDrawer, SvcDocUploadDrawer } from './page_services';
import { aftersalesApi, documentsApi, proposalsApi, servicesApi, workspaceActionsApi } from './api/resources';
import { resultsOf } from './api/client';




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
        <Icon name="plane" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
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
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.name}, {a.country}</div>
              </span>
            </div>
          ))}
          {!list.length && <div style={{ padding: 12, color: 'var(--muted)', fontSize: 14 }}>Ничего не найдено</div>}
        </div>
      )}
    </div>
  );
}


const PAX_DEFAULT_OPTIONS = { sameClass: true, allowDiffClasses: false, seekSubsidized: false, seekGroupFares: false };

function paxTotal(pax) { return pax.adt + pax.chd + pax.infNoSeat + pax.infSeat; }


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
        <Icon name="users" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
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

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
        <Icon name="api" style={{ width: 16, height: 16 }} />
        Поиск выполняется одновременно по: Amadeus GDS · Sirena-Travel · Air Astana · Pegasus · Qatar API
      </div>
    </div>
  );
}




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
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.out.flightNo}{o.back ? ' · ' + o.back.flightNo : ''} · {o.fareName}</div>
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
        <div style={{ marginTop: 10 }}>
          <FareRulesInfo airline={o.airline} fareName={o.fareName} refundable={o.refundable} baggage={o.baggage} />
        </div>
      </div>
      <div className="off-side">
        <div>
          <div className="off-supplier"><Icon name="api" style={{ width: 14, height: 14, verticalAlign: -2 }} /> {o.supplier}</div>
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

function FilterRail({ flt, setFlt, allOffers = FLIGHT_OFFERS }) {
  const airlines = [...new Set(allOffers.map((o) => o.airline))];
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
              <span className="cnt">{allOffers.filter((o) => o.airline === a).length}</span></label>
          ))}
        </div>
        <div className="flt-block">
          <div className="flt-h">Поставщики</div>
          {[...new Set(allOffers.map((o) => o.supplier))].map((s) => (
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
    <Drawer open={open} onClose={onClose} width="min(900px,96vw)"
      title="Сравнение предложений" sub={`${offers.length} варианта`}>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ marginTop: 0, minWidth: 560 }}>
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
    </Drawer>
  );
}

function FlightResults({ params, liveOffers = FLIGHT_OFFERS, loading = false, onSelect, onBackToSearch }) {
  const [sort, setSort] = useState('best');
  const [flt, setFlt] = useState({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, flightNo: '' });
  const [compare, setCompare] = useState([]);
  const [cmpOpen, setCmpOpen] = useState(false);
  const toast = useToast();

  const flightNoMatch = (o, q) => { const n = q.replace(/\s+/g, '').toLowerCase(); return [o.out, o.back].some((l) => l && l.flightNo && l.flightNo.replace(/\s+/g, '').toLowerCase().includes(n)); };
  let offers = liveOffers.filter((o) => {
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
        <FilterRail flt={flt} setFlt={setFlt} allOffers={liveOffers} />
        <div style={{ flex: 1, minWidth: 0 }}>

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
              onSelect={onSelect} onSave={() => toast('Добавьте предложение в backend-заказ, чтобы сохранить его', 'warn')}
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




function SegmentRow({ leg }) {
  return (
    <div className="seg">
      <div className="seg-time"><div className="t">{leg.dep}</div><div className="d">{leg.date}</div></div>
      <div className="seg-rail"><span className="o" /><span className="l" /><span className="o" /></div>
      <div className="seg-body">
        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{leg.from} → {leg.to}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', margin: '3px 0' }}>{leg.flightNo} · {leg.dur} · {leg.stopText}</div>
        <div style={{ fontSize: 13, color: 'var(--ink)' }}>Прибытие {leg.arr}, {leg.date}</div>
      </div>
    </div>
  );
}



function FareRulesInfo({ airline, fareName, refundable = true, baggage = '23 кг' }) {
  const [open, setOpen] = useState(false);
  const air = airline && AIRLINES[airline];
  const name = fareName || 'Economy';
  const pub = [
    { k: 'Обмен', v: refundable ? 'разрешён, сбор от 25 $' : 'платно, по правилам тарифа', tone: refundable ? 'green' : 'amber' },
    { k: 'Возврат', v: refundable ? 'разрешён со сбором' : 'невозвратный', tone: refundable ? 'green' : 'red' },
    { k: 'Ручная кладь', v: '10 кг' },
    { k: 'Багаж', v: baggage },
    { k: 'Срок действия билета', v: 'до 12 месяцев с даты оформления' },
    { k: 'Тайм-лимит на выписку', v: 'до 24 часов после бронирования' },
    { k: 'Класс бронирования', v: 'по применённому тарифу' },
  ];
  return (
    <div className={'fare-rules' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="fare-rules-head" onClick={() => setOpen((o) => !o)}>
        <Icon name="docs" style={{ width: 14, height: 14 }} />
        <span>Правила тарифа</span>
        <Icon name={open ? 'chevUp' : 'chevDown'} style={{ width: 14, height: 14, marginLeft: 'auto' }} />
      </button>
      {open && (
        <div className="fare-rules-body">
          <div className="fare-rules-src"><Icon name="api" style={{ width: 12, height: 12 }} />{(air ? air.name : 'Авиакомпания')} · публикуемые условия тарифа «{name}»</div>
          {pub.map((r, i) => (
            <div className="fare-rules-row" key={i}>
              <span className="frr-k">{r.k}</span>
              <span className={'frr-v' + (r.tone ? ' t-' + r.tone : '')}>{r.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





function flightStatusFlags(status, svc, offer) {
  const issued = status === 'Выписано' || status === 'Возврат' || status === 'Обмен';
  const booked = status === 'Забронировано';
  const offered = status === 'Предложение' || status === 'Согласование' || status === 'Поиск';
  const free = !svc && !!offer;
  return { issued, booked, offered, free };
}


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



function RefundPanel({ passengers, base, currency, onClose, onDone }) {
  const toast = useToast();
  const [voluntary, setVoluntary] = useState(true);
  const [sel, setSel] = useState(passengers.map((_, i) => i));
  const [docs, setDocs] = useState([]);
  const [calc, setCalc] = useState(null);
  const perTicket = base / Math.max(1, passengers.length);
  const toggle = (i) => setSel((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const allSel = sel.length === passengers.length;
  const scope = allSel ? 'полный' : 'частичный';
  const addDoc = () => setDocs((d) => [...d, { name: 'Документ ' + (d.length + 1) + '.pdf' }]);
  const doCalc = () => {
    const cnt = sel.length;
    if (!cnt) { toast('Выберите хотя бы одного пассажира', 'err'); return; }
    if (!voluntary && !docs.length) { toast('Приложите документ-основание для вынужденного возврата', 'err'); return; }
    const gross = Math.round(perTicket * cnt);
    const penalty = voluntary ? Math.round(gross * 0.15) : 0;
    const fee = voluntary ? 15 : 0;
    setCalc({ cnt, gross, penalty, fee, refund: Math.max(0, gross - penalty - fee) });
  };
  useEffect(() => { setCalc(null); }, [voluntary, sel, docs]);
  const cur = ' ' + (currency === 'USD' ? '$' : currency);
  return (
    <StackPanel title="Оформление возврата" width="min(680px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={doCalc}>Рассчитать сумму возврата</Button>
        <Button icon="check" style={{ flex: 1 }} disabled={!calc}
          onClick={async () => { if (!calc) return; try { await onDone?.({ calc, voluntary, passengers: sel }); toast('Запрос на возврат создан', 'ok'); onClose(); } catch (error) { toast(error.message, 'err'); } }}>
          Подтвердить возврат
        </Button>
      </>}>
      <PanelSub style={{ marginTop: 0 }}>Тип возврата</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (voluntary ? ' active' : '')} onClick={() => setVoluntary(true)}>Добровольный</button>
        <button className={'seg-btn' + (!voluntary ? ' active' : '')} onClick={() => setVoluntary(false)}>Вынужденный</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
        {voluntary ? 'Удерживается штраф авиакомпании и сервисный сбор.' : 'Вынужденный возврат — по правилам без штрафа (болезнь, отмена рейса и т.п.).'}
      </div>


      <PanelSub>Пассажиры <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· {scope} возврат</span></PanelSub>
      <label className="hp-check-row" style={{ marginBottom: 6 }}>
        <Checkbox on={allSel} onChange={() => setSel(allSel ? [] : passengers.map((_, i) => i))} />
        <span className="hp-check-label" style={{ flex: 1, fontWeight: 600 }}>Выбрать всех</span>
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {passengers.map((p, i) => (
          <label key={i} className="hp-check-row" style={{ border: '1px solid ' + (sel.includes(i) ? 'var(--blue)' : 'var(--line)'), borderRadius: 10, padding: '8px 12px' }}>
            <Checkbox on={sel.includes(i)} onChange={() => toggle(i)} />
            <span className="hp-check-label" style={{ flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.ticket}</span>
          </label>
        ))}
      </div>


      {!voluntary && (
        <>
          <PanelSub>Документы-основания</PanelSub>
          <div className="card" style={{ padding: 14, borderLeft: '3px solid var(--amber)', background: 'var(--amber-soft, #fff8ec)', marginBottom: 10, display: 'flex', gap: 10 }}>
            <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)', flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: 'var(--body)' }}>Приложите справки/подтверждающие документы. <b>Ознакомьтесь с правилами авиакомпании по документам</b> для вынужденного возврата (мед. справка, свидетельство и т.п.).</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
                <Icon name="docs" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
                <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDocs((x) => x.filter((_, j) => j !== i))}><Icon name="trash" /></button>
              </div>
            ))}
            <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)', width: '100%' }} onClick={addDoc}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" style={{ width: 16, height: 16 }} />Загрузить документ</span>
            </button>
          </div>
        </>
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



function ExchangePanel({ passengers, base, currency, origin, dest, onClose, onDone }) {
  const toast = useToast();
  const [voluntary, setVoluntary] = useState(true);
  const [mode, setMode] = useState('surcharge');
  const [reqMode, setReqMode] = useState('request');
  const [sel, setSel] = useState(passengers.map((_, i) => i));
  const [nf, setNf] = useState({ from: origin || '', to: dest || '', date: null, flightNo: '' });
  const [newFare, setNewFare] = useState('');
  const [variants, setVariants] = useState(null);
  const [pickedVar, setPickedVar] = useState(null);
  const [manualFare, setManualFare] = useState(false);
  const [calc, setCalc] = useState(null);


  const searchNew = () => {
    if (!nf.to || !nf.date) { toast('Заполните направление и дату нового рейса', 'err'); return; }
    const opts = FLIGHT_OFFERS.map((o) => {
      const baseUsd = o.fare + o.fee;
      const mk = aviaMarkupAmount(o.airline, o.out.from, o.out.to, baseUsd);
      return { id: o.id, airline: o.airline, leg: o.out, fareUsd: baseUsd + mk, markupUsd: mk, supplier: o.supplier };
    });
    const filtered = opts.filter((o) => (!nf.to || o.leg.to === nf.to) && (!nf.from || o.leg.from === nf.from));
    setVariants(filtered.length ? filtered : opts);
  };
  const pickVariant = (v) => { setPickedVar(v); setNewFare(String(v.fareUsd)); setManualFare(false); };
  const toggle = (i) => setSel((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const allSel = sel.length === passengers.length;
  const cur = ' ' + (currency === 'USD' ? '$' : currency);
  const doCalc = () => {
    if (!sel.length) { toast('Выберите пассажиров для обмена', 'err'); return; }
    if (!nf.to || !nf.date) { toast('Заполните новый рейс (направление и дату)', 'err'); return; }
    const f = parseFloat(newFare);
    if (isNaN(f)) { toast('Подберите новый рейс или укажите стоимость вручную', 'err'); return; }
    const diff = Math.round((f - base) * (sel.length / Math.max(1, passengers.length)));
    const penalty = (voluntary ? 25 : 0) * sel.length;
    if (mode === 'surcharge') setCalc({ cnt: sel.length, diff, penalty, payable: Math.max(0, diff) + penalty, refundable: 0 });
    else setCalc({ cnt: sel.length, diff, penalty, payable: penalty, refundable: Math.max(0, -diff) });
  };
  useEffect(() => { setCalc(null); }, [voluntary, mode, newFare, sel, nf]);

  useEffect(() => { setVariants(null); setPickedVar(null); if (!manualFare) setNewFare(''); }, [nf.from, nf.to, nf.date]);
  const confirmLabel = reqMode === 'request' ? 'Запросить обмен у авиакомпании' : 'Провести обмен';
  return (
    <StackPanel title="Обмен билета" width="min(720px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={doCalc}>Рассчитать стоимость обмена</Button>
        <Button icon="check" style={{ flex: 1 }} disabled={!calc}
          onClick={async () => { if (!calc) return; try { await onDone?.({ calc, voluntary, passengers: sel, newFlight: nf, requestMode: reqMode }); toast(reqMode === 'request' ? 'Запрос на обмен создан' : 'Обмен создан', 'ok'); onClose(); } catch (error) { toast(error.message, 'err'); } }}>
          {confirmLabel}
        </Button>
      </>}>
      <PanelSub style={{ marginTop: 0 }}>Тип обмена</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (voluntary ? ' active' : '')} onClick={() => setVoluntary(true)}>Добровольный</button>
        <button className={'seg-btn' + (!voluntary ? ' active' : '')} onClick={() => setVoluntary(false)}>Вынужденный</button>
      </div>
      <div className="card" style={{ padding: 12, borderLeft: '3px solid var(--amber)', marginTop: 8, display: 'flex', gap: 10 }}>
        <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)', flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: 'var(--body)' }}>Проверьте <b>правила авиакомпании по обмену</b>: допустимость изменения даты/маршрута, сбор за обмен и разница тарифа зависят от условий применённого тарифа.</div>
      </div>


      <PanelSub>Пассажиры</PanelSub>
      <label className="hp-check-row" style={{ marginBottom: 6 }}>
        <Checkbox on={allSel} onChange={() => setSel(allSel ? [] : passengers.map((_, i) => i))} />
        <span className="hp-check-label" style={{ flex: 1, fontWeight: 600 }}>Выбрать всех</span>
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {passengers.map((p, i) => (
          <label key={i} className="hp-check-row" style={{ border: '1px solid ' + (sel.includes(i) ? 'var(--blue)' : 'var(--line)'), borderRadius: 10, padding: '8px 12px' }}>
            <Checkbox on={sel.includes(i)} onChange={() => toggle(i)} />
            <span className="hp-check-label" style={{ flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.ticket}</span>
          </label>
        ))}
      </div>


      <PanelSub>Новый рейс</PanelSub>
      <div className="svcp-search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <AirportField label="Откуда" value={nf.from} onChange={(v) => setNf((s) => ({ ...s, from: v }))} />
        <AirportField label="Куда" value={nf.to} onChange={(v) => setNf((s) => ({ ...s, to: v }))} />
        <div className="av-field" style={{ minWidth: 150 }}><DateField label="Дата вылета" value={nf.date} onChange={(d) => setNf((s) => ({ ...s, date: d }))} placeholder="Выбрать" /></div>
        <div className="av-field" style={{ minWidth: 140 }}><span className="label">Рейс (если известен)</span><Input value={nf.flightNo} onChange={(e) => setNf((s) => ({ ...s, flightNo: e.target.value }))} placeholder="напр. KC 132" /></div>
        <Button variant="secondary" icon="search" style={{ alignSelf: 'flex-end' }} onClick={searchNew}>Подобрать рейс</Button>
      </div>


      {variants && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Варианты для обмена на {nf.date ? '' : 'выбранную дату'} · стоимость рассчитана на момент обращения:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {variants.map((v) => (
              <button type="button" key={v.id} onClick={() => pickVariant(v)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', border: '1px solid ' + (pickedVar && pickedVar.id === v.id ? 'var(--blue)' : 'var(--line)'), borderRadius: 10, padding: '10px 12px', background: pickedVar && pickedVar.id === v.id ? 'var(--blue-weak, #eef3ff)' : '#fff', cursor: 'pointer' }}>
                <AirlineLogo code={v.airline} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{v.leg.from} → {v.leg.to} · {v.leg.flightNo}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{AIRLINES[v.airline].name} · {v.leg.dep}–{v.leg.arr}{v.markupUsd > 0 ? ' · вкл. надбавку' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{v.fareUsd.toLocaleString('ru-RU')}{cur}</div>
                  {pickedVar && pickedVar.id === v.id && <div style={{ fontSize: 12, color: 'var(--blue)' }}>Выбрано</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <PanelSub>Как оформить</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (reqMode === 'request' ? ' active' : '')} onClick={() => setReqMode('request')}>Запросить у авиакомпании</button>
        <button className={'seg-btn' + (reqMode === 'now' ? ' active' : '')} onClick={() => setReqMode('now')}>Провести сразу</button>
      </div>

      <PanelSub>Расчёт</PanelSub>
      <div className="seg-toggle">
        <button className={'seg-btn' + (mode === 'surcharge' ? ' active' : '')} onClick={() => setMode('surcharge')}>С доплатой</button>
        <button className={'seg-btn' + (mode === 'refundDiff' ? ' active' : '')} onClick={() => setMode('refundDiff')}>С возвратом разницы</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <Field label="Стоимость нового тарифа" hint={'Текущий тариф: ' + base.toLocaleString('ru-RU') + cur}>
          {pickedVar && !manualFare ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)' }}>
              <Icon name="zap" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{parseFloat(newFare).toLocaleString('ru-RU')}{cur}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>подставлено из подбора · {pickedVar.leg.from}→{pickedVar.leg.to} {pickedVar.leg.flightNo}</span>
              </div>
              <button type="button" className="link-btn" style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }} onClick={() => setManualFare(true)}>изменить вручную</button>
            </div>
          ) : (
            <div>
              <Input type="number" value={newFare} onChange={(e) => { setNewFare(e.target.value); setManualFare(true); }} placeholder={variants ? 'Выберите вариант выше или введите вручную' : 'Подберите рейс кнопкой «Подобрать рейс»'} />
              {manualFare && pickedVar && <button type="button" style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, marginTop: 6, fontFamily: 'inherit', padding: 0 }} onClick={() => { setManualFare(false); setNewFare(String(pickedVar.fareUsd)); }}>← вернуть авто-стоимость</button>}
            </div>
          )}
        </Field>
      </div>

      {calc && (
        <div className="card card-pad" style={{ marginTop: 8 }}>
          <div className="kv">
            <div className="kv-row"><span className="k">Билетов к обмену</span><span className="v">{calc.cnt}</span></div>
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








const DOC_TEMPLATES = [
  { id: 'agency', name: 'Фирменный бланк агентства', logo: true },
  { id: 'client', name: 'Фирменный бланк клиента', logo: true },
  { id: 'nologo', name: 'Без логотипа', logo: false },
  { id: 'custom', name: 'Пользовательский шаблон', logo: true },
];
const AGENCY_ENTITIES = ['ОсОО «ПСЦ Travel Hub»', 'ОсОО «Гранд Лимитед»', 'ИП Акимова А.Т.'];




const DOC_CORR_KINDS = {
  'Авиа':      { mode: 'avia',  subjectLabel: 'Пассажир',      docNoLabel: 'Номер билета', refLabel: 'PNR',       carrierLabel: 'Авиакомпания', docTitle: 'Маршрут-квитанция электронного билета' },
  'Гостиница': { mode: 'hotel', subjectLabel: 'Гость',         docNoLabel: 'Ваучер №',     refLabel: 'Код брони', carrierLabel: 'Отель',        docTitle: 'Ваучер на проживание' },
  'ЖД':        { mode: 'rail',  subjectLabel: 'Пассажир',      docNoLabel: 'Билет №',      refLabel: 'Заказ №',   carrierLabel: 'Перевозчик',   docTitle: 'Проездной документ (ЖД)' },
  'Трансфер':  { mode: 'other', subjectLabel: 'Пассажир',      docNoLabel: 'Ваучер №',     refLabel: 'Заказ №',   carrierLabel: 'Перевозчик',   docTitle: 'Ваучер на трансфер' },
  'Автобус':   { mode: 'other', subjectLabel: 'Пассажир',      docNoLabel: 'Билет №',      refLabel: 'Заказ №',   carrierLabel: 'Перевозчик',   docTitle: 'Автобусный билет' },
  'Аэроэкспресс': { mode: 'other', subjectLabel: 'Пассажир',   docNoLabel: 'Билет №',      refLabel: 'Заказ №',   carrierLabel: 'Перевозчик',   docTitle: 'Билет Аэроэкспресс' },
  'Страховка': { mode: 'other', subjectLabel: 'Застрахованный',docNoLabel: 'Полис №',      refLabel: 'Договор №', carrierLabel: 'Страховщик',   docTitle: 'Страховой полис' },
  'Виза':      { mode: 'other', subjectLabel: 'Заявитель',     docNoLabel: 'Заявка №',     refLabel: 'Досье №',   carrierLabel: 'Визовый центр',docTitle: 'Визовый документ' },
  'Тур':       { mode: 'other', subjectLabel: 'Турист',        docNoLabel: 'Ваучер №',     refLabel: 'Код брони', carrierLabel: 'Туроператор',  docTitle: 'Ваучер на тур' },
  'Группа':    { mode: 'other', subjectLabel: 'Турист',        docNoLabel: 'Ваучер №',     refLabel: 'Код брони', carrierLabel: 'Туроператор',  docTitle: 'Ваучер на тур' },
};
function docCorrKind(kind) {
  return DOC_CORR_KINDS[kind] || { mode: 'other', subjectLabel: 'Клиент', docNoLabel: 'Документ №', refLabel: 'Код брони', carrierLabel: 'Поставщик', docTitle: 'Документ' };
}

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
  if (d.fareIT) chg.push('Тариф закрыт (IT)');
  if ((d.description || '') !== (d.src.description || '')) chg.push('Описание');
  if ((d.comment || '').trim()) chg.push('Комментарий');
  return chg;
}


function CorrectionPreview({ doc, template, entity, currency, cfg, itinerary = [] }) {
  cfg = cfg || docCorrKind('Авиа');
  const tpl = DOC_TEMPLATES.find((t) => t.id === template) || DOC_TEMPLATES[0];
  const cur = corrCur(currency);
  const money = (v) => (v < 0 ? '− ' : '') + Math.abs(v).toLocaleString('ru-RU') + ' ' + cur;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '22px 24px', fontSize: 13 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: '2px solid var(--ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tpl.logo && <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--blue)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>P</span>}
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{tpl.id === 'client' ? 'Клиентский бланк' : (tpl.logo ? entity : 'Документ без логотипа')}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{cfg.docTitle}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12 }}>Клиентская версия<br />{new Date().toLocaleDateString('ru-RU')}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px', margin: '14px 0' }}>
        {[[cfg.subjectLabel, doc.name], [cfg.docNoLabel, doc.ticket], [cfg.refLabel, doc.pnr], ['Описание', doc.route], [cfg.carrierLabel, doc.carrierName], ['Дата', doc.dates]].map(([k, v]) => (
          <div key={k}><span style={{ color: 'var(--muted)' }}>{k}: </span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{v}</span></div>
        ))}
      </div>

      {itinerary && itinerary.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginBottom: 4 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{cfg.mode === 'hotel' ? 'Проживание' : 'Маршрут'}</div>
          {itinerary.map((leg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: 'var(--body)' }}>
              <span>{leg.route || ((leg.from || '') + ' → ' + (leg.to || ''))}</span>
              <span style={{ color: 'var(--muted)' }}>{[leg.date, leg.flightNo].filter(Boolean).join(' · ')}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
          <span style={{ color: 'var(--muted)' }}>Базовый тариф</span>
          <span style={{ color: 'var(--ink)' }}>{doc.fareIT ? 'IT' : (doc.baseFare.toLocaleString('ru-RU') + ' ' + cur)}</span>
        </div>

        {!doc.fareIT && <>

          {cfg.mode === 'avia' && doc.taxList ? doc.taxList.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0 3px 14px' }}>
              <span style={{ color: 'var(--muted)' }}>Такса {t.code}{t.label ? ' · ' + t.label : ''}</span>
              <span style={{ color: 'var(--ink)' }}>{t.amount.toLocaleString('ru-RU')} {cur}</span>
            </div>
          )) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: 'var(--muted)' }}>Таксы</span>
              <span style={{ color: 'var(--ink)' }}>{doc.taxes.toLocaleString('ru-RU')} {cur}</span>
            </div>
          )}
          {[['Агентская надбавка', doc.agentMarkup], ['Сервисный сбор', doc.serviceFee], ['Скидка', -doc.discount]].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: v < 0 ? 'var(--green)' : 'var(--ink)' }}>{money(v)}</span>
            </div>
          ))}
        </>}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
          <span>Итого к оплате</span><span>{doc.fareIT ? 'IT' : (corrTotal(doc).toLocaleString('ru-RU') + ' ' + cur)}</span>
        </div>
      </div>

      {(cfg.mode === 'hotel' || cfg.mode === 'other') && doc.description && doc.description.trim() && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Описание услуги</div>
          <div style={{ color: 'var(--body)', whiteSpace: 'pre-wrap' }}>{doc.description}</div>
        </div>
      )}
      {doc.comment && doc.comment.trim() && <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, color: 'var(--body)' }}>{doc.comment}</div>}
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 11 }}>{tpl.logo ? entity : ''} · Документ сформирован в PSC Travel Hub</div>
    </div>
  );
}


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
              <div style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0' }}>{v.fields.join(', ')}</div>
              {v.comment && <div style={{ fontSize: 12, color: 'var(--body)' }}>«{v.comment}»</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Открыть</button>
                <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>Скачать</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function DocCorrectionPanel({ subjects, meta, currency, orderNo, onClose }) {
  const toast = useToast();
  const cfg = meta.cfg;
  const supplier = meta.supplier;
  const route = meta.route;
  const dates = meta.dates;
  const carrierName = meta.carrierName;
  const baseFareTotal = meta.baseFareTotal || 0;
  const supplierOriginal = meta.supplierOriginal || null;
  const docMode = cfg.mode || 'other';
  const itinerary = meta.itinerary || [];
  const passengers = subjects;
  const farePerPax = Math.round(baseFareTotal / Math.max(1, passengers.length));


  const buildDoc = (p) => {

    const taxList = docMode === 'avia'
      ? [{ code: 'YQ', label: 'Топливный сбор', amount: 20 }, { code: 'YR', label: 'Сбор авиакомпании', amount: 10 }, { code: 'RI', label: 'Аэропортовый сбор', amount: 15 }]
      : null;
    const taxes = taxList ? taxList.reduce((s, t) => s + t.amount, 0) : 45;
    const desc = meta.description || '';
    const src = { baseFare: farePerPax, taxes, agentMarkup: 0, serviceFee: 0, discount: 0, total: farePerPax + taxes, description: desc };
    return { id: (p.docNo || '') + p.name, name: p.name, type: p.type, ticket: p.docNo, pnr: p.ref, supplier, route, carrierName, dates,
      src, baseFare: src.baseFare, taxes, taxList, fareIT: false, description: desc,
      agentMarkup: 20, serviceFee: 15, discount: 0, totalOverride: null, comment: '' };
  };
  const [docs, setDocs] = useState(() => passengers.map(buildDoc));
  const [mode, setMode] = useState(passengers.length > 1 ? 'group' : 'single');
  const [sel, setSel] = useState(() => passengers.map((_, i) => i));
  const [active, setActive] = useState(0);
  const [template, setTemplate] = useState('agency');
  const [entity, setEntity] = useState(AGENCY_ENTITIES[0]);
  const [view, setView] = useState('edit');
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
  const setDescription = (i, v) => setDocs((ds) => ds.map((d, j) => (j === i ? { ...d, description: v } : d)));
  const setIT = (i, v) => setDocs((ds) => ds.map((d, j) => (j === i ? { ...d, fareIT: v } : d)));

  const setTax = (i, ti, v) => setDocs((ds) => ds.map((d, j) => {
    if (j !== i || !d.taxList) return d;
    const taxList = d.taxList.map((t, k) => (k === ti ? { ...t, amount: parseFloat(v) || 0 } : t));
    return { ...d, taxList, taxes: taxList.reduce((s, t) => s + t.amount, 0) };
  }));
  const toggleSel = (i) => setSel((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const allSel = sel.length === docs.length;


  const applyMass = () => {
    if (!sel.length) { toast('Не выбрано ни одного документа', 'err'); return; }
    if (massField === 'sameAsActive') {
      const a = docs[active];
      setDocs((ds) => ds.map((d, j) => sel.includes(j) ? { ...d, baseFare: a.baseFare, taxes: a.taxes, taxList: a.taxList ? a.taxList.map((t) => ({ ...t })) : d.taxList, agentMarkup: a.agentMarkup, serviceFee: a.serviceFee, discount: a.discount, totalOverride: a.totalOverride } : d));
      toast('Значения активной строки применены к выбранным', 'ok'); return;
    }
    if (massField === 'closeFareIT') {
      setDocs((ds) => ds.map((d, j) => sel.includes(j) ? { ...d, fareIT: true } : d));
      toast('Тариф закрыт на IT для ' + sel.length + ' документов', 'ok'); return;
    }
    const v = parseFloat(massVal); if (isNaN(v)) { toast('Укажите значение', 'err'); return; }
    setDocs((ds) => ds.map((d, j) => sel.includes(j) ? (massField === 'total' ? { ...d, totalOverride: v } : { ...d, [massField]: v }) : d));
    toast('Изменения применены к ' + sel.length + ' документам в форме. Сохраните корректировку, чтобы зафиксировать backend-журнал.', 'info');
  };


  const changedDocs = docs.filter((d) => corrChanges(d).length);
  const tplChanged = template !== 'agency';
  const changeSummary = [...new Set(changedDocs.flatMap((d) => corrChanges(d)))];

  const doSave = async () => {
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fields = [...changeSummary]; if (tplChanged) fields.push('Шаблон: ' + (DOC_TEMPLATES.find((t) => t.id === template) || {}).name);
    try {
      await workspaceActionsApi.execute('document.correction.save', {
        resourceType: 'order',
        resourceId: String(orderNo || ''),
        payload: { fields: fields.length ? fields : ['Без изменений'], comment: (docs[active].comment || '').trim(), subjects: subjects.map((item) => item.name), currency },
      });
      setVersions((vs) => [{ date: now, user: 'CRM', title: 'v' + (vs.length + 1) + ' · Клиентская версия', fields: fields.length ? fields : ['Без изменений'], comment: (docs[active].comment || '').trim() }, ...vs]);
      setView('done');
      toast('Корректировка сохранена в backend-журнале', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить корректировку', 'err'); }
  };

  const activeDoc = docs[active] || docs[0];


  if (view === 'done') {
    const actions = [
      ['Предпросмотр', 'eye', () => toast('Предпросмотр документа')],
      ['Скачать PDF', 'download', () => toast('Скачивание PDF')],
      ['Скачать все документы', 'download', () => toast('Скачивание всех документов')],
      ['Отправить пассажиру', 'send', () => toast('Отправка документов требует подключенного канала или ручной загрузки в чат', 'warn')],
      ['Отправить заказчику', 'send', () => toast('Отправка документов требует подключенного канала или ручной загрузки в чат', 'warn')],
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={icon} style={{ width: 16, height: 16 }} />{label}</span>
              <Icon name="chevRight" style={{ width: 16, height: 16 }} />
            </button>
          ))}
        </div>
        <CorrectionHistoryDrawer open={historyOpen} versions={versions} onClose={() => setHistoryOpen(false)} />
      </StackPanel>
    );
  }


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
            <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Изменённых документов</div><div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{changedDocs.length} / {docs.length}</div></div>
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
            <thead><tr><th>{cfg.subjectLabel}</th><th>{cfg.docNoLabel}</th><th>Изменения</th><th style={{ textAlign: 'right' }}>Итог</th></tr></thead>
            <tbody>
              {changedDocs.map((d) => (
                <tr key={d.id}><td style={{ fontWeight: 600 }}>{d.name}</td><td style={{ fontSize: 13 }}>{d.ticket}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{corrChanges(d).join(', ')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{corrTotal(d).toLocaleString('ru-RU')} {cur}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </StackPanel>
    );
  }


  const singleFieldEditor = (i) => {
    const d = docs[i];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Field label="Базовый тариф"><Input type="number" value={d.baseFare} onChange={(e) => setField(i, 'baseFare', e.target.value)} /></Field>
          {docMode !== 'avia' && <Field label="Таксы"><Input type="number" value={d.taxes} onChange={(e) => setField(i, 'taxes', e.target.value)} /></Field>}
          <Field label="Агентская надбавка"><Input type="number" value={d.agentMarkup} onChange={(e) => setField(i, 'agentMarkup', e.target.value)} /></Field>
          <Field label="Сервисный сбор"><Input type="number" value={d.serviceFee} onChange={(e) => setField(i, 'serviceFee', e.target.value)} /></Field>
          <Field label="Скидка"><Input type="number" value={d.discount} onChange={(e) => setField(i, 'discount', e.target.value)} /></Field>
          <Field label={'Итоговая стоимость (' + cur + ')'} hint={d.totalOverride != null ? 'Задано вручную' : 'Авто: ' + corrComputed(d).toLocaleString('ru-RU')}>
            <Input type="number" value={d.totalOverride != null ? d.totalOverride : corrComputed(d)} onChange={(e) => setTotal(i, e.target.value)} />
          </Field>
        </div>


        {docMode === 'avia' && d.taxList && (
          <div className="card card-pad" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>Детализация такс</div>
            {d.taxList.map((t, ti) => (
              <div key={t.code} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 40, fontFamily: 'monospace', fontWeight: 700, color: 'var(--ink)' }}>{t.code}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)' }}>{t.label}</span>
                <Input type="number" value={t.amount} onChange={(e) => setTax(i, ti, e.target.value)} style={{ width: 110, height: 34, padding: '4px 8px' }} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line)', fontWeight: 700, color: 'var(--ink)' }}>
              <span>Итого такс</span><span>{d.taxes.toLocaleString('ru-RU')} {cur}</span>
            </div>
          </div>
        )}


        {docMode === 'avia' && (
          <label className="hp-check-row" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
            <Checkbox on={d.fareIT} onChange={(v) => setIT(i, v)} />
            <span className="hp-check-label" style={{ flex: 1 }}>Закрыть тариф на «IT» <span style={{ color: 'var(--muted)' }}>— скрыть стоимость тарифа в документе (Inclusive Tour)</span></span>
          </label>
        )}


        {(docMode === 'hotel' || docMode === 'other') && (
          <Field label="Описание в бланке">
            <textarea className="input" style={{ minHeight: 70, resize: 'vertical', padding: '10px 12px' }} value={d.description} onChange={(e) => setDescription(i, e.target.value)} placeholder="Описание услуги в документе для клиента…" />
          </Field>
        )}
      </div>
    );
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Отмена</Button>
      <div style={{ flex: 1 }} />
      <Button variant="secondary" icon="clock" onClick={() => setHistoryOpen(true)}>История</Button>
      <Button variant="secondary" icon="download" onClick={() => window.print()}>Скачать PDF</Button>
      <Button icon="check" onClick={() => setView('confirm')}>Сохранить</Button>
    </>
  );

  return (
    <StackPanel title="Корректировка документов" width={mode === 'group' ? 'min(1200px,97vw)' : 'min(1040px,96vw)'} onClose={onClose} footer={footer}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        Формирование клиентской версии документа на фирменном бланке. Данные поставщика неизменяемы —
        корректируется только отображение (тариф, таксы, надбавка, сбор, скидка, итог, комментарий, реквизиты).
      </div>

      <PanelSub style={{ marginTop: 0 }}>Вид корректировки</PanelSub>
      <div className="seg-toggle" style={{ maxWidth: 360 }}>
        <button className={'seg-btn' + (mode === 'single' ? ' active' : '')} onClick={() => setMode('single')}>Индивидуальная</button>
        <button className={'seg-btn' + (mode === 'group' ? ' active' : '')} onClick={() => setMode('group')}>Групповая</button>
      </div>


      <PanelSub>Исходный документ · данные поставщика</PanelSub>
      {supplierOriginal && supplierOriginal.originalUrl && (
        <div style={{ marginBottom: 10 }}>
          <Button variant="secondary" size="sm" icon="eye" onClick={() => window.open(supplierOriginal.originalUrl, '_blank')}>
            Открыть оригинал · {supplierOriginal.name || 'файл поставщика'}
          </Button>
        </div>
      )}
      <div className="card card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 20px' }}>
        {[['Поставщик', supplier], [cfg.refLabel, activeDoc.pnr], [cfg.docNoLabel, activeDoc.ticket], ['Описание', route], [cfg.subjectLabel, activeDoc.name], [cfg.carrierLabel, carrierName], ['Базовый тариф', farePerPax.toLocaleString('ru-RU') + ' ' + cur], ['Таксы', activeDoc.src.taxes.toLocaleString('ru-RU') + ' ' + cur], ['Валюта', currency]].map(([k, v]) => (
          <div key={k}><div style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{v}</div></div>
        ))}
      </div>


      <PanelSub>Шаблон и реквизиты</PanelSub>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="Фирменный шаблон">
          <Select options={DOC_TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} value={template} onChange={(e) => setTemplate(e.target.value)} />
        </Field>
        <Field label="Реквизиты агентства (юр. лицо)">
          <Select options={AGENCY_ENTITIES} value={entity} onChange={(e) => setEntity(e.target.value)} />
        </Field>
      </div>


      {mode === 'single' ? (
        <>
          {docs.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <Field label={'Документ · ' + cfg.subjectLabel}>
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

            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Предпросмотр (обновляется мгновенно)</div>
              <CorrectionPreview doc={activeDoc} template={template} entity={entity} currency={currency} cfg={cfg} itinerary={itinerary} />
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
                options={[...CORR_FIELDS.map((f) => ({ value: f.key, label: 'Изменить: ' + f.label })), { value: 'total', label: 'Изменить итоговую сумму' }, { value: 'sameAsActive', label: 'Применить одинаковые значения' }, ...(docMode === 'avia' ? [{ value: 'closeFareIT', label: 'Закрыть тариф на IT' }] : [])]} />
            </div>
            {massField !== 'sameAsActive' && massField !== 'closeFareIT' && (
              <div style={{ width: 150 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Значение ({cur})</div>
                <Input type="number" value={massVal} onChange={(e) => setMassVal(e.target.value)} placeholder="0" />
              </div>
            )}
            <Button icon="check" onClick={applyMass}>Применить к выбранным ({sel.length})</Button>
          </div>


          <div className="table-card" style={{ marginTop: 14, overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr>
                <th style={{ width: 34 }}><Checkbox on={allSel} onChange={() => setSel(allSel ? [] : docs.map((_, i) => i))} /></th>
                <th>{cfg.subjectLabel}</th><th>{cfg.docNoLabel}</th><th>Поставщик</th>
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
                    <td style={{ fontSize: 12, color: 'var(--muted)' }}>{d.supplier}</td>
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


          <PanelSub>Предпросмотр · {activeDoc.name}</PanelSub>
          <div style={{ maxWidth: 560 }}><CorrectionPreview doc={activeDoc} template={template} entity={entity} currency={currency} cfg={cfg} itinerary={itinerary} /></div>
        </>
      )}

      <CorrectionHistoryDrawer open={historyOpen} versions={versions} onClose={() => setHistoryOpen(false)} />
    </StackPanel>
  );
}


function SendToPaxDrawer({ open, passengers, onClose, onSend }) {
  const toast = useToast();
  const [channel, setChannel] = useState('email');
  const CHANNELS = [['email', 'E-mail', 'mail'], ['whatsapp', 'WhatsApp', 'chat'], ['telegram', 'Telegram', 'send']];
  return (
    <Drawer open={open} onClose={onClose} title="Отправить пассажиру"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="send" onClick={async () => { try { await onSend?.(channel, passengers); toast('Документы отправлены пассажиру', 'ok'); onClose(); } catch (error) { toast(error.message, 'err'); } }}>Отправить</Button></>}>
      <PanelSub style={{ marginTop: 0 }}>Канал отправки</PanelSub>
      <div style={{ display: 'flex', gap: 8 }}>
        {CHANNELS.map(([k, label, icon]) => (
          <button key={k} type="button" className={'seg-btn' + (channel === k ? ' active' : '')} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px' }} onClick={() => setChannel(k)}>
            <Icon name={icon} style={{ width: 16, height: 16 }} />{label}
          </button>
        ))}
      </div>
      <PanelSub>Получатели</PanelSub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {passengers.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
            <Avatar name={p.name} size={30} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.ticket !== '—' ? 'Билет ' + p.ticket : 'Бронь ' + p.pnr}</div></div>
            <Pill tone="blue">{p.docs.length} док.</Pill>
          </div>
        ))}
      </div>
    </Drawer>
  );
}




const ATTACH_MODES = [
  { key: 'order', label: 'В существующий заказ', icon: 'briefcase', hint: 'Добавить услугу в уже созданный заказ' },
  { key: 'newCompany', label: 'Новый заказ · юр. лицо', icon: 'building', hint: 'Создать новый заказ на компанию (контрагента)' },
  { key: 'newPerson', label: 'Новый заказ · физ. лицо', icon: 'user', hint: 'Создать новый заказ на частного клиента' },
];
function AttachFlightDrawer({ mode, svcTitle, onClose, onDone }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);

  const [m, setM] = useState(mode === 'person' ? 'newPerson' : (mode || 'order'));
  const isOrder = m === 'order';
  const isCompany = m === 'newCompany';
  const orders = ORDERS.filter((o) => `${o.no} ${o.client}`.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  const companies = (typeof COMPANIES !== 'undefined' ? COMPANIES.map((c) => c.name || c) : ['ОсОО «Гранд лимитед»', 'ОсОО «Asia Travel»', 'ИП Мамажанов'])
    .filter((c) => String(c).toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  const clients = CLIENTS.filter((c) => c.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  useEffect(() => { setPicked(null); setQ(''); }, [m]);
  const confirm = () => {
    if (!picked) { toast('Выберите ' + (isOrder ? 'заказ' : isCompany ? 'компанию' : 'клиента'), 'err'); return; }
    const newNo = 51190 + Math.floor(Math.random() * 800);
    const msg = isOrder
      ? 'Услуга «' + svcTitle + '» добавлена в заказ № ' + picked.no
      : isCompany
        ? 'Создан заказ № ' + newNo + ' (юр. лицо: ' + picked + '), услуга «' + svcTitle + '» привязана'
        : 'Создан заказ № ' + newNo + ' (физ. лицо: ' + picked + '), услуга «' + svcTitle + '» привязана';
    onDone(msg);
    onClose();
  };
  const searchPh = isOrder ? 'Поиск: № заказа или клиент' : isCompany ? 'Поиск компании (юр. лицо)' : 'Поиск клиента (физ. лицо)';
  return (
    <Drawer open onClose={onClose} title="Привязка услуги к заказу" sub="Куда добавить подобранную услугу"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" disabled={!picked} onClick={confirm}>{isOrder ? 'Добавить в заказ' : 'Создать заказ и привязать'}</Button></>}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {ATTACH_MODES.map((a) => (
          <button key={a.key} type="button" onClick={() => setM(a.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              border: '1px solid ' + (m === a.key ? 'var(--blue)' : 'var(--field-line)'), background: m === a.key ? 'var(--blue-soft)' : '#fff' }}>
            <Radio on={m === a.key} onChange={() => setM(a.key)} />
            <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 32, height: 32, flexShrink: 0 }}><Icon name={a.icon} style={{ width: 16, height: 16 }} /></span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{a.label}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.hint}</div></div>
          </button>
        ))}
      </div>
      <SearchBox value={q} onChange={setQ} placeholder={searchPh} style={{ width: '100%', marginBottom: 12 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isCompany && companies.map((c) => {
          const on = picked === c;
          return (
            <button key={c} type="button" onClick={() => setPicked(c)}
              style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), background: on ? 'var(--blue-soft)' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="oc-svc-ic" style={{ background: 'var(--indigo)', width: 34, height: 34 }}><Icon name="building" /></span>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: 'var(--ink)' }}>{c}</div>
              {on && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
            </button>
          );
        })}
        {isCompany && !companies.length && <EmptyState icon="building" title="Компании не найдены" />}
        {isOrder && orders.map((o) => {
          const on = picked && picked.id === o.id;
          return (
            <button key={o.id} type="button" onClick={() => setPicked(o)}
              style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), background: on ? 'var(--blue-soft)' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 34, height: 34 }}><Icon name="briefcase" /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>Заказ № {o.no}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.client} · {o.requestType}</div></div>
              {on && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
            </button>
          );
        })}
        {!isOrder && !isCompany && clients.map((c) => {
          const on = picked === c;
          return (
            <button key={c} type="button" onClick={() => setPicked(c)}
              style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), background: on ? 'var(--blue-soft)' : '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={c} size={34} />
              <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: 'var(--ink)' }}>{c}</div>
              {on && <Icon name="check" style={{ width: 18, height: 18, color: 'var(--blue)' }} />}
            </button>
          );
        })}
        {isOrder && !orders.length && <EmptyState icon="briefcase" title="Заказы не найдены" />}
        {!isOrder && !isCompany && !clients.length && <EmptyState icon="user" title="Клиенты не найдены" />}
      </div>
    </Drawer>
  );
}



function FlightReceiptDrawer({ open, passengers, pax, legs, air, supplier, fare, fee, currency, onClose }) {
  const toast = useToast();
  const list = pax ? [pax] : passengers;
  const cur = currency === 'USD' ? '$' : currency;
  const money = (v) => Math.round(v).toLocaleString('ru-RU') + ' ' + cur;
  const perPax = (fare + fee) / Math.max(1, passengers.length);
  const taxRows = [{ code: 'YQ', label: 'Топливный сбор', amount: 20 }, { code: 'RI', label: 'Аэропортовый сбор', amount: 15 }];
  const taxes = taxRows.reduce((s, t) => s + t.amount, 0);
  const baseFare = Math.max(0, perPax - taxes - fee / Math.max(1, passengers.length));
  return (
    <Drawer open={open} onClose={onClose} title={pax ? 'Маршрут-квитанция · ' + pax.name : 'Маршрут-квитанция'}
      footer={<><Button variant="secondary" onClick={onClose}>Закрыть</Button>
        <Button icon="download" onClick={() => window.print()}>Скачать PDF</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.map((p, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-card)', padding: '20px 22px', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '2px solid var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AirlineLogo code={air} size="sm" />
                <div><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{AIRLINES[air].name}</div><div style={{ color: 'var(--muted)', fontSize: 12 }}>Маршрут-квитанция электронного билета</div></div>
              </div>
              <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 12 }}>Поставщик<br /><b style={{ color: 'var(--ink)' }}>{supplier}</b></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 18px', margin: '14px 0' }}>
              {[['Услуга', 'Авиаперевозка'], ['Пассажир', p.name], ['Документ', p.doc], ['PNR', p.pnr], ['Билет', p.ticket]].map(([k, v]) => (
                <div key={k}><span style={{ color: 'var(--muted)' }}>{k}: </span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{v}</span></div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Маршрут</div>
              {legs.map((leg, k) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: 'var(--body)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{leg.from} → {leg.to}</span>
                  <span style={{ color: 'var(--muted)' }}>{[leg.date, leg.flightNo].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ color: 'var(--muted)' }}>Базовый тариф</span><span style={{ color: 'var(--ink)' }}>{money(baseFare)}</span></div>
              {taxRows.map((t) => (
                <div key={t.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0 3px 14px' }}><span style={{ color: 'var(--muted)' }}>Такса {t.code} · {t.label}</span><span style={{ color: 'var(--ink)' }}>{money(t.amount)}</span></div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ color: 'var(--muted)' }}>Сервисный сбор</span><span style={{ color: 'var(--ink)' }}>{money(fee / Math.max(1, passengers.length))}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}><span>Итого</span><span>{money(perPax)}</span></div>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

function FlightCard({ svc, offer, no: noProp, hideBackRow, onBack, onFormKp, onAttachOrder, onAttachPerson }) {
  const toast = useToast();
  const [tab, setTab] = useState('segments');

  const [extrasOpen, setExtrasOpen] = useState(false);
  const [extras, setExtras] = useState({ seats: {}, baggage: {}, meal: {}, insurance: {}, special: {}, comfort: {} });
  const [refundOpen, setRefundOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [brandedOpen, setBrandedOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [attach, setAttach] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPax, setReceiptPax] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const ask = (title, message, onConfirm, confirmLabel = 'Подтвердить', confirmVariant = 'danger') =>
    setConfirm({ title, message, onConfirm, confirmLabel, confirmVariant });

  const [opConfirm, setOpConfirm] = useState(null);
  const air = svc ? svc.airline : (offer ? offer.airline : 'TK');
  const out = offer ? offer.out : { from: 'FRU', to: 'IST', dep: '04:15', arr: '08:40', date: '24 июн', dur: '6ч 25м', stopText: 'Прямой', flightNo: air + ' 131' };
  const back = offer ? offer.back : null;
  const [status, setStatus] = useState(svc ? svc.status : 'Предложение');
  const no = noProp || (svc ? svc.no : 'AV-' + Math.floor(10000 + Math.random() * 90000));
  const fare = offer ? offer.fare : (svc ? svc.sum : 0);
  const fee = offer ? offer.fee : 0;
  const currency = (svc && svc.currency) || (offer && offer.currency) || 'USD';

  const { issued, booked, offered, free } = flightStatusFlags(status, svc, offer);
  const [addPaxOpen, setAddPaxOpen] = useState(false);
  const [extraPax, setExtraPax] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [comment, setComment] = useState('');
  const [serverHistory, setServerHistory] = useState([]);
  const passengers = [...flightPassengers(svc, offer, status), ...extraPax];
  const pnr = passengers[0] ? passengers[0].pnr : (svc ? svc.pnr : '—');
  const ticket = passengers[0] ? passengers[0].ticket : (svc ? svc.ticket : '—');
  const supplier = svc ? svc.supplier : (offer ? offer.supplier : '—');

  useEffect(() => {
    if (!svc?.id) return undefined;
    const controller = new AbortController();
    Promise.all([
      documentsApi.list({ service: svc.id }, controller.signal),
      workspaceActionsApi.list({ resource_type: 'OrderService', resource_id: svc.id }, controller.signal),
    ]).then(([documents, actions]) => {
      setUploadedDocs(resultsOf(documents).map((doc) => ({ ...doc, name: doc.title, type: doc.kind, documentId: doc.id })));
      setServerHistory((actions || []).map((row) => ({ t: new Date(row.created_at).toLocaleString('ru-RU'), txt: row.payload?.comment || row.payload?.label || row.action, who: 'CRM' })));
    }).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); });
    return () => controller.abort();
  }, [svc?.id]);

  const serviceAction = async (action, payload = {}) => {
    try {
      const row = await workspaceActionsApi.execute(action, { resourceType: 'OrderService', resourceId: svc?.id || '', payload });
      setServerHistory((current) => [{ t: new Date(row.created_at).toLocaleString('ru-RU'), txt: payload.label || action, who: 'CRM' }, ...current]);
      toast(payload.label || 'Операция принята backend', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const uploadFlightDocument = async (doc) => {
    try {
      const created = await documentsApi.upload(doc.file, { order: svc.orderId || svc.order, service: svc.id, kind: 'other', title: doc.name, source: 'upload' });
      setUploadedDocs((current) => [...current, { ...created, name: created.title, type: created.kind, documentId: created.id, size: doc.size }]);
      setUploadOpen(false); toast('Документ загружен', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const addFlightComment = async () => {
    const value = comment.trim(); if (!value) return;
    await serviceAction('service.comment.add', { comment: value, label: value }); setComment('');
  };
  const createAftersale = async (type, data) => {
    if (!svc?.id || !(svc.orderId || svc.order)) throw new Error('Услуга не связана с заказом backend');
    const created = await aftersalesApi.create({
      order: svc.orderId || svc.order, service: svc.id, type, initiator: 'operator', currency,
      financial_snapshot: type === 'refund' ? {
        original_paid: data.calc.gross, supplier_penalty: data.calc.penalty,
        agency_service_fee: data.calc.fee, refund_total: data.calc.refund,
      } : { original_paid: fare + fee, exchange: data },
    });
    setServerHistory((current) => [{ t: new Date().toLocaleString('ru-RU'), txt: `Создана операция ${created.number}`, who: 'CRM' }, ...current]);
    setStatus(type === 'refund' ? 'Возврат' : 'Обмен');
    return created;
  };

  const ticketingDeadline = 'сегодня 18:00';

  const transitionService = async (target, label) => {
    if (!svc?.id) return;
    try {
      const updated = await servicesApi.transition(svc.id, { target_status: target, version: svc.version });
      svc.version = updated.version;
      svc.status = updated.status;
      setStatus(label);
      toast(`Статус услуги изменён: ${label}`, 'ok');
    } catch (error) { toast(error.message || 'Не удалось изменить статус услуги', 'err'); }
  };

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


  const bookedMenu = [
    { icon: 'luggage', label: 'Снять места', onClick: () => ask('Снять места?', 'Места по брони ' + pnr + ' будут сняты. Действие может быть необратимым.', () => serviceAction('service.booking.release', { pnr, label: 'Запрос на снятие мест отправлен' }), 'Снять места') },
    { icon: 'loader', label: 'Обновить статус бронирования', onClick: () => serviceAction('service.booking.status.refresh', { pnr, label: 'Статус запрошен у поставщика' }) },
    { icon: 'api', label: 'Запросить статус у поставщика', onClick: () => serviceAction('service.booking.status.inquiry', { pnr, label: 'Запрос статуса отправлен' }) },
    { icon: 'edit', label: 'Изменить бронирование', onClick: () => setExtrasOpen(true) },
    { icon: 'swap', label: 'Сменить поставщика', onClick: () => ask('Сменить поставщика?', 'Бронирование будет переоформлено у другого поставщика.', () => serviceAction('service.supplier.change', { supplier, label: 'Запрос смены поставщика создан' }), 'Сменить') },
    { icon: 'user', label: 'Изменить пассажира (до выписки)', onClick: () => setAddPaxOpen(true) },
    { icon: 'template', label: 'Добавить в коммерческое предложение', onClick: () => (onFormKp ? onFormKp() : setAttach('order')) },
    { icon: 'clock', label: 'История изменений', onClick: () => setTab('history') },
    { sep: true },
    { icon: 'trash', label: 'Аннулировать бронирование', danger: true, onClick: () => ask('Аннулировать бронирование?', 'Бронь ' + pnr + ' будет аннулирована. Отменить действие будет нельзя.', () => transitionService('cancelled', 'Аннулировано'), 'Аннулировать') },
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
    { icon: 'loader', label: 'Обновить статус билета', onClick: () => serviceAction('service.ticket.status.refresh', { ticket, label: 'Статус билета запрошен' }) },
    { icon: 'api', label: 'Запросить статус у поставщика', onClick: () => serviceAction('service.ticket.status.inquiry', { ticket, label: 'Запрос статуса отправлен' }) },
    { sep: true },
    { icon: 'trash', label: 'Аннулировать', danger: true, onClick: () => ask('Аннулировать билет?', 'Билет ' + ticket + ' будет аннулирован. Отменить действие будет нельзя.', () => transitionService('cancelled', 'Аннулировано'), 'Аннулировать') },
  ];
  const offerMenu = [
    { icon: 'template', label: 'В коммерческое предложение', onClick: () => (onFormKp ? onFormKp() : setAttach('order')) },
    { icon: 'briefcase', label: 'Привязать к заказу', onClick: () => setAttach('order') },
    { icon: 'user', label: 'Привязать к физ. лицу', onClick: () => setAttach('person') },
    { icon: 'download', label: 'Скачать маршрут-квитанцию', onClick: () => setReceiptOpen(true) },
    { sep: true },
    { icon: 'trash', label: 'Аннулировать', danger: true, onClick: () => ask('Снять предложение?', 'Подобранное предложение будет снято. Действие необратимо.', () => toast('Предложение снято', 'err'), 'Снять') },
  ];
  return (
    <>
    <div className="fade-in">
      {!hideBackRow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>Назад</Button>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Авиабилеты / {no}</span>
        </div>
      )}


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
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{(fare + fee).toLocaleString('ru-RU')} $</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>

            {free && (<>
              <Button icon="template" onClick={() => (onFormKp ? onFormKp() : (window.__toastNav && window.__toastNav('offers')))}>Сформировать КП</Button>
              <Button variant="secondary" icon="briefcase" onClick={() => setAttach('order')}>Добавить в заказ</Button>
            </>)}

            {!free && offered && <Button icon="check" onClick={() => setOpConfirm({ action: 'book', onConfirm: () => transitionService('booked', 'Забронировано') })}>Забронировать</Button>}

            {booked && (<>
              <Button icon="ticket" onClick={() => setOpConfirm({ action: 'issue', onConfirm: () => transitionService('issued', 'Выписано') })}>Выписать билет</Button>
              <Button variant="secondary" icon="briefcase" onClick={() => setExtrasOpen(true)}>Доп. услуги</Button>
              <Button variant="secondary" icon="send" onClick={() => setSendOpen(true)}>Отправить пассажиру</Button>
              <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>} items={bookedMenu} />
            </>)}

            {issued && (<>
              <Button icon="swap" onClick={() => setExchangeOpen(true)}>Обменять билет</Button>
              <Button variant="secondary" icon="refund" onClick={() => setRefundOpen(true)}>Возврат</Button>
              <Button variant="secondary" icon="briefcase" onClick={() => setExtrasOpen(true)}>Доп. услуги</Button>
              <Button variant="secondary" icon="send" onClick={() => setSendOpen(true)}>Отправить пассажиру</Button>
              <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>} items={issuedMenu} />
            </>)}

            {!free && offered && <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>} items={offerMenu} />}
          </div>
        </div>


        {(booked || issued) && (
          <div className="fc-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 28px', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>Рейс</div><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{AIRLINES[air].name} • {out.flightNo}</div></div>
            <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>PNR (код брони)</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontFamily: 'monospace', letterSpacing: '.03em' }}>{pnr}</div></div>

            <div className="fc-meta-item"><div style={{ fontSize: 12, color: 'var(--muted)' }}>{passengers.length > 1 ? (issued ? 'Пассажиры / билеты' : 'Пассажиры') : (issued ? 'Пассажир / билет' : 'Пассажир')}</div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                {passengers.length === 1
                  ? passengers[0].name + (issued ? ' · ' + passengers[0].ticket : '')
                  : (
                    <button type="button" onClick={() => setTab('pax')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', fontWeight: 600, fontSize: 14, textAlign: 'left' }}>
                      {passengers[0].name.split(' ').slice(0, 2).join(' ')} <span style={{ color: 'var(--muted)' }}>и ещё {passengers.length - 1}</span> · {passengers.length} {plural(passengers.length, ['пассажир', 'пассажира', 'пассажиров'])} →
                    </button>
                  )}
              </div>
            </div>
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

            <div style={{ marginTop: 12 }}>
              <FareRulesInfo airline={air} fareName={offer ? offer.fareName : 'Economy'}
                refundable={offer ? offer.refundable : true} baggage={offer ? offer.baggage : '23 кг'} />
            </div>
          </div>
        </div>
      )}


      {tab === 'pax' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>Пассажиры</div>
            <Pill tone="blue">{passengers.length} {plural(passengers.length, ['пассажир', 'пассажира', 'пассажиров'])}</Pill>
            {issued && <Pill tone="green">{passengers.filter((p) => p.ticket !== '—').length} билетов</Pill>}
            <div style={{ flex: 1 }} />
            <Button size="sm" icon="plus" onClick={() => setAddPaxOpen(true)}>Добавить пассажира</Button>
          </div>
          {passengers.map((p, i) => {
            const paxActions = issued
              ? [
                  { icon: 'download', label: 'Маршрут-квитанция', onClick: () => { setReceiptPax(p); setReceiptOpen(true); } },
                  { icon: 'ticket', label: 'Электронный билет', onClick: () => { setReceiptPax(p); setReceiptOpen(true); } },
                  { sep: true },
                  { icon: 'refund', label: 'Возврат билета', onClick: () => setRefundOpen(true) },
                  { icon: 'swap', label: 'Обмен билета', onClick: () => setExchangeOpen(true) },
                ]
              : [
                  { icon: 'user', label: 'Изменить пассажира', onClick: () => setAddPaxOpen(true) },
                  { icon: 'download', label: 'Подтверждение брони', onClick: () => serviceAction('document.booking_confirmation.generate', { passenger: p.name, pnr: p.pnr, label: 'Подтверждение брони поставлено на формирование' }) },
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
                      <button key={d} className="doc-chip" style={{ width: 'auto', flex: '0 0 auto' }} onClick={() => {
                        const document = uploadedDocs.find((item) => item.name === d || item.title === d);
                        if (document) window.open(documentsApi.downloadUrl(document.documentId || document.id), '_blank');
                        else serviceAction('document.download.request', { passenger: p.name, title: d, label: 'Документ запрошен у поставщика' });
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" style={{ width: 16, height: 16 }} />{d}</span>
                        <Icon name="download" style={{ width: 16, height: 16 }} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', borderLeft: '4px solid var(--blue)' }}>
            <span className="oc-svc-ic" style={{ background: 'var(--blue)', flex: '0 0 auto' }}><Icon name="template" /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Бланк поставщика</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Оригинал сохраняется без изменений (v1). Клиентская версия — с правкой тарифа/такс/сборов, закрытием тарифа на «IT», единично или группово.</div>
            </div>
            <Button icon="edit" onClick={() => setBrandedOpen(true)}>Корректировать бланк</Button>
          </div>
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
                <button className="icon-btn" onClick={() => window.location.assign(documentsApi.downloadUrl(d.documentId || d.id))} title="Скачать"><Icon name="download" /></button>
                <button className="icon-btn" onClick={async () => { try { await documentsApi.void(d.documentId || d.id, 'Аннулирован из карточки авиаперелёта'); setUploadedDocs((cur) => cur.filter((x) => x.id !== d.id)); } catch (error) { toast(error.message, 'err'); } }} title="Удалить"><Icon name="trash" /></button>
              </span>
            </div>
          ))}
          <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => setUploadOpen(true)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
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
            <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Внутренний комментарий…" style={{ flex: 1 }} />
            <Button icon="send" onClick={addFlightComment}>Отправить</Button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card card-pad" style={{ maxWidth: 680 }}>
          <div className="timeline">
            {serverHistory.map(({ t, txt, who }, i) => (
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
          <Button icon="check" style={{ flex: 2 }} onClick={async () => { await serviceAction('service.extras.update', { extras, label: 'Доп. услуги сохранены' }); setExtrasOpen(false); }}>Применить</Button>
        </>}>
        <ExtrasTabs pax={extrasPax} state={extras} set={setExtras} embedded />
      </StackPanel>
    )}
    {refundOpen && <RefundPanel passengers={passengers} base={fare + fee} currency={currency} onClose={() => setRefundOpen(false)} onDone={(data) => createAftersale('refund', data)} />}
    {exchangeOpen && <ExchangePanel passengers={passengers} base={fare + fee} currency={currency} origin={out.from} dest={out.to} onClose={() => setExchangeOpen(false)} onDone={(data) => createAftersale('exchange', data)} />}
    {brandedOpen && <DocCorrectionPanel
      subjects={passengers.map((pp) => ({ name: pp.name, type: pp.type, docNo: pp.ticket, ref: pp.pnr }))}
      meta={{ cfg: docCorrKind('Авиа'), supplier, route: out.from + ' → ' + out.to + (back ? ' → ' + back.to : ''), dates: out.date, carrierName: AIRLINES[air].name, baseFareTotal: fare,
        itinerary: [{ from: out.from, to: out.to, date: out.date, flightNo: out.flightNo }, ...(back ? [{ from: back.from, to: back.to, date: back.date, flightNo: back.flightNo }] : [])] }}
      currency={currency} orderNo={svc ? svc.order : null} onClose={() => setBrandedOpen(false)} />}
    <SendToPaxDrawer open={sendOpen} passengers={passengers} onClose={() => setSendOpen(false)}
      onSend={(channel, recipients) => serviceAction('document.send_passengers', { channel, recipients: recipients.map((p) => p.name), document_ids: uploadedDocs.map((d) => d.documentId || d.id), label: 'Документы переданы на отправку' })} />
    <SvcAddPaxDrawer open={addPaxOpen} isHotel={false} onClose={() => setAddPaxOpen(false)}
      onAdd={(person) => { setExtraPax((cur) => [...cur, { name: person.name, type: person.role, doc: person.doc, dob: person.dob, ticket: '—', pnr: pnr, docs: [] }]); setAddPaxOpen(false); toast('Пассажир добавлен только в текущий просмотр. Для сохранения добавьте его в карточке заказа.', 'warn'); }} />
    <SvcDocUploadDrawer open={uploadOpen} isHotel={false} participants={passengers.map((p) => ({ name: p.name }))} orderNo={svc ? svc.order : null} onClose={() => setUploadOpen(false)}
      onUploaded={uploadFlightDocument} />
    {attach && <AttachFlightDrawer mode={attach} svcTitle={out.from + ' → ' + out.to + (back ? ' → ' + back.to : '')}
      onClose={() => setAttach(null)} onDone={(msg) => toast(msg, 'ok')} />}
    <FlightReceiptDrawer open={receiptOpen} passengers={passengers} pax={receiptPax}
      legs={[{ from: out.from, to: out.to, date: out.date, flightNo: out.flightNo }, ...(back ? [{ from: back.from, to: back.to, date: back.date, flightNo: back.flightNo }] : [])]}
      air={air} supplier={supplier} fare={fare} fee={fee} currency={currency}
      onClose={() => { setReceiptOpen(false); setReceiptPax(null); }} />
    <ConfirmDialog open={!!confirm} title={confirm && confirm.title} message={confirm && confirm.message}
      confirmLabel={confirm && confirm.confirmLabel} confirmVariant={confirm && confirm.confirmVariant}
      onConfirm={() => { const c = confirm; setConfirm(null); c && c.onConfirm && c.onConfirm(); }}
      onCancel={() => setConfirm(null)} />
    {opConfirm && (
      <OperationConfirmModal open action={opConfirm.action} kind="Авиа"
        service={out.from + ' → ' + out.to + (back ? ' → ' + back.to : '') + ' · ' + AIRLINES[air].name}
        fin={{ price: fare, fee, total: fare + fee, currency: currency === 'USD' ? '$' : currency }}
        warnings={[ticketingDeadline ? 'До окончания тайм-лимита бронирования: ' + ticketingDeadline : null, 'Стоимость могла измениться с момента последнего поиска'].filter(Boolean)}
        onConfirm={opConfirm.onConfirm} onClose={() => setOpConfirm(null)} />
    )}
    </>
  );
}




function FlightsRegistry({ onNew, onOpen, onFormKp, onReturn, liveRows = [] }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fSup, setFSup] = useState('');
  const { sort, onSort, apply } = useSort({ col: 'dep', dir: 'asc' });

  const TAB_MAP = { all: null, search: 'Поиск', booked: 'Забронировано', issued: 'Выписано', refund: 'Возврат' };
  let rows = liveRows.filter((r) => {
    if (TAB_MAP[tab] && r.status !== TAB_MAP[tab]) return false;
    if (fSup && r.supplier !== fSup) return false;
    if (q && !(`${r.no} ${r.route} ${r.supplier} ${r.pnr}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = apply(rows, { sum: (r) => r.sum, no: (r) => r.no, dep: (r) => r.dep });

  const counts = (st) => liveRows.filter((r) => !st || r.status === st).length;
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
        {AIR_STATS.map((s, index) => ({ ...s, value: [liveRows.filter((r) => ['Забронировано', 'Согласование'].includes(r.status)).length, liveRows.filter((r) => r.status === 'Забронировано').length, liveRows.filter((r) => r.status === 'Согласование').length, liveRows.filter((r) => r.status === 'Возврат').length][index] || 0 })).map((s) => (
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
          options={[...new Set(liveRows.map((r) => r.supplier))]} />
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
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><AirlineLogo code={r.airline} size="sm" />{AIRLINES[r.airline]?.name || r.airline}</span></td>
                  <td>{r.pnr === '—' ? <span style={{ color: 'var(--muted-2)' }}>—</span> : r.pnr}</td>
                  <td style={{ fontSize: 13 }}>{r.ticket}</td>
                  <td>{r.supplier ? <span className="sup-badge" style={{ marginTop: 0 }}><Icon name="api" />{r.supplier}</span> : <span style={{ color: 'var(--muted-2)' }}>—</span>}</td>
                  <td>{r.dep}</td>
                  <td><Pill tone={AIR_STATUS[r.status]}>{r.status}</Pill></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.sum ? money(r.sum, r.currency) : '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[{ icon: 'eye', label: 'Открыть', onClick: () => onOpen(r) }, { icon: 'template', label: 'В КП', onClick: () => onFormKp(r) }, { sep: true }, { icon: 'refund', label: 'Возврат / обмен', danger: true, onClick: () => onReturn(r) }]} />
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

function liveFlightLeg(segment) {
  const dep = segment.departure ? new Date(segment.departure) : null;
  const arr = segment.arrival ? new Date(segment.arrival) : null;
  const minutes = dep && arr ? Math.max(0, Math.round((arr - dep) / 60000)) : 0;
  return {
    from: segment.origin || '—', to: segment.destination || '—',
    dep: dep ? dep.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—',
    arr: arr ? arr.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—',
    date: dep ? dep.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : '—',
    dur: Math.floor(minutes / 60) + 'ч ' + String(minutes % 60).padStart(2, '0') + 'м',
    stops: 0, stopText: 'Прямой', flightNo: [segment.airline, segment.flight_number].filter(Boolean).join(' '),
  };
}
function liveFlightOffer(offer) {
  const segment = offer.itinerary?.segments?.[0] || {};
  return {
    ...offer, id: offer.id, _backendOfferId: offer.id, airline: segment.airline || 'TK', supplier: offer.provider_adapter || 'Подключённый поставщик',
    refundable: Boolean(offer.fare?.refundable), baggage: offer.fare?.baggage === '0PC' ? 'Без багажа' : (offer.fare?.baggage || '—'),
    cabin: offer.fare?.cabin || 'Эконом', fareName: offer.fare?.booking_class ? `Класс ${offer.fare.booking_class}` : 'Доступный тариф',
    seatsLeft: Number(offer.availability?.seats || 9), out: liveFlightLeg(segment), back: null,
    fare: Number(offer.price?.amount || 0), fee: 0, currency: offer.price?.currency || 'USD',
  };
}
function serviceFlightRow(item) {
  const airline = item.title.match(/·\s*([A-Z0-9]{2})\b/)?.[1] || '—';
  const status = {
    searching: 'Поиск', proposed: 'Предложение', approval: 'Согласование', booked: 'Забронировано',
    confirmed: 'Забронировано', issued: 'Выписано', refund_in_progress: 'Возврат', refunded: 'Возврат',
    cancelled: 'Отменено', failed: 'Ошибка',
  }[item.status] || item.status;
  return {
    ...item,
    no: `AV-${String(item.id).slice(0, 8).toUpperCase()}`,
    order: item.order_number || item.order,
    route: item.title.split('·')[0].trim(),
    pax: item.passengers_count || 0,
    airline,
    pnr: item.external_id || '—',
    ticket: item.status === 'issued' ? (item.external_id || 'Выписан') : '—',
    supplier: item.supplier_name || 'Без поставщика',
    status,
    sum: Number(item.client_total || 0),
    currency: item.currency || 'USD',
    dep: item.starts_at ? new Date(item.starts_at).toLocaleDateString('ru-RU') : '—',
  };
}
async function loadLiveFlightOffers(params) {
  const created = await servicesApi.search({
    kind: 'avia', criteria: {
      origin: params.from, destination: params.to,
      date: params.depDate instanceof Date ? params.depDate.toISOString().slice(0, 10) : params.depDate || undefined,
      return_date: params.retDate instanceof Date ? params.retDate.toISOString().slice(0, 10) : params.retDate || undefined,
      cabin: { 'Эконом': 'economy', 'Бизнес': 'business', 'Первый': 'first' }[params.cabin] || 'economy',
      passengers: paxTotal(params.pax), currency: 'USD',
    },
  });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await servicesApi.searchStatus(created.search_id);
    if (['completed', 'partial', 'failed', 'cancelled'].includes(status.status)) {
      if (status.status === 'failed') throw new Error('Поставщики не вернули варианты перелёта');
      return resultsOf(await servicesApi.offers(created.search_id)).map(liveFlightOffer);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Поиск занимает больше обычного. Повторите попытку.');
}

function FlightsPage({ searchIntent, onConsumeSearch }) {
  const [view, setView] = useState(searchIntent ? 'results' : 'registry');
  const [svc, setSvc] = useState(null);
  const [offer, setOffer] = useState(null);
  const [cardNo, setCardNo] = useState(null);
  const [liveOffers, setLiveOffers] = useState([]);
  const [registryRows, setRegistryRows] = useState([]);
  const [searching, setSearching] = useState(!!searchIntent);
  const toast = useToast();
  useEffect(() => {
    const controller = new AbortController();
    servicesApi.list({ kind: 'avia' }, controller.signal)
      .then((payload) => setRegistryRows(resultsOf(payload).map(serviceFlightRow)))
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить авиауслуги', 'err'); });
    return () => controller.abort();
  }, []);
  const [params, setParams] = useState(() => {
    const base = {
      trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null,
      pax: { adt: 1, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} }, cabin: 'Эконом',
      baggage: false, flex: false, direct: false, airline: '',
      ...PAX_DEFAULT_OPTIONS,
    };
    const s = searchIntent && searchIntent.form;
    if (!s) return base;
    return {
      ...base,
      trip: s.trip === 'В одну сторону' ? 'ow' : 'rt',
      from: s.from || base.from, to: s.to || base.to,
      depDate: s.depDate || base.depDate, retDate: s.retDate || base.retDate,
      pax: { ...base.pax, adt: s.pax || base.pax.adt },
      cabin: s.cabin || base.cabin,
    };
  });
  const runSearch = async () => {
    setView('results'); setSearching(true); setLiveOffers([]);
    try { setLiveOffers(await loadLiveFlightOffers(params)); }
    catch (error) { toast(error.message || 'Не удалось выполнить поиск', 'err'); }
    finally { setSearching(false); }
  };
  const formKp = async (service) => {
    try {
      const until = new Date(); until.setDate(until.getDate() + 7);
      const proposal = await proposalsApi.create({
        order: service.order, type: 'standard', purpose: 'Предложение по авиауслуге', currency: service.currency || 'USD', valid_until: until.toISOString(),
        variants: [{ name: 'Вариант A', items: [{ service: service.id, title: service.route, description: service.supplier || '', quantity: 1, price_amount: Number(service.sum || 0), price_currency: service.currency || 'USD' }] }],
      });
      toast(`КП ${proposal.number} создано в backend`, 'ok');
    } catch (error) { toast(error.message || 'Не удалось создать КП', 'err'); }
  };
  const createReturn = async (service) => {
    try {
      const created = await aftersalesApi.create({ order: service.order, service: service.id, type: 'refund', initiator: 'client', currency: service.currency || 'USD' });
      toast(`Запрос ${created.number} создан в backend`, 'ok');
    } catch (error) { toast(error.message || 'Не удалось создать запрос на возврат', 'err'); }
  };
  useEffect(() => {
    if (!searchIntent) return;
    runSearch();
    onConsumeSearch && onConsumeSearch();
  }, []);

  const TITLES = { registry: 'Авиабилеты', search: 'Поиск авиабилетов', results: 'Результаты поиска', card: 'Авиауслуга' };

  return (
    <>
      <Topbar title={TITLES[view]} sub={view === 'card' && cardNo ? 'Авиабилеты · ' + cardNo : undefined}>
        <div className="topbar-spacer" />
        {view === 'registry' && <Button icon="search" onClick={() => setView('search')}>Новый поиск</Button>}
        {view === 'card' && <Button variant="secondary" icon="chevLeft" onClick={() => setView(svc ? 'registry' : 'results')}>{svc ? 'К реестру' : 'К результатам'}</Button>}
      </Topbar>
      <div className="content">
        {view === 'registry' && (
          <FlightsRegistry liveRows={registryRows} onNew={() => setView('search')} onFormKp={formKp} onReturn={createReturn}
            onOpen={(r) => { setSvc(r); setOffer(null); setCardNo(r.no); setView('card'); }} />
        )}
        {view === 'search' && (
          <FlightSearch params={params} setParams={setParams} onSearch={runSearch} />
        )}
        {view === 'results' && (
          <FlightResults params={params} liveOffers={liveOffers} loading={searching}
            onBackToSearch={() => setView('search')}
            onSelect={(o) => { setOffer(o); setSvc(null); setCardNo('AV-' + Math.floor(10000 + Math.random() * 90000)); setView('card'); toast('Предложение открыто без сохранения. Добавление в backend-заказ выполняется из карточки заказа.', 'info'); }} />
        )}
        {view === 'card' && (
          <FlightCard svc={svc} offer={offer} no={cardNo} hideBackRow onBack={() => setView(svc ? 'registry' : 'results')} />
        )}
      </div>
    </>
  );
}

Object.assign(window, { FlightsPage, AirlineLogo, FlightSearch, FlightResults, FlightCard, paxTotal, PAX_DEFAULT_OPTIONS, DocCorrectionPanel, docCorrKind });



export { AirlineLogo, durMin, money, AirportField, PAX_DEFAULT_OPTIONS, paxTotal, PAX_BASE_TYPES, SPECIAL_PAX_ICONS, SPECIAL_PAX_INFO, SUBSIDIZED_PAX_ICONS, CABIN_ICONS, PAX_OPTION_META, PaxStepper, PaxClassPicker, PaxField, FlightSearch, OfferLeg, OfferCard, FilterRail, CompareModal, FlightResults, SegmentRow, FareRulesInfo, flightStatusFlags, flightPassengers, RefundPanel, ExchangePanel, DOC_TEMPLATES, AGENCY_ENTITIES, DOC_CORR_KINDS, docCorrKind, CORR_FIELDS, corrCur, corrComputed, corrTotal, corrChanges, CorrectionPreview, CorrectionHistoryDrawer, DocCorrectionPanel, SendToPaxDrawer, ATTACH_MODES, AttachFlightDrawer, FlightReceiptDrawer, FlightCard, FlightsRegistry, liveFlightOffer, loadLiveFlightOffers, FlightsPage };
