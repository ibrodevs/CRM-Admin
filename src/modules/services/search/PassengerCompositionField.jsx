import { TransferSearchExtras } from './SearchExtras.jsx';
import { PassengerPickerField, PassengerCounterRow } from './PassengerPickerField.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { passengerComposition, passengerTotal, transferChildSeats } from './passenger-composition.js';

export function PassengerCompositionField({ form, set, kind = 'rail' }) {
  const value = passengerComposition(form);
  const update = (next) => { set('passenger_composition', next); set('pax', passengerTotal(next)); };
  const child = (index, patch) => update({ ...value, children: value.children.map((row, i) => i === index ? { ...row, ...patch } : row) });
  const chairs = transferChildSeats(form);
  const repeatChair = kind === 'transfer' && new Set(chairs).size < chairs.length;
  return <PassengerPickerField label="Пассажиры" title="Состав пассажиров" summary={`${value.adults} взр.${value.children.length ? ` · ${value.children.length} дет.` : ''}`} total={passengerTotal(value)} className="passenger-composition-field">
    <div className="pcp-shell"><div className="pcp passenger-composition-content">
      <div className="pcp-sec-head"><span className="t">Пассажиры</span><span className="pcp-total">Всего: {passengerTotal(value)}</span></div>
      <PassengerCounterRow label="Взрослые" description={kind === 'transfer' ? 'От 12 лет' : 'От 18 лет'} value={value.adults} onChange={(adults) => update({ ...value, adults })} />
      <p className="passenger-composition-hint">Возраст детей укажите на дату поездки. {kind === 'rail' ? 'Детские тарифы и льготы зависят от маршрута, гражданства и перевозчика.' : 'Для детей до 12 лет подбираются подходящие кресла.'}</p>
      {value.children.map((row, index) => <section key={index} className="passenger-composition-child passenger-picker-child">
        <div><b>Ребёнок {index + 1}</b><button type="button" className="icon-btn" aria-label={`Убрать ребёнка ${index + 1}`} onClick={() => update({ ...value, children: value.children.filter((_, i) => i !== index) })}><Icon name="x" /></button></div>
        <Select aria-label={`Возраст ребёнка ${index + 1}`} menuMinWidth={170} placeholder="Выберите возраст" value={row.age ?? ''} options={Array.from({ length: kind === 'transfer' ? 12 : 18 }, (_, age) => ({ value: age, label: age === 0 ? 'До 1 года' : `${age} лет` }))} onChange={(event) => { const age = event.target.value === '' ? null : Number(event.target.value); child(index, { age, with_seat: kind === 'transfer' || age >= 5 ? true : row.with_seat }); }} />
        {kind === 'rail' && <label className="passenger-composition-seat"><input type="checkbox" checked={row.with_seat !== false} disabled={row.age >= 5} onChange={(event) => child(index, { with_seat: event.target.checked })} />Отдельное место{row.age >= 5 ? ' · обязательно' : ''}</label>}
      </section>)}
      <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={() => update({ ...value, children: [...value.children, { age: null, with_seat: true }] })}><Icon name="plus" />Добавить ребёнка</button>
      {kind === 'rail' && <p className="passenger-composition-hint">Без отдельного места можно указать ребёнка младше 5 лет. Право на такой проезд подтверждается при оформлении.</p>}
      {kind === 'transfer' && <TransferSearchExtras form={form} set={set} />}
      {repeatChair && <p className="passenger-composition-warning">Несколько кресел одного типа требуют согласования с оператором i’way.</p>}
    </div></div>
  </PassengerPickerField>;
}
