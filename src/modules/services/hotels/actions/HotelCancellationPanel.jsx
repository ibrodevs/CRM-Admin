import { useState } from 'react';
import { Button } from '../../../../shared/ui/Button.jsx';
import { HotelPolicy } from './HotelBookingSummary.jsx';
import { hotelMoney } from './hotelCapabilities.js';
export function HotelCancellationPanel({ operation, busy, onConfirm, onBack }) {
  const [accepted, setAccepted] = useState(false);
  const s = operation.original_snapshot, f = operation.financial_snapshot;
  return <section className="card card-pad" aria-label="Подтверждение отмены гостиничной брони">
    <h3>Подтвердите отмену всей брони</h3><p><b>{s.hotel}</b> · {s.check_in} — {s.check_out}</p>
    <p>Номер бронирования поставщика: <b>{operation.supplier_reference || 'Не указан'}</b></p>
    <p>Номера: {operation.room_refs.join(', ') || 'Все номера поставщика'}</p>
    <p>Стоимость поставщика: {hotelMoney(f.supplier_cost, f.currency)}<br />Стоимость клиента: {hotelMoney(f.client_cost, f.currency)}<br />Сервисный сбор: {hotelMoney(f.service_fee, f.currency)}</p>
    <HotelPolicy value={s.cancellation_policy} />
    <p>Известный точный штраф: {f.penalty == null ? 'Не предоставлен' : hotelMoney(f.penalty, f.currency)}<br />Предполагаемый возврат: {f.refund == null ? 'Не определён' : hotelMoney(f.refund, f.currency)}</p>
    {f.reported_penalty && <p>Последний сообщённый поставщиком штраф: {hotelMoney(f.reported_penalty.amount, f.reported_penalty.currency)}. Перед отменой он может измениться.</p>}
    <div className="hp-cap-note">{f.warning} Отмена необратима; финансовые проводки и возврат денег выполняются отдельно.</div>
    <label className="hotel-actions-checkbox" style={{ margin: '16px 0' }}><input type="checkbox" checked={accepted} disabled={busy} onChange={(event) => setAccepted(event.target.checked)} />Подтверждаю отмену всей брони и принимаю условия поставщика, включая возможный неизвестный штраф.</label>
    <div className="hotel-actions-row"><Button variant="secondary" disabled={busy} onClick={onBack}>Назад</Button><Button variant="danger" disabled={!accepted || busy} onClick={onConfirm}>{busy ? 'Отправляем…' : 'Подтвердить отмену бронирования'}</Button></div>
  </section>;
}
