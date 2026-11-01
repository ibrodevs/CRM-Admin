import React, { useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { FlightFareSummary } from './FlightFareSummary.jsx';

function Action({ icon, title, sub, onClick, danger = false }) {
  return <button type="button" className={'flight-booking-action' + (danger ? ' danger' : '')} onClick={onClick}><span className="flight-booking-action-icon"><Icon name={icon} /></span><span><strong>{title}</strong><small>{sub}</small></span><Icon name="chevRight" /></button>;
}

export function FlightBookingActionsDrawer({ service, statusTone, summary, bookingReference, segments, participants, documents, onClose, onRefresh, onExchange, onRefund, onCancel, onSend, onHistory, onDocuments, onUpload, onChat, onDelete, loading, error }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const reference = bookingReference;
  const run = (callback) => () => { onClose(); callback(); };
  const refresh = async () => {
    setBusy(true);
    try { await onRefresh(); toast('Сведения об услуге обновлены', 'ok'); }
    catch (err) { toast(err.message || 'Не удалось обновить сведения', 'err'); }
    finally { setBusy(false); }
  };
  return <Drawer open title="Действия с авиабронированием" onClose={onClose} width="min(760px, 100vw)" className="flight-booking-drawer"
    footer={<><Button variant="secondary" icon={busy ? 'loader' : 'loader'} onClick={refresh} disabled={busy || loading}>{busy ? 'Обновляем…' : 'Обновить сведения'}</Button><Button variant="secondary" onClick={onClose}>Закрыть</Button></>}>
    <section className="flight-booking-summary">
      <div><span className="flight-booking-eyebrow">Авиауслуга · {participants.length} пасс.</span><Pill tone={statusTone || 'gray'}>{service.status}</Pill></div>
      <h3>{summary?.title || service.title}</h3><p>{summary?.dates}</p>
      <dl><div><dt>Бронирование</dt><dd>{reference || 'Номер не указан'}</dd></div><div><dt>Поставщик</dt><dd>{service.supplier || 'Не указан'}</dd></div></dl>
    </section>
    <FlightFareSummary service={service} segments={segments} loading={loading} error={error} />
    <section className="flight-booking-section"><h3>Изменение бронирования</h3><div className="flight-booking-actions-grid">
      <Action icon="swap" title="Обмен билета" sub="Подобрать другой перелёт и рассчитать обмен" onClick={run(onExchange)} />
      <Action icon="refund" title="Возврат билета" sub="Оформить запрос и расчёт возврата" onClick={run(onRefund)} />
      <Action icon="x" title="Отменить услугу" sub="Открыть подтверждение отмены" onClick={run(onCancel)} danger />
    </div></section>
    <section className="flight-booking-section"><h3>Документы и общение</h3><div className="flight-booking-actions-grid">
      <Action icon="docs" title={`Документы (${documents.length})`} sub="Открыть или скачать документы по пассажирам" onClick={run(onDocuments)} />
      <Action icon="paperclip" title="Добавить файл" sub="Прикрепить документ к этой услуге" onClick={run(onUpload)} />
      <Action icon="send" title="Отправить клиенту" sub="Подготовить карточку услуги для отправки" onClick={run(onSend)} />
      <Action icon="chat" title="Обсудить в чате" sub="Перейти в чат заказа" onClick={run(onChat)} />
    </div></section>
    <section className="flight-booking-section"><h3>История</h3><Action icon="clock" title="История услуги" sub="Отправленные карточки и ответы клиента" onClick={run(onHistory)} /></section>
    <details className="flight-booking-other"><summary>Другие действия</summary><Action icon="trash" title="Удалить услугу" sub="Открыть подтверждение удаления из заказа" onClick={run(onDelete)} danger /></details>
  </Drawer>;
}
