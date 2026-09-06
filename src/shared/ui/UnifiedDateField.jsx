import { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../icons/index';
import { Field } from './index';

const UF_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const UF_DAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

function ufParseDate(value) {
  if (!value || value === '—') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const m = String(value).match(/^(\d{2})\.(\d{2})\.(\d{2}|\d{4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const dt = new Date(y, Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function ufDateString(value) {
  const dt = ufParseDate(value);
  if (!dt) return '';
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

function ufDateIso(value) {
  const dt = ufParseDate(value);
  if (!dt) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function ufDateFromIso(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

function UFDateField(_uf) {
  const { value, onChange, label, required, error, minYear, maxYear } = _uf;
  const placeholder = _uf.placeholder != null ? _uf.placeholder : 'дд.мм.гггг';
  const props = {};
  const _skip = { value: 1, onChange: 1, label: 1, required: 1, error: 1, placeholder: 1, minYear: 1, maxYear: 1 };
  for (const k in _uf) { if (!_skip[k]) props[k] = _uf[k]; }
  const isBirthDate = /дата рождения/i.test(label || '');
  const currentYear = new Date().getFullYear();
  const minY = minYear || (isBirthDate ? 1900 : currentYear - 5);
  const maxY = maxYear || (isBirthDate ? currentYear : currentYear + 20);
  const parsed = ufParseDate(value);
  const base = parsed || new Date(isBirthDate ? 1990 : currentYear, 0, 1);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [month, setMonth] = useState(base.getMonth());
  const [year, setYear] = useState(Math.min(maxY, Math.max(minY, base.getFullYear())));
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const dt = ufParseDate(value) || base;
    setMonth(dt.getMonth());
    setYear(Math.min(maxY, Math.max(minY, dt.getFullYear())));
  }, [open]);
  useEffect(() => {
    const h = (e) => {
      const portal = document.getElementById('__uf_date_portal__');
      if ((ref.current && ref.current.contains(e.target)) || (portal && portal.contains(e.target))) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const years = useMemo(() => Array.from({ length: maxY - minY + 1 }, (_, i) => maxY - i), [minY, maxY]);
  const cells = useMemo(() => {
    const out = [];
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMo = new Date(year, month + 1, 0).getDate();
    const prevMonDays = new Date(year, month, 0).getDate();
    for (let i = firstDow - 1; i >= 0; i--) {
      const pm = month === 0 ? 11 : month - 1;
      const py = month === 0 ? year - 1 : year;
      out.push({ d: new Date(py, pm, prevMonDays - i), cur: false });
    }
    for (let d = 1; d <= daysInMo; d++) out.push({ d: new Date(year, month, d), cur: true });
    let nxt = 1;
    while (out.length < 42) {
      const nm = month === 11 ? 0 : month + 1;
      const ny = month === 11 ? year + 1 : year;
      out.push({ d: new Date(ny, nm, nxt++), cur: false });
    }
    return out;
  }, [year, month]);
  const openCal = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const calH = 430, calW = 320, vh = window.innerHeight;
      let top = r.bottom + 6;
      if (top + calH > vh - 8) {
        const above = r.top - calH - 6;
        top = above >= 8 ? above : Math.max(8, vh - calH - 8);
      }
      setPos({ top, left: Math.max(8, Math.min(r.left, window.innerWidth - calW - 8)) });
    }
    setOpen((v) => !v);
  };
  const moveMonth = (delta) => {
    setMonth((m) => {
      const next = m + delta;
      if (next < 0) { setYear((y) => Math.max(minY, y - 1)); return 11; }
      if (next > 11) { setYear((y) => Math.min(maxY, y + 1)); return 0; }
      return next;
    });
  };
  const pick = (dt) => {
    onChange(ufDateString(dt));
    setOpen(false);
  };
  const cal = (
    <div id="__uf_date_portal__" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 18px 54px rgba(16,23,38,.22)', border: '1px solid var(--line)', width: 318, userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => moveMonth(-1)} className="icon-btn" style={{ width: 34, height: 34 }}><Icon name="chevLeft" style={{ width: 18, height: 18 }} /></button>
          <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ flex: 1, height: 36, padding: '0 9px', fontWeight: 700 }}>
            {UF_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 92, height: 36, padding: '0 9px', fontWeight: 700 }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => moveMonth(1)} className="icon-btn" style={{ width: 34, height: 34 }}><Icon name="chevRight" style={{ width: 18, height: 18 }} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
          {UF_DAYS.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--blue)', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map(({ d, cur }, i) => {
            const active = cur && parsed && d.getFullYear() === parsed.getFullYear() && d.getMonth() === parsed.getMonth() && d.getDate() === parsed.getDate();
            return (
              <button key={i} type="button" onClick={() => cur && pick(d)}
                style={{ height: 38, border: 'none', background: 'transparent', cursor: cur ? 'pointer' : 'default', padding: 2 }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--blue)' : 'transparent', color: active ? '#fff' : (cur ? 'var(--ink)' : 'var(--faint)'),
                  fontSize: 14, fontWeight: active ? 800 : 500 }}>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setOpen(false)} style={{ width: '100%', border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '10px 0 2px', fontFamily: 'inherit' }}>Закрыть</button>
      </div>
    </div>
  );
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Field label={label} required={required} error={error}>
        <div className={'input' + (error ? ' err' : '')} {...props}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={openCal}>
          <Icon name="calendar" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
          <span style={{ color: value ? 'var(--ink)' : 'var(--faint)', fontSize: 15, flex: 1 }}>{value || placeholder}</span>
          <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
        </div>
      </Field>
      {open && ReactDOM.createPortal(cal, document.body)}
    </div>
  );
}

export { UF_MONTHS, UF_DAYS, ufParseDate, ufDateString, ufDateIso, ufDateFromIso, UFDateField };
