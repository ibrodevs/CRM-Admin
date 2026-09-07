import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { FilterChip } from '../../../shared/ui/FilterChip.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Tabs } from '../../../shared/ui/Tabs.jsx';
import { plural } from '../../../shared/ui/plural.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { COMPANIES_DB, CURRENT_USER, DOCS2, DOC_KIND, DOC_STATUS2, ORDERS } from '../../../legacy/data/index.jsx';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { toLegacyDocument } from '../../../legacy/adapters/legacy-adapters.js';
import { documentsApi } from '../api/documentsApi.js';
import { workspaceActionsApi } from '../../workspace/api.js';
import { resultsOf } from '../../../shared/api/client.js';
import { ReceiptBrandDocumentDrawer, ReceiptParticipantSummary, normalizeReceiptDraft, receiptDetailsLines, receiptFinancialTotal, recType, guessType, serviceTypeFromBackend, recMoney, receiptApplyPartsLabel, receiptSharedGroupPatch, ReceiptEditDrawer, ReceiptImportModal } from '../../receipts/index.js';
import { inlineSupplierDocumentUrl, freshSupplierDocumentUrl } from '../model/supplier-pdf.js';

function companyForDoc(doc) {
  const name = doc.participant !== '—' ? doc.participant : ORDERS.find((o) => o.no === doc.order)?.client;
  return COMPANIES_DB.find((c) => c.name === name) || null;
}

const DOC_BOOKKEEPING = ['Счёт', 'Акт', 'Договор'];

const now = () => new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·');

const DOC_ORIGIN = {
  supplier: { label: 'От поставщика', tone: 'blue' },
  corrected: { label: 'Система / скорр.', tone: 'amber' },
  client: { label: 'От клиента', tone: 'teal' },
  system: { label: 'Сформирован системой', tone: 'gray' },
};

function docOrigin(doc) {
  if (doc.origin && DOC_ORIGIN[doc.origin]) return DOC_ORIGIN[doc.origin];
  const notes = (doc.versions || []).map((v) => `${v.note || ''} ${v.who || ''}`).join(' ').toLowerCase();
  if (doc.version > 1 || /коррект|итогов|клиентск/.test(notes)) return DOC_ORIGIN.corrected;
  if (/поставщик|выписк|бронь|ваучер/.test(notes)) return DOC_ORIGIN.supplier;
  if (/клиент|скан/.test(notes)) return DOC_ORIGIN.client;
  return DOC_ORIGIN.system;
}

// Простой ярлык «от кого»: Поставщик / Клиент / СРМ (система)
function docOriginShort(doc) {
  const o = docOrigin(doc);
  if (o === DOC_ORIGIN.supplier) return 'Поставщик';
  if (o === DOC_ORIGIN.client) return 'Клиент';
  return 'СРМ';
}

function DocOriginPill({ doc }) {
  const o = docOrigin(doc);
  return <Pill tone={o.tone}>{o.label}</Pill>;
}

function docSetKey(doc) {
  const service = doc.service && doc.service !== '—' ? doc.service : doc.type;
  return [doc.participant || '—', doc.type, service].join('|');
}

function docSetTitle(docs) {
  const first = docs[0] || {};
  const service = first.service && first.service !== '—' ? first.service : null;
  return service ? `${first.type} · ${service}` : first.type;
}

function groupDocSets(docs) {
  const map = {};
  docs.forEach((d) => {
    const key = docSetKey(d);
    if (!map[key]) map[key] = [];
    map[key].push(d);
  });
  return Object.entries(map).map(([key, items]) => ({
    key,
    docs: items.sort((a, b) => (a.version || 1) - (b.version || 1)),
  }));
}

function DocPreviewModal({ doc, company, onClose, onChange }) {
  const toast = useToast();
  const [correcting, setCorrecting] = useState(false);
  const [note, setNote] = useState('');
  if (!doc) return null;

  const addHistory = (text, who) => [...doc.history, { t: now(), text, who }];

  const sendForCorrection = async () => {
    if (!note.trim()) return;
    try {
      await workspaceActionsApi.execute('document.correction.request', { resourceType: 'document', resourceId: doc.serverId || doc.no, payload: { note, company: company?.name || null } });
      onChange(doc.no, { status: 'Черновик', history: addHistory('Возвращён на корректировку: ' + note, 'Даниель') });
      if (company) company.docCorrections = [...company.docCorrections, { date: now(), who: 'Даниель', note }];
      toast('Замечание сохранено для контрагента, документ — в работу', 'ok');
      setNote(''); setCorrecting(false); onClose();
    } catch (error) { toast(error.message || 'Не удалось сохранить замечание', 'err'); }
  };

  const sendToAccounting = async () => {
    try {
      await workspaceActionsApi.execute('document.accounting.send', { resourceType: 'document', resourceId: doc.serverId || doc.no, payload: { requires_esign: !!company?.requiresESign, company: company?.name || null } });
      onChange(doc.no, { status: 'В бухгалтерии', history: addHistory('Отправлен в бухгалтерию', 'Даниель') });
      toast('Задача бухгалтерии создана в backend', 'ok');
      onClose();
    } catch (error) { toast(error.message || 'Не удалось отправить в бухгалтерию', 'err'); }
  };

  return (
    <Drawer open={!!doc} onClose={onClose} width="min(560px,94vw)"
      title="Предпросмотр перед отправкой" sub={doc.no + ' · ' + doc.name}
      footer={correcting ? (
        <>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCorrecting(false)}>Назад</Button>
          <Button style={{ flex: 1 }} onClick={sendForCorrection}>Сохранить и вернуть в работу</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" style={{ flex: 1 }} icon="edit" onClick={() => setCorrecting(true)}>Откорректировать</Button>
          <Button style={{ flex: 1 }} icon="send" onClick={sendToAccounting}>Отправить в бухгалтерию</Button>
        </>
      )}>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="kv-row"><span className="k">Контрагент</span><span className="v">{company ? company.name : doc.participant}</span></div>
        <div className="kv-row"><span className="k">Договор</span><span className="v">{company ? company.contract : '—'}</span></div>
        <div className="kv-row"><span className="k">Наименование в документе</span><span className="v">{doc.name}</span></div>
        <div className="kv-row"><span className="k">ЭЦП у контрагента</span><span className="v">{company ? (company.requiresESign ? 'Требуется' : 'Не требуется') : '—'}</span></div>
      </div>

      {company && company.docCorrections.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 className="card-title" style={{ fontSize: 14, marginBottom: 8 }}>Ранее отмечено по этому контрагенту</h3>
          {company.docCorrections.map((c, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4, display: 'flex', gap: 6 }}>
              <Icon name="alertCircle" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />{c.note}
            </div>
          ))}
        </div>
      )}

      {correcting && (
        <Field label="Что нужно исправить?">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: неверное наименование услуги в акте" />
        </Field>
      )}
    </Drawer>
  );
}

function DocCard({ doc, onClose, onChange }) {
  const toast = useToast();
  const [preview, setPreview] = useState(false);
  const versionInput = useRef(null);
  if (!doc) return null;
  const k = DOC_KIND[doc.type] || DOC_KIND['Прочее'];
  const isClosingDoc = DOC_BOOKKEEPING.includes(doc.type);
  const needsPreview = isClosingDoc && !['Подписан', 'Аннулирован'].includes(doc.status);
  const company = companyForDoc(doc);
  const origin = docOrigin(doc);
  const links = [
    { ic: 'orders', label: 'Заказ № ' + doc.order, on: doc.order },
    { ic: 'user', label: doc.participant, on: doc.participant !== '—' },
    { ic: 'plane', label: doc.service, on: doc.service !== '—' },
    { ic: 'finance', label: 'Операция ' + doc.finOp, on: doc.finOp !== '—' },
  ].filter((l) => l.on);
  const openDoc = (version) => {
    if (!doc.serverId) return toast('Файл документа не найден в backend', 'err');
    const suffix = version ? `&file_version=${version}` : '';
    window.open(documentsApi.previewUrl(doc.serverId) + suffix, '_blank', 'noopener,noreferrer');
  };
  const download = (version) => {
    if (!doc.serverId) return toast('Файл документа не найден в backend', 'err');
    const suffix = version ? `?file_version=${version}` : '';
    window.open(documentsApi.downloadUrl(doc.serverId) + suffix, '_blank', 'noopener,noreferrer');
  };
  const sign = async () => {
    try {
      const updated = await documentsApi.sign(doc.serverId, 'crm-confirmation');
      onChange && onChange(doc.no, { status: 'Подписан', version: updated.current_version || doc.version });
      toast('Документ подписан в backend', 'ok');
    } catch (error) { toast(error.message || 'Не удалось подписать документ', 'err'); }
  };
  const addVersion = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try { await documentsApi.addVersion(doc.serverId, file); toast('Новая версия загружена в backend', 'ok'); }
    catch (error) { toast(error.message || 'Не удалось загрузить версию', 'err'); }
  };
  return (
    <>
    <Drawer open={!!doc} onClose={onClose} title={doc.no}
      footer={<div style={{ display: 'flex', gap: 10 }}>
        <input ref={versionInput} type="file" hidden onChange={addVersion} />
        <Button style={{ flex: 1 }} icon="download" onClick={() => download()}>Скачать</Button>
        <Button variant="secondary" icon="plus" onClick={() => versionInput.current?.click()}>Новая версия</Button>
        {!isClosingDoc && doc.status !== 'Подписан' && <Button variant="secondary" icon="check" onClick={sign}>Подписать</Button>}
      </div>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>{doc.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{doc.type} · {doc.size}</div></div>
        <Pill tone={origin.tone}>{origin.label}</Pill>
        <Pill tone={DOC_STATUS2[doc.status]}>{doc.status}</Pill>
      </div>

      <div className="doc-preview" style={{ marginBottom: 16 }}>
        <Icon name={k.icon} style={{ width: 44, height: 44 }} strokeWidth={1.4} />
        <span style={{ fontSize: 13 }}>Предпросмотр документа · v{doc.version}</span>
        {needsPreview
          ? <Button variant="secondary" size="sm" icon="eye" onClick={() => setPreview(true)}>Предпросмотр перед отправкой</Button>
          : <Button variant="secondary" size="sm" icon="eye" onClick={() => openDoc()}>Открыть</Button>}
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 10 }}>Связи</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {links.map((l, i) => <span key={i} className="link-chip"><Icon name={l.ic} />{l.label}</span>)}
      </div>
      <div className="kv" style={{ marginBottom: 18 }}>
        <div className="kv-row"><span className="k">Источник документа</span><span className="v"><Pill tone={origin.tone}>{origin.label}</Pill></span></div>
        <div className="kv-row"><span className="k">Пассажир / привязка</span><span className="v">{doc.participant !== '—' ? doc.participant : doc.service}</span></div>
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 8 }}>Версии</h3>
      <div style={{ marginBottom: 18 }}>
        {doc.versions.map((v) => (
          <div className="ver-row" key={v.v}>
            <span className="ver-badge">v{v.v}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{v.note}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.date} · {v.who}</div></div>
            <button className="icon-btn" onClick={() => download(v.v)}><Icon name="download" /></button>
          </div>
        ))}
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>История</h3>
      <div className="timeline">
        {[...doc.history].reverse().map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </Drawer>
    {needsPreview && <DocPreviewModal doc={preview ? doc : null} company={company} onClose={() => setPreview(false)} onChange={onChange} />}
    </>
  );
}

function DocSetCard({ set, onOpen }) {
  const latest = set.docs[set.docs.length - 1];
  const k = DOC_KIND[latest.type] || DOC_KIND['Прочее'];
  const latestOrigin = docOrigin(latest);
  const multi = set.docs.length > 1;
  return (
    <div className="doc-set-card">
      <div className="doc-set-head">
        <span className="airline-logo sm doc-set-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div className="doc-set-main">
          <div className="doc-set-title">{docSetTitle(set.docs)}</div>
          <div className="doc-set-sub">{set.docs.length} {plural(set.docs.length, ['версия', 'версии', 'версий'])} · последняя v{latest.version}</div>
        </div>
        {/* Вместо статуса — версия и простой ярлык «от кого» (Поставщик / СРМ), без жирного шрифта */}
        <button type="button" className="doc-version-pill latest" onClick={() => onOpen(latest)} title="Открыть документ">
          <span className="v">v{latest.version}</span>
          <span className={'src ' + latestOrigin.tone}>{docOriginShort(latest)}</span>
        </button>
      </div>
      {multi && (
        <div className="doc-version-row">
          {set.docs.map((d) => {
            const origin = docOrigin(d);
            return (
              <button key={d.no} type="button" className={'doc-version-pill ' + (d.no === latest.no ? 'latest' : '')} onClick={() => onOpen(d)}>
                <span className="v">v{d.version}</span>
                <span className={'src ' + origin.tone}>{docOriginShort(d)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Услуга = раскрывающийся блок: свёрнут показывает сводку, раскрыт — карточки документов.
function DocServiceGroup({ service, desc, sets, defaultOpen, onOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const allDocs = sets.flatMap((s) => s.docs);
  const needsAction = allDocs.some((d) => ['Черновик', 'На подписи'].includes(d.status));
  const first = sets[0].docs[sets[0].docs.length - 1];
  const k = DOC_KIND[first.type] || DOC_KIND['Прочее'];
  return (
    <div className={'doc-svc-group' + (open ? ' is-open' : '')}>
      <button type="button" className="doc-svc-head" onClick={() => setOpen((o) => !o)}>
        <span className="airline-logo sm doc-set-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div className="doc-svc-main">
          <div className="doc-svc-title">{service}</div>
          {desc && <div className="doc-svc-desc">{desc}</div>}
          <div className="doc-svc-sub">{sets.length} {plural(sets.length, ['документ', 'документа', 'документов'])} · {allDocs.length} {plural(allDocs.length, ['версия', 'версии', 'версий'])}</div>
        </div>
        <Pill tone={needsAction ? 'amber' : 'green'}>{needsAction ? 'Требует действия' : 'Готово'}</Pill>
        <Icon name={open ? 'chevUp' : 'chevDown'} className="doc-svc-chev" />
      </button>
      {open && (
        <div className="doc-set-grid" style={{ marginTop: 10 }}>
          {sets.map((set) => <DocSetCard key={set.key} set={set} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

function DocPassengerGroup({ name, role, docs, onOpen, onUpload, svcDesc }) {
  const supplierCount = docs.filter((d) => docOrigin(d).label === DOC_ORIGIN.supplier.label).length;
  const correctedCount = docs.filter((d) => docOrigin(d).label === DOC_ORIGIN.corrected.label).length;
  const sets = groupDocSets(docs);
  // Группируем наборы документов по услуге, чтобы каждая услуга была отдельным раскрывающимся блоком.
  const svcOrder = [];
  const svcMap = {};
  sets.forEach((set) => {
    const s0 = set.docs[0] || {};
    const svc = s0.service && s0.service !== '—' ? s0.service : 'Без привязки к услуге';
    if (!svcMap[svc]) { svcMap[svc] = []; svcOrder.push(svc); }
    svcMap[svc].push(set);
  });
  // Простые случаи (одна услуга) — раскрыты сразу; при нескольких услугах свёрнуты для компактности.
  const autoOpen = svcOrder.length <= 1;
  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {role || 'Пассажир'} · {docs.length ? docs.length + ' ' + plural(docs.length, ['документ', 'документа', 'документов']) : 'документов нет'}
            {docs.length ? ` · ${svcOrder.length} ${plural(svcOrder.length, ['услуга', 'услуги', 'услуг'])} · ${supplierCount} от поставщика · ${correctedCount} скорр.` : ''}
          </div>
        </div>
        <Button variant="secondary" size="sm" icon="plus" onClick={onUpload}>Загрузить</Button>
      </div>
      {docs.length ? (
        <div className="doc-svc-list">
          {svcOrder.map((svc) => <DocServiceGroup key={svc} service={svc} desc={svcDesc ? svcDesc(svc) : ''} sets={svcMap[svc]} defaultOpen={autoOpen} onOpen={onOpen} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '12px 14px', border: '1px dashed var(--line)', borderRadius: 12, color: 'var(--muted)', fontSize: 13 }}>
          <Icon name="idcard" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
          Документы пассажира ещё не загружены — добавьте билеты, ваучеры, визы и страховки.
        </div>
      )}
    </div>
  );
}

function correctionSubjects(participants, onlyName) {
  const list = (participants || []).filter((p) => !onlyName || p.name === onlyName);
  const base = list.length ? list : [{ name: onlyName || 'Пассажир', role: 'Взрослый' }];
  return base.map((p) => ({ name: p.name, type: p.role || 'Взрослый', docNo: p.doc || '—', ref: '—' }));
}

const DOC_UPLOAD_TYPES = Object.keys(DOC_KIND).filter((type) => type !== 'Маршрутная квитанция');

function DocUploadModal({ open, scopeOrder, participants = [], defaultParticipant, onClose, onUploaded, onRouteToEditor }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [type, setType] = useState('Билет');
  const [participant, setParticipant] = useState('—');
  const [origin, setOrigin] = useState('supplier');

  useEffect(() => {
    if (open) { setFile(null); setType('Билет'); setParticipant(defaultParticipant || '—'); setOrigin('supplier'); }
  }, [open, defaultParticipant]);

  const isReceipt = type === 'Маршрут-квитанция' || type === 'Маршрутная квитанция';
  const pickFile = () => fileRef.current && fileRef.current.click();
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setFile({ raw: f, name: f.name, size: (f.size / 1024 < 1024 ? Math.max(1, Math.round(f.size / 1024)) + ' КБ' : (f.size / 1048576).toFixed(1) + ' МБ') });
    e.target.value = '';
  };

  const submit = () => {
    const payload = { file, type, participant: participant !== '—' ? participant : '—', origin };
    if (isReceipt) { onRouteToEditor(payload); return; }
    const now = new Date().toLocaleDateString('ru-RU');
    const doc = {
      no: 'D-' + Math.floor(3200 + Math.random() * 800),
      name: (file && file.name) || (type + ' (загружен)'),
      type, order: scopeOrder || '—', participant: payload.participant, service: '—', finOp: '—',
      status: 'Черновик', version: origin === 'corrected' ? 2 : 1, origin, date: now, size: (file && file.size) || '— КБ',
      versions: [{ v: origin === 'corrected' ? 2 : 1, date: now, who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор', note: DOC_ORIGIN[origin].label }],
      history: [{ t: now, text: 'Документ загружен', who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор' }],
    };
    onUploaded(doc);
  };

  const k = DOC_KIND[type] || DOC_KIND['Прочее'];
  const paxOptions = ['—', ...participants.map((p) => p.name)];
  return (
    <Drawer open={open} onClose={onClose} title="Загрузка документа" sub={scopeOrder ? 'Заказ № ' + scopeOrder : 'Документ вне заказа'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon={isReceipt ? 'template' : 'plus'} disabled={!file} onClick={submit}>
          {isReceipt ? 'Далее: редактор квитанции' : 'Загрузить'}
        </Button>
      </>}>
      <div>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={onFile} />

        <button type="button" className="doc-preview" onClick={pickFile}
          style={{ width: '100%', cursor: 'pointer', border: '1px dashed var(--line)', textAlign: 'center' }}>
          <Icon name={file ? k.icon : 'plus'} style={{ width: 40, height: 40 }} strokeWidth={1.4} />
          <span style={{ fontSize: 13, color: file ? 'var(--ink)' : 'var(--blue)', fontWeight: 600 }}>
            {file ? file.name : 'Выберите файл или перетащите сюда'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{file ? file.size : 'PDF, JPG, PNG · до 15 МБ'}</span>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: participants.length ? '1fr 1fr' : '1fr', gap: 12, marginTop: 16 }}>
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Тип документа</label>
            <Select options={DOC_UPLOAD_TYPES} value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          {participants.length > 0 && (
            <div>
              <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Пассажир</label>
              <Select options={paxOptions} value={participant} onChange={(e) => setParticipant(e.target.value)} />
            </div>
          )}
          <div>
            <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Источник</label>
            <Select options={[
              { value: 'supplier', label: 'От поставщика' },
              { value: 'corrected', label: 'Скорректированный' },
              { value: 'client', label: 'От клиента' },
              { value: 'system', label: 'Сформирован системой' },
            ]} value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </div>
        </div>

        {isReceipt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--blue-weak, #eef3ff)', color: 'var(--blue)', fontSize: 13 }}>
            <Icon name="route" style={{ width: 18, height: 18, flexShrink: 0 }} />
            Маршрут-квитанция откроется в редакторе — сформируете клиентскую версию на фирменном бланке перед сохранением.
          </div>
        )}

      </div>
    </Drawer>
  );
}

function DocCenter({ scopeOrder, participants, services, onOpenDoc, initialDocuments, orders = [] }) {
  const toast = useToast();
  const normalizeDocument = (item) => item?.serverId ? item : toLegacyDocument(item, orders);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fStatus, setFStatus] = useState('');
  const [openNo, setOpenNo] = useState(null);

  const canGroupByPax = !!scopeOrder && Array.isArray(participants) && participants.length > 0;
  const [view, setView] = useState(canGroupByPax ? 'byService' : 'byType');
  // Описание услуги (маршрут/даты) по её ярлыку — чтобы различать, напр., 5 разных перелётов.
  const svcDesc = (label) => {
    if (!Array.isArray(services) || !services.length || !label || label === 'Без привязки к услуге') return '';
    const code = label.includes('·') ? label.split('·').pop().trim() : '';
    const kind = label.split('·')[0].trim();
    const s = services.find((x) => (code && (x.avia === code || x.code === code || x.id === code)) || (x.title && label.includes(x.title)))
      || (!code ? services.find((x) => x.kind === kind) : null);
    if (!s) return '';
    return [s.title, s.date].filter(Boolean).join(' · ');
  };
  const liveDocuments = Array.isArray(initialDocuments) ? initialDocuments.map(normalizeDocument) : (scopeOrder ? [] : DOCS2);
  const scopedOrderId = orders.find((item) => item.no === scopeOrder)?.id;
  const [docs, setDocs] = useState(() => (scopeOrder ? liveDocuments.filter((d) => d.order === scopeOrder) : liveDocuments));
  useEffect(() => {
    if (!Array.isArray(initialDocuments)) return;
    const mapped = initialDocuments.map(normalizeDocument);
    setDocs(scopeOrder ? mapped.filter((d) => d.order === scopeOrder) : mapped);
  }, [initialDocuments, orders, scopeOrder]);
  useEffect(() => {
    if (Array.isArray(initialDocuments) || !scopeOrder) return;
    if (!scopedOrderId) return;
    const controller = new AbortController();
    documentsApi.list({ order: scopedOrderId }, controller.signal)
      .then((payload) => setDocs(resultsOf(payload).map((item) => toLegacyDocument(item, orders))))
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить документы', 'err'); });
    return () => controller.abort();
  }, [initialDocuments, scopeOrder, scopedOrderId]);
  const updateDoc = (no, patch) => setDocs((cur) => cur.map((d) => (d.no === no ? { ...d, ...patch } : d)));
  const card = docs.find((d) => d.no === openNo) || null;
  const [uploadFor, setUploadFor] = useState(null);
  const [editorFor, setEditorFor] = useState(null);
  const [receiptEdit, setReceiptEdit] = useState(null);
  const [receiptBrand, setReceiptBrand] = useState(null);

  const TYPE_TABS = [
    { key: 'all', label: 'Все', test: () => true },
    { key: 'tickets', label: 'Билеты и квитанции', test: (d) => ['Билет', 'Маршрут-квитанция', 'Маршрутная квитанция'].includes(d.type) },
    { key: 'vouchers', label: 'Ваучеры и полисы', test: (d) => ['Ваучер', 'Страховой полис'].includes(d.type) },
    { key: 'fin', label: 'Счета и акты', test: (d) => ['Счёт', 'Акт'].includes(d.type) },
    { key: 'legal', label: 'Договоры', test: (d) => d.type === 'Договор' },
    { key: 'passports', label: 'Паспорта', test: (d) => d.type === 'Паспорт' },
    { key: 'missing', label: 'Требуют действия', test: (d) => ['Черновик', 'На подписи'].includes(d.status) },
  ];
  const cur = TYPE_TABS.find((t) => t.key === tab);
  const matchesQ = (d) => !q || `${d.no} ${d.name} ${d.order} ${d.participant} ${d.type}`.toLowerCase().includes(q.toLowerCase());
  let rows = docs.filter((d) => cur.test(d) && (!fStatus || d.status === fStatus) && matchesQ(d));
  const receiptEditorType = (d) => serviceTypeFromBackend(
    d.service_kind,
    d.service_type,
    guessType(`${d.name || ''} ${d.service || ''}`),
  );
  // Бланк заказа открывается в том же редакторе квитанций, что и в реестре:
  // правки, стоимость и вывод бланка доступны прямо из карточки заказа.
  const openReceiptDocument = (d) => {
    const editorType = receiptEditorType(d);
    const parsed = normalizeReceiptDraft(editorType, {
      ...d.parsed,
      crmOrderId: d.parsed?.crmOrderId || d.orderId || scopedOrderId || '',
      crmOrderNo: d.parsed?.crmOrderNo || (d.order !== '—' ? String(d.order) : ''),
      crmPersonId: d.parsed?.crmPersonId || d.personId || '',
    });
    setReceiptEdit({
      ...d, id: d.serverId, editorType, parsed,
      originalUrl: documentsApi.supplierPreviewUrl(d.serverId),
      sourceOriginalUrl: documentsApi.supplierSourcePreviewUrl(d.serverId),
    });
  };
  const open = (d) => {
    if (d.parsed && ['Маршрут-квитанция', 'Маршрутная квитанция', 'Билет', 'Ваучер'].includes(d.type)) {
      openReceiptDocument(d);
      return;
    }
    if (onOpenDoc) onOpenDoc(d);
    else setOpenNo(d.no);
  };

  // Однотипные бланки заказа: их видит редактор, чтобы оператор мог осознанно
  // распространить стоимость и корректировки на весь заказ.
  const RECEIPT_DOC_TYPES = ['Маршрут-квитанция', 'Маршрутная квитанция', 'Билет', 'Ваучер'];
  const receiptSiblingsFor = (document) => docs.filter((row) => row.serverId && row.parsed
    && RECEIPT_DOC_TYPES.includes(row.type)
    && receiptEditorType(row) === receiptEditorType(document));

  const receiptGroupInfo = (() => {
    if (!receiptEdit) return null;
    const siblings = receiptSiblingsFor(receiptEdit);
    if (siblings.length < 2) return null;
    const position = siblings.findIndex((row) => String(row.serverId) === String(receiptEdit.id)) + 1;
    return {
      index: 1,
      count: siblings.length,
      type: receiptEdit.editorType,
      position: position > 0 ? position : 1,
      fileIds: siblings.map((row) => row.serverId),
      fileNames: siblings.map((row) => row.parsed?.passenger || row.name || row.no || 'Бланк'),
    };
  })();

  const saveOrderReceipt = async (fileId, parsed, options = {}) => {
    const editorType = receiptEdit?.editorType || 'Авиа';
    const siblingIds = options.applyToGroup
      ? (options.groupFileIds || []).filter((id) => String(id) !== String(fileId))
      : [];
    try {
      const saved = await documentsApi.updateReceipt(fileId, {
        draft: false,
        verified_data: parsed,
        order: parsed.crmBindingMode === 'person' ? null : (parsed.crmOrderId || scopedOrderId || null),
        person: parsed.crmBindingMode === 'person' ? (parsed.crmPersonId || null) : null,
        output_settings: parsed.output || { mode: 'original' },
        audit_log: parsed.auditLog || [],
      });
      const mapped = toLegacyDocument(saved, orders);
      setDocs((current) => current.map((row) => String(row.serverId) === String(fileId) ? mapped : row));
      setReceiptEdit((current) => current ? { ...current, parsed: { ...parsed, recognitionPending: false } } : current);

      if (siblingIds.length) {
        const shared = receiptSharedGroupPatch(editorType, parsed, options.applyParts);
        const auditEntry = {
          at: new Date().toLocaleString('ru-RU'),
          user: (typeof window !== 'undefined' && window.CURRENT_USER?.name) || 'Оператор',
          label: 'Применение стоимости и корректировок ко всем бланкам заказа',
          before: 'Индивидуальные данные сохранены',
          after: receiptApplyPartsLabel(options.applyParts),
        };
        const savedSiblings = [];
        for (const siblingId of siblingIds) {
          const sibling = docs.find((row) => String(row.serverId) === String(siblingId));
          if (!sibling) continue;
          const nextParsed = normalizeReceiptDraft(editorType, {
            ...sibling.parsed,
            ...shared,
            auditLog: [...(sibling.parsed?.auditLog || []), auditEntry],
          });
          // eslint-disable-next-line no-await-in-loop
          const savedSibling = await documentsApi.updateReceipt(siblingId, {
            draft: false,
            verified_data: nextParsed,
            output_settings: nextParsed.output || { mode: 'original' },
            audit_log: nextParsed.auditLog || [],
          });
          savedSiblings.push(toLegacyDocument(savedSibling, orders));
        }
        if (savedSiblings.length) {
          setDocs((current) => current.map((row) => savedSiblings.find((item) => String(item.serverId) === String(row.serverId)) || row));
        }
        toast(`Стоимость и корректировки применены к ${savedSiblings.length + 1} ${plural(savedSiblings.length + 1, ['бланку', 'бланкам', 'бланкам'])} заказа`, 'ok');
        return true;
      }

      // Последовательная проверка бланков заказа: следующий однотипный бланк
      // открывается сам, редактор при этом не закрывается.
      if (options.continueSequential) {
        const ids = options.groupFileIds || [];
        const nextId = ids[ids.indexOf(fileId) + 1] ?? ids.find((id) => String(id) !== String(fileId));
        const nextDoc = docs.find((row) => String(row.serverId) === String(nextId));
        if (nextDoc) {
          openReceiptDocument(nextDoc);
          toast('Бланк сохранён. Открыт следующий бланк заказа.', 'ok');
          return true;
        }
      }

      toast('Квитанция сохранена прямо в документах заказа', 'ok');
      return true;
    } catch (error) {
      toast(error.message || 'Не удалось сохранить квитанцию', 'err');
      return false;
    }
  };


  const paxDocs = (name) => docs.filter((d) => d.participant === name && !DOC_BOOKKEEPING.includes(d.type) && (!fStatus || d.status === fStatus) && matchesQ(d));
  const bookkeeping = docs.filter((d) => DOC_BOOKKEEPING.includes(d.type) && (!fStatus || d.status === fStatus) && matchesQ(d));
  const paxList = canGroupByPax
    ? participants.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || paxDocs(p.name).length)
    : [];

  // Группировка по услуге (для представления «По услуге»)
  const svcGroupOrder = [];
  const svcGroupMap = {};
  docs.filter((d) => (!fStatus || d.status === fStatus) && matchesQ(d)).forEach((d) => {
    const s = d.service && d.service !== '—' ? d.service : 'Без привязки к услуге';
    if (!svcGroupMap[s]) { svcGroupMap[s] = []; svcGroupOrder.push(s); }
    svcGroupMap[s].push(d);
  });

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {canGroupByPax && (
          <div className="trip-toggle" style={{ display: 'inline-flex' }}>
            <button className={view === 'byService' ? 'on' : ''} onClick={() => setView('byService')}>По услуге</button>
            <button className={view === 'byPassenger' ? 'on' : ''} onClick={() => setView('byPassenger')}>По пассажирам</button>
          </div>
        )}
        {view === 'byType' && <Tabs tabs={TYPE_TABS.map((t) => ({ key: t.key, label: t.label, count: docs.filter(t.test).length }))} value={tab} onChange={setTab} />}
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder={view === 'byType' ? 'Поиск документа…' : 'Поиск пассажира или документа…'} style={{ width: 230 }} />
        <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(DOC_STATUS2)} />
        <Button icon="plus" onClick={() => setUploadFor({})}>Загрузить</Button>
      </div>

      {view === 'byService' ? (
        <div className="doc-svc-list">
          {svcGroupOrder.length ? svcGroupOrder.map((svc) => (
            <DocServiceGroup key={svc} service={svc} desc={svcDesc(svc)} sets={groupDocSets(svcGroupMap[svc])}
              defaultOpen={svcGroupOrder.length <= 1} onOpen={open} />
          )) : <EmptyState icon="briefcase" title="Документы по услугам не найдены" sub={q ? 'Измените запрос поиска' : 'Загрузите документы по услугам заказа'} />}
        </div>
      ) : view === 'byPassenger' ? (
        <>
          {paxList.length ? paxList.map((p) => (
            <DocPassengerGroup key={p.name} name={p.name} role={p.role} docs={paxDocs(p.name)} svcDesc={svcDesc} onOpen={open} onUpload={() => setUploadFor({ participant: p.name })} />
          )) : <EmptyState icon="users" title="Пассажиры не найдены" />}

          <h3 className="section-title" style={{ fontSize: 17, margin: '22px 0 12px' }}>Документы по заказу · бухгалтерия</h3>
          {bookkeeping.length ? (
            <div className="card card-pad">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {bookkeeping.map((d) => {
                  const k = DOC_KIND[d.type] || DOC_KIND['Прочее'];
                  return (
                    <button key={d.no} className="doc-chip" style={{ width: 'auto' }} onClick={() => open(d)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name={k.icon} />{d.name}</span>
                      <Pill tone={DOC_STATUS2[d.status]}>{d.status}</Pill>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : <div style={{ color: 'var(--muted)', fontSize: 14 }}>Бухгалтерских документов нет</div>}
        </>
      ) : (
        <div className="table-card">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th style={{ width: 90 }}>№</th><th>Документ</th><th>Тип</th><th>Источник</th><th>Заказ</th><th>Привязка</th><th>Версия</th><th>Дата</th><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((d) => {
                  const k = DOC_KIND[d.type] || DOC_KIND['Прочее'];
                  return (
                    <tr key={d.no} style={{ cursor: 'pointer' }} onClick={() => open(d)}>
                      <td className="t-strong">{d.no}</td>
                      <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="airline-logo sm" style={{ background: k.color, width: 30, height: 30, borderRadius: 8 }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span><span style={{ fontWeight: 600 }}>{d.name}</span></span></td>
                      <td>{d.type}</td>
                      <td><DocOriginPill doc={d} /></td>
                      <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {d.order}</span></td>
                      <td className="t-muted">{d.participant !== '—' ? d.participant : d.service !== '—' ? d.service : '—'}</td>
                      <td>v{d.version}</td>
                      <td>{d.date}</td>
                      <td><Pill tone={DOC_STATUS2[d.status]}>{d.status}</Pill></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <EmptyState icon="docs" title="Документы не найдены" />}
        </div>
      )}
      {card && <DocCard doc={card} onClose={() => setOpenNo(null)} onChange={updateDoc} />}

      <DocUploadModal open={!!uploadFor} scopeOrder={scopeOrder} participants={participants || []}
        defaultParticipant={uploadFor && uploadFor.participant}
        onClose={() => setUploadFor(null)}
        onUploaded={async (doc) => {
          try {
            const kind = { 'Маршрут-квитанция': 'itinerary_receipt', 'Маршрутная квитанция': 'itinerary_receipt', 'Билет': 'ticket', 'Ваучер': 'voucher', 'Страховой полис': 'insurance_policy', 'Счёт': 'invoice', 'Акт': 'act', 'Договор': 'contract', 'Паспорт': 'passport', 'Прочее': 'other' }[doc.type] || 'other';
            const order = orders.find((item) => item.no === scopeOrder);
            const person = (participants || []).find((item) => item.name === doc.participant);
            const created = await documentsApi.upload(doc.file.raw, { order: order?.id || null, person: person?.serverId || null, kind, title: doc.file.name, source: doc.origin || 'upload', document_date: new Date().toISOString().slice(0, 10) });
            setDocs((cur) => [toLegacyDocument(created, orders), ...cur]);
            setUploadFor(null);
            toast('Файл добавлен в документы заказа', 'ok', { title: 'Документ загружен', action: { label: 'Открыть «Документы»', route: 'documents' } });
          } catch (error) { toast(error.message || 'Не удалось загрузить документ', 'err'); }
        }}
        onRouteToEditor={(info) => {
          setUploadFor(null);
          setEditorFor({ file: info.file?.raw, participant: info.participant !== '—' ? info.participant : null });
        }} />

      {editorFor && (
        <ReceiptImportModal
          open
          initialFiles={editorFor.file ? [editorFor.file] : []}
          orders={orders}
          initialBindTarget={scopeOrder ? {
            mode: 'order',
            label: `Заказ № ${scopeOrder}`,
            order: orders.find((item) => item.no === scopeOrder) || { no: scopeOrder, id: scopedOrderId },
          } : null}
          onClose={() => setEditorFor(null)}
          onDone={async (createdDocuments) => {
            setDocs((current) => [...createdDocuments.map(normalizeDocument), ...current]);
            setEditorFor(null);
          }}
        />
      )}
      <ReceiptEditDrawer open={!!receiptEdit}
        file={receiptEdit ? { ...receiptEdit, type: receiptEdit.editorType } : null}
        onClose={() => setReceiptEdit(null)}
        onChange={(fileId, parsed) => setReceiptEdit((current) => current && String(current.id) === String(fileId) ? { ...current, parsed } : current)}
        onReview={saveOrderReceipt} orders={orders} services={services || []}
        groupInfo={receiptGroupInfo}
        onBrand={() => { setReceiptBrand(receiptEdit); }} />
      <ReceiptBrandDocumentDrawer open={!!receiptBrand} type={receiptBrand?.editorType} draft={receiptBrand?.parsed}
        originalUrl={receiptBrand?.originalUrl} sourceOriginalUrl={receiptBrand?.sourceOriginalUrl}
        onClose={() => setReceiptBrand(null)} />
    </div>
  );
}

// ——— Бланки поставщика внутри услуги заказа ——————————————————————————————
// Заказ / услуга / авиа: выгруженные бланки редактируются тем же редактором
// квитанций, что и в реестре, и выгружаются в нужном виде — оригинал
// поставщика с корректировками, исходный файл или фирменный бланк.
const SERVICE_RECEIPT_DOC_TYPES = ['Маршрут-квитанция', 'Маршрутная квитанция', 'Билет', 'Ваучер'];

export function ServiceBlanksPanel({
  service, orderNo, orderId, orders = [], companies = [], participants = [], onChanged,
}) {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [brand, setBrand] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showAllOtherDocs, setShowAllOtherDocs] = useState(false);
  const serviceId = service?.serverId || service?.id || null;
  const boundOrder = orders.find((item) => String(item.id) === String(orderId));
  const boundOrderNo = orderNo || boundOrder?.no || null;

  const reload = React.useCallback(async (signal) => {
    if (!serviceId) { setLoading(false); return; }
    try {
      const payload = await documentsApi.list({ service: serviceId }, signal);
      setDocs(resultsOf(payload).map((item) => toLegacyDocument(item, orders)));
    } catch (error) {
      if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить бланки услуги', 'err');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const editorTypeOf = (document) => document.recType || serviceTypeFromBackend(
    document.service_kind,
    document.service_type,
    guessType(`${document.name || ''} ${service?.kind || ''}`),
  );

  const blanks = docs
    .filter((document) => document.serverId && SERVICE_RECEIPT_DOC_TYPES.includes(document.type))
    .map((document) => {
      const editorType = editorTypeOf(document);
      return {
        ...document,
        id: document.serverId,
        editorType,
        parsed: normalizeReceiptDraft(editorType, {
          ...(document.parsed || { passenger: document.participant !== '—' ? document.participant : '', recognitionPending: true }),
          crmOrderId: document.parsed?.crmOrderId || document.orderId || orderId || '',
          crmOrderNo: document.parsed?.crmOrderNo || (orderNo ? String(orderNo) : ''),
        }),
        originalUrl: documentsApi.supplierPreviewUrl(document.serverId),
        sourceOriginalUrl: documentsApi.supplierSourcePreviewUrl(document.serverId),
      };
    });
  const otherDocs = docs.filter((document) => !SERVICE_RECEIPT_DOC_TYPES.includes(document.type));

  const groupInfo = (() => {
    if (!edit || blanks.length < 2) return null;
    const position = blanks.findIndex((row) => String(row.id) === String(edit.id)) + 1;
    return {
      index: 1,
      count: blanks.length,
      type: edit.editorType,
      position: position > 0 ? position : 1,
      fileIds: blanks.map((row) => row.id),
      fileNames: blanks.map((row) => row.parsed?.passenger || row.name || 'Бланк'),
    };
  })();

  const saveBlank = async (fileId, parsed, options = {}) => {
    const editorType = edit?.editorType || 'Авиа';
    const siblingIds = options.applyToGroup
      ? (options.groupFileIds || []).filter((id) => String(id) !== String(fileId))
      : [];
    try {
      const boundOrderId = parsed.crmOrderId || orderId || null;
      await documentsApi.updateReceipt(fileId, {
        draft: false,
        verified_data: parsed,
        // Пустой order отвязал бы бланк от заказа — поле уходит только с id.
        ...(boundOrderId ? { order: boundOrderId } : {}),
        output_settings: parsed.output || { mode: 'original' },
        audit_log: parsed.auditLog || [],
      });
      if (siblingIds.length) {
        const shared = receiptSharedGroupPatch(editorType, parsed, options.applyParts);
        const auditEntry = {
          at: new Date().toLocaleString('ru-RU'),
          user: (typeof window !== 'undefined' && window.CURRENT_USER?.name) || 'Оператор',
          label: 'Применение стоимости и корректировок ко всем бланкам услуги',
          before: 'Индивидуальные данные сохранены',
          after: receiptApplyPartsLabel(options.applyParts),
        };
        for (const siblingId of siblingIds) {
          const sibling = blanks.find((row) => String(row.id) === String(siblingId));
          if (!sibling) continue;
          const nextParsed = normalizeReceiptDraft(editorType, {
            ...sibling.parsed,
            ...shared,
            auditLog: [...(sibling.parsed?.auditLog || []), auditEntry],
          });
          // eslint-disable-next-line no-await-in-loop
          await documentsApi.updateReceipt(siblingId, {
            draft: false,
            verified_data: nextParsed,
            output_settings: nextParsed.output || { mode: 'original' },
            audit_log: nextParsed.auditLog || [],
          });
        }
        toast(`Стоимость и корректировки применены к ${siblingIds.length + 1} бланкам услуги`, 'ok');
      } else if (options.continueSequential) {
        const ids = options.groupFileIds || [];
        const nextId = ids[ids.indexOf(fileId) + 1];
        const nextBlank = blanks.find((row) => String(row.id) === String(nextId));
        if (nextBlank) {
          setEdit(nextBlank);
          toast('Бланк сохранён. Открыт следующий бланк услуги.', 'ok');
        } else {
          toast('Бланк сохранён в услуге заказа', 'ok');
        }
      } else {
        toast('Бланк сохранён в услуге заказа', 'ok');
      }
      await reload();
      await onChanged?.();
      return true;
    } catch (error) {
      toast(error.message || 'Не удалось сохранить бланк', 'err');
      return false;
    }
  };

  const openFile = (url) => url && window.open(freshSupplierDocumentUrl(url), '_blank', 'noopener,noreferrer');

  return (
    <div className="service-blanks">
      <div className="service-blanks-head">
        <span className="oc-svc-ic" style={{ background: 'var(--blue)' }}><Icon name="template" /></span>
        <div>
          <b>Бланки поставщика по услуге</b>
          <small>Редактируйте бланк прямо в заказе и выгружайте нужный вид: оригинал поставщика с корректировками, исходный файл или фирменный бланк. Загруженный оригинал всегда хранится отдельно и не меняется.</small>
        </div>
        <Button icon="download" onClick={() => setImporting(true)}>Загрузить бланк</Button>
      </div>

      {loading ? <div className="receipt-empty">Загружаем бланки услуги…</div>
        : blanks.length ? (
          <div className="service-blanks-list">
            {blanks.map((document) => {
              const meta = recType(document.editorType);
              const details = receiptDetailsLines(document.editorType, document.parsed);
              const total = receiptFinancialTotal(document.editorType, document.parsed);
              return (
                <article className="service-blank-card" key={document.id}>
                  <header>
                    <span className="rec-import-icon" style={{ background: meta.color }}><Icon name={meta.icon} /></span>
                    <div>
                      <b><ReceiptParticipantSummary draft={document.parsed} noun={document.editorType === 'Гостиница' ? 'гостей' : 'пассажиров'} /></b>
                      <small>{document.editorType} · {document.no} · {document.name}</small>
                    </div>
                    <div className="service-blank-total">
                      <b>{recMoney(total, document.parsed.currency)}</b>
                      <small>итого клиенту</small>
                    </div>
                  </header>
                  <div className="service-blank-details">
                    {details.map((line, index) => <span key={index}>{line}</span>)}
                  </div>
                  <footer>
                    <Button size="sm" icon="edit" onClick={() => setEdit(document)}>Редактировать бланк</Button>
                    <Button size="sm" variant="secondary" icon="template" onClick={() => setBrand(document)}>Фирменный бланк</Button>
                    <Button size="sm" variant="ghost" icon="eye" onClick={() => openFile(document.originalUrl)}>Оригинал с корректировками</Button>
                    <Button size="sm" variant="ghost" onClick={() => window.open(inlineSupplierDocumentUrl(document.sourceOriginalUrl), '_blank', 'noopener,noreferrer')}>Исходный файл</Button>
                    <Button size="sm" variant="ghost" icon="download" onClick={() => window.open(documentsApi.downloadUrl(document.serverId), '_blank', 'noopener,noreferrer')}>Скачать файл</Button>
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="template" title="Бланки поставщика не загружены"
            sub="Загрузите маршрут-квитанцию, билет или ваучер — он попадёт в эту услугу и станет доступен для редактирования." />
        )}

      {otherDocs.length > 0 && (() => {
        const OTHER_DOCS_LIMIT = 6;
        const visibleOtherDocs = showAllOtherDocs ? otherDocs : otherDocs.slice(0, OTHER_DOCS_LIMIT);
        return (
          <div className="service-blanks-other">
            <b>
              Прочие документы услуги
              <span className="pill pill-gray" style={{ marginLeft: 6 }}>{otherDocs.length}</span>
            </b>
            <div className="service-doc-grid">
              {visibleOtherDocs.map((document) => (
                <div key={document.serverId || document.no} className="doc-chip" title={document.name}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Icon name="docs" style={{ flexShrink: 0 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{document.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{document.type}{document.size ? ' · ' + document.size : ''}</span>
                    </span>
                  </span>
                  <button className="icon-btn" title="Скачать"
                    onClick={() => window.open(documentsApi.downloadUrl(document.serverId), '_blank', 'noopener,noreferrer')}><Icon name="download" /></button>
                </div>
              ))}
            </div>
            {otherDocs.length > OTHER_DOCS_LIMIT && (
              <button type="button" className="service-blanks-more-btn" onClick={() => setShowAllOtherDocs((prev) => !prev)}>
                {showAllOtherDocs
                  ? 'Свернуть список документов'
                  : `Показать ещё ${otherDocs.length - OTHER_DOCS_LIMIT} ${plural(otherDocs.length - OTHER_DOCS_LIMIT, ['документ', 'документа', 'документов'])}`}
              </button>
            )}
          </div>
        );
      })()}

      <ReceiptEditDrawer open={!!edit} file={edit ? { ...edit, type: edit.editorType } : null}
        onClose={() => setEdit(null)}
        onChange={(fileId, parsed) => setEdit((current) => current && String(current.id) === String(fileId) ? { ...current, parsed } : current)}
        onReview={saveBlank}
        groupInfo={groupInfo}
        orders={orders} services={service ? [service] : []} companies={companies}
        onBrand={() => setBrand(edit)} />

      <ReceiptBrandDocumentDrawer open={!!brand} type={brand?.editorType} draft={brand?.parsed}
        originalUrl={brand?.originalUrl} sourceOriginalUrl={brand?.sourceOriginalUrl}
        onClose={() => setBrand(null)} />

      {importing && (
        <ReceiptImportModal open orders={orders} companies={companies}
          initialBindTarget={boundOrderNo ? {
            mode: 'order',
            label: `Заказ № ${boundOrderNo}`,
            order: boundOrder || { no: boundOrderNo, id: orderId },
          } : null}
          onClose={() => setImporting(false)}
          onDone={async () => {
            setImporting(false);
            await reload();
            await onChanged?.();
          }} />
      )}
    </div>
  );
}

function DocCenterPage({ documents = [], orders = [] }) {
  return (<><Topbar title="Документы" /><div className="content"><DocCenter initialDocuments={documents} orders={orders} /></div></>);
}

export { companyForDoc, DOC_BOOKKEEPING, now, DOC_ORIGIN, docOrigin, docOriginShort, DocOriginPill, docSetKey, docSetTitle, groupDocSets, DocPreviewModal, DocCard, DocSetCard, DocServiceGroup, DocPassengerGroup, correctionSubjects, DOC_UPLOAD_TYPES, DocUploadModal, DocCenter, SERVICE_RECEIPT_DOC_TYPES, DocCenterPage };
export { inlineSupplierDocumentUrl } from '../model/supplier-pdf.js';
export { freshSupplierDocumentUrl } from '../model/supplier-pdf.js';
export { waitForReceiptPdfJob } from '../model/supplier-pdf.js';
export { PDF_SYNC_SUCCESS_NOTICE_MS } from '../model/supplier-pdf.js';
export { supplierDocumentPageUrl } from '../model/supplier-pdf.js';
