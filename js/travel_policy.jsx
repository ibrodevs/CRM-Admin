import { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { Avatar, Button, Checkbox, Drawer, Input, Pill, Select, Toggle, useToast } from './ui';
import { CURRENT_USER } from './data';
import { TP_AIRLINES, TP_BOARD, TP_CAR_CLASSES, TP_CLASSES_AVIA, TP_COMPLIANCE, TP_CURRENCIES, TP_EMPLOYEES, TP_HOTEL_CATEGORIES, TP_HOTEL_CHAINS, TP_RAIL_CLASSES, TP_RAIL_TYPES, TP_SCOPES, companyStaffStore, departmentsFor, travelPolicyFor } from './data/access-control';
import { CollapseSection } from './order_extras';





function tpArr(v) { return Array.isArray(v) ? v : []; }
function tpNum(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function tpVal(offer, keys) {
  for (const k of keys) if (offer && offer[k] !== undefined && offer[k] !== null && offer[k] !== '') return offer[k];
  return null;
}
function tpBool(offer, keys) {
  const v = tpVal(offer, keys);
  return v === true || v === 'true' || v === 'Да' || v === 'yes' || v === 1;
}
function tpDateDays(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function tpPush(out, code, text) { out.push({ code, text }); }
function tpMax(out, code, fact, limit, text) {
  const f = tpNum(fact); const l = tpNum(limit);
  if (f != null && l != null && l > 0 && f > l) tpPush(out, code, text || ('Превышен лимит: ' + f + ' > ' + l));
}
function tpAllowed(out, code, fact, allowed, text) {
  const list = tpArr(allowed);
  if (fact && list.length && !list.includes(fact)) tpPush(out, code, text || ('Не входит в разрешённый список: ' + fact));
}
function tpForbidden(out, code, fact, forbidden, text) {
  if (fact && tpArr(forbidden).includes(fact)) tpPush(out, code, text || ('Запрещено политикой: ' + fact));
}
function tpClassOver(list, fact, allowed) {
  const i = list.indexOf(fact); const a = list.indexOf(allowed);
  return fact && allowed && i >= 0 && a >= 0 && i > a;
}
function tpStatus(violations, policy) {
  if (!violations.length) return policy && policy.approval && policy.approval.required && !policy.approval.autoIfCompliant ? 'approval' : 'ok';
  if (violations.some((v) => v.code === 'supplier')) return 'supplier';
  if (violations.some((v) => v.code === 'class')) return 'class';
  if (violations.some((v) => v.code === 'approval')) return 'approval';
  return 'overLimit';
}

function travelPolicyCompliance(kind, offer, policy) {
  const p = policy || {};
  const o = offer || {};
  const violations = [];
  const name = String(kind || '').toLowerCase();

  if ((name.includes('авиа') || name.includes('flight') || name.includes('air')) && p.avia) {
    const av = p.avia;
    const airline = tpVal(o, ['airline', 'carrier', 'supplier', 'provider']);
    const cls = tpVal(o, ['cls', 'class', 'serviceClass', 'cabin']);
    const price = tpVal(o, ['price', 'total', 'amount', 'fare']);
    const stops = tpNum(tpVal(o, ['stops', 'segmentsStops', 'connections']));
    const maxLayover = tpVal(o, ['maxLayoverH', 'layoverH', 'connectionHours']);
    const minLayover = tpVal(o, ['minLayoverMin', 'layoverMin', 'connectionMinutes']);
    const cheapest = tpNum(tpVal(o, ['cheapest', 'basePrice', 'minPrice']));
    tpForbidden(violations, 'supplier', airline, av.airlinesForbidden, 'Авиакомпания запрещена тревел-политикой');
    tpAllowed(violations, 'supplier', airline, av.airlinesAllowed, 'Авиакомпания не входит в разрешённый список');
    if (tpClassOver(TP_CLASSES_AVIA || [], cls, av.classAllowed)) tpPush(violations, 'class', 'Класс обслуживания выше разрешённого');
    tpMax(violations, 'overLimit', price, av.maxPrice, 'Стоимость авиабилета выше лимита');
    if (stops != null && av.stops === false && stops > 0) tpPush(violations, 'overLimit', 'Рейс с пересадкой запрещён политикой');
    tpMax(violations, 'overLimit', stops, av.maxStops, 'Количество пересадок выше лимита');
    tpMax(violations, 'overLimit', maxLayover, av.maxLayoverH, 'Продолжительность пересадки выше лимита');
    const ml = tpNum(minLayover); const minPolicy = tpNum(av.minLayoverMin);
    if (ml != null && minPolicy != null && minPolicy > 0 && ml < minPolicy) tpPush(violations, 'overLimit', 'Время пересадки меньше минимального');
    if (tpBool(o, ['nonRefundable', 'isNonRefundable']) && av.nonRefundable === false) tpPush(violations, 'overLimit', 'Невозвратный тариф запрещён');
    if (tpBool(o, ['extras', 'hasExtras', 'paidExtras']) && av.extrasAllowed === false) tpPush(violations, 'overLimit', 'Дополнительные услуги к авиабилету запрещены');
    const lead = tpDateDays(tpVal(o, ['date', 'departureDate', 'startDate']));
    const minLead = tpNum(av.minLeadDays);
    if (lead != null && minLead != null && minLead > 0 && lead < minLead) tpPush(violations, 'overLimit', 'Срок оформления меньше минимального');
    const dev = tpNum(av.deviationPct);
    const pr = tpNum(price);
    if (dev != null && dev > 0 && cheapest != null && cheapest > 0 && pr != null && pr > cheapest * (1 + dev / 100)) tpPush(violations, 'overLimit', 'Отклонение от самого дешёвого тарифа выше лимита');
  }

  if ((name.includes('жд') || name.includes('rail') || name.includes('поезд')) && p.rail) {
    const r = p.rail;
    const cls = tpVal(o, ['wagonClass', 'cls', 'class']);
    const type = tpVal(o, ['wagonType', 'type', 'trainType']);
    tpAllowed(violations, 'class', type, r.wagonTypes, 'Тип вагона не входит в разрешённый список');
    if (tpClassOver(TP_RAIL_CLASSES || [], cls, r.wagonClass)) tpPush(violations, 'class', 'Класс вагона выше разрешённого');
    tpMax(violations, 'overLimit', tpVal(o, ['price', 'total', 'amount']), r.maxPrice, 'Стоимость ЖД-билета выше лимита');
    if ((cls === 'СВ' || type === 'СВ') && r.svAllowed === false) tpPush(violations, 'class', 'СВ запрещён политикой');
    if ((cls === 'Купе' || type === 'Купе') && r.kupeAllowed === false) tpPush(violations, 'class', 'Купе запрещено политикой');
    if (tpBool(o, ['highSpeed', 'isHighSpeed']) && r.highSpeed === false) tpPush(violations, 'overLimit', 'Скоростной поезд запрещён политикой');
    const lead = tpDateDays(tpVal(o, ['date', 'departureDate', 'startDate']));
    const minLead = tpNum(r.minLeadDays);
    if (lead != null && minLead != null && minLead > 0 && lead < minLead) tpPush(violations, 'overLimit', 'Срок оформления ЖД меньше минимального');
  }

  if ((name.includes('гост') || name.includes('hotel') || name.includes('отел')) && p.hotels) {
    const h = p.hotels;
    const chain = tpVal(o, ['chain', 'hotelChain', 'supplier', 'provider', 'hotel']);
    const category = tpVal(o, ['category', 'stars', 'hotelCategory']);
    const board = tpVal(o, ['board', 'meal', 'mealPlan']);
    tpMax(violations, 'overLimit', tpVal(o, ['night', 'nightPrice', 'pricePerNight', 'price']), h.maxNight, 'Стоимость ночи выше лимита');
    if (tpNum(category) != null && tpNum(h.maxCategory) != null && tpNum(category) > tpNum(h.maxCategory)) tpPush(violations, 'class', 'Категория гостиницы выше разрешённой');
    tpAllowed(violations, 'supplier', chain, h.chainsAllowed, 'Сеть гостиницы не входит в разрешённый список');
    tpForbidden(violations, 'supplier', chain, h.forbidden, 'Гостиница или сеть запрещена политикой');
    tpMax(violations, 'overLimit', tpVal(o, ['distanceKm', 'distance', 'toOfficeKm']), h.maxDistanceKm, 'Расстояние до места назначения выше лимита');
    tpAllowed(violations, 'overLimit', board, h.boardAllowed, 'Тип питания не разрешён политикой');
    if (tpBool(o, ['earlyCheckIn']) && h.earlyCheckIn === false) tpPush(violations, 'overLimit', 'Раннее заселение запрещено');
    if (tpBool(o, ['lateCheckOut']) && h.lateCheckOut === false) tpPush(violations, 'overLimit', 'Поздний выезд запрещён');
    if (tpBool(o, ['upgrade', 'roomUpgrade']) && h.upgrade === false) tpPush(violations, 'class', 'Повышение категории номера запрещено');
  }

  if ((name.includes('трансфер') || name.includes('transfer') || name.includes('taxi')) && p.transfers) {
    const t = p.transfers;
    const cls = tpVal(o, ['carClass', 'class', 'vehicleClass']);
    tpAllowed(violations, 'class', cls, t.carClasses, 'Класс автомобиля не разрешён политикой');
    if (tpBool(o, ['individual', 'isIndividual']) && t.individual === false) tpPush(violations, 'overLimit', 'Индивидуальный трансфер запрещён');
    if (tpBool(o, ['taxi', 'isTaxi']) && t.taxi === false) tpPush(violations, 'overLimit', 'Такси запрещено политикой');
    tpMax(violations, 'overLimit', tpVal(o, ['price', 'total', 'amount']), t.maxPrice, 'Стоимость трансфера выше лимита');
  }

  if ((name.includes('доп') || name.includes('extra') || name.includes('услуг')) && p.extras) {
    const ex = p.extras;
    const map = [
      ['insurance', 'Страхование запрещено политикой'], ['visa', 'Визовая поддержка запрещена политикой'],
      ['vipLounge', 'VIP-зал запрещён политикой'], ['fastTrack', 'Fast Track запрещён политикой'], ['airportExtra', 'Дополнительные услуги аэропорта запрещены политикой']
    ];
    map.forEach(([key, text]) => { if (tpBool(o, [key, 'has' + key.charAt(0).toUpperCase() + key.slice(1)]) && ex[key] === false) tpPush(violations, 'overLimit', text); });
  }

  if (o.needsApproval) tpPush(violations, 'approval', 'Вариант требует ручного согласования');
  const status = tpStatus(violations, p);
  const requiresApproval = !!(p.approval && p.approval.required && (o.needsApproval || (violations.length && p.approval.onOverLimit) || status === 'approval'));
  return { status, reasons: violations.map((v) => v.text), violations, requiresApproval };
}


function checkTravelPolicy(kind, offer, policy) {
  return travelPolicyCompliance(kind, offer, policy).status;
}

function ComplianceBadge({ status, reasons }) {
  const c = TP_COMPLIANCE[status] || TP_COMPLIANCE.ok;
  const title = reasons && reasons.length ? reasons.join('\n') : c.label;
  return <Pill tone={c.tone} title={title}><Icon name={c.icon} style={{ width: 12, height: 12, verticalAlign: -2, marginRight: 4 }} />{c.label}</Pill>;
}


function TpNum({ label, value, onChange, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 120 }}><Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} /></div>
      {suffix && <span style={{ width: 46, fontSize: 12, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  );
}

function TpNumCur({ label, value, onChange, cur, onCur }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 120 }}><Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} /></div>
      <div style={{ width: 92 }}><Select options={TP_CURRENCIES} value={cur} onChange={(e) => onCur(e.target.value)} /></div>
    </div>
  );
}
function TpSelect({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 200 }}><Select options={options} value={value} onChange={(e) => onChange(e.target.value)} /></div>
    </div>
  );
}
function TpToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
      <Toggle on={!!value} onChange={onChange} />
    </div>
  );
}

function TpMultiSelect({ label, options, values, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const vals = values || [];
  const toggle = (o) => onChange(vals.includes(o) ? vals.filter((x) => x !== o) : [...vals, o]);
  return (
    <div style={{ padding: '7px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 5 }}>{label}</div>
      <div ref={ref} style={{ position: 'relative' }}>
        <button className="input" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 44, width: '100%', cursor: 'pointer', textAlign: 'left' }} onClick={() => setOpen((o) => !o)}>
          {vals.length ? vals.map((v) => <span key={v} className="off-tag">{v}</span>) : <span style={{ color: 'var(--muted-2)' }}>{placeholder || 'Выберите из списка…'}</span>}
          <span style={{ flex: 1 }} />
          <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
        </button>
        {open && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 60, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-modal)', maxHeight: 260, overflowY: 'auto', padding: 6 }}>
            {options.map((o) => (
              <div key={o} onClick={() => toggle(o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <Checkbox on={vals.includes(o)} onChange={() => toggle(o)} />{o}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TpPersonSearch({ placeholder, exclude, onPick }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const ex = exclude || [];
  const list = TP_EMPLOYEES.filter((n) => !ex.includes(n) && n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Input leadIcon="search" placeholder={placeholder || 'Поиск сотрудника по ФИО'} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      {open && q.trim() && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 60, background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-modal)', maxHeight: 260, overflowY: 'auto', padding: 6 }}>
          {list.length ? list.map((n) => (
            <div key={n} onClick={() => { onPick(n); setQ(''); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <Avatar name={n} size={26} /><span style={{ fontSize: 13, color: 'var(--ink)' }}>{n}</span>
            </div>
          )) : <div style={{ padding: '10px', color: 'var(--muted)', fontSize: 13 }}>Не найдено</div>}
        </div>
      )}
    </div>
  );
}

function TpApproverChain({ approvers, onChange }) {
  const list = approvers || [];
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= list.length) return; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  const remove = (i) => onChange(list.filter((_, j) => j !== i));
  const add = (name) => { if (!list.includes(name)) onChange([...list, name]); };
  return (
    <div style={{ padding: '7px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 6 }}>Цепочка согласующих (по порядку)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Согласующие не добавлены.</div>}
        {list.map((name, i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--field-line)' }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--blue)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
            <Avatar name={name} size={26} />
            <span style={{ flex: 1, fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{name}</span>
            <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} style={i === 0 ? { opacity: .35 } : null}><Icon name="chevUp" /></button>
            <button className="icon-btn" disabled={i === list.length - 1} onClick={() => move(i, 1)} style={i === list.length - 1 ? { opacity: .35 } : null}><Icon name="chevDown" /></button>
            <button className="icon-btn" onClick={() => remove(i)}><Icon name="x" /></button>
          </div>
        ))}
      </div>
      <TpPersonSearch placeholder="Добавить согласующего…" exclude={list} onPick={add} />
    </div>
  );
}


function DepartmentsManager({ companyId }) {
  const toast = useToast();
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);
  const store = companyStaffStore(companyId);
  const depts = store.departments;
  const empsOf = (d) => store.employees.filter((e) => e.dept === d.id);
  const [newDept, setNewDept] = useState('');

  const addDept = () => {
    if (!newDept.trim()) { toast('Введите название подразделения', 'info'); return; }
    depts.push({ id: 'd' + Date.now(), name: newDept.trim(), head: '', policy: '' });
    setNewDept(''); toast('Подразделение создано', 'ok'); rerender();
  };
  const removeDept = (id) => {
    const i = depts.findIndex((d) => d.id === id); if (i >= 0) depts.splice(i, 1);
    store.employees.forEach((e) => { if (e.dept === id) e.dept = ''; });
    rerender();
  };
  const invite = (dept, name) => {
    if (store.employees.some((e) => e.name === name && e.dept === dept.id)) return;
    store.employees.push({ id: 'E-' + Math.floor(1000 + Math.random() * 8999), name, dept: dept.id, position: '', phone: '', email: '', doc: '—', dob: '—', inPolicy: true });
    toast('Приглашён: ' + name, 'ok'); rerender();
  };
  const removeEmp = (emp) => { const i = store.employees.findIndex((e) => e.id === emp.id); if (i >= 0) store.employees.splice(i, 1); rerender(); };

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Создавайте отделы и подразделения и приглашайте в них сотрудников. Список общий с вкладкой «Сотрудники» компании. На подразделения можно назначать отдельную тревел-политику (область применения «Подразделение»).</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}><Input placeholder="Название подразделения" value={newDept} onChange={(e) => setNewDept(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addDept(); }} /></div>
        <Button icon="plus" onClick={addDept}>Создать подразделение</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {depts.map((d) => { const emps = empsOf(d); return (
          <div className="card card-pad" key={d.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="oc-svc-ic" style={{ width: 34, height: 34, background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="building" style={{ width: 18, height: 18 }} /></span>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{emps.length} сотрудник(ов){d.policy ? ' · политика: ' + d.policy : (d.head ? ' · руководитель ' + d.head : '')}</div></div>
              <Button variant="ghost" size="sm" icon="trash" onClick={() => removeDept(d.id)}>Удалить</Button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {emps.map((e) => (
                <span key={e.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 5px', borderRadius: 999, border: '1px solid var(--field-line)', fontSize: 12 }}>
                  <Avatar name={e.name} size={22} />{e.name}
                  <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => removeEmp(e)}><Icon name="x" style={{ width: 12, height: 12 }} /></button>
                </span>
              ))}
              {!emps.length && <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>Сотрудники не приглашены.</span>}
            </div>
            <div style={{ maxWidth: 360 }}><TpPersonSearch placeholder="Пригласить сотрудника…" exclude={emps.map((e) => e.name)} onPick={(n) => invite(d, n)} /></div>
          </div>
        ); })}
      </div>
    </div>
  );
}


function TpImportDrawer({ open, kind, companyId, onClose }) {
  const toast = useToast();
  if (!open) return null;
  const isEmp = kind === 'employees';
  const doImport = () => {
    if (isEmp) {
      const store = companyStaffStore(companyId);
      let target = store.departments[0];
      if (!target) { target = { id: 'd' + Date.now(), name: 'Импортированные', head: '', policy: '' }; store.departments.push(target); }
      ['Импортов Импорт А.', 'Импортов Импорт Б.'].forEach((n) => {
        if (!store.employees.some((e) => e.name === n && e.dept === target.id)) store.employees.push({ id: 'E-' + Math.floor(1000 + Math.random() * 8999), name: n, dept: target.id, position: '', phone: '', email: '', doc: '—', dob: '—', inPolicy: true });
      });
      toast('Сотрудники импортированы в «' + target.name + '»', 'ok');
    } else {
      toast('Тревел-политика импортирована из документа', 'ok');
    }
    onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title={isEmp ? 'Импорт сотрудников' : 'Импорт тревел-политики'} width="min(560px,96vw)"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="check" onClick={doImport}>Импортировать</Button></>}>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
        {isEmp ? 'Загрузите файл со списком сотрудников (XLSX / CSV). Сотрудники будут добавлены в подразделения компании.' : 'Загрузите документ тревел-политики (PDF / DOCX / XLSX). Параметры будут распознаны и применены к компании.'}
      </div>
      <label className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)', height: 120, flexDirection: 'column', gap: 8, cursor: 'pointer', justifyContent: 'center' }}>
        <Icon name="download" style={{ width: 26, height: 26 }} />
        <span style={{ fontWeight: 600 }}>Выберите файл или перетащите сюда</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{isEmp ? 'XLSX, CSV — до 5 МБ' : 'PDF, DOCX, XLSX — до 10 МБ'}</span>
      </label>
    </Drawer>
  );
}

function TravelPolicyBlock({ co }) {
  const toast = useToast();
  const store = travelPolicyFor(co.id);
  const [pol, setPol] = useState(() => JSON.parse(JSON.stringify(store.policy)));
  const [histOpen, setHistOpen] = useState(false);
  const [importKind, setImportKind] = useState(null);
  const [showDepts, setShowDepts] = useState(false);
  const s = (section, key, v) => setPol((p) => ({ ...p, [section]: { ...p[section], [key]: v } }));

  const diffFields = () => {
    const out = [];
    const base = store.policy;
    ['avia', 'rail', 'hotels', 'transfers', 'extras', 'approval'].forEach((sec) => {
      Object.keys(pol[sec]).forEach((k) => { if (JSON.stringify(pol[sec][k]) !== JSON.stringify(base[sec][k])) out.push(sec + ' · ' + k); });
    });
    if (pol.scope !== base.scope || pol.scopeValue !== base.scopeValue) out.push('Область применения');
    return out;
  };
  const save = () => {
    const fields = diffFields();
    if (!fields.length) { toast('Изменений нет', 'info'); return; }
    store.policy = JSON.parse(JSON.stringify(pol));
    store.history.push({ date: window.cfNow ? window.cfNow() : new Date().toLocaleString('ru-RU'), user: (CURRENT_USER && CURRENT_USER.name) || 'Оператор', title: 'Изменение тревел-политики', fields });
    toast('Тревел-политика сохранена (новая версия)', 'ok');
  };

  const deptNames = departmentsFor(co.id).map((d) => d.name);

  return (
    <div className="fade-in">

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>Тревел-политика</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Правила оформления командировок. Проверяются автоматически при подборе и бронировании.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon="download" onClick={() => setImportKind('employees')}>Импорт сотрудников</Button>
            <Button variant="secondary" size="sm" icon="download" onClick={() => setImportKind('policy')}>Импорт политики</Button>
            <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История</Button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Применяется к:</span>
          <div className="seg-toggle">
            {TP_SCOPES.map((t) => (
              <button key={t} className={'seg-btn' + (pol.scope === t ? ' active' : '')} onClick={() => setPol((p) => ({ ...p, scope: t, scopeValue: '' }))}>{t}</button>
            ))}
          </div>
          {pol.scope === 'Подразделение' && (
            <div style={{ width: 240 }}><Select placeholder="Выберите подразделение" options={deptNames} value={pol.scopeValue} onChange={(e) => setPol((p) => ({ ...p, scopeValue: e.target.value }))} /></div>
          )}
          {pol.scope === 'Должность' && (
            <div style={{ width: 240 }}><Input placeholder="Название должности" value={pol.scopeValue} onChange={(e) => setPol((p) => ({ ...p, scopeValue: e.target.value }))} /></div>
          )}
          {pol.scope === 'Сотрудник' && (
            <div style={{ width: 280 }}>
              {pol.scopeValue
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, border: '1px solid var(--field-line)' }}><Avatar name={pol.scopeValue} size={24} />{pol.scopeValue}<button className="icon-btn" onClick={() => setPol((p) => ({ ...p, scopeValue: '' }))}><Icon name="x" /></button></span>
                : <TpPersonSearch placeholder="Найдите сотрудника…" onPick={(n) => setPol((p) => ({ ...p, scopeValue: n }))} />}
            </div>
          )}
        </div>
      </div>


      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setShowDepts((v) => !v)}>
          <span className="oc-svc-ic" style={{ width: 34, height: 34, background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="users" style={{ width: 18, height: 18 }} /></span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>Подразделения и сотрудники</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Создание отделов и приглашение сотрудников</div></div>
          <Icon name={showDepts ? 'chevUp' : 'chevDown'} style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
        </div>
        {showDepts && <div style={{ borderTop: '1px solid var(--line)', padding: '16px 18px', background: 'var(--surface-2)' }}><DepartmentsManager companyId={co.id} /></div>}
      </div>


      <CollapseSection title="Авиа" note="Класс, авиакомпании, пересадки, лимиты стоимости" defaultOpen>
        <TpSelect label="Разрешённый класс обслуживания" options={TP_CLASSES_AVIA} value={pol.avia.classAllowed} onChange={(v) => s('avia', 'classAllowed', v)} />
        <TpMultiSelect label="Разрешённые авиакомпании" options={TP_AIRLINES} values={pol.avia.airlinesAllowed} onChange={(v) => s('avia', 'airlinesAllowed', v)} placeholder="Выберите авиакомпании" />
        <TpMultiSelect label="Запрещённые авиакомпании" options={TP_AIRLINES} values={pol.avia.airlinesForbidden} onChange={(v) => s('avia', 'airlinesForbidden', v)} placeholder="Выберите авиакомпании" />
        <TpToggle label="Разрешены рейсы с пересадками" value={pol.avia.stops} onChange={(v) => s('avia', 'stops', v)} />
        <TpNum label="Максимум пересадок" value={pol.avia.maxStops} onChange={(v) => s('avia', 'maxStops', v)} suffix="шт." />
        <TpNum label="Макс. продолжительность пересадки" value={pol.avia.maxLayoverH} onChange={(v) => s('avia', 'maxLayoverH', v)} suffix="ч" />
        <TpNum label="Мин. время пересадки" value={pol.avia.minLayoverMin} onChange={(v) => s('avia', 'minLayoverMin', v)} suffix="мин" />
        <TpNumCur label="Максимальная стоимость билета" value={pol.avia.maxPrice} onChange={(v) => s('avia', 'maxPrice', v)} cur={pol.avia.maxPriceCur} onCur={(v) => s('avia', 'maxPriceCur', v)} />
        <TpNum label="Допустимое отклонение от самого дешёвого" value={pol.avia.deviationPct} onChange={(v) => s('avia', 'deviationPct', v)} suffix="%" />
        <TpToggle label="Разрешены невозвратные тарифы" value={pol.avia.nonRefundable} onChange={(v) => s('avia', 'nonRefundable', v)} />
        <TpToggle label="Разрешены доп. услуги (багаж, место, бизнес-зал)" value={pol.avia.extrasAllowed} onChange={(v) => s('avia', 'extrasAllowed', v)} />
        <TpNum label="Мин. срок оформления до вылета" value={pol.avia.minLeadDays} onChange={(v) => s('avia', 'minLeadDays', v)} suffix="дн." />
      </CollapseSection>


      <CollapseSection title="ЖД" note="Классы вагонов, лимиты, типы поездов">
        <TpSelect label="Разрешённый класс вагона" options={TP_RAIL_CLASSES} value={pol.rail.wagonClass} onChange={(v) => s('rail', 'wagonClass', v)} />
        <TpMultiSelect label="Разрешённые типы вагонов" options={TP_RAIL_TYPES} values={pol.rail.wagonTypes} onChange={(v) => s('rail', 'wagonTypes', v)} placeholder="Выберите типы вагонов" />
        <TpNumCur label="Максимальная стоимость билета" value={pol.rail.maxPrice} onChange={(v) => s('rail', 'maxPrice', v)} cur={pol.rail.maxPriceCur} onCur={(v) => s('rail', 'maxPriceCur', v)} />
        <TpToggle label="Разрешено СВ" value={pol.rail.svAllowed} onChange={(v) => s('rail', 'svAllowed', v)} />
        <TpToggle label="Разрешено купе" value={pol.rail.kupeAllowed} onChange={(v) => s('rail', 'kupeAllowed', v)} />
        <TpToggle label="Разрешены скоростные поезда" value={pol.rail.highSpeed} onChange={(v) => s('rail', 'highSpeed', v)} />
        <TpNum label="Мин. срок оформления" value={pol.rail.minLeadDays} onChange={(v) => s('rail', 'minLeadDays', v)} suffix="дн." />
      </CollapseSection>


      <CollapseSection title="Гостиницы" note="Категория, стоимость за ночь, сети, услуги">
        <TpNumCur label="Максимальная стоимость за ночь" value={pol.hotels.maxNight} onChange={(v) => s('hotels', 'maxNight', v)} cur={pol.hotels.maxNightCur} onCur={(v) => s('hotels', 'maxNightCur', v)} />
        <TpSelect label="Максимальная категория гостиницы" options={TP_HOTEL_CATEGORIES} value={pol.hotels.maxCategory} onChange={(v) => s('hotels', 'maxCategory', v)} />
        <TpMultiSelect label="Разрешённые сети гостиниц" options={TP_HOTEL_CHAINS} values={pol.hotels.chainsAllowed} onChange={(v) => s('hotels', 'chainsAllowed', v)} placeholder="Выберите сети" />
        <TpMultiSelect label="Запрещённые гостиницы / сети" options={TP_HOTEL_CHAINS} values={pol.hotels.forbidden} onChange={(v) => s('hotels', 'forbidden', v)} placeholder="Выберите сети" />
        <TpNum label="Допустимое расстояние до места назначения" value={pol.hotels.maxDistanceKm} onChange={(v) => s('hotels', 'maxDistanceKm', v)} suffix="км" />
        <TpMultiSelect label="Разрешённые типы питания" options={TP_BOARD} values={pol.hotels.boardAllowed} onChange={(v) => s('hotels', 'boardAllowed', v)} placeholder="Выберите питание" />
        <TpToggle label="Разрешено раннее заселение" value={pol.hotels.earlyCheckIn} onChange={(v) => s('hotels', 'earlyCheckIn', v)} />
        <TpToggle label="Разрешён поздний выезд" value={pol.hotels.lateCheckOut} onChange={(v) => s('hotels', 'lateCheckOut', v)} />
        <TpToggle label="Разрешено повышение категории номера" value={pol.hotels.upgrade} onChange={(v) => s('hotels', 'upgrade', v)} />
      </CollapseSection>


      <CollapseSection title="Трансферы" note="Классы авто, такси, лимиты">
        <TpMultiSelect label="Разрешённые классы автомобилей" options={TP_CAR_CLASSES} values={pol.transfers.carClasses} onChange={(v) => s('transfers', 'carClasses', v)} placeholder="Выберите классы" />
        <TpToggle label="Разрешены индивидуальные трансферы" value={pol.transfers.individual} onChange={(v) => s('transfers', 'individual', v)} />
        <TpToggle label="Разрешено такси" value={pol.transfers.taxi} onChange={(v) => s('transfers', 'taxi', v)} />
        <TpNumCur label="Максимальная стоимость" value={pol.transfers.maxPrice} onChange={(v) => s('transfers', 'maxPrice', v)} cur={pol.transfers.maxPriceCur} onCur={(v) => s('transfers', 'maxPriceCur', v)} />
      </CollapseSection>


      <CollapseSection title="Дополнительные услуги" note="Что разрешено оформлять">
        <TpToggle label="Страхование" value={pol.extras.insurance} onChange={(v) => s('extras', 'insurance', v)} />
        <TpToggle label="Визовая поддержка" value={pol.extras.visa} onChange={(v) => s('extras', 'visa', v)} />
        <TpToggle label="VIP-залы" value={pol.extras.vipLounge} onChange={(v) => s('extras', 'vipLounge', v)} />
        <TpToggle label="Fast Track" value={pol.extras.fastTrack} onChange={(v) => s('extras', 'fastTrack', v)} />
        <TpToggle label="Дополнительные услуги аэропорта" value={pol.extras.airportExtra} onChange={(v) => s('extras', 'airportExtra', v)} />
      </CollapseSection>


      <CollapseSection title="Согласование" note="Кто и когда согласовывает поездку · цепочка согласующих">
        <TpToggle label="Требуется согласование поездки" value={pol.approval.required} onChange={(v) => s('approval', 'required', v)} />
        <TpApproverChain approvers={pol.approval.approvers} onChange={(v) => s('approval', 'approvers', v)} />
        <TpToggle label="Согласование при превышении лимитов" value={pol.approval.onOverLimit} onChange={(v) => s('approval', 'onOverLimit', v)} />
        <TpToggle label="Автосогласование при соблюдении политики" value={pol.approval.autoIfCompliant} onChange={(v) => s('approval', 'autoIfCompliant', v)} />
        <TpToggle label="Возможность оформления без согласования" value={pol.approval.allowWithout} onChange={(v) => s('approval', 'allowWithout', v)} />
      </CollapseSection>


      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Контроль соответствия при подборе</h3>
        <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 12 }}>При подборе услуг система автоматически проверяет тревел-политику и помечает каждый вариант. Оформление не блокируется — при нарушении указывается причина и, при необходимости, заявка отправляется по цепочке согласующих.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.keys(TP_COMPLIANCE).map((k) => (<div key={k}><ComplianceBadge status={k} /></div>))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
        <Button icon="check" onClick={save}>Сохранить тревел-политику</Button>
      </div>

      <Drawer open={histOpen} onClose={() => setHistOpen(false)} title="История изменений тревел-политики"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setHistOpen(false)}>Закрыть</Button>}>
        <div className="timeline">
          {[...store.history].reverse().map((v, i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div style={{ paddingBottom: 8 }}>
                <div className="tl-time">{v.date} · {v.user}</div>
                <div className="tl-text" style={{ fontWeight: 600 }}>{v.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{v.fields.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      <TpImportDrawer open={!!importKind} kind={importKind} companyId={co.id} onClose={() => setImportKind(null)} />
    </div>
  );
}

Object.assign(window, { TravelPolicyBlock, travelPolicyCompliance, checkTravelPolicy, ComplianceBadge, DepartmentsManager });



export { tpArr, tpNum, tpVal, tpBool, tpDateDays, tpPush, tpMax, tpAllowed, tpForbidden, tpClassOver, tpStatus, travelPolicyCompliance, checkTravelPolicy, ComplianceBadge, TpNum, TpNumCur, TpSelect, TpToggle, TpMultiSelect, TpPersonSearch, TpApproverChain, DepartmentsManager, TpImportDrawer, TravelPolicyBlock };
