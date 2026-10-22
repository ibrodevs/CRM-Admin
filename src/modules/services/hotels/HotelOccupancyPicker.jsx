import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { hotelOccupancy } from './search-criteria.js';

const ageLabel = (age) => `${age} ${age === 1 ? 'год' : age >= 2 && age <= 4 ? 'года' : 'лет'}`;

export function HotelOccupancyPicker({ rooms, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  const occupancy = hotelOccupancy(rooms);
  const update = (index, patch) => onChange(rooms.map((room, i) => i === index ? { ...room, ...patch } : room));
  useEffect(() => {
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    if (open) { document.addEventListener('mousedown', close); document.addEventListener('keydown', escape); }
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="hp-occupancy" ref={ref}>
    <button type="button" className="hp-guests-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
      <span>{rooms.length} {rooms.length === 1 ? 'номер' : rooms.length < 5 ? 'номера' : 'номеров'} · {occupancy.guests} гостей</span><Icon name="chevDown" />
    </button>
    {open && <div className="hp-guests-pop hp-occupancy-pop" id={id} role="dialog" aria-label="Номера и гости">
      <div className="hp-occupancy-rooms">{rooms.map((room, index) => <section className="hp-occupancy-room" key={index} aria-label={`Номер ${index + 1}`}>
        <div className="hp-occupancy-heading"><b>{index + 1} номер</b>{rooms.length > 1 && <Button variant="ghost" size="sm" aria-label={`Удалить номер ${index + 1}`} onClick={() => onChange(rooms.filter((_, i) => i !== index))}>Удалить</Button>}</div>
        <div className="hp-stepper-row"><span>Взрослые<small>От 18 лет</small></span><div className="hp-stepper">
          <button type="button" aria-label={`Уменьшить взрослых в номере ${index + 1}`} disabled={room.adults <= 1} onClick={() => update(index, { adults: room.adults - 1 })}>−</button><b aria-live="polite">{room.adults}</b>
          <button type="button" aria-label={`Добавить взрослого в номер ${index + 1}`} disabled={room.adults >= 9} onClick={() => update(index, { adults: room.adults + 1 })}>+</button>
        </div></div>
        {room.childrenAges.map((age, child) => <div className="hp-occupancy-child" key={child}>
          <Field label={`Возраст ребёнка ${child + 1}`}><Select value={age} onChange={(event) => update(index, { childrenAges: room.childrenAges.map((value, i) => i === child ? (event.target.value === '' ? '' : Number(event.target.value)) : value) })}
            options={[{ value: '', label: 'Выберите возраст' }, ...Array.from({ length: 18 }, (_, value) => ({ value, label: ageLabel(value) }))]} /></Field>
          <Button variant="ghost" size="sm" icon="x" aria-label={`Удалить ребёнка ${child + 1} из номера ${index + 1}`} onClick={() => update(index, { childrenAges: room.childrenAges.filter((_, i) => i !== child) })} />
        </div>)}
        <Button variant="secondary" size="sm" icon="plus" disabled={room.childrenAges.length >= 4} onClick={() => update(index, { childrenAges: [...room.childrenAges, ''] })}>Добавить ребёнка</Button>
      </section>)}</div>
      {!occupancy.valid && <div className="hp-occupancy-hint" role="status">Укажите возраст каждого ребёнка на дату заезда.</div>}
      <div className="hp-occupancy-footer"><Button variant="ghost" size="sm" icon="plus" disabled={rooms.length >= 5} onClick={() => onChange([...rooms, { adults: 2, childrenAges: [] }])}>Добавить номер</Button><Button size="sm" disabled={!occupancy.valid} onClick={() => setOpen(false)}>Готово</Button></div>
    </div>}
  </div>;
}
