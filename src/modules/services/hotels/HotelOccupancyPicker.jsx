import { PassengerPickerField, PassengerCounterRow } from '../search/PassengerPickerField.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { hotelOccupancy } from './search-criteria.js';

const ageLabel = (age) => `${age} ${age === 1 ? 'год' : age >= 2 && age <= 4 ? 'года' : 'лет'}`;

export function HotelOccupancyPicker({ rooms, onChange }) {
  const occupancy = hotelOccupancy(rooms);
  const update = (index, patch) => onChange(rooms.map((room, i) => i === index ? { ...room, ...patch } : room));
  return <PassengerPickerField label="" title="Номера и гости" summary={`${rooms.length} ${rooms.length === 1 ? 'номер' : rooms.length < 5 ? 'номера' : 'номеров'} · ${occupancy.guests} гостей`} total={occupancy.guests} doneDisabled={!occupancy.valid} className="hp-occupancy" triggerClassName="hp-guests-trigger">
      <div className="hp-occupancy-rooms">{rooms.map((room, index) => <section className="hp-occupancy-room pcp-shell" key={index} aria-label={`Номер ${index + 1}`}>
        <div className="hp-occupancy-heading"><b>{index + 1} номер</b>{rooms.length > 1 && <Button variant="ghost" size="sm" aria-label={`Удалить номер ${index + 1}`} onClick={() => onChange(rooms.filter((_, i) => i !== index))}>Удалить</Button>}</div>
        <PassengerCounterRow label={`Взрослые · номер ${index + 1}`} description="От 18 лет" value={room.adults} min={1} max={9} onChange={(adults) => update(index, { adults })} />
        {room.childrenAges.map((age, child) => <div className="hp-occupancy-child" key={child}>
          <Field label={`Возраст ребёнка ${child + 1}`}><Select value={age} onChange={(event) => update(index, { childrenAges: room.childrenAges.map((value, i) => i === child ? (event.target.value === '' ? '' : Number(event.target.value)) : value) })}
            options={[{ value: '', label: 'Выберите возраст' }, ...Array.from({ length: 18 }, (_, value) => ({ value, label: ageLabel(value) }))]} /></Field>
          <Button variant="ghost" size="sm" icon="x" aria-label={`Удалить ребёнка ${child + 1} из номера ${index + 1}`} onClick={() => update(index, { childrenAges: room.childrenAges.filter((_, i) => i !== child) })} />
        </div>)}
        <Button variant="secondary" size="sm" icon="plus" disabled={room.childrenAges.length >= 4} onClick={() => update(index, { childrenAges: [...room.childrenAges, ''] })}>Добавить ребёнка</Button>
      </section>)}</div>
      {!occupancy.valid && <div className="hp-occupancy-hint" role="status">Укажите возраст каждого ребёнка на дату заезда.</div>}
      <div className="hp-occupancy-footer"><Button variant="ghost" size="sm" icon="plus" disabled={rooms.length >= 5} onClick={() => onChange([...rooms, { adults: 2, childrenAges: [] }])}>Добавить номер</Button></div>
  </PassengerPickerField>;
}
