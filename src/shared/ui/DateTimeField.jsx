import { DateField } from './CalendarField.jsx';
import { TimeField } from './DateFields.jsx';
import { parseCalendarDate } from './date-range.js';

export function DateTimeField({ value = '', onChange, minDate = new Date() }) {
  const [day = '', rawClock = ''] = String(value).split(/[T ]/);
  const clock = rawClock.slice(0, 5);
  const chooseDate = (date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    onChange(`${iso}T${clock}`);
  };
  return <div className="calendar-datetime">
    <DateField label="Дата" value={parseCalendarDate(day)} minDate={minDate} onChange={chooseDate} />
    <TimeField label="Время" value={clock} minuteStep={1} onChange={(time) => onChange(`${day}T${time}`)} />
  </div>;
}
