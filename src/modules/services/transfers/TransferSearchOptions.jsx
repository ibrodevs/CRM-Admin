import { DateField, TimeField } from '../../../shared/ui/DateFields.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { InfoNotice } from '../../../shared/ui/InfoNotice.jsx';
import { transferDepartureParts } from '../free-booking-search.js';

const extras = [['infant_seat', 'Кресло до 1 года'], ['seat', 'Кресло 1–3 года'], ['booster', 'Бустер от 3 лет'], ['table', 'Встреча с табличкой'], ['tollroad', 'Платная дорога']];
export function TransferSearchOptions({ form, set }) {
  const arrival = form.arrival_transport || (form.flight_number ? 'flight' : form.train_number ? 'train' : 'none');
  const departure = transferDepartureParts(form);
  const date = departure.date ? new Date(`${departure.date}T12:00:00`) : null;
  return <details className="transfer-search-options">
    <summary><Icon name="filter" /><span>Расширенный поиск трансфера</span><Icon name="chevDown" className="transfer-search-options-chevron" /></summary>
    <div className="transfer-options-body">
      <InfoNotice icon="clock">Время указывается по местному времени точки подачи. Все дополнительные поля необязательны.</InfoNotice>
      <fieldset className="transfer-options-section"><legend>Подача и встреча</legend>
        <div className="transfer-options-grid">
          <div><TimeField label="Время подачи" value={form.pickup_clock || ''} onChange={(value) => set('pickup_clock', value)} placeholder="Выберите время" minuteStep={1} />{form.pickup_clock && <button type="button" className="transfer-options-clear" onClick={() => set('pickup_clock', '')}>Сбросить время</button>}</div>
          <label className="transfer-options-field"><span className="label">Текст таблички</span><Input value={form.text_tablet || ''} onChange={(e) => set('text_tablet', e.target.value)} placeholder="Например, Иван Иванов" locationAutocomplete={false} /></label>
          <label className="transfer-options-field"><span className="label">Координаты подачи</span><Input value={form.start_point || ''} onChange={(e) => set('start_point', e.target.value)} placeholder="55.7558, 37.6173" locationAutocomplete={false} /></label>
          <label className="transfer-options-field"><span className="label">Координаты назначения</span><Input value={form.finish_point || ''} onChange={(e) => set('finish_point', e.target.value)} placeholder="55.9726, 37.4146" locationAutocomplete={false} /></label>
        </div>
        <p className="transfer-options-hint">Координаты: широта, долгота. Текст таблички используется при выборе услуги «Встреча с табличкой».</p>
      </fieldset>
      <fieldset className="transfer-options-section"><legend>Рейс или поезд</legend>
        <div className="transfer-options-grid">
          <label className="transfer-options-field"><span className="label">Встреча по прибытии</span><Select aria-label="Встреча по прибытии" value={arrival} onChange={(e) => set('arrival_transport', e.target.value)} options={[{ value: 'none', label: 'Без привязки' }, { value: 'flight', label: 'Самолёт' }, { value: 'train', label: 'Поезд' }]} /></label>
          {arrival !== 'none' && <label className="transfer-options-field"><span className="label">{arrival === 'flight' ? 'Номер прибывающего рейса' : 'Номер прибывающего поезда'}</span><Input leadIcon={arrival === 'flight' ? 'plane' : 'train'} value={form[arrival === 'flight' ? 'flight_number' : 'train_number'] || ''} onChange={(e) => set(arrival === 'flight' ? 'flight_number' : 'train_number', e.target.value)} placeholder={arrival === 'flight' ? 'Например, SU 1234' : 'Например, 020А'} locationAutocomplete={false} /></label>}
          <div><DateField label="Дата отправления" value={date} onChange={(value) => set('departure_date', value)} placeholder="Выберите дату" /></div>
          <div><TimeField label="Время отправления" value={departure.clock} onChange={(value) => set('departure_clock', value)} placeholder="Выберите время" minuteStep={1} /></div>
        </div>
        <p className="transfer-options-hint">Номер прибытия — для встречи в аэропорту или на вокзале. Дату и время отправления укажите при поездке к вылетающему рейсу или отправляющемуся поезду.</p>
        {(departure.date || departure.clock) && <button type="button" className="transfer-options-clear" onClick={() => { set('departure_date', ''); set('departure_clock', ''); }}>Сбросить отправление</button>}
      </fieldset>
      <fieldset className="transfer-options-section"><legend>Дополнительные услуги</legend>
        <div className="transfer-options-extras">{extras.map(([type, label]) => <label key={type}><input type="checkbox" checked={(form.additional_service_types || []).includes(type)} onChange={(event) => set('additional_service_types', event.target.checked ? [...(form.additional_service_types || []), type] : (form.additional_service_types || []).filter((value) => value !== type))} /><span>{label}</span></label>)}</div>
        <p className="transfer-options-hint">Для детей младше 12 лет выберите подходящее кресло. Допуслуги учитываются в цене предложения.</p>
      </fieldset>
      <p className="transfer-options-hint">Обратный трансфер оформляется отдельной поездкой. После срока бесплатной отмены штраф — 100% стоимости заказа.</p>
    </div>
  </details>;
}
