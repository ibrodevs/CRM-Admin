import { travelDate } from '../../../../shared/lib/service-presentation.js';
import { useState } from 'react';
import { Button } from '../../../../shared/ui/Button.jsx';
import { HotelPolicy } from './HotelBookingSummary.jsx';
import { hotelMoney } from './hotelCapabilities.js';
export function HotelCancellationPanel({ operation, busy, onConfirm, onBack }) {
  const [accepted, setAccepted] = useState(false);
  const s = operation.original_snapshot, f = operation.financial_snapshot;
  return <section className="card card-pad" aria-label="Подтверждение отмены гостиничной брони">
    <h3>Подтвердите отмену всей брони</h3><p><b>{s.hotel}</b> · {travelDate(s.check_in)} → {travelDate(s.check_out)}</p>
    <p>Номер бронирования поставщика: <b>{operation.supplier_reference || 'Не указан'}</b></p>
    <p>Номера: {operation.room_refs.map((ref) => { const index = (s.rooms || []).findIndex((room) => room.ref === ref); return index < 0 ? ref : `Номер ${index + 1} · ${s.rooms[index].category || 'Категория не указана'}`; }).join(', ') || 'Все номера поставщика'}</p>
    <p>Стоимость поставщика: {hotelMoney(f.supplier_cost, f.currency)}<br />Стоимость клиента: {hotelMoney(f.client_cost, f.currency)}<br />Сервисный сбор: {hotelMoney(f.service_fee, f.currency)}</p>
    <HotelPolicy value={s.cancellation_policy} />
    <p>Штраф за отмену сейчас: {f.penalty == null ? 'Не удалось определить' : hotelMoney(f.penalty, f.currency)}</p>
    {f.reported_penalty && <p>Последний сообщённый поставщиком штраф: {hotelMoney(f.reported_penalty.amount, f.reported_penalty.currency)}. Перед отменой он может измениться.</p>}
    <div className="hp-cap-note">{f.warning} Отмена необратима; финансовые проводки и возврат денег выполняются отдельно.</div>
    <label className="hotel-actions-checkbox" style={{ margin: '16px 0' }}><input type="checkbox" checked={accepted} disabled={busy || !!f.cancellation_quote && !f.penalty_exact} onChange={(event) => setAccepted(event.target.checked)} />{f.cancellation_quote ? `Подтверждаю отмену всей брони со штрафом ${hotelMoney(f.penalty, f.currency)}.` : 'Подтверждаю отмену всей брони и принимаю условия поставщика, включая возможный неизвестный штраф.'}</label>
    <div className="hotel-actions-row"><Button variant="secondary" disabled={busy} onClick={onBack}>Назад</Button><Button variant="danger" disabled={!accepted || busy || !!f.cancellation_quote && !f.penalty_exact} onClick={onConfirm}>{busy ? 'Отправляем…' : 'Подтвердить отмену бронирования'}</Button></div>
  </section>;
}
