import { HotelPolicy } from './HotelBookingSummary.jsx';
import { travelDate } from '../../../../shared/lib/service-presentation.js';
import { allRoomsSelected, hotelMoney, hotelStatusLabel } from './hotelCapabilities.js';

export function HotelRoomsSelector({ rooms, selected, onChange, disabled }) {
  const all = allRoomsSelected(rooms, selected);
  return <details className="hotel-booking-disclosure hotel-booking-rooms">
    <summary>Номера и гости <span>Выбрано {selected.length} из {rooms.length}</span></summary>
    <section aria-label="Номера бронирования">
      {rooms.length ? <><label className="hotel-actions-checkbox"><input type="checkbox" checked={all} disabled={disabled} onChange={(event) => onChange(event.target.checked ? rooms.map((room) => room.ref) : [])} />Выбрать все номера</label>
        {rooms.map((room, index) => <article className="hotel-room-card" key={room.ref}>
          <label className="hotel-actions-checkbox"><input type="checkbox" checked={selected.includes(room.ref)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, room.ref] : selected.filter((ref) => ref !== room.ref))} /><b>Номер {index + 1} · {room.category || 'Категория не указана'}</b></label>
          <p className="hotel-room-dates">{travelDate(room.check_in) || 'Дата не указана'} → {travelDate(room.check_out) || 'Дата не указана'}</p>
          <dl className="hotel-actions-summary">
            <div><dt>Гости</dt><dd>{room.guests.map((guest) => guest.name || 'Имя не указано').join(', ') || 'Распределение не указано'}</dd></div>
            <div><dt>Питание</dt><dd>{room.meal || 'Не указано'}</dd></div>
            <div><dt>Статус номера</dt><dd>{hotelStatusLabel(room.status)}</dd></div>
            <div><dt>Стоимость номера</dt><dd>{room.price ? hotelMoney(room.price.amount, room.price.currency) : 'Отдельная стоимость не передана поставщиком'}</dd></div>
          </dl>
          <details className="hotel-room-details"><summary>Условия отмены номера</summary><HotelPolicy value={room.cancellation_terms} /></details>
          <details className="hotel-room-details"><summary>Идентификаторы номера</summary><dl className="hotel-actions-summary">
            <div><dt>Номер в системе бронирования</dt><dd>{room.ref}</dd></div>
            {room.provider_room_id && <div><dt>Идентификатор номера поставщика</dt><dd>{room.provider_room_id}</dd></div>}
            {room.supplier_item_id && <div><dt>Идентификатор позиции поставщика</dt><dd>{room.supplier_item_id}</dd></div>}
          </dl></details>
        </article>)}
      </> : <p className="hint">Поставщик не передал отдельные номера. Проверка и отмена относятся ко всей брони.</p>}
    </section>
  </details>;
}
