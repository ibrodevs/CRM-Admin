import { passengerAttachments } from '../model/passenger-attachments.js';
import React, { useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { downloadServiceDocuments } from '../model/document-download.js';

const passengerKey = (p) => String(p?.serverId || p?.id || p?.person || p?.name || '');

export function ServiceDocumentsDrawer({ service, documents, participants, initialParticipant, onClose, onPreview }) {
  const [person, setPerson] = useState(passengerKey(initialParticipant));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedPassenger = participants.find((p) => passengerKey(p) === person);
  const visible = selectedPassenger ? passengerAttachments(documents, selectedPassenger) : documents;
  const download = async () => {
    setBusy(true); setError('');
    try { await downloadServiceDocuments(visible, `Документы-${service.id}${person ? '-пассажир-' + person : ''}`); }
    catch (err) { setError(err.message || 'Не удалось скачать документы. Попробуйте ещё раз.'); }
    finally { setBusy(false); }
  };
  return <Drawer open title="Документы услуги" sub={service.title} onClose={onClose}
    footer={<Button icon="download" onClick={download} disabled={busy || !visible.length}>
      {busy ? 'Подготовка архива…' : `Скачать ${person ? 'документы пассажира' : 'все документы'} (${visible.length})`}
    </Button>}>
    <p className="osrv-download-hint">Скачайте комплект документов по услуге или выберите конкретного пассажира. Комплект сохраняется одним ZIP-архивом.</p>
    <label className="osrv-download-filter">Пассажир
      <Select value={person} onChange={(event) => { setPerson(event.target.value); setError(''); }} disabled={busy}
        options={[{ value: '', label: 'Все документы по услуге' }, ...participants.map((p) => ({ value: passengerKey(p), label: p.name }))]} />
    </label>
    {error && <p role="alert" style={{ color: 'var(--red)' }}>{error}</p>}
    <div className="osrv-download-list">
      {!visible.length && <EmptyState icon="docs" title="Документов пока нет" sub={person ? 'Для этого пассажира нет документов по услуге.' : 'Добавьте документы в раскрытой карточке услуги.'} />}
      {visible.map((doc) => <div className="osrv-download-row" key={doc.id}>
        <div><b>{doc.title || doc.file_name || 'Документ'}</b><small>{participants.find((p) => String(p.person) === String(doc.person))?.name || 'Документ по услуге'}</small></div>
        <Button variant="secondary" size="sm" onClick={() => onPreview(doc)}>Открыть</Button>
      </div>)}
    </div>
  </Drawer>;
}
