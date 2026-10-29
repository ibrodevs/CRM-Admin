import { HotelPolicy } from './HotelBookingSummary.jsx';
import { allRoomsSelected, hotelMoney } from './hotelCapabilities.js';
export function HotelRoomsSelector({ rooms, selected, onChange, disabled }) {
  const all = allRoomsSelected(rooms, selected);
  return <section aria-label="Номера бронирования">
    <div className="hotel-actions-row"><h3>Номера</h3><span className="hint">Выбрано {selected.length} из {rooms.length}</span></div>
    {rooms.length ? <><label className="hotel-actions-checkbox"><input type="checkbox" checked={all} disabled={disabled} onChange={(event) => onChange(event.target.checked ? rooms.map((room) => room.ref) : [])} />Выбрать все</label>
      {rooms.map((room) => <article className="card card-pad" style={{ marginTop: 12 }} key={room.ref}>
        <label className="hotel-actions-checkbox"><input type="checkbox" checked={selected.includes(room.ref)} disabled={disabled} onChange={(event) => onChange(event.target.checked ? [...selected, room.ref] : selected.filter((ref) => ref !== room.ref))} /><b>{room.category}</b></label>
        <div className="hint" style={{ marginTop: 8, overflowWrap: 'anywhere' }}>Room ref: {room.ref}{room.provider_room_id ? ` · ID: ${room.provider_room_id}` : ''}{room.supplier_item_id ? ` · Supplier item: ${room.supplier_item_id}` : ''}</div>
        <p>{room.check_in || 'Дата не указана'} — {room.check_out || 'Дата не указана'}</p>
        <p>Гости: {room.guests.map((guest) => guest.name || 'Имя не указано').join(', ') || 'Распределение не указано'}</p>
        <p>Питание: {room.meal || 'Не указано'} · Статус: {room.status || 'Неизвестен'}</p>
        <p>Стоимость номера: {room.price ? hotelMoney(room.price.amount, room.price.currency) : 'Отдельная стоимость не передана поставщиком'}</p>
        <details><summary>Условия отмены номера</summary><HotelPolicy value={room.cancellation_terms} /></details>
      </article>)}
    </> : <p className="hint">В snapshot нет отдельных номеров. Проверка и отмена относятся ко всей брони.</p>}
  </section>;
}
