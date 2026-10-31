import { DateField, TripDateRangeField } from '../../../shared/ui/DateFields.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { ServiceSearchHeader } from './ServiceSearchHeader.jsx';
import { searchHeaderDate, searchPassengerCount } from './search-header.js';

export function FlightSearchHeader({ values, onSearch, busy, title = 'Авиабилеты', subtitle, supplier, renderAirport, renderPassengers, fixedPassengers, onEditingChange, children }) {

  const wrap = (label, control) => <div className="av-field"><span className="label">{label}</span>{control}</div>;
  const fields = (active) => {
    const tripOptions = [{ value: 'ow', label: 'В одну сторону' }, { value: 'rt', label: 'Туда и обратно' }, { value: 'mc', label: 'Сложный маршрут' }];
    const list = [{ key: 'trip', label: 'Маршрут', value: tripOptions.find((option) => option.value === active.trip)?.label,
      render: (draft, update) => wrap('Маршрут', <Select aria-label="Маршрут" options={tripOptions} value={draft.trip} onChange={(event) => update({ trip: event.target.value, ...(event.target.value === 'mc' && !draft.segments?.length ? { segments: [{ from: draft.from, to: draft.to, date: draft.depDate }, { from: draft.to, to: '', date: null }] } : {}) })} />) }];
    if (active.trip === 'mc') {
      (active.segments || []).forEach((segment, index) => {
        for (const [key, label] of [['from', 'Откуда'], ['to', 'Куда'], ['date', 'Дата']]) list.push({ key: `segment-${index}-${key}`, label: `${label} · ${index + 1}`, value: key === 'date' ? searchHeaderDate(segment.date) : segment[key], icon: key === 'date' ? 'calendar' : 'plane',
          render: (draft, update) => { const change = (value) => update({ segments: draft.segments.map((row, i) => i === index ? { ...row, [key]: value } : row) }); return key === 'date' ? wrap(`${label} · ${index + 1}`, <DateField value={draft.segments[index].date} onChange={change} />) : renderAirport(`${label} · ${index + 1}`, draft.segments[index][key], change); } });
      });
    } else {
      for (const [key, label] of [['from', 'Откуда'], ['to', 'Куда']]) list.push({ key, label, value: active[key], icon: 'plane', render: (draft, update) => renderAirport(label, draft[key], (value) => update({ [key]: value })) });
      list.push({ key: 'dates', label: active.trip === 'rt' ? 'Даты поездки' : 'Дата вылета', value: searchHeaderDate(active.depDate) + (active.trip === 'rt' ? ` — ${searchHeaderDate(active.retDate)}` : ''), icon: 'calendar',
        render: (draft, update) => wrap(draft.trip === 'rt' ? 'Даты поездки' : 'Дата вылета', draft.trip === 'rt' ? <TripDateRangeField startVal={draft.depDate} endVal={draft.retDate} onChange={(start, end) => update({ depDate: start, retDate: end })} /> : <DateField value={draft.depDate} onChange={(value) => update({ depDate: value })} />) });
    }
    list.push({ key: 'passengers', label: 'Пассажиры и класс', value: `${fixedPassengers ?? searchPassengerCount(active.pax)} пасс. · ${active.cabin || 'Эконом'}`, icon: 'users',
      render: (draft, update) => renderPassengers ? renderPassengers(draft, update) : wrap('Пассажиры', <Input aria-label="Пассажиры" type="number" min={1} value={draft.pax?.adt || 1} onChange={(event) => update({ pax: { ...draft.pax, adt: Math.max(1, Number(event.target.value)) } })} />) });
    return list;
  };
  return <ServiceSearchHeader title={title} subtitle={subtitle || (values.trip === 'mc' ? 'Перелёт с несколькими сегментами' : `${values.from || 'Откуда'} → ${values.to || 'Куда'}`)} supplier={supplier} icon="plane" values={values} fields={fields} onSearch={onSearch} busy={busy} onEditingChange={onEditingChange}>{children}</ServiceSearchHeader>;
}
