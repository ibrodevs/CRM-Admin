import { useEffect, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { servicesApi } from '../api/servicesApi.js';
import { apiRequest } from '../../../shared/api/client.js';
import { documentsApi } from '../../documents/api.js';

export function saveHotelBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Gallery({ photos, label }) {
  if (!photos?.length) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Поставщик не передал фотографии.</p>;
  return <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
    {photos.map((photo, i) => <a key={photo.url} href={photo.url} target="_blank" rel="noopener noreferrer" style={{ display: 'grid', gap: 4, maxWidth: 220 }} title="Открыть оригинал фотографии для сохранения">
      <img src={photo.thumbnail || photo.url} alt={photo.description || `${label}, фото ${i + 1}`} loading="lazy" referrerPolicy="no-referrer" style={{ width: 200, height: 135, objectFit: 'cover', borderRadius: 8 }} />
      <span style={{ fontSize: 12 }}>Открыть / сохранить фото</span>
    </a>)}
  </div>;
}

export function HotelContent({ offerId, serviceId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    servicesApi.hotelContent({ offerId, serviceId }, controller.signal).then((payload) => {
      if (!controller.signal.aborted) setData(payload);
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Не удалось загрузить номера'); });
    return () => controller.abort();
  }, [offerId, serviceId, retry]);
  const exportRooms = async () => {
    setExporting(true); setError('');
    try {
      const blob = await servicesApi.hotelRoomsCsv({ offerId, serviceId });
      saveHotelBlob(blob, `hotel-${data.hotel.id}-rooms.csv`);
    } catch (err) { setError(err.message || 'Не удалось выгрузить номера'); }
    finally { setExporting(false); }
  };
  return <section style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 12, margin: '16px 0' }} aria-label="Номерной фонд и фотографии">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
      <h3 style={{ margin: 0, flex: 1 }}>Номерной фонд и фотографии</h3>
      {data && <Button size="sm" variant="secondary" icon="download" disabled={exporting} onClick={exportRooms}>{exporting ? 'Выгрузка…' : 'Скачать перечень номеров (CSV)'}</Button>}
    </div>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry((n) => n + 1)}>Повторить</button></p>}
    {!data && !error && <p role="status">Загружаем информацию гостиницы…</p>}
    {data && <>
      <h4>{data.hotel.name}</h4>
      <p>{data.hotel.address}</p>
      {data.hotel.description && <p style={{ whiteSpace: 'pre-line' }}>{data.hotel.description}</p>}
      <Gallery photos={data.hotel.photos} label={data.hotel.name} />
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>Каталог категорий гостиницы. Наличие и цена на выбранные даты определяются результатами поиска.</p>
      {!data.rooms.length && <p>Поставщик не передал каталог номеров для этой гостиницы.</p>}
      {data.rooms.map((room) => <article key={room.id} style={{ borderTop: '1px solid var(--border)', padding: '14px 0' }}>
        <h4 style={{ margin: '0 0 8px' }}>{room.name || 'Категория номера'} {data.selected_room_ids.includes(room.id) && <small> · Номер выбранного тарифа</small>}</h4>
        {room.description && <p style={{ whiteSpace: 'pre-line' }}>{room.description}</p>}
        {!!room.amenities.length && <p>{room.amenities.join(' · ')}</p>}
        <Gallery photos={room.photos} label={room.name} />
      </article>)}
    </>}
  </section>;
}

export function HotelServiceTools({ serviceId, capabilities, onDocumentCreated }) {
  const [showContent, setShowContent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!capabilities) return null;
  const available = ['confirmed', 'cancelled'].includes(capabilities.certificate_status);
  const certificate = async () => {
    setBusy(true); setError('');
    try {
      const doc = await servicesApi.hotelCertificate(serviceId);
      const blob = await apiRequest(documentsApi.downloadUrl(doc.id));
      saveHotelBlob(blob, `hotel-certificate-${serviceId}.pdf`);
      await onDocumentCreated?.(doc);
    } catch (err) { setError(err.message || 'Не удалось скачать сертификат'); }
    finally { setBusy(false); }
  };
  return <div style={{ margin: '12px 0' }}>
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <Button size="sm" icon="download" disabled={busy || !available} onClick={certificate}>{busy ? 'Формируем…' : capabilities.certificate_status === 'cancelled' ? 'Сертификат об отменённой брони (PDF)' : 'Скачать сертификат на проживание (PDF)'}</Button>
      <Button size="sm" variant="secondary" onClick={() => setShowContent((value) => !value)}>{showContent ? 'Скрыть номера и фото' : 'Номера и фотографии гостиницы'}</Button>
    </div>
    {!available && <p style={{ fontSize: 13, color: 'var(--muted)' }}>Сертификат появится после подтверждения брони. При необходимости обновите статус бронирования.</p>}
    {error && <p role="alert">{error}</p>}
    {showContent && <HotelContent serviceId={serviceId} />}
  </div>;
}
