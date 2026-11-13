import { DateField } from './CalendarField.jsx';
import { Field } from './Field.jsx';
import { parseCalendarDate } from './date-range.js';

const UF_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const UF_DAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function ufParseDate(value) {
  return parseCalendarDate(value);
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

function UFDateField({ value, onChange, label, required, error, hint, minYear, maxYear, minDate = null, maxDate = null, placeholder = 'дд.мм.гггг', ...props }) {
  const isBirthDate = /дата рождения/i.test(label || '');
  const today = new Date();
  const minimum = minDate || (minYear ? new Date(minYear, 0, 1) : isBirthDate ? new Date(1900, 0, 1) : null);
  const maximum = maxDate || (maxYear ? new Date(maxYear, 11, 31) : isBirthDate ? today : null);
  return <Field label={label} required={required} hint={hint} error={error}>
    <DateField value={ufParseDate(value)} onChange={(date) => onChange(ufDateString(date))} minDate={minimum} maxDate={maximum}
      placeholder={placeholder} triggerProps={{ ...props, 'aria-invalid': Boolean(error) }} formatValue={ufDateString} />
  </Field>;
}

export { UF_MONTHS, UF_DAYS, ufParseDate, ufDateString, ufDateIso, ufDateFromIso, UFDateField };
