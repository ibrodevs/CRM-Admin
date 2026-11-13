import { useRef, useState } from 'react';
import { FloatingPanel } from '../../../shared/ui/FloatingPanel.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { passengerComposition, passengerTotal, transferChildSeats } from './passenger-composition.js';

export function PassengerCompositionField({ form, set, kind = 'rail' }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef(null);
  const value = passengerComposition(form);
  const update = (next) => { set('passenger_composition', next); set('pax', passengerTotal(next)); };
  const child = (index, patch) => update({ ...value, children: value.children.map((row, i) => i === index ? { ...row, ...patch } : row) });
  const chairs = transferChildSeats(form);
  const repeatChair = kind === 'transfer' && new Set(chairs).size < chairs.length;
  return <div className="av-field passenger-composition-field">
    <span className="label">Пассажиры</span>
    <button ref={anchor} type="button" className="input passenger-composition-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog">
      <Icon name="users" /><span>{value.adults} взр.{value.children.length ? ` · ${value.children.length} дет.` : ''}</span><Icon name="chevDown" />
    </button>
    {open && <FloatingPanel anchorRef={anchor} onClose={() => setOpen(false)} width={390} maxHeight={460} className="passenger-composition-menu" role="dialog" aria-label="Состав пассажиров">
      <div className="passenger-composition-title"><b>Состав пассажиров</b><button type="button" className="icon-btn" aria-label="Закрыть состав пассажиров" onClick={() => setOpen(false)}><Icon name="x" /></button></div>
      <div className="passenger-composition-adults"><div><b>Взрослые</b><small>{kind === 'transfer' ? 'От 12 лет' : 'От 18 лет'}</small></div><div className="passenger-composition-stepper"><button type="button" disabled={value.adults <= 0} aria-label="Уменьшить число взрослых" onClick={() => update({ ...value, adults: Math.max(0, value.adults - 1) })}>−</button><span>{value.adults}</span><button type="button" aria-label="Увеличить число взрослых" onClick={() => update({ ...value, adults: value.adults + 1 })}>+</button></div></div>
      <p className="passenger-composition-hint">Возраст детей укажите на дату поездки. {kind === 'rail' ? 'Детские тарифы и льготы зависят от маршрута, гражданства и перевозчика.' : 'Для детей до 12 лет подбираются подходящие кресла.'}</p>
      {value.children.map((row, index) => <section key={index} className="passenger-composition-child">
        <div><b>Ребёнок {index + 1}</b><button type="button" className="icon-btn" aria-label={`Убрать ребёнка ${index + 1}`} onClick={() => update({ ...value, children: value.children.filter((_, i) => i !== index) })}><Icon name="x" /></button></div>
        <Select aria-label={`Возраст ребёнка ${index + 1}`} menuMinWidth={170} placeholder="Выберите возраст" value={row.age ?? ''} options={Array.from({ length: kind === 'transfer' ? 12 : 18 }, (_, age) => ({ value: age, label: age === 0 ? 'До 1 года' : `${age} лет` }))} onChange={(event) => { const age = event.target.value === '' ? null : Number(event.target.value); child(index, { age, with_seat: kind === 'transfer' || age >= 5 ? true : row.with_seat }); }} />
        {kind === 'rail' && <label className="passenger-composition-seat"><input type="checkbox" checked={row.with_seat !== false} disabled={row.age >= 5} onChange={(event) => child(index, { with_seat: event.target.checked })} />Отдельное место{row.age >= 5 ? ' · обязательно' : ''}</label>}
        {kind === 'transfer' && row.age !== null && <small>{row.age < 1 ? 'Кресло до 1 года' : row.age < 3 ? 'Кресло 1–3 года' : 'Бустер от 3 лет'}</small>}
      </section>)}
      <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => update({ ...value, children: [...value.children, { age: null, with_seat: true }] })}><Icon name="plus" />Добавить ребёнка</button>
      {kind === 'rail' && <p className="passenger-composition-hint">Без отдельного места можно указать ребёнка младше 5 лет. Право на такой проезд подтверждается при оформлении.</p>}
      {repeatChair && <p className="passenger-composition-warning">Несколько кресел одного типа требуют согласования с оператором i’way.</p>}
      <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => setOpen(false)}>Готово · {passengerTotal(value)} пассажиров</button>
    </FloatingPanel>}
  </div>;
}
