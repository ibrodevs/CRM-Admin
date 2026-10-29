import { Button } from '../../../../shared/ui/Button.jsx';
import { HOTEL_ACTION_LABELS, hotelActionAvailability } from './hotelCapabilities.js';
const groups = [
  ['Основные действия', ['change_dates', 'change_room', 'change_guests', 'add_room', 'remove_room', 'change_meal']],
  ['Отмена', ['check_policy', 'cancel_free', 'cancel_booking', 'request_free_cancel']],
  ['Дополнительно', ['early_checkin', 'late_checkout', 'extra_bed', 'special_requests', 'contact_supplier', 'documents']],
];
export function HotelActionMenu({ data, selected, busy, onAction }) {
  return <div>{groups.map(([title, actions]) => <section key={title}><h3>{title}</h3><div className="hotel-actions-grid">{actions.map((action) => {
    const state = hotelActionAvailability(action, data, selected, busy);
    return <div key={action}><Button variant="secondary" disabled={!state.enabled} onClick={() => onAction(action)}>{HOTEL_ACTION_LABELS[action]}</Button>
      <div className="hint" style={{ fontSize: 12, marginTop: 5 }}>{!state.enabled ? state.reason : state.mode === 'manual' ? 'Ручной запрос оператору' : state.mode === 'new_booking' ? 'Требуется новое бронирование' : state.mode === 'api' ? 'API поставщика · вся бронь' : ''}</div></div>;
  })}</div></section>)}</div>;
}
