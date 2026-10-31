import { InfoNotice } from '../../../../shared/ui/InfoNotice.jsx';
import { useState } from 'react';
import { Button } from '../../../../shared/ui/Button.jsx';
import { HOTEL_ACTION_LABELS } from './hotelCapabilities.js';
export function HotelManualRequestPanel({ action, selected, busy, onSubmit, onBack }) {
  const [description, setDescription] = useState('');
  return <section className="card card-pad"><h3>{HOTEL_ACTION_LABELS[action]}</h3><InfoNotice icon="alertCircle">Создаётся запрос оператору для связи с поставщиком. Бронь, номера и стоимость автоматически не изменятся.</InfoNotice><p>Номера: {selected.join(', ') || 'Вся бронь'}</p>
    <label className="field"><span className="label">Описание запроса</span><textarea className="input" value={description} maxLength={5000} rows={5} onChange={(event) => setDescription(event.target.value)} /></label>
    <div className="hotel-actions-row"><Button variant="secondary" disabled={busy} onClick={onBack}>Назад</Button><Button disabled={busy || !description.trim()} onClick={() => onSubmit(description.trim())}>{busy ? 'Сохраняем…' : 'Создать ручной запрос'}</Button></div>
  </section>;
}
