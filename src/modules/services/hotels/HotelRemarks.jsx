import { useEffect, useState } from 'react';
import { servicesApi } from '../api/servicesApi.js';

export function HotelRemarks({ offerId, value, onChange }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRows(null); setError('');
    servicesApi.hotelRemarks(offerId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRows(data.results || []);
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Не удалось загрузить пожелания'); });
    return () => controller.abort();
  }, [offerId, retry]);
  return <fieldset style={{ border: 0, padding: 0, margin: '16px 0', minWidth: 0 }}>
    <legend className="hp-col-subtitle">Пожелания в отель <span className="hp-opt">(необязательно)</span></legend>
    <p className="hint">Выберите пожелания из списка поставщика. Выполнение зависит от возможностей отеля.</p>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry((n) => n + 1)}>Повторить</button></p>}
    {!rows && !error && <p role="status">Загружаем пожелания…</p>}
    {rows?.map((row) => {
      const chosen = value.find((item) => item.remarkId === row.id);
      return <div key={row.id} style={{ marginBottom: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'start', overflowWrap: 'anywhere' }}>
          <input type="checkbox" checked={!!chosen} onChange={(event) => onChange(event.target.checked ? [...value, { remarkId: row.id, data: row.dataType === 'NONE' ? null : '' }] : value.filter((item) => item.remarkId !== row.id))} />
          <span>{row.title.replaceAll('{value}', '…')}</span>
        </label>
        {chosen && row.dataType !== 'NONE' && <input className="input" type={row.dataType === 'DATETIME' ? 'datetime-local' : 'text'} aria-label={`Значение: ${row.title}`} maxLength={2000} required value={chosen.data || ''}
          onChange={(event) => onChange(value.map((item) => item.remarkId === row.id ? { ...item, data: event.target.value } : item))} style={{ marginTop: 8, width: '100%' }} />}
      </div>;
    })}
    {rows && !rows.length && <p>Доступных пожеланий нет.</p>}
  </fieldset>;
}
