import { BookingAction } from '../../../../shared/ui/BookingAction.jsx';
import { HOTEL_ACTION_LABELS, hotelActionAvailability } from './hotelCapabilities.js';

const groups = [
  ['Изменение бронирования', ['change_dates', 'change_room', 'change_guests', 'change_meal']],
  ['Отмена бронирования', ['check_policy', 'cancel_booking', 'request_free_cancel']],
  ['Документы и связь', ['documents', 'contact_supplier']],
];
const extra = ['add_room', 'remove_room', 'early_checkin', 'late_checkout', 'extra_bed', 'special_requests'];
const descriptions = {
  change_dates: 'Запросить новые даты проживания', change_room: 'Уточнить доступность другой категории',
  change_guests: 'Изменить данные или состав гостей', change_meal: 'Запросить другой вариант питания',
  check_policy: 'Посмотреть сроки и возможные штрафы', cancel_booking: 'Проверить условия и открыть подтверждение отмены',
  request_free_cancel: 'Отправить запрос на отмену без штрафа', documents: 'Открыть сохранённые документы услуги',
  contact_supplier: 'Сохранить обращение к поставщику', add_room: 'Подобрать дополнительный номер',
  remove_room: 'Запросить удаление выбранного номера', early_checkin: 'Уточнить возможность и стоимость раннего заезда',
  late_checkout: 'Уточнить возможность и стоимость позднего выезда', extra_bed: 'Запросить дополнительное спальное место',
  special_requests: 'Передать пожелания по проживанию',
};
const icons = { change_dates: 'calendar', change_room: 'building', change_guests: 'users', change_meal: 'briefcase', check_policy: 'docs', cancel_booking: 'x', request_free_cancel: 'refund', documents: 'docs', contact_supplier: 'chat', add_room: 'plus', remove_room: 'trash', early_checkin: 'clock', late_checkout: 'clock', extra_bed: 'plus', special_requests: 'edit' };

export function HotelActionMenu({ data, selected, busy, onAction }) {
  const actionCard = (action) => {
    const state = hotelActionAvailability(action, data, selected, busy);
    const mode = state.mode === 'manual' ? ' · Ручной запрос' : state.mode === 'new_booking' ? ' · Новое бронирование' : '';
    return <BookingAction key={action} icon={icons[action]} title={HOTEL_ACTION_LABELS[action]} disabled={!state.enabled}
      sub={!state.enabled ? state.reason : descriptions[action] + mode} danger={['cancel_booking', 'remove_room'].includes(action)} onClick={() => onAction(action)} />;
  };
  return <div className="hotel-booking-menu">
    {groups.map(([title, actions]) => <section key={title} className="flight-booking-section"><h3>{title}</h3><div className="flight-booking-actions-grid">{actions.map(actionCard)}</div></section>)}
    <details className="hotel-booking-disclosure"><summary>Дополнительные действия</summary><div className="flight-booking-actions-grid">{extra.map(actionCard)}</div></details>
  </div>;
}
