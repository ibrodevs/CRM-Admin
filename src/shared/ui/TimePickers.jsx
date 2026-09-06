import { useState } from 'react';

function ClockTimePicker({ value = '09:00', onChange }) {
  const [hRaw, mRaw] = String(value).split(':');
  const hour24 = Math.max(0, Math.min(23, parseInt(hRaw, 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(mRaw, 10) || 0));
  const pm = hour24 >= 12;
  const hour12 = ((hour24 + 11) % 12) + 1;
  const emit = (h12, min, isPm) => {
    let h = h12 % 12; if (isPm) h += 12;
    onChange && onChange(String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0'));
  };
  const R = 78, C = 96, hand = 54;
  const ang = (hour12 % 12) * 30 - 90;
  const hx = C + hand * Math.cos(ang * Math.PI / 180);
  const hy = C + hand * Math.sin(ang * Math.PI / 180);
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={C * 2} height={C * 2} style={{ flexShrink: 0 }}>
        <circle cx={C} cy={C} r={C - 4} fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1.5" />
        <line x1={C} y1={C} x2={hx} y2={hy} stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={C} cy={C} r="5" fill="var(--blue)" />
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const a = (n * 30 - 90) * Math.PI / 180;
          const x = C + R * Math.cos(a), y = C + R * Math.sin(a);
          const active = n === (hour12 % 12 || 12);
          return (
            <g key={n} style={{ cursor: 'pointer' }} onClick={() => emit(n, minute, pm)}>
              <circle cx={x} cy={y} r="14" fill={active ? 'var(--blue)' : 'transparent'} />
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                fontSize="13" fontWeight="700" fill={active ? '#fff' : 'var(--ink)'}>{n}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
          {String(hour24).padStart(2, '0')}:{String(minute).padStart(2, '0')}
        </div>
        <div style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
          {[['День', false], ['Ночь', true]].map(([lbl, isPm]) => (
            <button key={lbl} type="button" onClick={() => emit(hour12, minute, isPm)}
              style={{ padding: '6px 12px', fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: pm === isPm ? 'var(--blue)' : '#fff', color: pm === isPm ? '#fff' : 'var(--muted)' }}>{lbl}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[0, 15, 30, 45].map((m) => (
            <button key={m} type="button" onClick={() => emit(hour12, m, pm)}
              style={{ padding: '5px 9px', fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                border: '1px solid ' + (minute === m ? 'var(--blue)' : 'var(--line)'),
                background: minute === m ? 'var(--blue-soft)' : '#fff', color: minute === m ? 'var(--blue)' : 'var(--muted)' }}>:{String(m).padStart(2, '0')}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const WH_DAY_RANGES = ['Пн–Пт', 'Пн–Сб', 'Пн–Вс', 'Сб–Вс'];

function WorkHoursPicker({ value = 'Пн–Пт 09:00–18:00', onChange }) {
  const round = /круглосуточ/i.test(value);
  const m = String(value).match(/(\S+)\s+(\d{2}:\d{2})[–-](\d{2}:\d{2})/);
  const days = m ? m[1] : 'Пн–Пт';
  const from = m ? m[2] : '09:00';
  const to = m ? m[3] : '18:00';
  const [editing, setEditing] = useState(null);
  const set = (d, f, t) => onChange && onChange(d + ' ' + f + '–' + t);
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12, background: '#fff' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer', marginBottom: round ? 0 : 12 }}>
        <input type="checkbox" checked={round} onChange={(e) => onChange && onChange(e.target.checked ? 'Круглосуточно' : (days + ' ' + from + '–' + to))} />
        Круглосуточно
      </label>
      {!round && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <select className="select" style={{ width: 'auto', minWidth: 110 }} value={days} onChange={(e) => set(e.target.value, from, to)}>
              {WH_DAY_RANGES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button type="button" onClick={() => setEditing(editing === 'from' ? null : 'from')}
              style={{ padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                border: '1px solid ' + (editing === 'from' ? 'var(--blue)' : 'var(--line)'), background: editing === 'from' ? 'var(--blue-soft)' : '#fff', color: 'var(--ink)' }}>с {from}</button>
            <span style={{ color: 'var(--muted)' }}>—</span>
            <button type="button" onClick={() => setEditing(editing === 'to' ? null : 'to')}
              style={{ padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                border: '1px solid ' + (editing === 'to' ? 'var(--blue)' : 'var(--line)'), background: editing === 'to' ? 'var(--blue-soft)' : '#fff', color: 'var(--ink)' }}>до {to}</button>
          </div>
          {editing && (
            <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{editing === 'from' ? 'Открытие' : 'Закрытие'} — задайте циферблатом</div>
              <ClockTimePicker value={editing === 'from' ? from : to}
                onChange={(v) => (editing === 'from' ? set(days, v, to) : set(days, from, v))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { ClockTimePicker, WH_DAY_RANGES, WorkHoursPicker };
