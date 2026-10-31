import { InfoNotice } from '../../../../shared/ui/InfoNotice.jsx';
import { useEffect, useRef, useState } from 'react';
import { Drawer } from '../../../../shared/ui/Overlays.jsx';
import { Button } from '../../../../shared/ui/Button.jsx';
import { documentsApi } from '../../../documents/api.js';
import { servicesApi } from '../../api.js';
import { HotelBookingSummary, HotelPolicy } from './HotelBookingSummary.jsx';
import { HotelRoomsSelector } from './HotelRoomsSelector.jsx';
import { HotelActionMenu } from './HotelActionMenu.jsx';
import { HotelCancellationPanel } from './HotelCancellationPanel.jsx';
import { HotelManualRequestPanel } from './HotelManualRequestPanel.jsx';
import { hotelActionsApi } from './hotelActionsApi.js';
import { HOTEL_ACTION_LABELS, HOTEL_OPERATION_STATUS, hotelActionAvailability } from './hotelCapabilities.js';

export function HotelBookingActionsDrawer({ serviceId, onClose, onChanged, onNewBooking }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [panel, setPanel] = useState(null);
  const [cancelOperation, setCancelOperation] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState(null);
  const inFlight = useRef(false), retryKey = useRef(null), initialized = useRef(false);
  const policyRef = useRef(null), docsRef = useRef(null), lastVersion = useRef(null), changedRef = useRef(onChanged);
  useEffect(() => { changedRef.current = onChanged; }, [onChanged]);
  const load = async (signal) => {
    const payload = await hotelActionsApi.detail(serviceId, signal);
    if (signal?.aborted) return;
    setData(payload);
    if (lastVersion.current != null && lastVersion.current !== payload.summary.version) changedRef.current?.();
    lastVersion.current = payload.summary.version;
    const firstLoad = !initialized.current;
    initialized.current = true;
    setSelected((old) => firstLoad ? payload.summary.rooms.map((room) => room.ref) : old.filter((ref) => payload.summary.rooms.some((room) => room.ref === ref)));
  };
  useEffect(() => {
    const controller = new AbortController();
    initialized.current = false; lastVersion.current = null; setData(null); setError(''); setPanel(null); setDocs(null); retryKey.current = null;
    load(controller.signal).catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Не удалось загрузить гостиничную бронь'); });
    return () => controller.abort();
  }, [serviceId]);
  const pending = data?.operations.some((op) => ['submitted_to_supplier', 'awaiting_supplier'].includes(op.status));
  useEffect(() => {
    if (!pending || busy) return;
    const controller = new AbortController();
    const timer = setTimeout(() => { load(controller.signal).catch((err) => { if (!controller.signal.aborted) setError(err.message); }); }, 2000);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [data, pending, busy, serviceId]);
  const perform = async (fn) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (err) { setError(err.message || 'Не удалось выполнить действие'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const create = async (action, description = '') => {
    const body = { operation_type: action, scope: ['refresh', 'cancel_booking'].includes(action) ? 'booking' : selected.length ? 'rooms' : 'booking', room_refs: selected, requested_changes: description ? { description } : action === 'cancel_booking' ? { cancellation_mode: 'penalty' } : {} };
    const fingerprint = JSON.stringify(body);
    if (retryKey.current?.fingerprint !== fingerprint) retryKey.current = { fingerprint, key: crypto.randomUUID() };
    const operation = await hotelActionsApi.create(serviceId, body, retryKey.current.key);
    retryKey.current = null;
    await load();
    return operation;
  };
  const loadDocuments = async () => {
    const payload = await documentsApi.all({ order: data.summary.order_id });
    setDocs(payload.results.filter((doc) => String(doc.service) === String(serviceId)));
  };
  const act = (action) => {
    const available = hotelActionAvailability(action, data, selected, busy);
    if (!available.enabled) return;
    if (action === 'check_policy') { policyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (action === 'documents') { perform(async () => { await loadDocuments(); docsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); return; }
    if (available.mode === 'manual') { setPanel(action); return; }
    if (available.mode === 'new_booking') { setPanel('new_booking'); return; }
    perform(async () => {
      const operation = await create(action);
      if (action === 'cancel_booking') { setCancelOperation(operation); setPanel('cancel'); }
      else setNotice('Запрос проверки поставлен в очередь. Здесь появится фактический результат поставщика.');
    });
  };
  return <Drawer open={!!serviceId} onClose={busy ? undefined : onClose} width="min(820px,96vw)" title="Действия с гостиничной бронью" sub={data?.summary.hotel || 'Загружаем данные брони'}>
    <div className="hotel-booking-actions">
      {error && <div className="err-text" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {notice && <div className="hp-cap-note info" role="status">{notice}</div>}
      {!data && !error && <p role="status">Загружаем бронирование…</p>}
      {!data && error && <Button variant="secondary" onClick={() => perform(() => load())}>Повторить загрузку</Button>}
      {data && <>
        <HotelBookingSummary summary={data.summary} />
        <div style={{ margin: '16px 0' }}><Button variant="secondary" disabled={!hotelActionAvailability('refresh', data, selected, busy).enabled} onClick={() => act('refresh')}>Обновить данные у поставщика</Button><InfoNotice icon="alertCircle">{hotelActionAvailability('refresh', data, selected, busy).reason || 'Status inquiry существующей брони; новое бронирование не создаётся.'}</InfoNotice></div>
        <section ref={policyRef}><h3>Условия отмены бронирования</h3><HotelPolicy value={data.summary.cancellation_policy} /></section>
        <HotelRoomsSelector rooms={data.summary.rooms} selected={selected} onChange={setSelected} disabled={busy || !!panel} />
        {panel === 'cancel' && cancelOperation ? <HotelCancellationPanel key={cancelOperation.id} operation={cancelOperation} busy={busy} onBack={() => setPanel(null)} onConfirm={() => perform(async () => {
          await hotelActionsApi.confirm(serviceId, cancelOperation, { confirmed: true, accept_unknown_penalty: true });
          setPanel(null); await load(); await onChanged?.(); setNotice('Отмена отправлена в обработку. До подтверждения поставщика бронь не считается отменённой.');
        })} /> : panel === 'new_booking' ? <section className="card card-pad" style={{ marginTop: 16 }}><h3>Добавление номера</h3><p>Существующая бронь не изменится. Для дополнительного номера нужно выполнить новый подбор и оформить отдельное бронирование.</p><div className="hotel-actions-row"><Button variant="secondary" onClick={() => setPanel(null)}>Назад</Button>{onNewBooking && <Button onClick={onNewBooking}>Перейти к подбору гостиницы</Button>}</div></section>
          : panel ? <HotelManualRequestPanel key={panel} action={panel} selected={selected} busy={busy} onBack={() => setPanel(null)} onSubmit={(description) => perform(async () => { await create(panel, description); setPanel(null); setNotice('Ручной запрос сохранён. Бронирование и финансовые значения не изменены.'); })} />
          : <HotelActionMenu data={data} selected={selected} busy={busy} onAction={act} />}
        <section ref={docsRef}><h3>Документы / ваучер</h3>{!data.permissions.documents ? <InfoNotice icon="alertCircle">Нет права просмотра документов.</InfoNotice> : <>
          <Button variant="secondary" disabled={busy} onClick={() => perform(loadDocuments)}>Загрузить документы услуги</Button>
          {data.permissions.generate_documents && data.summary.documents?.certificate_status && <Button variant="secondary" style={{ margin: '8px 0 8px 8px' }} disabled={busy || !['confirmed', 'cancelled'].includes(data.summary.documents.certificate_status)} onClick={() => perform(async () => { await servicesApi.hotelCertificate(serviceId); await loadDocuments(); setNotice('Сертификат CRM сохранён в документах услуги.'); })}>Сертификат на проживание</Button>}
          {data.summary.documents?.certificate_status === 'pending' && <InfoNotice icon="alertCircle">Сертификат доступен после подтверждения брони. Обновите данные у поставщика.</InfoNotice>}
          {docs && (docs.length ? <ul>{docs.map((doc) => <li key={doc.id}><a href={documentsApi.previewUrl(doc.id)} target="_blank" rel="noreferrer">{doc.title || doc.kind}</a></li>)}</ul> : <InfoNotice icon="alertCircle">Сохранённых документов услуги пока нет.</InfoNotice>)}
        </>}</section>
        <section><h3>История операций</h3>{!data.operations.length && <InfoNotice icon="alertCircle">Операций пока нет.</InfoNotice>}{data.operations.map((operation) => <HotelOperationHistory key={operation.id} operation={operation} busy={busy} permissions={data.permissions}
          onConfirm={() => { setCancelOperation(operation); setPanel('cancel'); }} onResolve={(status, note) => perform(async () => { await hotelActionsApi.resolve(serviceId, operation, status, note); await load(); })} />)}</section>
      </>}
    </div>
  </Drawer>;
}
function HotelOperationHistory({ operation: op, busy, permissions, onConfirm, onResolve }) {
  const [note, setNote] = useState('');
  const targets = { created: ['checking', 'rejected'], checking: ['awaiting_supplier', 'completed', 'rejected'], awaiting_supplier: ['completed', 'rejected'] };
  return <article className="card card-pad" style={{ margin: '12px 0' }}>
    <b>{HOTEL_ACTION_LABELS[op.operation_type] || op.operation_type}</b><p role="status">{HOTEL_OPERATION_STATUS[op.status] || op.status}</p>
    <div className="hint">{new Date(op.created_at).toLocaleString('ru-RU')} · {op.actor_name || 'Оператор'} · {op.execution_mode === 'manual' ? 'Ручной запрос' : 'API поставщика'}</div>
    {op.requested_changes.description && <p style={{ whiteSpace: 'pre-wrap' }}>{op.requested_changes.description}</p>}
    {op.status === 'unknown' && <p className="err-text">Результат неизвестен. Не отправляйте отмену повторно. Используйте «Обновить данные у поставщика».</p>}
    {op.status === 'failed' && <p className="err-text">Операция не выполнена: {op.supplier_response?.error_code || 'Требуется проверка'}.</p>}
    {op.execution_mode === 'manual' && op.status === 'completed' && <InfoNotice icon="alertCircle">Ручной запрос обработан; автоматическое изменение брони не выполнялось.</InfoNotice>}
    {op.status === 'awaiting_operator_confirmation' && permissions.cancel && permissions.financial_confirmation && <Button variant="secondary" disabled={busy} onClick={onConfirm}>Открыть подтверждение отмены</Button>}
    <details style={{ marginTop: 10 }}><summary>История и обработка запроса</summary><ol>{op.history.map((entry) => <li key={entry.id}>{new Date(entry.created_at).toLocaleString('ru-RU')} · {entry.action} · {HOTEL_OPERATION_STATUS[entry.after?.status] || entry.after?.status}{entry.after?.result?.operator_note ? ` · ${entry.after.result.operator_note}` : ''}</li>)}</ol>
      {op.execution_mode === 'manual' && permissions.modify && targets[op.status] && <><label className="field"><span className="label">Комментарий обработки</span><textarea className="input" value={note} rows={3} maxLength={5000} onChange={(event) => setNote(event.target.value)} /></label><div className="hotel-actions-row">{targets[op.status].map((status) => <Button key={status} variant="secondary" disabled={busy || !note.trim()} onClick={() => onResolve(status, note.trim())}>{HOTEL_OPERATION_STATUS[status]}</Button>)}</div></>}
    </details>
  </article>;
}
