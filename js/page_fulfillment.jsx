import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, Combobox, ConfirmDialog, Drawer, EmptyState, Field, FilterChip, Input, Pill, Radio, SearchBox, Select, Tabs, Th, TimeField, plural, useSort, useToast } from './ui';
import { COMPANIES_DB, CURRENT_USER, DOCS2, DOC_KIND, DOC_STATUS2, FIN_OPS, FIN_OP_STATUS, FULFILLMENT, ORDERS, ORDER_STAGES, SERVICE_KIND } from './data';
import { UnifiedBindField, UnifiedBindPicker, UFDateField } from './forms_unified';
import { Topbar } from './layout';
import { toLegacyDocument } from './api/legacy-adapters';
import { crmApi, documentsApi, financeApi, jobsApi, workspaceActionsApi } from './api/resources';
import { resultsOf } from './api/client';
import {
  ReceiptBrandDocumentDrawer,
  ReceiptDocumentPreview,
  ReceiptParticipantSummary,
  ReceiptSpecializedForm,
  normalizeReceiptDraft,
  receiptDetailsLines,
  receiptFinancialTotal,
  receiptParticipantLabel,
} from './features/receipts/editor';
import {
  createReceiptImportDraftId,
  readReceiptImportDrafts,
  receiptImportDraftTitle,
  removeReceiptImportDraft,
  upsertReceiptImportDraft,
  writeReceiptImportDrafts,
} from './features/receipts/import-drafts';



function fUsd(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }
function finPayable(op) { return op.tariff + op.taxes + op.fee + op.penalty - op.discount; }
function finDebt(op) { return Math.max(0, finPayable(op) - op.paid); }



function companyForDoc(doc) {
  const name = doc.participant !== '—' ? doc.participant : ORDERS.find((o) => o.no === doc.order)?.client;
  return COMPANIES_DB.find((c) => c.name === name) || null;
}

function inlineSupplierDocumentUrl(url) {
  const value = String(url || '');
  if (!value || value.startsWith('blob:') || !value.includes('/documents/')
    || !value.includes('/download/') || value.includes('disposition=')) return value;
  return `${value}${value.includes('?') ? '&' : '?'}disposition=inline`;
}

function freshSupplierDocumentUrl(url) {
  const value = inlineSupplierDocumentUrl(url);
  if (!value || value.startsWith('blob:')) return value;
  return `${value}${value.includes('?') ? '&' : '?'}_pdf=${Date.now()}`;
}

async function waitForReceiptPdfJob(jobId, timeoutMs = 5 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await jobsApi.detail(jobId);
    if (job.status === 'succeeded') return job.result || {};
    if (['failed', 'dead', 'cancelled'].includes(job.status)) {
      throw new Error(job.error_message || 'Фоновое обновление PDF завершилось с ошибкой');
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('PDF продолжает обновляться в фоне. Откройте документ немного позже.');
}

const PDF_SYNC_SUCCESS_NOTICE_MS = 3500;

function supplierDocumentPageUrl(url, pageNumber) {
  const value = inlineSupplierDocumentUrl(url);
  const page = Number(pageNumber);
  if (!value || !Number.isFinite(page) || page < 1) return value;
  const base = value.split('#')[0];
  const normalizedPage = Math.floor(page);
  const separator = base.includes('?') ? '&' : '?';
  // Chromium's PDF viewer can keep the previous page when only the hash
  // changes. A deterministic query key makes every ticket page a distinct
  // document URL; #page then positions the freshly mounted viewer.
  return `${base}${separator}_receipt_page=${normalizedPage}#page=${normalizedPage}`;
}


function OrderStageBar({ index, compact }) {
  return (
    <div className={'stage-bar' + (compact ? ' compact' : '')}>
      {ORDER_STAGES.map((s, i) => {
        const state = i < index ? 'done' : i === index ? 'active' : '';
        return (
          <React.Fragment key={s}>
            {i > 0 && <span className={'stage-line' + (i <= index ? ' done' : '')} />}
            <div className={'stage ' + state}>
              <span className="dot">{i < index ? <Icon name="check" strokeWidth={3} /> : i + 1}</span>
              <span className="lbl">{s}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}




function FinanceOpCard({ op, onClose, onChange }) {
  const toast = useToast();
  const [comment, setComment] = useState('');
  if (!op) return null;
  const payable = finPayable(op);
  const debt = finDebt(op);
  const pct = payable ? Math.min(100, Math.round((op.paid / payable) * 100)) : 0;
  const isRefund = op.status === 'Возврат';

  const setStatus = async (s) => {
    try {
      await workspaceActionsApi.execute('finance.operation.status.change', { resourceType: 'finance_operation', resourceId: op.no, payload: { status: s } });
      onChange && onChange(op.no, { status: s }); toast('Статус: ' + s, 'ok');
    } catch (error) { toast(error.message || 'Не удалось изменить статус операции', 'err'); }
  };

  return (
    <Drawer open={!!op} onClose={onClose} title={'Операция ' + op.no}
      footer={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button style={{ flex: 1, minWidth: 150 }} icon="finance" onClick={async () => {
            try {
              if (op.orderId) await financeApi.createPayment({ direction: 'incoming', order: op.orderId, method: 'manual', amount: payable, currency: op.currency, comment: `Операция ${op.no}` });
              else await workspaceActionsApi.execute('finance.payment.create_request', { resourceType: 'finance_operation', resourceId: op.no, payload: { amount: payable, currency: op.currency, order_number: op.order } });
              onChange?.(op.no, { paid: payable, status: 'Оплачено' }); toast('Платёж добавлен', 'ok');
            } catch (error) { toast(error.message, 'err'); }
          }}>Добавить платёж</Button>
          <Button variant="secondary" icon="refund" onClick={() => window.__toastNav && window.__toastNav('returns')}>Возврат</Button>
          <Button variant="secondary" icon="check" onClick={() => setStatus('Закрыто')}>Закрыть</Button>
        </div>
      }>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Pill tone={SERVICE_KIND[op.source] ? SERVICE_KIND[op.source].tone : 'blue'}>{op.source}</Pill>
        <span style={{ color: 'var(--muted)' }}>{op.type}</span>
        <div style={{ flex: 1 }} />
        <ActionMenu trigger={<button style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pill tone={FIN_OP_STATUS[op.status]}>{op.status}</Pill><Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} /></button>}
          items={Object.keys(FIN_OP_STATUS).map((s) => ({ icon: op.status === s ? 'check' : null, label: s, onClick: () => setStatus(s) }))} />
      </div>


      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Расчёт</h3>
        <div className="amt-row"><span className="k">Тариф</span><span className="v">{fUsd(op.tariff, op.currency)}</span></div>
        <div className="amt-row"><span className="k">Таксы и сборы</span><span className="v">{fUsd(op.taxes, op.currency)}</span></div>
        <div className="amt-row"><span className="k">Сервисный сбор</span><span className="v">{fUsd(op.fee, op.currency)}</span></div>
        {op.discount > 0 && <div className="amt-row minus"><span className="k">Скидка</span><span className="v">− {fUsd(op.discount, op.currency)}</span></div>}
        {op.penalty > 0 && <div className="amt-row"><span className="k">Штраф</span><span className="v">{fUsd(op.penalty, op.currency)}</span></div>}
        <div className="amt-row total"><span className="k">Сумма к оплате</span><span className="v">{fUsd(payable, op.currency)}</span></div>
      </div>


      {!isRefund ? (
        <div className="card card-pad" style={{ marginBottom: 16 }}>
          <div className="pay-bar" style={{ marginBottom: 12 }}>
            <span style={{ width: pct + '%', background: '#2bb96a' }} />
            <span style={{ width: (100 - pct) + '%', background: debt > 0 ? '#f0921f' : '#2bb96a' }} />
          </div>
          <div className="amt-row"><span className="k">Оплачено</span><span className="v" style={{ color: 'var(--green)' }}>{fUsd(op.paid, op.currency)} · {pct}%</span></div>
          <div className="amt-row"><span className="k">Задолженность</span><span className="v" style={{ color: debt ? 'var(--red)' : 'var(--ink)' }}>{fUsd(debt, op.currency)}</span></div>
          <div className="amt-row"><span className="k">Комиссия агентства</span><span className="v" style={{ color: 'var(--green)' }}>+ {fUsd(op.commission, op.currency)}</span></div>
        </div>
      ) : (
        <div className="card card-pad" style={{ marginBottom: 16, background: 'var(--teal-bg)' }}>
          <div className="amt-row"><span className="k">К возврату клиенту</span><span className="v">{fUsd(op.refund, op.currency)}</span></div>
          <div className="amt-row"><span className="k">Удержанный штраф</span><span className="v" style={{ color: 'var(--red)' }}>{fUsd(op.penalty, op.currency)}</span></div>
        </div>
      )}

      <div className="kv" style={{ marginBottom: 16 }}>
        <div className="kv-row"><span className="k">Заказ</span><span className="v" style={{ color: 'var(--blue)' }}>№ {op.order}</span></div>
        <div className="kv-row"><span className="k">Дата</span><span className="v">{op.date}</span></div>
        <div className="kv-row"><span className="k">Валюта</span><span className="v">{op.currency}</span></div>
        <div className="kv-row"><span className="k">Ответственный</span><span className="v">{op.resp}</span></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 className="card-title" style={{ fontSize: 15, marginBottom: 10 }}>Комментарий</h3>
        {op.comment ? <p style={{ margin: '0 0 12px', color: 'var(--body)' }}>{op.comment}</p> : <p style={{ margin: '0 0 12px', color: 'var(--muted-2)' }}>Без комментариев</p>}
        <div style={{ display: 'flex', gap: 8 }}><Input placeholder="Добавить комментарий…" value={comment} onChange={(event) => setComment(event.target.value)} style={{ flex: 1 }} /><Button icon="send" onClick={async () => {
          if (!comment.trim()) return;
          try { await workspaceActionsApi.execute('finance.comment.add', { resourceType: 'finance_operation', resourceId: op.no, payload: { comment: comment.trim() } }); setComment(''); toast('Комментарий добавлен', 'ok'); }
          catch (error) { toast(error.message, 'err'); }
        }} /></div>
      </div>

      <h3 className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>История изменений</h3>
      <div className="timeline">
        {[...op.history].reverse().map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </Drawer>
  );
}


function FinanceRegistry({ scopeOrder, onOpenOp, initialOps }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [fSource, setFSource] = useState('');
  const sourceOps = Array.isArray(initialOps) ? initialOps : FIN_OPS;
  const [ops, setOps] = useState(scopeOrder ? sourceOps.filter((o) => o.order === scopeOrder) : sourceOps);
  const [card, setCard] = useState(null);
  const { sort, onSort, apply } = useSort(null);

  const updateOp = (no, patch) => setOps((cur) => cur.map((o) => (o.no === no ? { ...o, ...patch } : o)));

  let rows = ops.filter((o) => {
    if (tab !== 'all' && o.status !== tab) return false;
    if (fSource && o.source !== fSource) return false;
    if (q && !(`${o.no} ${o.order} ${o.source} ${o.resp}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = apply(rows, { no: (r) => r.no, payable: (r) => finPayable(r), debt: (r) => finDebt(r) });

  const sum = (fn) => ops.reduce((s, o) => s + fn(o), 0);
  const STATS = [
    { l: 'К оплате', v: fUsd(sum((o) => finPayable(o))) },
    { l: 'Оплачено', v: fUsd(sum((o) => o.paid)) },
    { l: 'Задолженность', v: fUsd(sum((o) => finDebt(o))), tone: 'red' },
    { l: 'Возвраты', v: fUsd(sum((o) => o.refund)), tone: 'teal' },
  ];
  const cnt = (st) => ops.filter((o) => !st || o.status === st).length;
  const TABS = [{ key: 'all', label: 'Все', count: cnt() }].concat(Object.keys(FIN_OP_STATUS).map((s) => ({ key: s, label: s, count: cnt(s) })));

  const open = (o) => onOpenOp ? onOpenOp(o) : setCard(o);

  return (
    <div className="fade-in">
      {!scopeOrder && (
        <div className="grid-4" style={{ marginBottom: 22 }}>
          {STATS.map((s) => (<div className="stat-card" key={s.l}><div className="s-label">{s.l}</div><div className="s-value" style={s.tone === 'red' ? { color: 'var(--red)' } : s.tone === 'teal' ? { color: 'var(--teal)' } : null}>{s.v}</div></div>))}
        </div>
      )}
      {scopeOrder && (() => {

        const curs = [...new Set(ops.map((o) => o.currency))];
        const sumCur = (c, fn) => ops.filter((o) => o.currency === c).reduce((s, o) => s + fn(o), 0);
        return (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {curs.map((c) => (
              <div className="stat-card" key={c} style={{ flex: '1 1 220px' }}>
                <div className="s-label">Итоги по операциям · {c}</div>
                <div style={{ display: 'flex', gap: 22, marginTop: 8, flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>К оплате</div><div style={{ fontWeight: 700, fontSize: 16 }}>{fUsd(sumCur(c, finPayable), c)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Оплачено</div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{fUsd(sumCur(c, (o) => o.paid), c)}</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--muted)' }}>Задолженность</div><div style={{ fontWeight: 700, fontSize: 16, color: sumCur(c, finDebt) ? 'var(--red)' : 'var(--ink)' }}>{fUsd(sumCur(c, finDebt), c)}</div></div>
                </div>
              </div>
            ))}
            {curs.length > 1 && (
              <div style={{ width: '100%', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="alertCircle" style={{ width: 14, height: 14 }} />Операции заказа в разных валютах — суммы по валютам не складываются.
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <div style={{ flex: 1 }} />
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, заказ…" style={{ width: 230 }} />
        <FilterChip label="Источник" value={fSource} onChange={setFSource} options={['Авиа', 'Гостиница', 'Трансфер', 'ЖД', 'Группа']} />
      </div>
      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr>
              <Th label="№" col="no" sort={sort} onSort={onSort} style={{ width: 90 }} />
              <th>Заказ</th><th>Источник</th><th>Тип операции</th>
              <Th label="К оплате" col="payable" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th style={{ textAlign: 'right' }}>Оплачено</th>
              <Th label="Задолженность" col="debt" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th>Ответственный</th><th>Статус</th>
            </tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.no} style={{ cursor: 'pointer' }} onClick={() => open(o)}>
                  <td className="t-strong">{o.no}</td>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {o.order}</span></td>
                  <td><Pill tone={SERVICE_KIND[o.source] ? SERVICE_KIND[o.source].tone : 'blue'}>{o.source}</Pill></td>
                  <td>{o.type}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fUsd(finPayable(o), o.currency)}</td>
                  <td style={{ textAlign: 'right' }}>{fUsd(o.paid, o.currency)}</td>
                  <td style={{ textAlign: 'right', color: finDebt(o) ? 'var(--red)' : 'var(--muted-2)', fontWeight: 600 }}>{finDebt(o) ? fUsd(finDebt(o), o.currency) : '—'}</td>
                  <td>{o.resp}</td>
                  <td><Pill tone={FIN_OP_STATUS[o.status]}>{o.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="finance" title="Операций не найдено" />}
      </div>
      {card && <FinanceOpCard op={card} onClose={() => setCard(null)} onChange={updateOp} />}
    </div>
  );
}

function FinancePageNew() {
  return (<><Topbar title="Финансы" /><div className="content"><FinanceRegistry /></div></>);
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








const REC_TYPES = [
  { key: 'Авиа',      doc: 'Маршрут-квитанция', icon: 'plane', color: '#2566ff', legLabel: 'Рейс',    docNoLabel: 'Номер билета', refLabel: 'PNR' },
  { key: 'ЖД',        doc: 'Электронный ЖД-билет', icon: 'train', color: '#5a5af0', legLabel: 'Поезд',   docNoLabel: 'Билет №',      refLabel: 'Заказ №' },
  { key: 'Гостиница', doc: 'Ваучер',               icon: 'bed',   color: '#1f9d57', legLabel: 'Проживание', docNoLabel: 'Ваучер №',  refLabel: 'Код брони' },
  { key: 'Трансфер',  doc: 'Ваучер',               icon: 'car',   color: '#c47e22', legLabel: 'Трансфер', docNoLabel: 'Ваучер №',    refLabel: 'Заказ №' },
  { key: 'Прочее',    doc: 'Прочее',               icon: 'paperclip', color: '#9aa3b2', legLabel: 'Услуга', docNoLabel: 'Документ №', refLabel: 'Код' },
];
const recType = (key) => REC_TYPES.find((t) => t.key === key) || REC_TYPES[0];
const RECOG_STEPS = ['Извлечение текста', 'Пассажир и документ', 'Маршрут и рейсы', 'Тарифы и таксы', 'Проверка данных'];



const TRIP_TYPES = {
  oneway:    { label: 'В одну сторону',  arrow: '→' },
  roundtrip: { label: 'Туда-обратно',    arrow: '⇄' },
  complex:   { label: 'Сложный маршрут', arrow: '→' },
};
const tripLabel = (p) => (TRIP_TYPES[p.tripType] || TRIP_TYPES.oneway).label;
const legCode = (l, side) => (side === 'to' ? (l.toCode || l.to) : (l.fromCode || l.from)) || '';
function routeSummary(p) {
  if (!p.legs || !p.legs.length) return '—';
  if (p.tripType === 'roundtrip') {
    const out = p.legs.find((l) => l.dir !== 'back') || p.legs[0];
    return legCode(out, 'from') + ' ⇄ ' + legCode(out, 'to');
  }
  return p.legs.map((l) => legCode(l, 'from')).concat([legCode(p.legs[p.legs.length - 1], 'to')]).filter(Boolean).join(' → ') || '—';
}

let RID = 0;


function emptyReceiptParse(file) {
  return normalizeReceiptDraft(file.type, {
    carrier: '', carrierCode: '', passenger: '', dob: '', docNo: '', ticketNo: '', ref: '',
    cls: '', fareBasis: '', baggage: '', handBaggage: '', issueDate: '', tripType: file.type === 'Гостиница' ? 'stay' : 'oneway',
    legs: [{ from: '', fromCode: '', to: '', toCode: '', date: '', endDate: '', dep: '', arr: '', flightNo: '', dir: 'out' }],
    currency: '', fare: '', taxes: '', fees: '', total: '', fareBreakdown: [], taxBreakdown: [], feeBreakdown: [],
    recognitionPending: true,
  });
}
function guessType(name) {
  const n = (name || '').toLowerCase();
  if (/(transfer|трансфер|pickup|driver|car)/.test(n)) return 'Трансфер';
  if (/(hotel|отел|voucher|ваучер|room|гостиниц)/.test(n)) return 'Гостиница';
  if (/(train|ржд|поезд|rail|жд)/.test(n)) return 'ЖД';
  if (/(avia|air|flight|ticket|itinerary|авиа|рейс|маршрут)/.test(n)) return 'Авиа';
  return 'Прочее';
}
function serviceTypeFromBackend(kind, label, fallback) {
  const raw = String(kind || label || '').toLowerCase();
  if (raw === 'avia' || /авиа/.test(raw)) return 'Авиа';
  if (raw === 'rail' || /жд|ж\/д|поезд|rail/.test(raw)) return 'ЖД';
  if (raw === 'hotel' || /гостиниц|отел|hotel/.test(raw)) return 'Гостиница';
  if (raw === 'transfer' || /трансфер|transfer/.test(raw)) return 'Трансфер';
  if (raw === 'other' || /проч/.test(raw)) return 'Прочее';
  return fallback || 'Прочее';
}
function receiptImportSubrows(type, receipts, expectedCount = 0) {
  if (!Array.isArray(receipts) || !receipts.length) return [];
  // A partially recognized group still keeps its successfully parsed child.
  // The declared count and backend warning make the missing blanks visible,
  // instead of falling back to one misleading aggregate ticket.
  if (receipts.length < 2 && Number(expectedCount || 0) < 2) return [];
  return receipts.map((receipt, index) => normalizeReceiptDraft(type, {
    ...receipt,
    carrier: receipt.carrier || receipt.issuer || '',
    passenger: receipt.passenger || receipt.passenger_name || '',
    passengers: receipt.passengers || ((receipt.passenger || receipt.passenger_name) ? [{
      name: receipt.passenger || receipt.passenger_name,
      dob: receipt.dob || receipt.date_of_birth || '',
      document: receipt.docNo || receipt.document_number || '',
      ticketNo: receipt.ticketNo || receipt.ticket_number || '',
    }] : []),
    dob: receipt.dob || receipt.date_of_birth || '',
    docNo: receipt.docNo || receipt.document_number || '',
    ticketNo: receipt.ticketNo || receipt.ticket_number || '',
    ref: receipt.ref || receipt.reference || '',
    cls: receipt.cls || receipt.booking_class || '',
    // `total` in railway supplier payloads is the whole ticket amount. It must
    // not become the tariff, otherwise the reserved-seat part is added twice.
    fare: receipt.fare ?? '',
    taxes: receipt.taxes ?? 0,
    fees: receipt.fees ?? 0,
    total: receipt.total ?? '',
    ticketCost: receipt.ticketCost ?? receipt.ticket_cost ?? '',
    reservedSeatCost: receipt.reservedSeatCost ?? receipt.reserved_seat_cost ?? '',
    agencyServiceFee: receipt.agencyServiceFee ?? receipt.agency_service_fee ?? receipt.fees ?? '',
    additionalFees: receipt.additionalFees ?? receipt.additional_fees ?? '',
    fareBreakdown: receipt.costBreakdown || receipt.fare_breakdown || [],
    taxBreakdown: receipt.taxBreakdown || receipt.tax_breakdown || [],
    feeBreakdown: receipt.feeBreakdown || receipt.fee_breakdown || [],
    includedTaxBreakdown: receipt.includedTaxBreakdown || receipt.included_tax_breakdown || [],
    currency: receipt.currency || 'RUB',
    legs: receipt.legs || receipt.segments || [],
    tripType: receipt.tripType || receipt.trip_type || 'oneway',
    recognitionPending: false,
    receiptIndex: receipt.receiptIndex || receipt.receipt_index || index + 1,
    sourcePage: receipt.sourcePage || receipt.source_page || '',
    sourcePages: receipt.sourcePages || receipt.source_pages || [],
    reviewStatus: receipt.reviewStatus || receipt.review_status || 'pending',
  }));
}
function aggregateReceiptSubrows(parent, subReceipts, receiptType = 'ЖД') {
  if (!subReceipts.length) return parent;
  const tickets = subReceipts.map((receipt) => normalizeReceiptDraft(receiptType, {
    ...receipt,
    groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
  }));
  const sum = (key) => Math.round(tickets.reduce((total, receipt) => total + (Number(receipt[key]) || 0), 0) * 100) / 100;
  const passengers = tickets.flatMap((receipt) => receipt.passengers || []).filter((passenger) => passenger.name);
  const uniqueLegs = [];
  const seenLegs = new Set();
  tickets.flatMap((receipt) => receipt.legs || []).forEach((leg) => {
    const key = [leg.from, leg.to, leg.date, leg.dep, leg.arr, leg.flightNo].join('|');
    if (!seenLegs.has(key)) {
      seenLegs.add(key);
      uniqueLegs.push(leg);
    }
  });
  const ticketCost = sum('ticketCost');
  const reservedSeatCost = sum('reservedSeatCost');
  const agencyServiceFee = sum('agencyServiceFee');
  const additionalFees = sum('additionalFees');
  const taxes = sum('taxes');
  if (receiptType === 'Авиа') {
    const fare = sum('fare');
    const fees = sum('fees');
    const total = sum('total') || Math.round((fare + taxes + fees) * 100) / 100;
    return normalizeReceiptDraft('Авиа', {
      ...parent,
      passenger: passengers.map((passenger) => passenger.name).join(', '),
      passengers,
      ticketNo: tickets.map((receipt) => receipt.ticketNo).filter(Boolean).join(', '),
      legs: uniqueLegs.length ? uniqueLegs : parent.legs,
      fare, taxes, fees, total, originalTotal: total,
      groupTickets: tickets,
      receipts: tickets,
      receiptItems: tickets,
      receiptCount: tickets.length,
      recognitionPending: tickets.some((receipt) => receipt.recognitionPending),
    });
  }
  const computedTotal = Math.round((ticketCost + reservedSeatCost + agencyServiceFee + additionalFees + taxes) * 100) / 100;
  const ticketTotals = sum('total');
  const total = ticketTotals || computedTotal;
  return normalizeReceiptDraft('ЖД', {
    ...parent,
    passenger: passengers.map((passenger) => passenger.name).join(', '),
    passengers,
    ticketNo: tickets.map((receipt) => receipt.ticketNo).filter(Boolean).join(', '),
    legs: uniqueLegs.length ? uniqueLegs : parent.legs,
    fare: Math.round((ticketCost + reservedSeatCost) * 100) / 100,
    taxes,
    fees: Math.round((agencyServiceFee + additionalFees) * 100) / 100,
    total,
    originalTotal: total,
    ticketCost,
    reservedSeatCost,
    agencyServiceFee,
    additionalFees,
    fareBreakdown: [
      { code: 'TICKET', label: 'Билет', amount: ticketCost, currency: parent.currency || 'RUB' },
      { code: 'RESERVED_SEAT', label: 'Плацкарта', amount: reservedSeatCost, currency: parent.currency || 'RUB' },
    ],
    groupTickets: tickets,
    receipts: tickets,
    railTickets: tickets,
    receiptItems: tickets,
    receiptCount: tickets.length,
    recognitionPending: tickets.some((receipt) => receipt.recognitionPending),
  });
}

function receiptWithPricing(type, receipt, pricing) {
  const round = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const tariffAndTaxes = round(pricing?.tariff);
  const fees = round(pricing?.fee);
  const taxes = round(receipt?.taxes);
  const clientAmount = round(tariffAndTaxes + fees + Number(pricing?.markup || 0));
  const pricingFields = {
    markup: round(pricing?.markup),
    commission: round(pricing?.commission),
    clientTotal: clientAmount,
  };

  if (type === 'Авиа') {
    const fare = Math.max(0, round(tariffAndTaxes - taxes));
    const fareBreakdown = (receipt?.fareBreakdown || []).length === 1
      ? receipt.fareBreakdown.map((row) => ({ ...row, amount: fare }))
      : (receipt?.fareBreakdown || []);
    return normalizeReceiptDraft(type, {
      ...receipt,
      fare,
      taxes,
      fees,
      total: clientAmount,
      fareBreakdown,
      ...pricingFields,
    });
  }

  if (type === 'ЖД') {
    const rawTicketCost = pricing?.ticketCost !== undefined
      ? round(pricing.ticketCost)
      : (receipt?.ticketCost !== undefined ? round(receipt.ticketCost) : null);
    const rawReservedCost = pricing?.reservedSeatCost !== undefined
      ? round(pricing.reservedSeatCost)
      : (receipt?.reservedSeatCost !== undefined ? round(receipt.reservedSeatCost) : null);
    const reservedSeatCost = rawReservedCost !== null
      ? rawReservedCost
      : round(receipt?.reservedSeatCost);
    const additionalFees = round(receipt?.additionalFees);
    const ticketCost = rawTicketCost !== null
      ? rawTicketCost
      : Math.max(0, round(tariffAndTaxes - taxes - reservedSeatCost));
    const agencyServiceFee = Math.max(0, round(fees - additionalFees));
    const fare = Math.round((ticketCost + reservedSeatCost) * 100) / 100;
    return normalizeReceiptDraft(type, {
      ...receipt,
      ticketCost,
      reservedSeatCost,
      fare,
      agencyServiceFee,
      additionalFees,
      total: clientAmount,
      fareBreakdown: [
        { code: 'TICKET', label: 'Билет', amount: ticketCost, currency: receipt?.currency || 'RUB' },
        { code: 'RESERVED_SEAT', label: 'Плацкарта', amount: reservedSeatCost, currency: receipt?.currency || 'RUB' },
      ],
      ...pricingFields,
    });
  }

  return normalizeReceiptDraft(type, { ...receipt, total: clientAmount, ...pricingFields });
}
function receiptMoneyNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const compact = raw.replace(/[\s\u00a0\u202f]/g, '').replace(/[^\d,.+\-]/g, '');
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized = compact;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? /\./g : /,/g;
    normalized = compact.replace(thousandsSeparator, '').replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    normalized = compact.replace(/,/g, '.');
  }
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

const receiptImportMoney = (...values) => {
  const numbers = values
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(receiptMoneyNumber)
    .filter(Number.isFinite);
  return numbers.find((value) => value !== 0) ?? numbers[0] ?? 0;
};
const receiptImportPassengers = (...lists) => (
  lists.find((rows) => Array.isArray(rows) && rows.length > 0) || []
);
const recMoney = (v, c) => (v < 0 ? '− ' : '') + Math.abs(v).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c);
const recComputed = (p) => (Number(p.fare) || 0) + (Number(p.taxes) || 0) + (Number(p.fees) || 0);
const recHasSourceAmount = (p) => p && Object.prototype.hasOwnProperty.call(p, 'originalTotal')
  ? Math.abs(Number(p.originalTotal) || 0) > 0
  : [p && p.fare, p && p.taxes, p && p.fees, p && p.total].some((value) => Math.abs(Number(value) || 0) > 0);
const recSourceMoney = (p) => recHasSourceAmount(p) ? recMoney(Number(p.originalTotal) || Number(p.total) || recComputed(p), p.currency) : 'Не указано';

function LegLine({ l }) {
  const dates = l.endDate && l.endDate !== l.date ? `${l.date || '—'}–${l.endDate}` : l.date;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '3px 0', fontSize: 12, color: 'var(--body)' }}>
      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{l.from}{l.to ? ' → ' + l.to : ''}</span>
      <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{[dates, [l.dep, l.arr].filter(Boolean).join('–'), l.flightNo].filter(Boolean).join(' · ')}</span>
    </div>
  );
}

function RouteView({ p, isStay }) {
  if (isStay) {
    return (<div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12, marginBottom: 4 }}>Проживание</div>
      {p.legs.map((l, i) => <LegLine key={i} l={l} />)}
    </div>);
  }
  const tt = p.tripType || 'oneway';
  const Group = ({ title, legs }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.03em', margin: '4px 0 2px' }}>{title}</div>
      {legs.map((l, i) => <LegLine key={i} l={l} />)}
    </div>
  );
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12 }}>Маршрут</span>
        <Pill tone="blue">{tripLabel(p)}</Pill>
      </div>
      {tt === 'roundtrip' ? (
        <>
          <Group title="Туда" legs={p.legs.filter((l) => l.dir !== 'back')} />
          <Group title="Обратно" legs={p.legs.filter((l) => l.dir === 'back')} />
        </>
      ) : p.legs.map((l, i) => (
        <React.Fragment key={i}>
          <LegLine l={l} />
          {tt === 'complex' && i < p.legs.length - 1 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', padding: '0 0 2px 2px' }}>↳ пересадка{legCode(l, 'to') ? ' · ' + legCode(l, 'to') : ''}</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
function RSub({ children, style }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '20px 2px 10px', ...style }}>{children}</div>;
}


function ReceiptPreview({ type, p }) {
  const t = recType(type);
  const total = Number(p.total) || recComputed(p);
  const hasFinancials = [p.fare, p.taxes, p.fees, p.total].some((value) => value !== '' && value != null);
  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: '2px solid var(--ink)' }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, background: t.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} style={{ width: 18, height: 18, color: '#fff' }} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{p.carrier || '—'}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t.doc}</div>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>{t.refLabel}<br /><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.ref || '—'}</span></div>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12, marginBottom: 10 }}>
          {[[t.legLabel === 'Проживание' ? 'Гость' : 'Пассажир', p.passenger], [t.docNoLabel, p.ticketNo], ['Класс/тариф', [p.cls, p.fareBasis].filter((x) => x && x !== '—').join(' · ') || '—'], ['Багаж', p.baggage]].map(([k, v]) => (
            <div key={k}><span style={{ color: 'var(--muted)' }}>{k}: </span><span style={{ fontWeight: 600, color: 'var(--ink)' }}>{v || '—'}</span></div>
          ))}
        </div>
        <RouteView p={p} isStay={t.legLabel === 'Проживание'} />
        {hasFinancials ? <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8, fontSize: 12 }}>
          {[['Тариф', p.fare], ['Таксы', p.taxes], ['Сборы', p.fees]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: 'var(--ink)' }}>{recMoney(Number(v) || 0, p.currency)}</span></div>
          ))}
          {!!(p.fareBreakdown && p.fareBreakdown.length) && (
            <div style={{ padding: '2px 0 4px', fontSize: 11.5, color: 'var(--muted)' }}>
              {p.fareBreakdown.map((row, i) => <span key={i} style={{ marginRight: 8 }}>{row.code || row.label}: {recMoney(Number(row.amount) || 0, row.currency || '')}</span>)}
            </div>
          )}
          {!!(p.taxBreakdown && p.taxBreakdown.length) && (
            <div style={{ padding: '2px 0 4px', fontSize: 11.5, color: 'var(--muted)' }}>
              {p.taxBreakdown.map((row, i) => <span key={i} style={{ marginRight: 8 }}>{row.code || row.label}: {recMoney(Number(row.amount) || 0, row.currency || p.currency)}</span>)}
            </div>
          )}
          {!!(p.feeBreakdown && p.feeBreakdown.length) && (
            <div style={{ padding: '0 0 4px', fontSize: 11.5, color: 'var(--muted)' }}>
              {p.feeBreakdown.map((row, i) => <span key={i} style={{ marginRight: 8 }}>{row.code || row.label}: {recMoney(Number(row.amount) || 0, row.currency || p.currency)}</span>)}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '2px solid var(--ink)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
            <span>Итого</span><span>{recMoney(total, p.currency)}</span>
          </div>
        </div> : <div style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 8, fontSize: 12, color: 'var(--muted)' }}>Стоимость в исходном документе не указана</div>}
      </div>
    </div>
  );
}


function ReceiptEditForm({ type, p, onChange }) {
  const t = recType(type);
  const isStay = t.legLabel === 'Проживание';
  const canTrip = type === 'Авиа' || type === 'ЖД';
  const set = (k, v) => onChange({ ...p, [k]: v });
  const setLeg = (i, k, v) => onChange({ ...p, legs: p.legs.map((l, ix) => (ix === i ? { ...l, [k]: v } : l)) });
  const breakdownKey = (kind) => ({ fare: 'fareBreakdown', tax: 'taxBreakdown', fee: 'feeBreakdown' }[kind]);
  const setBreakdown = (kind, i, k, v) => {
    const key = breakdownKey(kind);
    onChange({ ...p, [key]: (p[key] || []).map((row, ix) => (ix === i ? { ...row, [k]: v } : row)) });
  };
  const addBreakdown = (kind) => {
    const key = breakdownKey(kind);
    onChange({ ...p, [key]: [...(p[key] || []), { code: '', label: '', amount: '', currency: p.currency || 'RUB' }] });
  };
  const delBreakdown = (kind, i) => {
    const key = breakdownKey(kind);
    onChange({ ...p, [key]: (p[key] || []).filter((_, ix) => ix !== i) });
  };
  const sumRows = (rows) => Math.round((rows || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0) * 100) / 100;
  const addLeg = () => {
    const tt = p.tripType === 'roundtrip' ? 'roundtrip' : 'complex';
    const dir = p.tripType === 'roundtrip' ? 'back' : 'seg';
    const legs = p.tripType === 'oneway' ? p.legs.map((l) => ({ ...l, dir: 'seg' })) : p.legs;
    onChange({ ...p, tripType: tt, legs: [...legs, { from: '', fromCode: '', to: '', toCode: '', date: '', endDate: '', dep: '', arr: '', flightNo: '', dir }] });
  };
  const delLeg = (i) => onChange({ ...p, legs: p.legs.filter((_, ix) => ix !== i) });
  const setTrip = (tt) => {
    let legs = p.legs.map((l) => ({ ...l }));
    if (tt === 'oneway') { legs = [{ ...(legs[0] || {}), dir: 'out' }]; }
    else if (tt === 'roundtrip') {
      const out = { ...(legs[0] || {}), dir: 'out' };
      const b = legs.find((l) => l.dir === 'back') || legs[1] || {};
      legs = [out, { ...b, dir: 'back', from: b.from || out.to, fromCode: b.fromCode || out.toCode, to: b.to || out.from, toCode: b.toCode || out.fromCode, date: b.date || '', dep: b.dep || '', arr: b.arr || '', flightNo: b.flightNo || '' }];
    } else { legs = legs.map((l) => ({ ...l, dir: 'seg' })); if (legs.length < 2) legs.push({ from: '', fromCode: '', to: '', toCode: '', date: '', dep: '', arr: '', flightNo: '', dir: 'seg' }); }
    onChange({ ...p, tripType: tt, legs });
  };
  const legTitle = (i) => {
    if (p.tripType === 'roundtrip') return p.legs[i].dir === 'back' ? 'Обратно' : 'Туда';
    if (p.tripType === 'complex') return 'Плечо ' + (i + 1);
    return t.legLabel;
  };
  return (
    <div>
      <RSub style={{ marginTop: 0 }}>{recType(type).legLabel === 'Проживание' ? 'Гость и бронь' : 'Пассажир и документ'}</RSub>
      <div className="form-grid">
        <Field label={t.legLabel === 'Проживание' ? 'Гость' : 'Пассажир'}><Input value={p.passenger} onChange={(e) => set('passenger', e.target.value)} /></Field>
        <UFDateField label="Дата рождения" value={p.dob && p.dob !== '—' ? p.dob : null} onChange={(v) => set('dob', v)} placeholder="дд.мм.гггг" />
        <Field label="Документ"><Input value={p.docNo} onChange={(e) => set('docNo', e.target.value)} /></Field>
        <Field label={t.docNoLabel}><Input value={p.ticketNo} onChange={(e) => set('ticketNo', e.target.value)} /></Field>
        <Field label={t.refLabel}><Input value={p.ref} onChange={(e) => set('ref', e.target.value)} /></Field>
        <Field label="Перевозчик / поставщик"><Input value={p.carrier} onChange={(e) => set('carrier', e.target.value)} /></Field>
        <Field label="Класс"><Input value={p.cls} onChange={(e) => set('cls', e.target.value)} /></Field>
        <Field label="Тариф (fare basis)"><Input value={p.fareBasis} onChange={(e) => set('fareBasis', e.target.value)} /></Field>
        <Field label="Багаж"><Input value={p.baggage} onChange={(e) => set('baggage', e.target.value)} /></Field>
        <Field label="Ручная кладь"><Input value={p.handBaggage} onChange={(e) => set('handBaggage', e.target.value)} /></Field>
      </div>

      <RSub style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{isStay ? 'Проживание' : 'Маршрут'}</span>
        <button className="btn btn-ghost btn-sm" onClick={addLeg}><Icon name="plus" style={{ width: 14, height: 14 }} /> {p.tripType === 'roundtrip' ? 'Плечо' : 'Сегмент'}</button>
      </RSub>
      {canTrip && (
        <div className="trip-toggle" style={{ display: 'inline-flex', marginBottom: 12 }}>
          {Object.keys(TRIP_TYPES).map((k) => (
            <button key={k} className={(p.tripType || 'oneway') === k ? 'on' : ''} onClick={() => setTrip(k)}>{TRIP_TYPES[k].label}</button>
          ))}
        </div>
      )}
      {p.legs.map((l, i) => (
        <div key={i} className="card card-pad" style={{ marginBottom: 10, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted)' }}>{isStay ? t.legLabel : legTitle(i)}</span>
            {p.legs.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => delLeg(i)}><Icon name="trash" style={{ width: 14, height: 14 }} /></button>}
          </div>
          <div className="form-grid">
            <Field label="Откуда"><Input value={l.from} onChange={(e) => setLeg(i, 'from', e.target.value)} /></Field>
            <Field label="Куда"><Input value={l.to} onChange={(e) => setLeg(i, 'to', e.target.value)} /></Field>
            <UFDateField label={isStay ? 'Дата заезда' : 'Дата'} value={l.date || null} onChange={(v) => setLeg(i, 'date', v)} placeholder="дд.мм.гггг" />
            {isStay && <UFDateField label="Дата выезда" value={l.endDate || null} onChange={(v) => setLeg(i, 'endDate', v)} placeholder="дд.мм.гггг" />}
            <Field label={t.legLabel === 'Проживание' ? 'Условия' : 'Рейс / поезд'}><Input value={l.flightNo} onChange={(e) => setLeg(i, 'flightNo', e.target.value)} /></Field>
            <TimeField label="Вылет / заезд" value={l.dep} onChange={(v) => setLeg(i, 'dep', v)} />
            <TimeField label="Прилёт / выезд" value={l.arr} onChange={(v) => setLeg(i, 'arr', v)} />
          </div>
        </div>
      ))}

      <RSub>Стоимость</RSub>
      <div className="form-grid">
        <Field label="Валюта"><Select options={['RUB', 'USD', 'EUR', 'KGS', 'KZT']} value={p.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
        <Field label="Тариф"><Input type="number" value={p.fare} onChange={(e) => set('fare', e.target.value)} /></Field>
        <Field label="Таксы"><Input type="number" value={p.taxes} onChange={(e) => set('taxes', e.target.value)} /></Field>
        <Field label="Сборы"><Input type="number" value={p.fees} onChange={(e) => set('fees', e.target.value)} /></Field>
        <Field label="Итого"><Input type="number" value={p.total} onChange={(e) => set('total', e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 10 }}>
        {[
          ['fare', 'Разбивка тарифа', p.fareBreakdown || []],
          ['tax', 'Разбивка такс', p.taxBreakdown || []],
          ['fee', 'Разбивка сборов', p.feeBreakdown || []],
        ].map(([kind, title, rows]) => (
          <div key={kind} className="card card-pad" style={{ background: 'var(--surface-2)', gridColumn: kind === 'fee' ? '1 / -1' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{title}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => addBreakdown(kind)}><Icon name="plus" style={{ width: 14, height: 14 }} /> Добавить</button>
            </div>
            {rows.length ? rows.map((row, i) => (
              <div key={i} className="form-grid receipt-breakdown-row">
                <Field label="Код"><Input value={row.code || ''} onChange={(e) => setBreakdown(kind, i, 'code', e.target.value)} /></Field>
                <Field label="Название"><Input value={row.label || ''} onChange={(e) => setBreakdown(kind, i, 'label', e.target.value)} /></Field>
                <Field label="Сумма"><Input type="number" value={row.amount || ''} onChange={(e) => setBreakdown(kind, i, 'amount', e.target.value)} /></Field>
                <Field label=" "><button type="button" className="btn btn-ghost receipt-breakdown-remove"
                  aria-label="Удалить строку" title="Удалить строку" onClick={() => delBreakdown(kind, i)}><Icon name="trash" /></button></Field>
              </div>
            )) : <div style={{ fontSize: 12, color: 'var(--muted)' }}>Детализация не найдена</div>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => onChange({ ...p, taxes: sumRows(p.taxBreakdown || []) || p.taxes, fees: sumRows(p.feeBreakdown || []) || p.fees, total: recComputed({ ...p, taxes: sumRows(p.taxBreakdown || []) || p.taxes, fees: sumRows(p.feeBreakdown || []) || p.fees }) })}><Icon name="calc" style={{ width: 14, height: 14 }} /> Пересчитать итог</button>
      </div>
    </div>
  );
}



const REC_STATUS = {
  'Черновик':         { tone: 'amber', action: 'Продолжить черновик' },
  'Проверено':        { tone: 'green', action: 'Изменить' },
  'Распознано':       { tone: 'green', action: 'Проверить' },
  'Требует проверки': { tone: 'amber', action: 'Заполнить'  },
  'Заполнено вручную': { tone: 'blue', action: 'Проверить' },
  'Возможный дубль':  { tone: 'red',   action: 'Пропустить' },
  'Ошибка':           { tone: 'gray',  action: 'Повторить'  },
};
const IMPORT_STEPS = [
  { key: 'upload', label: 'Загрузка' },
  { key: 'recognize', label: 'Распознавание' },
  { key: 'verify', label: 'Проверка' },
  { key: 'pricing', label: 'Данные и бланк' },
  { key: 'attach', label: 'В заказ' },
];
const RECEIPT_IMPORT_CONCURRENCY = 1;
const RECEIPT_IMPORT_MAX_ATTEMPTS = 5;
const RECEIPT_RESULT_MAX_ATTEMPTS = 6;
const RECEIPT_IMPORT_GAP_MS = 650;
const RECEIPT_TRANSIENT_STATUSES = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

const receiptImportSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const receiptRetryDelay = (attempt, base = 1200) => Math.min(12000, base * (2 ** attempt)) + Math.round(Math.random() * 350);
const isTransientReceiptError = (error) => RECEIPT_TRANSIENT_STATUSES.has(Number(error?.status || 0));

async function importReceiptWithRetry(file) {
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'receipt-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  let lastError = null;
  for (let attempt = 0; attempt < RECEIPT_IMPORT_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await documentsApi.importReceipt(file, { idempotencyKey });
    } catch (error) {
      lastError = error;
      if (!isTransientReceiptError(error) || attempt >= RECEIPT_IMPORT_MAX_ATTEMPTS - 1) throw error;
      await receiptImportSleep(receiptRetryDelay(attempt));
    }
  }
  throw lastError || new Error('Не удалось импортировать квитанцию');
}

async function receiptResultWithRetry(importId) {
  let lastError = null;
  for (let attempt = 0; attempt < RECEIPT_RESULT_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await documentsApi.receiptResult(importId);
    } catch (error) {
      lastError = error;
      if (!isTransientReceiptError(error) || attempt >= RECEIPT_RESULT_MAX_ATTEMPTS - 1) throw error;
      await receiptImportSleep(receiptRetryDelay(attempt, 900));
    }
  }
  throw lastError || new Error('Не удалось получить результат распознавания');
}

function serializableReceiptImportFile(file) {
  const { raw, ...stored } = file;
  return {
    ...stored,
    originalUrl: stored.originalUrl && !String(stored.originalUrl).startsWith('blob:')
      ? stored.originalUrl
      : null,
    status: 'done',
  };
}

// Отпечаток одного бланка. Номера билета мало: в ЖД-группе перевозчик
// печатает на каждом билете общий номер заказа, и по нему все бланки группы
// выглядели одинаковыми. Пассажир вместе с поездом, вагоном, местом и датой
// разводит билеты одного заказа и при этом ловит повторную загрузку файла.
function receiptBlankFingerprint(ticket, parent) {
  const token = (value) => String(value ?? '').replace(/[^0-9A-ZА-ЯЁ]/gi, '').toUpperCase();
  const leg = ticket?.legs?.[0] || ticket?.segments?.[0] || parent?.legs?.[0] || parent?.segments?.[0] || {};
  const number = token(ticket?.ticketNo || ticket?.ticket_number || ticket?.passengers?.[0]?.ticketNo || ticket?.docNo || ticket?.document_number);
  const passenger = token(ticket?.passenger || ticket?.passenger_name || ticket?.passengers?.[0]?.name || parent?.passenger || parent?.passenger_name);
  const doc = token(ticket?.docNo || ticket?.document_number || ticket?.passengers?.[0]?.document);
  const train = token(leg.flightNo || leg.flight_no || leg.train);
  const coach = token(leg.coach);
  const seat = token(leg.seat);
  const date = token(leg.date);
  const dep = token(leg.dep);
  const place = [train, coach, seat, date, dep].filter(Boolean).join('-');
  const route = [token(leg.fromCode || leg.from), token(leg.toCode || leg.to)].filter(Boolean).join('-');
  const identity = [number, passenger || doc, place, route].filter(Boolean).join('::');
  return identity && (number || passenger || doc || place) ? identity : '';
}

function receiptBlankFingerprints(parsed, file) {
  if (!parsed && !file) return [];
  const fileSubReceipts = Array.isArray(file?.subReceipts) && file.subReceipts.length ? file.subReceipts : [];
  const parsedTickets = parsed?.groupTickets || parsed?.receiptItems || parsed?.receipt_items || parsed?.receipts || parsed?.railTickets || [];
  const tickets = fileSubReceipts.length ? fileSubReceipts : (parsedTickets.length ? parsedTickets : []);
  const sources = tickets.length ? tickets : (parsed ? [parsed] : []);
  return [...new Set(sources.map((ticket) => receiptBlankFingerprint(ticket, parsed)).filter(Boolean))];
}

function receiptStatus(parsed, seen, type, error, file) {
  if (error) return 'Ошибка';
  if (!parsed) return 'Ошибка';
  const fingerprints = receiptBlankFingerprints(parsed, file);
  // Дубль — только когда повторно загружен весь документ. Частичное
  // совпадение у ЖД-группы означает общий заказ, а не повтор билета.
  const duplicate = fingerprints.length > 0 && fingerprints.every((fingerprint) => seen.has(fingerprint));
  fingerprints.forEach((fingerprint) => seen.add(fingerprint));
  if (duplicate) return 'Возможный дубль';
  const route = routeSummary(parsed);
  const hasRoute = route && route !== '—' && route.replace(/[→⇄\s]/g, '');
  const hasDateOrTime = (parsed.legs || []).some((l) => l.date || l.dep || l.arr);
  const amountMissing = type !== 'Гостиница' && !(Number(parsed.total) > 0);
  if (parsed.recognitionPending || !parsed.passenger || amountMissing || !hasRoute || !hasDateOrTime) return 'Требует проверки';
  if (parsed.manualCompletion) return 'Заполнено вручную';
  return 'Распознано';
}

async function waitForReceiptResult(importId) {
  let result = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    result = await receiptResultWithRetry(importId);
    const status = String(result?.parser_status || '').toLowerCase();
    if (!['queued', 'pending', 'processing', 'scanning'].includes(status)) return result;
    await receiptImportSleep(Math.min(2200, 700 + attempt * 80));
  }
  return result || {};
}


// Причина, по которой рабочий PDF не опубликован. Незакрытый тариф называется
// прямо: оператор должен понимать, что графа тарифа в бланке осталась открытой.
function receiptPdfCorrectionProblem(correction) {
  const unapplied = [
    ...(Array.isArray(correction?.unapplied) ? correction.unapplied : []),
    ...(Array.isArray(correction?.raw_unapplied) ? correction.raw_unapplied : []),
  ];
  if (unapplied.some((key) => String(key).endsWith('.it'))) {
    return 'Тариф закрыт на IT, но графу тарифа в бланке поставщика заменить не удалось. Проверьте бланк вручную — цена в нём осталась открытой.';
  }
  return 'Стоимость сохранена, но её не удалось безопасно перенести в рабочий PDF. Исходник не изменён.';
}

function receiptBlankIsReviewed(ticket) {
  const raw = String(ticket?.reviewStatus || ticket?.review_status || '').trim().toLowerCase();
  return ticket?.reviewed === true || ['reviewed', 'checked', 'done', 'complete', 'completed'].includes(raw);
}

// База поставщика бланка: для ЖД — билет + плацкарта, для авиа — тариф + таксы.
// Сервисный сбор агентства, надбавка и комиссия CRM в базу не входят: по ней
// сравнивается закупочная стоимость и от неё считается внутренняя математика.
function receiptSupplierBaseAmount(type, receipt) {
  const componentValues = (type === 'ЖД'
    ? [
      receipt?.ticketCost ?? receipt?.ticket_cost,
      receipt?.reservedSeatCost ?? receipt?.reserved_seat_cost,
    ]
    : [receipt?.fare, receipt?.taxes]).map(receiptMoneyNumber);
  const hasComponents = componentValues.some((value) => Number.isFinite(value) && value !== 0);
  // Ticket-level components are more reliable for grouped PDFs: some legacy
  // payloads copied the parent aggregate into every child's originalTotal.
  if (hasComponents) {
    const components = componentValues.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
    return Math.round(components * 100) / 100;
  }
  const total = receiptMoneyNumber(receipt?.originalTotal ?? receipt?.original_total ?? receipt?.total);
  if (!Number.isFinite(total)) return NaN;
  const feeValues = (type === 'ЖД'
    ? [
      receipt?.agencyServiceFee ?? receipt?.agency_service_fee,
      receipt?.additionalFees ?? receipt?.additional_fees,
    ]
    : [receipt?.fees]).map(receiptMoneyNumber);
  const fees = feeValues.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  return Math.round((total - fees) * 100) / 100;
}

function receiptSupplierBaseSignature(type, receipt) {
  const amount = receiptSupplierBaseAmount(type, receipt);
  if (!(amount > 0)) return '';
  return `${String(receipt?.currency || 'RUB').toUpperCase()}::${Math.round(amount * 100)}`;
}

function receiptRailCostSignature(ticket) {
  return receiptSupplierBaseSignature('ЖД', ticket);
}

function receiptPricingCostSignature(type, receipt) {
  if (!['Авиа', 'ЖД'].includes(type)) return '';
  return receiptSupplierBaseSignature(type, receipt);
}

function receiptRailSignatureAmount(signature) {
  const cents = Number(String(signature || '').split('::')[1]);
  return Number.isFinite(cents) ? cents / 100 : 0;
}

// Сквозная группировка по одинаковой закупочной стоимости: считается по всем
// загруженным бланкам импорта сразу, а не внутри одного PDF. Один и тот же
// тариф в разных документах поставщика попадает в одну группу.
function receiptGlobalCostGroups(pricingRows) {
  const groups = new Map();
  (pricingRows || []).forEach((row) => {
    const type = row?.f?.type;
    if (!['Авиа', 'ЖД'].includes(type)) return;
    const signature = receiptPricingCostSignature(type, row.parsed);
    if (!signature) return;
    const key = `${type}::${signature}`;
    const current = groups.get(key) || { key, type, signature, matches: [] };
    current.matches.push(row);
    groups.set(key, current);
  });
  return [...groups.values()]
    .filter((group) => group.matches.length > 1)
    .map((group) => ({
      ...group,
      sourceRow: group.matches[0],
      amount: receiptRailSignatureAmount(group.signature),
      currency: group.matches[0]?.parsed?.currency || '',
      documentCount: new Set(group.matches.map((row) => row.f.id)).size,
    }))
    .sort((a, b) => b.matches.length - a.matches.length || b.amount - a.amount);
}

function receiptGroupedTickets(file) {
  if (!file || !['Авиа', 'ЖД'].includes(file.type)) return [];
  if (Array.isArray(file.subReceipts) && file.subReceipts.length) return file.subReceipts;
  const parsed = file.parsed || {};
  return parsed.groupTickets || parsed.receiptItems || parsed.receipts || parsed.railTickets || [];
}

function receiptBrandFileForBlank(file, blankIndex = 0) {
  if (!file) return null;
  const type = file.type || file.editorType || 'ЖД';
  const tickets = receiptGroupedTickets({ ...file, type });
  // A one-ticket compatibility wrapper is not a real group; its parent stays
  // authoritative. Multi-ticket supplier PDFs must always produce one client
  // document per selected ticket, never a parent aggregate.
  if (tickets.length <= 1) return file;
  const index = Math.max(0, Math.min(tickets.length - 1, Number(blankIndex) || 0));
  const parent = file.parsed || {};
  const ticket = normalizeReceiptDraft(type, {
    ...tickets[index],
    crmBindingMode: tickets[index]?.crmBindingMode || parent.crmBindingMode,
    crmOrderId: tickets[index]?.crmOrderId || parent.crmOrderId,
    crmOrderNo: tickets[index]?.crmOrderNo || parent.crmOrderNo,
    crmPersonId: tickets[index]?.crmPersonId || parent.crmPersonId,
    crmPerson: tickets[index]?.crmPerson || parent.crmPerson,
    crmCompanyId: tickets[index]?.crmCompanyId || parent.crmCompanyId,
    crmCompany: tickets[index]?.crmCompany || parent.crmCompany,
    crmService: tickets[index]?.crmService || parent.crmService,
    crmServiceId: tickets[index]?.crmServiceId || parent.crmServiceId,
    crmTrip: tickets[index]?.crmTrip || parent.crmTrip,
    crmTripId: tickets[index]?.crmTripId || parent.crmTripId,
    output: tickets[index]?.output || parent.output,
    groupTickets: [], receiptItems: [], receipts: [], railTickets: [], receiptCount: 1,
  });
  return { ...file, parsed: ticket, subReceipts: [], brandBlankIndex: index };
}

function receiptHasMultipleSubReceipts(file) {
  if (Array.isArray(file?.subReceipts) && file.subReceipts.length > 1) return true;
  const tickets = typeof receiptGroupedTickets === 'function'
    ? receiptGroupedTickets(file)
    : (file?.parsed?.groupTickets || file?.parsed?.receipt_items || file?.parsed?.receipts || []);
  return Array.isArray(tickets) && tickets.length > 1;
}

function receiptFinancialFingerprint(receipt) {
  const money = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 10000) / 10000 : String(value);
  };
  const financial = (value) => ({
    fare: money(value?.fare),
    taxes: money(value?.taxes),
    fees: money(value?.fees),
    total: money(value?.total),
    ticketCost: money(value?.ticketCost ?? value?.ticket_cost),
    reservedSeatCost: money(value?.reservedSeatCost ?? value?.reserved_seat_cost),
    agencyServiceFee: money(value?.agencyServiceFee ?? value?.agency_service_fee),
    additionalFees: money(value?.additionalFees ?? value?.additional_fees),
    supplierCost: money(value?.supplierCost ?? value?.supplier_cost),
    fareBreakdown: (value?.fareBreakdown || value?.fare_breakdown || []).map((row) => [row?.code || '', row?.label || '', money(row?.amount)]),
    taxBreakdown: (value?.taxBreakdown || value?.tax_breakdown || []).map((row) => [row?.code || '', row?.label || '', money(row?.amount)]),
    feeBreakdown: (value?.feeBreakdown || value?.fee_breakdown || []).map((row) => [row?.code || '', row?.label || '', money(row?.amount)]),
  });
  const group = receipt?.groupTickets || receipt?.receiptItems || receipt?.receipt_items
    || receipt?.receipts || receipt?.railTickets || [];
  return JSON.stringify({
    parent: financial(receipt),
    tickets: Array.isArray(group) && group.length > 1 ? group.map(financial) : [],
  });
}

function receiptSupplierPdfFingerprint(receipt) {
  const priceMode = String(receipt?.output?.priceMode || receipt?.output?.price_mode || 'total').toLowerCase();
  const group = receipt?.groupTickets || receipt?.receiptItems || receipt?.receipt_items
    || receipt?.receipts || receipt?.railTickets || [];
  return JSON.stringify({
    financial: receiptFinancialFingerprint(receipt),
    priceMode,
    ticketPriceModes: Array.isArray(group) && group.length > 1
      ? group.map((ticket) => String(ticket?.output?.priceMode || ticket?.output?.price_mode || priceMode).toLowerCase())
      : [],
  });
}

function receiptGroupNeedsSequentialReview(file) {
  const tickets = receiptGroupedTickets(file);
  return tickets.length > 1 && !tickets.every(receiptBlankIsReviewed);
}

function receiptGroupToken(value) {
  return String(value || '').trim().toLocaleUpperCase('ru-RU').replace(/\s+/g, ' ');
}

function receiptSimilaritySignature(file) {
  if (!file?.parsed || !['Авиа', 'ЖД'].includes(file.type)) return '';
  const parsed = normalizeReceiptDraft(file.type, file.parsed);
  const legs = (parsed.legs || []).map((leg) => [
    leg.fromCode || leg.from,
    leg.toCode || leg.to,
    leg.date,
    leg.flightNo,
    leg.cls,
    leg.fareBasis,
  ].map(receiptGroupToken).join('~')).join('|');
  if (!legs) return '';
  const price = file.type === 'Авиа'
    ? [parsed.fare, parsed.taxes, parsed.fees].map((value) => Number(value) || 0).join('~')
    : '';
  return [file.type, receiptGroupToken(parsed.carrier), legs, price].join('::');
}

function receiptDetectedGroups(files, importMode = 'auto') {
  if (importMode === 'ordinary') return [];
  const candidates = files.filter((file) => file.status === 'done' && !file.error && ['Авиа', 'ЖД'].includes(file.type));
  if (importMode === 'group') {
    const buckets = new Map();
    candidates.forEach((file) => buckets.set(file.type, [...(buckets.get(file.type) || []), file]));
    return [...buckets.values()].filter((group) => group.length > 1);
  }
  const related = (left, right) => {
    if (left.type !== right.type) return false;
    const leftSignature = receiptSimilaritySignature(left);
    if (leftSignature && leftSignature === receiptSimilaritySignature(right)) return true;
    if (left.type !== 'Авиа') return false;
    const a = normalizeReceiptDraft(left.type, left.parsed);
    const b = normalizeReceiptDraft(right.type, right.parsed);
    const aLeg = a.legs?.[0] || {};
    const bLeg = b.legs?.[0] || {};
    const passengerMatches = receiptGroupToken(a.passenger) && receiptGroupToken(a.passenger) === receiptGroupToken(b.passenger);
    const aFrom = receiptGroupToken(aLeg.fromCode || aLeg.from);
    const aTo = receiptGroupToken(aLeg.toCode || aLeg.to);
    const bFrom = receiptGroupToken(bLeg.fromCode || bLeg.from);
    const bTo = receiptGroupToken(bLeg.toCode || bLeg.to);
    return passengerMatches && aFrom && aTo && aFrom === bTo && aTo === bFrom;
  };
  const groups = [];
  const visited = new Set();
  candidates.forEach((file, index) => {
    if (visited.has(file.id)) return;
    const group = [file];
    visited.add(file.id);
    for (let cursor = index + 1; cursor < candidates.length; cursor += 1) {
      const candidate = candidates[cursor];
      if (!visited.has(candidate.id) && group.some((member) => related(member, candidate))) {
        group.push(candidate);
        visited.add(candidate.id);
      }
    }
    if (group.length > 1) groups.push(group);
  });
  return groups;
}

// Что именно оператор разрешил перенести на остальные бланки. Набор всегда
// выбирается явно: раньше группа получала весь пакет полей молча.
const RECEIPT_APPLY_PARTS = [
  { key: 'finance', label: 'Стоимость, таксы и сборы', hint: 'тариф, таксы, сервисные сборы, итог и валюта' },
  { key: 'route', label: 'Маршрут и рейсы', hint: 'направления, даты, номера рейсов, перевозчик' },
  { key: 'fare', label: 'Тариф и условия', hint: 'код тарифа, класс бронирования, багаж' },
  { key: 'output', label: 'Настройки бланка', hint: 'вид бланка и режим показа цены' },
];
const RECEIPT_APPLY_ALL_PARTS = Object.fromEntries(RECEIPT_APPLY_PARTS.map((part) => [part.key, true]));

function receiptApplyPartsLabel(parts) {
  const selected = RECEIPT_APPLY_PARTS.filter((part) => parts?.[part.key]).map((part) => part.label.toLowerCase());
  return selected.length ? selected.join(', ') : 'ничего не выбрано';
}

function receiptSharedGroupPatch(type, parsed, parts = RECEIPT_APPLY_ALL_PARTS) {
  const use = { ...RECEIPT_APPLY_ALL_PARTS, ...(parts || {}) };
  const shared = {};
  if (use.route) Object.assign(shared, {
    carrier: parsed.carrier,
    legs: parsed.legs,
    tripType: parsed.tripType,
  });
  if (use.finance) Object.assign(shared, { currency: parsed.currency });
  // Настройки вывода переносятся без itFareSnapshot: снимок закупочных сумм
  // индивидуален для бланка, и подмена его суммами исходного билета сломала бы
  // восстановление тарифа у остальных.
  if (use.output && parsed.output) {
    const { itFareSnapshot, it_fare_snapshot: legacySnapshot, ...displayOutput } = parsed.output;
    Object.assign(shared, { output: displayOutput });
  }
  if (use.fare) Object.assign(shared, { fareInfo: parsed.fareInfo });
  if (type === 'Авиа' && use.finance) Object.assign(shared, {
    fare: parsed.fare,
    taxes: parsed.taxes,
    fees: parsed.fees,
    total: parsed.total,
    originalTotal: parsed.originalTotal,
    fareBreakdown: parsed.fareBreakdown,
    taxBreakdown: parsed.taxBreakdown,
    feeBreakdown: parsed.feeBreakdown,
  });
  if (type === 'Авиа' && use.fare) Object.assign(shared, {
    cls: parsed.cls,
    fareBasis: parsed.fareBasis,
    baggage: parsed.baggage,
    handBaggage: parsed.handBaggage,
  });
  return shared;
}

// Явный выбор области применения. Пока оператор не выбрал «ко всей группе» и
// не подтвердил действие, правки остаются на текущем бланке.
function ReceiptApplyScopePanel({ total, position, scope, onScope, parts, onTogglePart, subjectLabel, unitLabel = 'бланков' }) {
  const chosen = RECEIPT_APPLY_PARTS.filter((part) => parts[part.key]).length;
  return (
    <section className="receipt-apply-scope" aria-label="Область применения изменений">
      <div className="receipt-apply-scope-head">
        <Icon name="alertCircle" />
        <span>
          <b>Куда применить стоимость и корректировки?</b>
          <small>Решение за оператором: система ничего не переносит на другие бланки без явного выбора и подтверждения.</small>
        </span>
        <Pill tone={scope === 'all' ? 'blue' : 'gray'}>{scope === 'all' ? `Ко всем · ${total}` : 'Только текущий'}</Pill>
      </div>
      <div className="receipt-apply-scope-options" role="radiogroup" aria-label="Область применения">
        <label className={'receipt-apply-scope-option' + (scope === 'current' ? ' is-active' : '')} onClick={() => onScope('current')}>
          <span className="receipt-apply-scope-control"><Radio on={scope === 'current'} onChange={() => onScope('current')} /></span>
          <span><b>Только этот бланк</b><small>{subjectLabel}{position ? ` · бланк ${position} из ${total}` : ''}</small></span>
        </label>
        <label className={'receipt-apply-scope-option' + (scope === 'all' ? ' is-active' : '')} onClick={() => onScope('all')}>
          <span className="receipt-apply-scope-control"><Radio on={scope === 'all'} onChange={() => onScope('all')} /></span>
          <span><b>Применять общие исправления ко всей группе</b><small>Все {total} {unitLabel} — стоимость и расчёты переносятся на каждый бланк</small></span>
        </label>
      </div>
      {scope === 'all' && (
        <div className="receipt-apply-scope-parts">
          <b>Что переносим на остальные бланки</b>
          <div className="receipt-apply-scope-parts-grid">
            {RECEIPT_APPLY_PARTS.map((part) => (
              <label key={part.key} className={parts[part.key] ? 'is-on' : ''} onClick={() => onTogglePart(part.key)}>
                <span className="receipt-apply-scope-control"><Checkbox on={!!parts[part.key]} onChange={() => onTogglePart(part.key)} /></span>
                <span><b>{part.label}</b><small>{part.hint}</small></span>
              </label>
            ))}
          </div>
          <small className="receipt-apply-scope-note">
            <Icon name="lock" /> ФИО, документы, номера билетов и места остаются индивидуальными всегда.
            {chosen === 0 && ' Выберите хотя бы один блок — иначе применять нечего.'}
          </small>
        </div>
      )}
    </section>
  );
}

function receiptBlankMissingFields(ticket, type = 'ЖД') {
  const passenger = ticket?.passengers?.[0] || {};
  const leg = ticket?.legs?.[0] || {};
  const missing = [];
  if (!(passenger.name || ticket?.passenger)) missing.push('ФИО пассажира');
  if (!(ticket?.ticketNo || passenger.ticketNo)) missing.push('номер билета');
  if (!(leg.from && leg.to)) missing.push('маршрут');
  if (!leg.flightNo) missing.push(type === 'Авиа' ? 'номер рейса' : 'номер поезда');
  const amount = Number(ticket?.total) || Number(ticket?.ticketCost) + Number(ticket?.reservedSeatCost)
    + Number(ticket?.agencyServiceFee) + Number(ticket?.additionalFees);
  if (!(amount > 0)) missing.push('стоимость билета');
  return missing;
}

function ReceiptEditDrawer({ open, file, onClose, onChange, onSubChange, onBrand, onReview, groupInfo, pdfSyncStatus = '', orders = [], services = [], companies = [] }) {
  const [correctionMode, setCorrectionMode] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [editPreviewMode, setEditPreviewMode] = useState('corrected');
  const [activeBlankIndex, setActiveBlankIndex] = useState(0);
  // Область применения выбирает оператор: 'current' — только открытый бланк,
  // 'all' — вся группа. Значение по умолчанию всегда 'current'.
  const [applyScope, setApplyScope] = useState('current');
  const [applyParts, setApplyParts] = useState(RECEIPT_APPLY_ALL_PARTS);
  const applyToGroup = applyScope === 'all';
  const [confirmGroupApply, setConfirmGroupApply] = useState(false);
  const ticketGridRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    setCorrectionMode(false);
    setPreviewExpanded(false);
    setEditPreviewMode(file?.type === 'ЖД' && file?.originalUrl ? 'supplier' : 'corrected');
    const tickets = receiptGroupedTickets(file);
    const firstUnreviewed = tickets.findIndex((ticket) => !receiptBlankIsReviewed(ticket));
    setActiveBlankIndex(firstUnreviewed >= 0 ? firstUnreviewed : 0);
    // A related return ticket can have its own valid fare and conditions.
    // Common corrections therefore require an explicit operator choice.
    setApplyScope('current');
    setApplyParts(RECEIPT_APPLY_ALL_PARTS);
    setConfirmGroupApply(false);
  }, [open, file && file.id, groupInfo?.count]);
  useEffect(() => {
    if (!previewExpanded) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPreviewExpanded(false);
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [previewExpanded]);
  useEffect(() => {
    if (!open || !ticketGridRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const activeTicket = ticketGridRef.current?.querySelector(`[data-ticket-index="${activeBlankIndex}"]`);
      activeTicket?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, activeBlankIndex]);
  if (!open || !file) return null;

  const parsed = normalizeReceiptDraft(file.type, file.parsed);
  const rawTickets = receiptGroupedTickets(file);
  const groupTickets = rawTickets.map((ticket) => normalizeReceiptDraft(file.type, {
    ...ticket,
    groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
  }));
  const hasTicketGroup = groupTickets.length > 1;
  const isAviaTicketGroup = file.type === 'Авиа' && hasTicketGroup;
  const safeBlankIndex = hasTicketGroup ? Math.min(activeBlankIndex, groupTickets.length - 1) : 0;
  const selectedBase = hasTicketGroup ? groupTickets[safeBlankIndex] : parsed;
  const editingParsed = hasTicketGroup ? normalizeReceiptDraft(file.type, {
    ...selectedBase,
    crmBindingMode: selectedBase.crmBindingMode || parsed.crmBindingMode,
    crmOrderId: selectedBase.crmOrderId || parsed.crmOrderId,
    crmOrderNo: selectedBase.crmOrderNo || parsed.crmOrderNo,
    crmPersonId: selectedBase.crmPersonId || parsed.crmPersonId,
    crmPerson: selectedBase.crmPerson || parsed.crmPerson,
    crmCompanyId: selectedBase.crmCompanyId || parsed.crmCompanyId,
    crmCompany: selectedBase.crmCompany || parsed.crmCompany,
    crmService: selectedBase.crmService || parsed.crmService,
    crmServiceId: selectedBase.crmServiceId || parsed.crmServiceId,
    crmTrip: selectedBase.crmTrip || parsed.crmTrip,
    crmTripId: selectedBase.crmTripId || parsed.crmTripId,
    output: selectedBase.output || parsed.output,
    groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
  }) : parsed;
  const reviewedCount = hasTicketGroup ? groupTickets.filter(receiptBlankIsReviewed).length : 0;
  const currentMissing = hasTicketGroup ? receiptBlankMissingFields(editingParsed, file.type) : [];
  const progress = hasTicketGroup ? Math.round((reviewedCount / groupTickets.length) * 100) : 0;
  const currentIsReviewed = hasTicketGroup && receiptBlankIsReviewed(editingParsed);
  const allOtherReviewed = hasTicketGroup && groupTickets.every((ticket, index) => index === safeBlankIndex || receiptBlankIsReviewed(ticket));
  const canFinishSequence = hasTicketGroup && safeBlankIndex === groupTickets.length - 1 && allOtherReviewed;
  const firstUnreviewedIndex = hasTicketGroup
    ? groupTickets.findIndex((ticket) => !receiptBlankIsReviewed(ticket))
    : -1;
  const furthestAccessibleIndex = firstUnreviewedIndex >= 0 ? firstUnreviewedIndex : Math.max(0, groupTickets.length - 1);
  const canOpenBlank = (index) => index <= furthestAccessibleIndex;
  const showSupplierPreview = editPreviewMode === 'supplier' && Boolean(file.originalUrl);
  const supplierPageNumber = Number(
    editingParsed.sourcePage || editingParsed.source_page
    || editingParsed.receiptPage || editingParsed.receipt_page
    || editingParsed.receiptIndex || editingParsed.receipt_index,
  )
    || (hasTicketGroup ? safeBlankIndex + 1 : 0);
  const supplierPreviewUrl = supplierDocumentPageUrl(file.originalUrl, supplierPageNumber);
  const supplierPreviewKey = `${file.id || file.originalUrl || 'supplier'}-page-${supplierPageNumber}-revision-${file.supplierPdfRevision || 0}`;

  const parentFromTickets = (tickets, child = editingParsed) => aggregateReceiptSubrows({
    ...parsed,
    crmBindingMode: child.crmBindingMode || parsed.crmBindingMode,
    crmOrderId: child.crmOrderId || parsed.crmOrderId,
    crmOrderNo: child.crmOrderNo || parsed.crmOrderNo,
    crmPersonId: child.crmPersonId || parsed.crmPersonId,
    crmPerson: child.crmPerson || parsed.crmPerson,
    crmCompanyId: child.crmCompanyId || parsed.crmCompanyId,
    crmCompany: child.crmCompany || parsed.crmCompany,
    crmService: child.crmService || parsed.crmService,
    crmServiceId: child.crmServiceId || parsed.crmServiceId,
    crmTrip: child.crmTrip || parsed.crmTrip,
    crmTripId: child.crmTripId || parsed.crmTripId,
    output: child.output || parsed.output,
  }, tickets, file.type);

  const persistChild = (child, index = safeBlankIndex) => {
    if (onSubChange) {
      onSubChange(file.id, index, child);
      return;
    }
    const tickets = groupTickets.map((ticket, ticketIndex) => ticketIndex === index ? child : ticket);
    onChange(file.id, parentFromTickets(tickets, child));
  };

  const commitEditingReceipt = (next) => {
    if (!hasTicketGroup) {
      // Keep edits local while the user is typing. Applying common fields to
      // related receipts is a separate, explicitly confirmed final action.
      onChange(file.id, next);
      return;
    }
    const child = normalizeReceiptDraft(file.type, {
      ...next,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    });
    persistChild(child);
  };

  const saveAndContinue = async () => {
    if (!hasTicketGroup || currentMissing.length) return;
    const reviewedAt = new Date().toISOString();
    const child = normalizeReceiptDraft(file.type, {
      ...editingParsed,
      reviewStatus: 'reviewed',
      review_status: 'reviewed',
      reviewedAt,
      reviewed_at: reviewedAt,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    });
    const tickets = groupTickets.map((ticket, index) => index === safeBlankIndex ? child : ticket);
    const nextParent = parentFromTickets(tickets, child);
    persistChild(child);

    if (safeBlankIndex < tickets.length - 1) {
      setActiveBlankIndex(safeBlankIndex + 1);
      setCorrectionMode(false);
      return;
    }

    const firstPending = tickets.findIndex((ticket) => !receiptBlankIsReviewed(ticket));
    if (firstPending >= 0) {
      setActiveBlankIndex(firstPending);
      setCorrectionMode(false);
      return;
    }

    const saved = await onReview?.(file.id, nextParent);
    if (saved !== false) onClose();
  };

  // Массовое применение внутри одного многобланкового PDF (авиа и ЖД).
  // Вызывается только после явного подтверждения оператора.
  const saveAviaGroup = async () => {
    if (!hasTicketGroup || currentMissing.length || !hasChosenParts) return;
    const reviewedAt = new Date().toISOString();
    const shared = receiptSharedGroupPatch(file.type, editingParsed, applyParts);
    const tickets = groupTickets.map((ticket, index) => normalizeReceiptDraft(file.type, {
      ...ticket,
      ...shared,
      ...(index === safeBlankIndex ? editingParsed : {}),
      reviewStatus: 'reviewed', review_status: 'reviewed', reviewedAt, reviewed_at: reviewedAt,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    }));
    const nextParent = parentFromTickets(tickets, editingParsed);
    onChange(file.id, nextParent);
    const saved = await onReview?.(file.id, nextParent);
    if (saved !== false) onClose();
  };

  const finishSingleReceipt = async (useGroup = false) => {
    const reviewedAt = new Date().toISOString();
    const reviewedParsed = normalizeReceiptDraft(file.type, {
      ...parsed,
      reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,
      reviewedAt, reviewed_at: reviewedAt,
    });
    onChange(file.id, reviewedParsed, useGroup
      ? { applyToGroup: true, groupFileIds: groupInfo?.fileIds || [], applyParts }
      : {});
    // После массового применения переходить «к следующему» не нужно: группа уже
    // закрыта одним подтверждением, редактор закрывается.
    const hasNextGroupBlank = !useGroup && Boolean(groupInfo?.count > 1 && groupInfo.position < groupInfo.count);
    const saved = await onReview?.(file.id, reviewedParsed, {
      applyToGroup: useGroup,
      continueSequential: hasNextGroupBlank,
      groupFileIds: groupInfo?.fileIds || [],
      applyParts,
    });
    if (saved !== false && !hasNextGroupBlank) onClose();
  };

  const confirmGroupChanges = async () => {
    setConfirmGroupApply(false);
    if (hasTicketGroup) {
      await saveAviaGroup();
      return;
    }
    await finishSingleReceipt(true);
  };

  const applyTotal = hasTicketGroup ? groupTickets.length : (groupInfo?.count || 1);
  const applyPosition = hasTicketGroup ? safeBlankIndex + 1 : (groupInfo?.position || 1);
  const hasSiblingBlanks = applyTotal > 1;
  const hasChosenParts = RECEIPT_APPLY_PARTS.some((part) => applyParts[part.key]);
  const applyTargets = hasTicketGroup
    ? groupTickets.map((ticket, index) => ({
      label: receiptParticipantLabel(ticket, `Бланк ${index + 1}`),
      note: ticket.ticketNo ? `№ ${ticket.ticketNo}` : '',
      current: index === safeBlankIndex,
    }))
    : (groupInfo?.fileNames || []).map((name, index) => ({
      label: name,
      note: '',
      current: index === (groupInfo.position - 1),
    }));

  const drawerTitle = hasTicketGroup
    ? `Проверка · бланк ${safeBlankIndex + 1} из ${groupTickets.length} · ${receiptParticipantLabel(editingParsed)}`
    : groupInfo?.count > 1
      ? `Проверка · бланк ${groupInfo.position} из ${groupInfo.count} · ${receiptParticipantLabel(parsed)}`
      : 'Проверка · ' + receiptParticipantLabel(parsed);
  const pdfSyncNote = (floating = false) => <div className={'receipt-edit-preview-note'
    + (pdfSyncStatus === 'error' ? ' is-warning' : '')
    + (floating ? ' is-floating' : '')}
    role="status" aria-live="polite">
    <Icon name={pdfSyncStatus === 'saving' ? 'clock' : pdfSyncStatus === 'error' ? 'alertCircle' : 'checkCircle'} />
    {pdfSyncStatus === 'saving'
      ? 'Обновляем рабочую PDF-копию…'
      : pdfSyncStatus === 'saved'
        ? 'Рабочая PDF-копия уже обновлена. Загруженный исходник сохранён отдельно без изменений.'
        : pdfSyncStatus === 'error'
          ? 'Не удалось безопасно перенести стоимость в PDF. Проверьте предупреждение и исходный бланк.'
          : showSupplierPreview
            ? 'После изменения стоимости эта рабочая PDF-копия обновится автоматически. Исходник остаётся доступен отдельно.'
            : 'Предпросмотр обновляется сразу; рабочий PDF обновляется после изменения стоимости.'}
  </div>;

  return (
    <>
      <Drawer open={open} onClose={onClose} title={drawerTitle}
        sub={hasTicketGroup
          ? `Последовательная проверка · ${reviewedCount} из ${groupTickets.length} бланков уже проверено`
          : groupInfo?.count > 1
            ? `Последовательная проверка группы · ${groupInfo.position} из ${groupInfo.count}`
            : `${recType(file.type).doc} · исходный файл сохраняется без изменений`}
        width="min(1280px,98vw)" className="receipt-editor-drawer"
        footer={<>
          {file.originalUrl && <Button variant="secondary" icon="eye" onClick={() => window.open(supplierPreviewUrl, '_blank', 'noopener,noreferrer')}>Оригинал поставщика с корректировками</Button>}
          {onBrand && <Button variant="secondary" icon="template" onClick={() => onBrand(hasTicketGroup ? safeBlankIndex : null)}>Фирменный бланк</Button>}
          {isAviaTicketGroup ? (applyToGroup
            ? <Button style={{ flex: 1 }} icon="check" disabled={currentMissing.length > 0 || !hasChosenParts}
              onClick={() => setConfirmGroupApply(true)}>Проверить и применить к {groupTickets.length} бланкам</Button>
            : <>
              <Button variant="secondary" icon="chevLeft" disabled={safeBlankIndex === 0}
                onClick={() => { setActiveBlankIndex((index) => Math.max(0, index - 1)); setCorrectionMode(false); }}>Назад</Button>
              <Button style={{ flex: 1 }} icon={canFinishSequence ? 'check' : 'chevRight'} disabled={currentMissing.length > 0}
                onClick={saveAndContinue}>
                {canFinishSequence ? 'Сохранить и завершить проверку' : 'Сохранить только этот бланк'}
              </Button>
            </>) : hasTicketGroup ? <>
            <Button variant="secondary" icon="chevLeft" disabled={safeBlankIndex === 0}
              onClick={() => { setActiveBlankIndex((index) => Math.max(0, index - 1)); setCorrectionMode(false); }}>Назад</Button>
            {applyToGroup
              ? <Button style={{ flex: 1 }} icon="check" disabled={currentMissing.length > 0 || !hasChosenParts}
                onClick={() => setConfirmGroupApply(true)}>Проверить и применить к {groupTickets.length} бланкам</Button>
              : <Button style={{ flex: 1 }} icon={canFinishSequence ? 'check' : 'chevRight'} disabled={currentMissing.length > 0}
                onClick={saveAndContinue}>
                {canFinishSequence ? 'Сохранить и завершить проверку' : 'Сохранить и далее'}
              </Button>}
          </> : <Button style={{ flex: 1 }} icon="check" disabled={applyToGroup && !hasChosenParts} onClick={() => {
            if (applyToGroup && groupInfo?.count > 1) setConfirmGroupApply(true);
            else finishSingleReceipt(false);
          }}>{applyToGroup && groupInfo?.count > 1
              ? `Проверить и применить к ${groupInfo.count} бланкам`
              : groupInfo?.count > 1 && groupInfo.position < groupInfo.count
                ? 'Сохранить и далее'
                : 'Проверено'}</Button>}
        </>}>
        <div className="receipt-edit-layout">
          {!hasTicketGroup && groupInfo?.count > 1 && <section className="receipt-similar-group-banner">
            <Icon name="users" />
            <span><b>Последовательная проверка: бланк {groupInfo.position} из {groupInfo.count}</b><small>{groupInfo.position < groupInfo.count ? 'Следующий бланк откроется после сохранения.' : 'Это последний бланк группы.'} Пассажир, номер билета и маршрут остаются индивидуальными.</small></span>
          </section>}
          {hasSiblingBlanks && <ReceiptApplyScopePanel
            total={applyTotal} position={applyPosition}
            scope={applyScope} onScope={setApplyScope}
            parts={applyParts}
            onTogglePart={(key) => setApplyParts((current) => ({ ...current, [key]: !current[key] }))}
            subjectLabel={receiptParticipantLabel(hasTicketGroup ? editingParsed : parsed)}
            unitLabel={plural(applyTotal, ['бланк', 'бланка', 'бланков'])} />}
          {hasTicketGroup && <section className="receipt-sequential-review" aria-label="Последовательная проверка бланков">
            <div className="receipt-sequential-review-head">
              <span><b>{isAviaTicketGroup ? 'Групповой авиабилет' : 'Последовательная проверка бланков'}</b><small>{applyToGroup ? 'Выбрано применение ко всей группе: после подтверждения общие поля уйдут на все бланки, пассажиры и номера билетов останутся индивидуальными.' : 'Правки сохраняются только на текущем бланке. Чтобы перенести их на остальные, выберите область применения выше.'}</small></span>
              <strong>{reviewedCount} / {groupTickets.length}</strong>
            </div>
            <div className="receipt-sequential-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="receipt-sequential-steps">
              {groupTickets.map((ticket, index) => {
                const reviewed = receiptBlankIsReviewed(ticket);
                return <button type="button" key={ticket.blankId || ticket.ticketNo || index}
                  className={(index === safeBlankIndex ? ' is-active' : '') + (reviewed ? ' is-reviewed' : '')}
                  aria-label={`Бланк ${index + 1}${reviewed ? ', проверен' : ''}`}
                  disabled={!canOpenBlank(index)}
                  onClick={() => { setActiveBlankIndex(index); setCorrectionMode(false); }}>
                  <span>{reviewed ? <Icon name="check" /> : index + 1}</span>
                  <small>{reviewed ? 'Проверен' : index === safeBlankIndex ? 'Сейчас' : 'Не проверен'}</small>
                </button>;
              })}
            </div>
          </section>}

          {hasTicketGroup && <section className="receipt-ticket-editor-strip" aria-label="Билеты в групповом PDF">
            <div className="receipt-ticket-editor-head">
              <span><b>Бланк {safeBlankIndex + 1} из {groupTickets.length}</b><small>У каждого билета свои пассажир, номер, место, условия и стоимость.</small></span>
              <div className="receipt-ticket-editor-nav">
                <button type="button" aria-label="Предыдущий билет" disabled={safeBlankIndex === 0}
                  onClick={() => { setActiveBlankIndex((index) => Math.max(0, index - 1)); setCorrectionMode(false); }}>
                  <Icon name="chevLeft" />
                </button>
                <Pill tone={currentIsReviewed ? 'green' : 'blue'}>{currentIsReviewed ? 'Проверен' : 'На проверке'}</Pill>
                <button type="button" aria-label="Следующий билет"
                  disabled={safeBlankIndex >= groupTickets.length - 1 || !canOpenBlank(safeBlankIndex + 1)}
                  onClick={() => { setActiveBlankIndex((index) => Math.min(groupTickets.length - 1, index + 1)); setCorrectionMode(false); }}>
                  <Icon name="chevRight" />
                </button>
              </div>
            </div>
            <div className="receipt-ticket-editor-scroll" ref={ticketGridRef}>
              {groupTickets.map((ticket, index) => {
                const passenger = ticket.passengers?.[0] || {};
                const leg = ticket.legs?.[0] || {};
                const ticketNumber = ticket.ticketNo || passenger.ticketNo || '—';
                const amount = Number(ticket.total) || Number(ticket.ticketCost) + Number(ticket.reservedSeatCost)
                  + Number(ticket.agencyServiceFee) + Number(ticket.additionalFees);
                const place = [leg.coach ? `вагон ${leg.coach}` : '', leg.seat ? `место ${leg.seat}` : ''].filter(Boolean).join(' · ');
                const reviewed = receiptBlankIsReviewed(ticket);
                return <button type="button" key={ticket.blankId || ticketNumber || index}
                  data-ticket-index={index}
                  className={'receipt-ticket-editor-chip' + (index === safeBlankIndex ? ' is-active' : '') + (reviewed ? ' is-reviewed' : '')}
                  aria-pressed={index === safeBlankIndex}
                  disabled={!canOpenBlank(index)}
                  onClick={() => { setActiveBlankIndex(index); setCorrectionMode(false); }}>
                  <span className="receipt-ticket-editor-index">{reviewed ? <Icon name="check" /> : index + 1}</span>
                  <span className="receipt-ticket-editor-main">
                    <b>{passenger.name || ticket.passenger || `Билет ${index + 1}`}</b>
                    <small>№ {ticketNumber}</small>
                  </span>
                  <span className="receipt-ticket-editor-side">
                    <b>{recMoney(Number.isFinite(amount) ? amount : 0, ticket.currency || parsed.currency || 'RUB')}</b>
                    <small>{place || 'Место не указано'}</small>
                  </span>
                </button>;
              })}
            </div>
            {currentMissing.length > 0
              ? <div className="receipt-sequential-validation is-warning"><Icon name="alertCircle" /> Не заполнено: {currentMissing.join(', ')}. Заполните эти данные для продолжения.</div>
              : applyToGroup
                ? <div className="receipt-sequential-validation is-ok"><Icon name="checkCircle" /> Общие исправления будут применены ко всем бланкам одним подтверждением: {receiptApplyPartsLabel(applyParts)}. Индивидуальные данные пассажиров сохранятся.</div>
                : <div className="receipt-sequential-validation is-ok"><Icon name="checkCircle" /> Изменения применяются только к выбранному билету. После сохранения система откроет следующий автоматически.</div>}
          </section>}
          <aside className="receipt-edit-preview">
            <div className="receipt-edit-preview-head">
              <div><Icon name="eye" /><span><b>{showSupplierPreview ? 'Бланк поставщика' : (hasTicketGroup ? `Бланк ${safeBlankIndex + 1}` : 'Квитанция с корректировками')}</b><small>{showSupplierPreview ? 'Рабочая копия исходного PDF' : 'Живой предпросмотр'}</small></span></div>
              <button type="button" className="btn btn-secondary btn-sm"
                aria-expanded={previewExpanded} aria-controls="receipt-corrected-preview"
                onClick={() => setPreviewExpanded(true)}>
                <Icon name="arrowUpRight" />Развернуть
              </button>
            </div>
            {file.originalUrl && <div className="receipt-edit-preview-tabs" role="tablist" aria-label="Вид квитанции">
              <button type="button" role="tab" aria-selected={editPreviewMode === 'supplier'} className={editPreviewMode === 'supplier' ? 'is-active' : ''} onClick={() => setEditPreviewMode('supplier')}>Бланк поставщика</button>
              <button type="button" role="tab" aria-selected={editPreviewMode === 'corrected'} className={editPreviewMode === 'corrected' ? 'is-active' : ''} onClick={() => setEditPreviewMode('corrected')}>С корректировками</button>
            </div>}
            {showSupplierPreview
              ? <iframe key={`${supplierPreviewKey}-inline`} className="receipt-edit-supplier-frame" title={`Бланк поставщика · страница ${supplierPageNumber}`} src={supplierPreviewUrl} />
              : <ReceiptDocumentPreview type={file.type} draft={editingParsed} />}
            {!pdfSyncStatus && pdfSyncNote()}
          </aside>
          <ReceiptSpecializedForm type={file.type} value={editingParsed} onChange={commitEditingReceipt}
            correctionMode={correctionMode} onToggleCorrection={() => setCorrectionMode((value) => !value)}
            orders={orders} services={services} companies={companies} />
        </div>
      </Drawer>
      {pdfSyncStatus && typeof document !== 'undefined' && ReactDOM.createPortal(
        pdfSyncNote(true),
        document.body,
      )}
      {previewExpanded && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div id="receipt-corrected-preview"
          className="receipt-corrected-preview-overlay is-open"
          role="dialog" aria-modal="true"
          aria-label="Развернутая квитанция с корректировками"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewExpanded(false);
          }}>
          <section className="receipt-corrected-preview-dialog">
            <header>
              <div><Icon name="eye" /><span><b>{showSupplierPreview ? 'Бланк поставщика' : (hasTicketGroup ? `Бланк ${safeBlankIndex + 1} из ${groupTickets.length}` : 'Квитанция с корректировками')}</b><small>{showSupplierPreview ? 'Рабочая PDF-копия' : 'Все несохранённые изменения уже учтены'}</small></span></div>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => setPreviewExpanded(false)}><Icon name="x" />Закрыть</button>
            </header>
            {showSupplierPreview
              ? <iframe key={`${supplierPreviewKey}-expanded`} className="receipt-edit-supplier-frame is-expanded" title={`Развёрнутый бланк поставщика · страница ${supplierPageNumber}`} src={supplierPreviewUrl} />
              : <ReceiptDocumentPreview type={file.type} draft={editingParsed} />}
          </section>
        </div>,
        document.body,
      )}
      <ConfirmDialog open={confirmGroupApply}
        title={`Применить общие исправления к ${applyTotal} бланкам?`}
        message={<div className="receipt-apply-confirm">
          <p>Проверьте, что именно уйдёт на другие бланки. Отменить массовое применение одним действием нельзя.</p>
          <div className="receipt-apply-confirm-block">
            <b>Переносим</b>
            <ul>{RECEIPT_APPLY_PARTS.filter((part) => applyParts[part.key]).map((part) => (
              <li key={part.key}><Icon name="check" />{part.label} <span>({part.hint})</span></li>
            ))}</ul>
          </div>
          {applyParts.finance && <div className="receipt-apply-confirm-block">
            <b>Стоимость, которая станет общей</b>
            <div className="receipt-apply-confirm-money">
              <span>Итого для клиента</span>
              <b>{recMoney(receiptFinancialTotal(file.type, editingParsed), editingParsed.currency)}</b>
            </div>
            {file.type === 'Авиа' && <div className="receipt-apply-confirm-money">
              <span>Тариф · таксы · сборы</span>
              <b>{recMoney(Number(editingParsed.fare) || 0, editingParsed.currency)} · {recMoney(Number(editingParsed.taxes) || 0, editingParsed.currency)} · {recMoney(Number(editingParsed.fees) || 0, editingParsed.currency)}</b>
            </div>}
          </div>}
          <div className="receipt-apply-confirm-block">
            <b>Бланки, которых это коснётся ({applyTotal})</b>
            <ul className="receipt-apply-confirm-targets">
              {applyTargets.map((target, index) => (
                <li key={`${target.label}-${index}`} className={target.current ? 'is-current' : ''}>
                  {target.label}{target.note ? ` · ${target.note}` : ''}{target.current ? ' — открыт сейчас' : ''}
                </li>
              ))}
            </ul>
          </div>
          <p className="receipt-apply-confirm-note">ФИО, документы, номера билетов и места останутся индивидуальными.</p>
        </div>}
        confirmLabel={groupInfo?.count > 1 && groupInfo.position < groupInfo.count ? 'Да, применить и далее' : 'Да, применить и завершить'} confirmVariant="primary"
        onConfirm={confirmGroupChanges} onCancel={() => setConfirmGroupApply(false)} />
    </>
  );
}


// Сервисный сбор считает backend по договору контрагента (crm/fee_resolution).
// Здесь только раскладка ответа и подписи для оператора: нулевой сбор «по
// умолчанию» не подставляется — если правила нет, поле остаётся ручным.
const SERVICE_FEE_MANUAL_HINTS = {
  no_company: 'Условия по договору не найдены — укажите вручную',
  no_active_contract: 'У контрагента нет действующего договора — укажите сбор вручную',
  no_applicable_rule: 'В договоре нет правила сервисного сбора для этой услуги — укажите вручную',
  rule_not_found: 'Правило договора больше не действует — укажите сбор вручную',
  unknown_service_kind: 'Для этого вида услуги договорные сборы не настроены — укажите вручную',
  resolve_failed: 'Не удалось получить условия договора — укажите сбор вручную',
};

function normalizeServiceFeeResolution(raw) {
  const source = raw?.source === 'contract' ? 'contract' : 'manual';
  const fee = Number(raw?.fee);
  return {
    source,
    fee: source === 'contract' && Number.isFinite(fee) ? Math.round(fee * 100) / 100 : null,
    currency: raw?.currency || '',
    reason: source === 'contract' ? '' : (raw?.reason || 'manual'),
    calculation: raw?.calculation || '',
    value: raw?.value || '',
    ruleId: raw?.rule_id || '',
    contractId: raw?.contract_id || '',
    agreementId: raw?.agreement_id || '',
    contractNumber: raw?.contract_number || '',
    agreementNumber: raw?.agreement_number || '',
    contractFee: raw?.contract_fee || '',
    contractCurrency: raw?.contract_currency || '',
    serviceKind: raw?.service_kind || '',
  };
}

function serviceFeeSourceLabel(info) {
  if (info?.source !== 'contract') return '';
  const percent = info.calculation === 'percent' && info.value
    ? ` · ${Number(info.value)}% от базы поставщика`
    : '';
  const contract = String(info.contractNumber || '').trim();
  return contract
    ? `Автоматически по договору ${contract}${percent}`
    : `По условиям контрагента${percent}`;
}

function serviceFeeManualHint(info) {
  if (info?.source === 'contract') return '';
  if (info?.reason === 'currency_mismatch' && info.contractFee) {
    const contract = String(info.contractNumber || '').trim();
    return `Сбор по договору ${contract ? contract + ' ' : ''}указан в ${info.contractCurrency} — валюта бланка другая, укажите сумму вручную`;
  }
  return SERVICE_FEE_MANUAL_HINTS[info?.reason] || 'Условия по договору не найдены — укажите вручную';
}

// Контрагент для расчёта: юрлицо напрямую либо заказчик выбранного заказа.
// Физлицо и новый заказ договорных условий не дают — сбор ручной.
function receiptFeeBindingContext(bindTarget) {
  if (bindTarget?.mode === 'company' && bindTarget.company?.id) {
    return {
      company: bindTarget.company.id,
      label: bindTarget.company.name || bindTarget.company.shortName || 'Юр. лицо',
    };
  }
  if (bindTarget?.mode === 'order' && bindTarget.order?.id) {
    return { order: bindTarget.order.id, label: 'Заказ № ' + (bindTarget.order.no || '') };
  }
  return {
    reason: 'no_company',
    label: bindTarget?.mode === 'person' ? 'Физлицо' : 'Клиент не выбран',
  };
}


// Итог по источнику сервисного сбора на шаге привязки: оператор видит, откуда
// возьмётся сумма, до того как бланки уйдут в заказ.
function ServiceFeeBindingSummary({ rows = [], info = {}, context = {}, hint = '', dismissed = false, onDismiss = null }) {
  const [localDismissed, setLocalDismissed] = useState(false);
  const isDismissed = dismissed || localDismissed;
  if (!rows.length || isDismissed) return null;
  const handleDismiss = () => {
    setLocalDismissed(true);
    onDismiss?.();
  };
  const resolutions = rows.map((row) => info[row.mathKey]).filter(Boolean);
  const contractRows = resolutions.filter((item) => item.source === 'contract');
  const manualRows = resolutions.filter((item) => item.source !== 'contract');
  const contract = contractRows[0];
  const allByContract = contractRows.length === rows.length && rows.length > 0;
  return (
    <div className={'receipt-fee-summary' + (allByContract ? ' is-contract' : '')}>
      <Icon name={allByContract ? 'checkCircle' : 'alertCircle'} />
      <span>
        <b>{allByContract
          ? `Сервисный сбор по договору${contract?.contractNumber ? ' ' + contract.contractNumber : ''}: ${contractRows.length} ${plural(contractRows.length, ['бланк', 'бланка', 'бланков'])}`
          : contractRows.length
            ? `Договорной сбор: ${contractRows.length} из ${rows.length}, остальные — вручную`
            : 'Сервисный сбор указывается вручную'}</b>
        <small>{allByContract
          ? `Клиент: ${context.label || 'контрагент'}. Сумма подставлена автоматически и пересчитается при смене клиента.`
          : [serviceFeeManualHint(manualRows[0]), hint].filter(Boolean).join(' ')}</small>
      </span>
      <button
        type="button"
        className="receipt-fee-summary-close"
        onClick={handleDismiss}
        aria-label="Закрыть уведомление"
        title="Закрыть"
      >
        <Icon name="x" />
      </button>
    </div>
  );
}


const costTabId = (index) => `cost-tab-${index}`;
const costPanelId = (index) => `cost-panel-${index}`;

// Единая полоса навигации по одинаковой стоимости над таблицей импорта.
// Вкладки перечисляют все варианты цены сразу; в панели видно каждый бланк
// с указанием документа-источника, поэтому переключаться между строками
// таблицы не нужно.
function ReceiptCostGroupsBar({
  groups, activeKey, onSelect, getMath, clientTotal,
  onEditTicket, onEditMath, onOpenBrand, onEditGroup,
}) {
  if (!groups.length) return null;
  const activeIndex = groups.findIndex((group) => group.key === activeKey);
  const activeGroup = activeIndex < 0 ? null : groups[activeIndex];
  const coveredBlanks = groups.reduce((sum, group) => sum + group.matches.length, 0);
  const coveredDocuments = new Set(groups.flatMap((group) => group.matches.map((row) => row.f.id))).size;
  const multiType = new Set(groups.map((group) => group.type)).size > 1;
  const moveFocus = (event, index) => {
    const shift = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!shift || groups.length < 2) return;
    event.preventDefault();
    const next = (index + shift + groups.length) % groups.length;
    onSelect(groups[next].key);
    const node = typeof document !== 'undefined' ? document.getElementById(costTabId(next)) : null;
    if (node) node.focus();
  };
  return (
    <div className={'receipt-cost-tabs is-global' + (activeGroup ? ' is-open' : '')}>
      <div className="receipt-cost-tabs-head">
        <span className="receipt-cost-tabs-title">
          <Icon name="calc" />
          <span>
            <b>Билеты с одинаковой стоимостью</b>
            <small>
              {groups.length} {plural(groups.length, ['вариант', 'варианта', 'вариантов'])} цены
              {' · '}{coveredBlanks} {plural(coveredBlanks, ['бланк', 'бланка', 'бланков'])}
              {' из '}{coveredDocuments} {plural(coveredDocuments, ['документа', 'документов', 'документов'])}
              {' · '}сквозная навигация по всем загруженным бланкам
            </small>
          </span>
        </span>
        {activeGroup && <button type="button" className="btn btn-ghost btn-sm receipt-cost-tabs-collapse"
          onClick={() => onSelect('')}>
          <Icon name="chevUp" /> Свернуть
        </button>}
      </div>
      <div className="receipt-cost-tablist" role="tablist" aria-label="Билеты с одинаковой стоимостью">
        {groups.map((group, groupIndex) => {
          const isActiveCostTab = group.key === activeKey;
          return (
            <button type="button" role="tab" key={group.key}
              id={costTabId(groupIndex)}
              className={'receipt-cost-tab' + (isActiveCostTab ? ' is-active' : '')}
              aria-selected={isActiveCostTab}
              aria-controls={costPanelId(groupIndex)}
              tabIndex={isActiveCostTab || (!activeGroup && groupIndex === 0) ? 0 : -1}
              onKeyDown={(event) => moveFocus(event, groupIndex)}
              onClick={() => onSelect(isActiveCostTab ? '' : group.key)}>
              <b>{recMoney(group.amount, group.currency)}</b>
              <small>
                {group.matches.length} {plural(group.matches.length, ['бланк', 'бланка', 'бланков'])}
                {group.documentCount > 1 ? ` · ${group.documentCount} док.` : ''}
                {multiType ? ` · ${group.type}` : ''}
              </small>
            </button>
          );
        })}
      </div>
      {activeGroup && (
        <div className="receipt-cost-panel" role="tabpanel"
          id={costPanelId(activeIndex)}
          aria-labelledby={costTabId(activeIndex)}>
          <div className="receipt-cost-panel-head">
            <span>
              <b>{recMoney(activeGroup.amount, activeGroup.currency)} · {activeGroup.matches.length} {plural(activeGroup.matches.length, ['бланк', 'бланка', 'бланков'])}</b>
              <small>Совпадает только закупочная стоимость. Пассажир, номер билета и маршрут остаются индивидуальными.</small>
            </span>
            <Button size="sm" variant="secondary" icon="calc"
              onClick={() => onEditGroup(activeGroup.sourceRow)}>
              Редактировать стоимость группы ({activeGroup.matches.length})
            </Button>
          </div>
          <ol className="receipt-cost-ticket-list">
            {activeGroup.matches.map((match, matchIndex) => {
              const matchMath = getMath(match.mathKey, match.parsed);
              const matchLeg = match.parsed.legs?.[0] || {};
              const matchReviewed = receiptBlankIsReviewed(match.parsed);
              return (
                <li key={match.mathKey} className="receipt-cost-ticket">
                  <span className="receipt-cost-ticket-index">{matchIndex + 1}</span>
                  <span className="receipt-cost-ticket-main">
                    <b>{match.parsed.passenger || receiptParticipantLabel(match.parsed, match.f.name)}</b>
                    <small>{[
                      match.blankIndex !== null ? `Бланк ${match.blankIndex + 1}` : 'Отдельный документ',
                      match.parsed.ticketNo ? `№ ${match.parsed.ticketNo}` : '',
                    ].filter(Boolean).join(' · ')}</small>
                    <span className="receipt-cost-ticket-source">{match.f.name}</span>
                  </span>
                  <span className="receipt-cost-ticket-route">
                    <span>{routeSummary(match.parsed)}</span>
                    <small>{[
                      matchLeg.date || '',
                      matchLeg.flightNo ? (match.f.type === 'ЖД' ? `Поезд ${matchLeg.flightNo}` : `Рейс ${matchLeg.flightNo}`) : '',
                      matchLeg.coach ? `вагон ${matchLeg.coach}` : '',
                      matchLeg.seat ? `место ${matchLeg.seat}` : '',
                    ].filter(Boolean).join(' · ') || 'Детали рейса не распознаны'}</small>
                  </span>
                  <span className="receipt-cost-ticket-money">
                    <b>{recSourceMoney(match.parsed)}</b>
                    <small>клиенту {recMoney(clientTotal(matchMath), match.parsed.currency)} · сбор {recMoney(Number(matchMath.fee) || 0, match.parsed.currency)}</small>
                  </span>
                  <Pill tone={matchReviewed ? 'green' : 'amber'}>{matchReviewed ? 'Проверено' : 'Не проверено'}</Pill>
                  <span className="receipt-cost-ticket-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEditTicket(match)}>
                      <Icon name="edit" /> Изменить
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEditMath(match.mathKey)}>
                      <Icon name="calc" /> Математика
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => onOpenBrand({ fileId: match.f.id, blankIndex: match.blankIndex === null ? 0 : match.blankIndex })}>
                      <Icon name="template" /> На бланке
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function ReceiptMathDrawer({ open, file, math, scopeOptions = [], feeInfo = null, onSave, onClose }) {
  const isRail = file?.type === 'ЖД';
  const buildInitialMath = (baseMath, parsed) => {
    const raw = baseMath || {};
    const tCost = raw.ticketCost !== undefined ? raw.ticketCost : (parsed?.ticketCost ?? parsed?.ticket_cost ?? 0);
    const rCost = raw.reservedSeatCost !== undefined ? raw.reservedSeatCost : (parsed?.reservedSeatCost ?? parsed?.reserved_seat_cost ?? 0);
    const defaultTariff = isRail ? (Number(tCost || 0) + Number(rCost || 0)) : (raw.tariff ?? 0);
    return {
      tariff: raw.tariff !== undefined ? raw.tariff : defaultTariff,
      ticketCost: tCost,
      reservedSeatCost: rCost,
      fee: raw.fee ?? 0,
      markup: raw.markup ?? 0,
      commission: raw.commission ?? 0,
    };
  };
  const [m, setM] = useState(() => buildInitialMath(math, file?.parsed));
  // Область применения расчёта. По умолчанию — только текущий бланк: раньше
  // выбор в таблице молча превращался в массовое применение.
  const [scopeKey, setScopeKey] = useState('current');
  const [confirmScope, setConfirmScope] = useState(false);
  useEffect(() => { if (open && math) setM(buildInitialMath(math, file?.parsed)); }, [open, file && file.id]);
  useEffect(() => { if (open) { setScopeKey('current'); setConfirmScope(false); } }, [open, file && file.id]);
  if (!open || !file) return null;
  const type = file.type || 'Прочее';
  const cur = file.parsed.currency || 'RUB'; const sym = cur === 'USD' ? '$' : cur;
  const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
  // Договорной сбор редактировать нельзя: он приходит из финансовых условий
  // контрагента и пересчитывается сервером при смене клиента или базы.
  const contractFee = feeInfo?.source === 'contract' && feeInfo.fee !== null;
  const feeAmount = contractFee ? num(feeInfo.fee) : num(m.fee);
  const client = num(num(m.tariff) + feeAmount + num(m.markup));
  const options = scopeOptions.length ? scopeOptions : [{
    key: 'current', label: 'Только этот бланк', hint: file.parsed.passenger || file.name || '',
    rows: [{ mathKey: file.id, parsed: file.parsed }],
  }];
  const activeScope = options.find((option) => option.key === scopeKey) || options[0];
  const targetRows = activeScope?.rows || [];
  const massApply = targetRows.length > 1;
  const serviceMeta = {
    'Авиа': { title: 'Авиа', tariff: 'Тариф + таксы поставщика', hint: 'тариф и таксы из авиабилета', fee: 'Сервисный сбор за авиабилет' },
    'ЖД': { title: 'ЖД', tariff: 'База поставщика (билет + плацкарта)', hint: 'автоматическая сумма стоимости билета и плацкарты', fee: 'Сервисный сбор за ЖД-билет' },
    'Гостиница': { title: 'Гостиница', tariff: 'Стоимость проживания поставщика', hint: 'закупочная стоимость размещения', fee: 'Сервисный сбор за бронирование' },
    'Трансфер': { title: 'Трансфер', tariff: 'Стоимость трансфера поставщика', hint: 'закупочная стоимость поездки', fee: 'Сервисный сбор за трансфер' },
  }[type] || { title: type, tariff: 'Стоимость поставщика', hint: 'из бланка', fee: 'Сервисный сбор' };
  const fld = (k, l, hint) => (
    <label className="receipt-internal-math-field">
      <span>{l}, {sym}{hint && <small> · {hint}</small>}</span>
      <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={m[k] ?? ''} onChange={(e) => setM((s) => ({ ...s, [k]: e.target.value }))} />
    </label>
  );
  const calculationRows = isRail ? [
    ['Стоимость билета', num(m.ticketCost)],
    ['Стоимость плацкарты', num(m.reservedSeatCost)],
    ['База поставщика (билет + плацкарта)', num(m.tariff)],
    [serviceMeta.fee, feeAmount],
    ['Агентская надбавка', num(m.markup)],
    ['Комиссия поставщика (не входит в итог)', num(m.commission)],
  ] : [
    [serviceMeta.tariff, num(m.tariff)],
    [serviceMeta.fee, feeAmount],
    ['Агентская надбавка', num(m.markup)],
    ['Комиссия поставщика (не входит в итог)', num(m.commission)],
  ];
  const selectedLabel = massApply
    ? `Выбрано ${targetRows.length} ${plural(targetRows.length, ['бланк', 'бланка', 'бланков'])}`
    : 'Текущий бланк';
  const patch = () => ({
    tariff: num(m.tariff),
    ...(isRail ? { ticketCost: num(m.ticketCost), reservedSeatCost: num(m.reservedSeatCost) } : {}),
    fee: feeAmount,
    markup: num(m.markup),
    commission: num(m.commission),
  });
  const applyNow = () => {
    onSave(patch(), massApply ? targetRows : null);
    onClose();
  };
  return (
    <>
    <Drawer open={open} onClose={onClose} title={'Внутренняя математика · ' + serviceMeta.title}
      sub={massApply
        ? `Сбор, надбавка и комиссия применятся к ${targetRows.length} бланкам после подтверждения. База поставщика изменится только у текущего билета.`
        : 'Отдельная внутренняя форма расчёта · после сохранения сумма сразу переносится в рабочую копию PDF'}
      width="min(560px,96vw)" className="receipt-internal-math-drawer"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={() => { if (massApply) setConfirmScope(true); else applyNow(); }}>
          {massApply ? `Применить к ${targetRows.length} бланкам` : 'Сохранить расчёт'}
        </Button>
      </>}>
      <div className="receipt-internal-math-head">
        <Pill tone={massApply ? 'blue' : 'gray'}>{selectedLabel}</Pill>
        <span>Бланк: <b>{file.parsed.passenger || file.name || 'без названия'}</b></span>
      </div>
      {options.length > 1 && <div className="receipt-apply-scope is-compact" role="radiogroup" aria-label="Область применения расчёта">
        <div className="receipt-apply-scope-head">
          <Icon name="alertCircle" />
          <span><b>К каким бланкам применить расчёт?</b><small>Система не расширяет область сама — выберите и подтвердите.</small></span>
        </div>
        <div className="receipt-apply-scope-options">
          {options.map((option) => (
            <label key={option.key} className={'receipt-apply-scope-option' + (option.key === activeScope.key ? ' is-active' : '')}
              onClick={() => setScopeKey(option.key)}>
              <span className="receipt-apply-scope-control"><Radio on={option.key === activeScope.key} onChange={() => setScopeKey(option.key)} /></span>
              <span><b>{option.label}</b>{option.hint && <small>{option.hint}</small>}</span>
            </label>
          ))}
        </div>
      </div>}
      <div className="receipt-internal-math-fields">
        {isRail ? (
          <>
            <label className="receipt-internal-math-field">
              <span>Стоимость билета, {sym}</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={m.ticketCost ?? ''}
                onChange={(e) => {
                  const tVal = e.target.value;
                  const rVal = m.reservedSeatCost ?? 0;
                  const sumTariff = num((Number(tVal) || 0) + (Number(rVal) || 0));
                  setM((s) => ({ ...s, ticketCost: tVal, tariff: sumTariff }));
                }}
              />
            </label>
            <label className="receipt-internal-math-field">
              <span>Стоимость плацкарты, {sym}</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={m.reservedSeatCost ?? ''}
                onChange={(e) => {
                  const rVal = e.target.value;
                  const tVal = m.ticketCost ?? 0;
                  const sumTariff = num((Number(tVal) || 0) + (Number(rVal) || 0));
                  setM((s) => ({ ...s, reservedSeatCost: rVal, tariff: sumTariff }));
                }}
              />
            </label>
            <div className="receipt-internal-math-field is-contract-fee">
              <span>База поставщика (билет + плацкарта), {sym}</span>
              <input className="input" value={num(m.tariff)} readOnly disabled aria-readonly="true" />
              <small className="receipt-internal-math-note is-contract">
                <Icon name="calc" /> Автоматический расчёт: {num(m.ticketCost || 0)} + {num(m.reservedSeatCost || 0)} = {num(m.tariff)} {sym}
              </small>
            </div>
          </>
        ) : (
          fld('tariff', serviceMeta.tariff, serviceMeta.hint)
        )}
        {contractFee ? (
          <div className="receipt-internal-math-field is-contract-fee">
            <span>{serviceMeta.fee}, {sym}</span>
            <input className="input" value={feeAmount} readOnly disabled aria-readonly="true" />
            <small className="receipt-internal-math-note is-contract">
              <Icon name="checkCircle" /> {serviceFeeSourceLabel(feeInfo)}
            </small>
          </div>
        ) : (
          <label className="receipt-internal-math-field is-manual-fee">
            <span>{serviceMeta.fee}, {sym}</span>
            <input className="input" type="number" min="0" step="0.01" inputMode="decimal"
              value={m.fee ?? ''} onChange={(e) => setM((s) => ({ ...s, fee: e.target.value }))} />
            <small className="receipt-internal-math-note is-manual">
              <Icon name="alertCircle" /> {serviceFeeManualHint(feeInfo)}
            </small>
          </label>
        )}
        {fld('markup', 'Агентская надбавка')}
        {fld('commission', 'Комиссия поставщика')}
      </div>
      <div className="receipt-internal-math-summary">
        {calculationRows.map(([label, value], index) => <div key={label} className={index === calculationRows.length - 1 ? 'is-commission' : ''}>
          <span>{label}</span><b>{recMoney(value, cur)}</b>
        </div>)}
        <div className="is-total"><span>Итого клиенту</span><b>{recMoney(client, cur)}</b></div>
        <small>Итого = база поставщика + сервисный сбор + агентская надбавка. Комиссия — внутреннее вознаграждение и сумму клиента не увеличивает.</small>
      </div>
    </Drawer>
    <ConfirmDialog open={confirmScope}
      title={`Применить расчёт к ${targetRows.length} бланкам?`}
      message={<div className="receipt-apply-confirm">
        <p>Сервисный сбор, агентская надбавка и комиссия станут одинаковыми. База поставщика у каждого бланка останется своей.</p>
        <div className="receipt-apply-confirm-block">
          <b>Новые значения</b>
          <div className="receipt-apply-confirm-money"><span>Сервисный сбор</span><b>{recMoney(feeAmount, cur)}</b></div>
          <div className="receipt-apply-confirm-money"><span>Агентская надбавка</span><b>{recMoney(num(m.markup), cur)}</b></div>
          <div className="receipt-apply-confirm-money"><span>Комиссия поставщика</span><b>{recMoney(num(m.commission), cur)}</b></div>
        </div>
        <div className="receipt-apply-confirm-block">
          <b>Бланки ({targetRows.length})</b>
          <ul className="receipt-apply-confirm-targets">
            {targetRows.map((row) => (
              <li key={row.mathKey} className={row.mathKey === file.id ? 'is-current' : ''}>
                {row.parsed?.passenger || row.f?.name || row.mathKey}{row.mathKey === file.id ? ' — открыт сейчас' : ''}
              </li>
            ))}
          </ul>
        </div>
        <p className="receipt-apply-confirm-note">Бланки с договорным сбором сохранят сумму по договору контрагента.</p>
      </div>}
      confirmLabel="Да, применить" confirmVariant="primary"
      onCancel={() => setConfirmScope(false)}
      onConfirm={() => { setConfirmScope(false); applyNow(); }} />
    </>
  );
}


// ——— Заказ из маршрут-квитанций ————————————————————————————————————————
// Всё, что нужно заказу, уже распознано в бланках: пассажиры, маршрут, даты,
// виды услуг и суммы. Поэтому новый заказ собирается прямо из них, без шага
// поиска услуг — искать нечего, услуги создаются по квитанциям.

function receiptIsoDate(value) {
  const raw = String(value || '').trim();
  const ru = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (ru) return `${ru[3]}-${String(ru[2]).padStart(2, '0')}-${String(ru[1]).padStart(2, '0')}`;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? raw : '';
}

// Код точки маршрута ограничен 8 символами: сначала IATA/код станции, затем
// код в скобках из названия, в последнюю очередь — усечённое название.
function receiptRoutePointCode(leg, side) {
  const code = String(leg?.[`${side}Code`] || '').trim().toUpperCase();
  if (code && code.length <= 8) return code;
  const name = String(leg?.[side] || '').trim();
  const inline = name.toUpperCase().match(/\(([A-Z0-9]{3,8})\)/);
  if (inline) return inline[1];
  return name.toUpperCase().replace(/[^0-9A-ZА-ЯЁ]/g, '').slice(0, 8);
}

function receiptRoutePointName(leg, side) {
  return String(leg?.[side] || leg?.[`${side}Code`] || '').trim().slice(0, 150);
}

function receiptOrderPassengers(file) {
  const tickets = receiptGroupedTickets(file);
  const sources = tickets.length ? tickets : [file.parsed];
  return sources.flatMap((ticket) => {
    const draft = normalizeReceiptDraft(file.type, ticket);
    const rows = (draft.passengers || []).filter((row) => String(row?.name || '').trim());
    const fallback = String(draft.passenger || '').trim();
    if (!rows.length && fallback) return [{ name: fallback, dob: '', document: '', ticketNo: draft.ticketNo || '' }];
    return rows.map((row) => ({
      name: String(row.name).trim(),
      dob: row.dob || '',
      document: row.document || '',
      ticketNo: row.ticketNo || draft.ticketNo || '',
    }));
  });
}

// Маршрут одного бланка полностью повторяется в бланках остальных пассажиров.
// Поэтому вложенные маршруты отбрасываются: заказ получает самый полный
// маршрут, а не десять склеенных копий одного и того же перелёта.
function receiptRouteContains(outer, inner) {
  if (!inner.length || inner.length > outer.length) return false;
  for (let start = 0; start + inner.length <= outer.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < inner.length; offset += 1) {
      if (outer[start + offset].location_code !== inner[offset].location_code) { matched = false; break; }
    }
    if (matched) return true;
  }
  return false;
}

function receiptMergeRoutes(routes) {
  const unique = [];
  const seen = new Set();
  routes.filter((route) => route.length > 1).forEach((route) => {
    const signature = route.map((point) => point.location_code).join('>');
    if (seen.has(signature)) return;
    seen.add(signature);
    unique.push(route);
  });
  const kept = unique.filter((route, index) => !unique.some((other, otherIndex) => (
    otherIndex !== index && other.length > route.length && receiptRouteContains(other, route)
  )));
  const merged = [];
  kept.forEach((route) => {
    route.forEach((point) => {
      if (merged[merged.length - 1]?.location_code === point.location_code) return;
      merged.push(point);
    });
  });
  return merged;
}

// Сводка по всем добавляемым бланкам: пассажиры, точки маршрута, даты и виды
// услуг. Из неё собирается тело заказа — оператору остаётся выбрать клиента.
function receiptOrderPlan(files = []) {
  const passengers = [];
  const seenPassengers = new Set();
  const routes = [];
  const dates = [];
  const serviceKinds = [];
  let currency = '';
  let roundTripHint = false;

  files.forEach((file) => {
    if (!serviceKinds.includes(file.type)) serviceKinds.push(file.type);
    receiptOrderPassengers(file).forEach((passenger) => {
      const key = passenger.name.toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ');
      if (seenPassengers.has(key)) return;
      seenPassengers.add(key);
      passengers.push(passenger);
    });
    const tickets = receiptGroupedTickets(file);
    const sources = tickets.length ? tickets : [file.parsed];
    sources.forEach((ticket) => {
      const draft = normalizeReceiptDraft(file.type, ticket);
      if (!currency && draft.currency) currency = draft.currency;
      if (draft.tripType === 'roundtrip') roundTripHint = true;
      const ticketRoute = [];
      (draft.legs || []).forEach((leg) => {
        const iso = receiptIsoDate(leg.date);
        if (iso) dates.push(iso);
        const endIso = receiptIsoDate(leg.endDate);
        if (endIso) dates.push(endIso);
        const locationType = file.type === 'Авиа' ? 'airport' : 'city';
        [['from', 'from'], ['to', 'to']].forEach(([side]) => {
          const code = receiptRoutePointCode(leg, side);
          if (!code || ticketRoute[ticketRoute.length - 1]?.location_code === code) return;
          ticketRoute.push({ location_code: code, location_name: receiptRoutePointName(leg, side), location_type: locationType });
        });
      });
      if (ticketRoute.length > 1) routes.push(ticketRoute);
    });
  });

  const points = receiptMergeRoutes(routes);
  dates.sort();
  // Backend принимает не больше MULTI_CITY_MAX_SEGMENTS сегментов: лишние
  // точки в заказ не уходят, но остаются видны в услугах по бланкам.
  const limitedPoints = points.slice(0, 7);
  const kind = limitedPoints.length < 3
    ? 'one_way'
    : (roundTripHint && limitedPoints.length === 3
      && limitedPoints[0].location_code === limitedPoints[2].location_code)
      ? 'round_trip'
      : 'multi_city';

  return {
    passengers,
    points: limitedPoints,
    truncatedPoints: Math.max(0, points.length - limitedPoints.length),
    kind,
    plannedStart: dates[0] || null,
    plannedEnd: dates[dates.length - 1] || null,
    currency: currency || 'RUB',
    serviceKinds,
    blankCount: files.reduce((sum, file) => sum + Math.max(1, receiptGroupedTickets(file).length), 0),
  };
}

// Разбор ФИО из бланка в поля физлица: в квитанциях фамилия идёт первой.
function receiptPersonNameParts(fullName) {
  const parts = String(fullName || '').trim().replace(/\s+/g, ' ').split(' ');
  return {
    surname: parts[0] || '',
    givenName: parts[1] || '',
    middleName: parts.slice(2).join(' ') || '',
  };
}

const RECEIPT_ROUTE_KIND_LABEL = {
  one_way: 'В одну сторону',
  round_trip: 'Туда-обратно',
  multi_city: 'Сложный маршрут',
};

// Создание заказа по бланкам: маршрут, даты, участники и услуги уже известны,
// оператор выбирает только клиента. Никакого поиска услуг здесь нет.
function ReceiptOrderCreateDrawer({ open, plan, clients = [], companies = [], onCancel, onSubmit }) {
  const toast = useToast();
  const [clientMode, setClientMode] = useState('new');
  const [person, setPerson] = useState({ surname: '', givenName: '', middleName: '', dob: '', phone: '', email: '' });
  const [existingClientId, setExistingClientId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPassengers, setSelectedPassengers] = useState({});
  const [saving, setSaving] = useState(false);

  const firstPassenger = plan?.passengers?.[0];
  useEffect(() => {
    if (!open || !plan) return;
    const parts = receiptPersonNameParts(firstPassenger?.name);
    setClientMode('new');
    setPerson({
      surname: parts.surname, givenName: parts.givenName, middleName: parts.middleName,
      dob: firstPassenger?.dob || '', phone: '', email: '',
    });
    setExistingClientId('');
    setCompanyId('');
    setPickerOpen(false);
    setSelectedPassengers(Object.fromEntries(plan.passengers.map((passenger) => [passenger.name, true])));
    setSaving(false);
  }, [open, plan?.passengers?.length, firstPassenger?.name]);

  if (!open || !plan) return null;

  const chosenPassengers = plan.passengers.filter((passenger) => selectedPassengers[passenger.name]);
  const selectedClient = clients.find((c) => String(c.id) === String(existingClientId));
  const selectedCompany = companies.find((c) => String(c.id) === String(companyId));

  const routeText = plan.points.length
    ? plan.points.map((point) => point.location_code).join(' → ')
    : 'Маршрут не распознан';
  const datesText = plan.plannedStart
    ? `${plan.plannedStart.split('-').reverse().join('.')}${plan.plannedEnd && plan.plannedEnd !== plan.plannedStart ? ` — ${plan.plannedEnd.split('-').reverse().join('.')}` : ''}`
    : 'Даты не распознаны';

  const submit = async () => {
    if (clientMode === 'new' && !person.surname.trim()) {
      toast('Укажите фамилию нового физлица', 'err');
      return;
    }
    if (clientMode === 'existing' && !existingClientId) {
      toast('Выберите клиента из базы', 'err');
      return;
    }
    if (clientMode === 'company' && !companyId) {
      toast('Выберите юридическое лицо', 'err');
      return;
    }
    setSaving(true);
    try {
      const created = await onSubmit({
        clientMode,
        person: clientMode === 'new' ? {
          surname: person.surname.trim(),
          given_name: person.givenName.trim(),
          middle_name: person.middleName.trim(),
          birth_date: receiptIsoDate(person.dob) || null,
          phone: person.phone.trim(),
          email: person.email.trim(),
        } : null,
        clientPersonId: clientMode === 'existing' ? existingClientId : null,
        companyId: clientMode === 'company' ? companyId : null,
        plan,
        passengers: chosenPassengers,
      });
      if (created) onCancel(created);
    } catch (error) {
      toast(error.message || 'Не удалось создать заказ по бланкам', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={() => onCancel(null)} title="Создание заказа по бланкам"
      sub={`${plan.blankCount} ${plural(plan.blankCount, ['бланк', 'бланка', 'бланков'])} · услуги создадутся по квитанциям, искать ничего не нужно`}
      width="min(720px,96vw)" className="receipt-order-create-drawer"
      footer={<>
        <Button variant="secondary" onClick={() => onCancel(null)}>Отмена</Button>
        <Button style={{ flex: 1 }} icon="check" disabled={saving} onClick={submit}>
          {saving ? 'Создаём заказ…' : `Создать заказ и добавить ${plan.blankCount} ${plural(plan.blankCount, ['бланк', 'бланка', 'бланков'])}`}
        </Button>
      </>}>
      <section className="receipt-order-plan" aria-label="Данные из бланков">
        <div className="receipt-order-plan-head">
          <Icon name="checkCircle" />
          <span><b>Всё уже есть в маршрут-квитанциях</b>
            <small>Маршрут, даты, пассажиры и услуги берутся из загруженных бланков. Поиск услуг в этом сценарии не нужен.</small></span>
        </div>
        <div className="receipt-order-plan-grid">
          <div><small>Услуги по бланкам</small><b>{plan.serviceKinds.join(' · ') || '—'}</b></div>
          <div><small>Маршрут · {RECEIPT_ROUTE_KIND_LABEL[plan.kind]}</small><b>{routeText}</b></div>
          <div><small>Даты поездки</small><b>{datesText}</b></div>
          <div><small>Валюта</small><b>{plan.currency}</b></div>
        </div>
        {plan.truncatedPoints > 0 && <small className="receipt-order-plan-note">
          В маршрут заказа вошли первые {plan.points.length} точек — остальные {plan.truncatedPoints} останутся в услугах по бланкам.
        </small>}
      </section>

      <RSub>Клиент заказа</RSub>
      <div className="receipt-apply-scope-options" role="radiogroup" aria-label="Клиент заказа">
        {[
          ['new', 'Новое физлицо', firstPassenger?.name ? `Из бланка: ${firstPassenger.name}` : 'Заполните данные вручную'],
          ['existing', 'Существующий клиент', 'Выбрать физлицо из базы CRM'],
          ['company', 'Юридическое лицо', 'Заказ оформляется на компанию'],
        ].map(([mode, label, hint]) => (
          <label key={mode} className={'receipt-apply-scope-option' + (clientMode === mode ? ' is-active' : '')}
            onClick={() => {
              setClientMode(mode);
              if (mode === 'existing' || mode === 'company') setPickerOpen(true);
            }}>
            <span className="receipt-apply-scope-control"><Radio on={clientMode === mode} onChange={() => {
              setClientMode(mode);
              if (mode === 'existing' || mode === 'company') setPickerOpen(true);
            }} /></span>
            <span><b>{label}</b><small>{hint}</small></span>
          </label>
        ))}
      </div>

      {clientMode === 'new' && <div className="receipt-form-grid receipt-order-person">
        <Field label="Фамилия" required><Input value={person.surname} onChange={(e) => setPerson((s) => ({ ...s, surname: e.target.value }))} /></Field>
        <Field label="Имя"><Input value={person.givenName} onChange={(e) => setPerson((s) => ({ ...s, givenName: e.target.value }))} /></Field>
        <Field label="Отчество"><Input value={person.middleName} onChange={(e) => setPerson((s) => ({ ...s, middleName: e.target.value }))} /></Field>
        <UFDateField label="Дата рождения" value={person.dob && person.dob !== '—' ? person.dob : null} onChange={(v) => setPerson((s) => ({ ...s, dob: v }))} placeholder="дд.мм.гггг" />
        <Field label="Телефон"><Input value={person.phone} onChange={(e) => setPerson((s) => ({ ...s, phone: e.target.value }))} /></Field>
        <Field label="Электронная почта"><Input value={person.email} onChange={(e) => setPerson((s) => ({ ...s, email: e.target.value }))} /></Field>
      </div>}

      {clientMode === 'existing' && <Field label="Клиент из базы">
        <button type="button" className="select unified-bind-field" onClick={() => setPickerOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
          <Icon name="user" style={{ width: 16, height: 16, color: 'var(--muted-2)', flexShrink: 0 }} />
          <span style={{ flex: 1, color: existingClientId ? 'var(--ink)' : 'var(--muted)' }}>
            {selectedClient?.name ? `${selectedClient.name}${selectedClient.phone && selectedClient.phone !== '—' ? ` · ${selectedClient.phone}` : ''}` : 'Нажмите, чтобы выбрать клиента из базы'}
          </span>
          <Icon name="chevRight" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
        </button>
      </Field>}

      {clientMode === 'company' && <Field label="Юридическое лицо">
        <button type="button" className="select unified-bind-field" onClick={() => setPickerOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
          <Icon name="building" style={{ width: 16, height: 16, color: 'var(--muted-2)', flexShrink: 0 }} />
          <span style={{ flex: 1, color: companyId ? 'var(--ink)' : 'var(--muted)' }}>
            {selectedCompany ? (selectedCompany.name || selectedCompany.shortName || selectedCompany.fullName || 'Юр. лицо') : 'Нажмите, чтобы выбрать юридическое лицо'}
          </span>
          <Icon name="chevRight" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
        </button>
      </Field>}

      <UnifiedBindPicker
        open={pickerOpen && (clientMode === 'existing' || clientMode === 'company')}
        modes={[clientMode === 'company' ? 'company' : 'person']}
        title={clientMode === 'company' ? 'Выбор юридического лица' : 'Выбор клиента из базы'}
        sub={clientMode === 'company' ? 'Выберите компанию из CRM для оформления заказа' : 'Выберите клиента из CRM для оформления заказа'}
        clientOptions={clients}
        companyOptions={companies}
        onClose={() => setPickerOpen(false)}
        onPick={(target) => {
          if (target.mode === 'person') {
            const found = clients.find((c) => c.name === target.client || String(c.id) === String(target.client?.id || target.id));
            setExistingClientId(found ? String(found.id) : (target.client?.id ? String(target.client.id) : target.client || ''));
          } else if (target.mode === 'company') {
            setCompanyId(String(target.company?.id || target.id || ''));
          }
          setPickerOpen(false);
        }}
      />

      <RSub>Участники заказа</RSub>
      <div className="receipt-order-passengers">
        {plan.passengers.length ? plan.passengers.map((passenger) => (
          <label key={passenger.name} className={selectedPassengers[passenger.name] ? 'is-on' : ''}
            onClick={() => setSelectedPassengers((current) => ({ ...current, [passenger.name]: !current[passenger.name] }))}>
            <span className="receipt-apply-scope-control">
              <Checkbox on={!!selectedPassengers[passenger.name]} onChange={() => {}} />
            </span>
            <span>
              <b>{passenger.name}</b>
              <small>{[passenger.dob, passenger.document, passenger.ticketNo ? `билет ${passenger.ticketNo}` : ''].filter(Boolean).join(' · ') || 'Дополнительные данные не распознаны'}</small>
            </span>
          </label>
        )) : <div className="receipt-empty">Пассажиры в бланках не распознаны</div>}
      </div>
      <small className="receipt-order-plan-note">
        Участники добавятся в заказ вместе с бланками: {chosenPassengers.length} из {plan.passengers.length}.
      </small>
    </Drawer>
  );
}

function ReceiptImportModal({ open, onClose, onDone, initialDraft, initialFiles = [], initialBindTarget = null, onDraftSaved, onDraftCleared, onCreateOrder, orders = [], companies = [], clients = [] }) {
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState(0);
  const [excluded, setExcluded] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [editId, setEditId] = useState(null);
  const [subEdit, setSubEdit] = useState(null);
  const [expandedReceipts, setExpandedReceipts] = useState({});
  // Билеты с одинаковой закупочной стоимостью показываются вкладками:
  // ключ — id документа, значение — подпись активной вкладки ('' — вкладки свёрнуты).
  const [costTabKey, setCostTabKey] = useState('');
  // Заказ по бланкам создаётся в отдельном окне: оператор выбирает клиента,
  // всё остальное уже распознано. Промис ждёт его решения.
  const [orderPlanRequest, setOrderPlanRequest] = useState(null);
  const orderPlanResolveRef = useRef(null);
  // Результат серверного расчёта сервисного сбора по бланкам: mathKey → источник.
  const [serviceFeeInfo, setServiceFeeInfo] = useState({});
  const [feeSummaryDismissed, setFeeSummaryDismissed] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [importMode, setImportMode] = useState('auto');


  const [bindTarget, setBindTarget] = useState({ mode: 'order', label: 'Выберите заказ' });
  const [optAddIncomplete, setOptAddIncomplete] = useState(false);
  const [optCreateServices, setOptCreateServices] = useState(true);

  const [math, setMath] = useState({});
  const [sel, setSel] = useState({});
  const [pricingSel, setPricingSel] = useState({});
  const [mathId, setMathId] = useState(null);
  const [brandTarget, setBrandTarget] = useState(null);
  const [pdfSync, setPdfSync] = useState({});
  const [draftSavedAt, setDraftSavedAt] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);
  const dragDepth = useRef(0);
  const filesStateRef = useRef([]);
  const serviceFeeInfoRef = useRef({});
  const mathStateRef = useRef({});
  const serviceFeeResolveRef = useRef(null);
  const pdfSyncTimers = useRef(new Map());
  const pdfSyncNoticeTimers = useRef(new Map());
  const pdfSyncSequence = useRef({});
  const pdfSyncChains = useRef({});
  const draftIdRef = useRef(null);

  useEffect(() => { filesStateRef.current = files; }, [files]);
  useEffect(() => { mathStateRef.current = math; }, [math]);
  useEffect(() => () => {
    pdfSyncTimers.current.forEach((timer) => clearTimeout(timer));
    pdfSyncTimers.current.clear();
    pdfSyncNoticeTimers.current.forEach((timer) => clearTimeout(timer));
    pdfSyncNoticeTimers.current.clear();
  }, []);

  useEffect(() => {
    if (!open) return;
    const draft = initialDraft?.version === 1 ? initialDraft : null;
    draftIdRef.current = draft?.id || null;
    setFiles(draft?.files || []);
    setStep(draft ? Math.max(2, Math.min(4, Number(draft.step) || 2)) : 0);
    setExcluded(draft?.excluded || {});
    setReviewed(draft?.reviewed || {});
    setEditId(null);
    setSubEdit(null);
    setExpandedReceipts({});
    setConfirmClose(false);
    setFeeSummaryDismissed(false);
    setImportMode(draft?.importMode || 'auto');
    setBindTarget(draft?.bindTarget || initialBindTarget || { mode: 'order', label: 'Выберите заказ' });
    setOptAddIncomplete(Boolean(draft?.optAddIncomplete));
    setOptCreateServices(draft ? Boolean(draft.optCreateServices) : true);
    setMath(draft?.math || {});
    setServiceFeeInfo(draft?.serviceFeeInfo || {});
    serviceFeeInfoRef.current = draft?.serviceFeeInfo || {};
    setSel(draft?.sel || {});
    setPricingSel(draft?.pricingSel || {});
    setMathId(null);
    setBrandTarget(null);
    pdfSyncNoticeTimers.current.forEach((timer) => clearTimeout(timer));
    pdfSyncNoticeTimers.current.clear();
    setPdfSync({});
    setDraftSavedAt(draft?.savedAt || '');
    setDragActive(false);
    dragDepth.current = 0;
    if (!draft && initialFiles.length) addFiles(initialFiles);
  }, [open]);
  useEffect(() => {
    if (['person', 'company'].includes(bindTarget.mode) && optCreateServices) setOptCreateServices(false);
  }, [bindTarget.mode, optCreateServices]);


  const supplierNet = (p) => {
    const fare = Number(p && p.fare) || 0;
    const taxes = Number(p && p.taxes) || 0;
    return Math.round((fare + taxes || Number(p && p.total) || 0) * 100) / 100;
  };
  const getMathFrom = (mathState, id, p) => {
    if (mathState[id]) return mathState[id];
    const ticketCost = Number(p && (p.ticketCost ?? p.ticket_cost)) || 0;
    const reservedSeatCost = Number(p && (p.reservedSeatCost ?? p.reserved_seat_cost)) || 0;
    const isRail = Boolean(ticketCost > 0 || reservedSeatCost > 0 || p?.type === 'ЖД' || p?.editorType === 'ЖД');
    const initialTicketCost = isRail
      ? (ticketCost || (reservedSeatCost ? Math.max(0, supplierNet(p) - reservedSeatCost) : supplierNet(p)))
      : 0;
    const initialReservedCost = isRail ? reservedSeatCost : 0;
    const tariff = isRail
      ? Math.round((initialTicketCost + initialReservedCost) * 100) / 100
      : supplierNet(p);
    return {
      tariff,
      ticketCost: initialTicketCost,
      reservedSeatCost: initialReservedCost,
      fee: Math.round((Number(p && (p.fees || p.agencyServiceFee)) || 0) * 100) / 100,
      markup: 0,
      commission: 0,
    };
  };
  const getMath = (id, p) => getMathFrom(math, id, p);
  // Договорной сервисный сбор индивидуален для бланка: массовое применение
  // математики не должно затирать его сбором исходного билета.
  const contractServiceFeeFor = (mathKey) => {
    const info = serviceFeeInfoRef.current[mathKey];
    return info?.source === 'contract' && info.fee !== null ? Math.round(Number(info.fee) * 100) / 100 : null;
  };
  // Массовый расчёт применяется только по явному выбору оператора: список
  // бланков приходит из формы расчёта после подтверждения. Без него правка
  // остаётся на текущем бланке — система сама область не расширяет.
  const setMathFor = (id, p, patch, explicitTargets) => {
    const current = mathStateRef.current;
    const sourcePricingRow = pricingRows.find((row) => row.mathKey === id);
    const requested = Array.isArray(explicitTargets) && explicitTargets.length ? explicitTargets : null;
    const targets = requested
      ? requested.filter((row) => !sourcePricingRow || row.f?.type === undefined || row.f.type === sourcePricingRow.f?.type)
      : [{ mathKey: id, parsed: p }];
    const safeTargets = targets.length ? targets : [{ mathKey: id, parsed: p }];
    const next = { ...current };
    safeTargets.forEach((row) => {
      const sharedPatch = row.mathKey === id
        ? patch
        : { fee: patch.fee, markup: patch.markup, commission: patch.commission };
      const contractFee = contractServiceFeeFor(row.mathKey);
      next[row.mathKey] = {
        ...getMathFrom(current, row.mathKey, row.parsed),
        ...sharedPatch,
        ...(contractFee === null ? {} : { fee: contractFee }),
      };
    });
    mathStateRef.current = next;
    setMath(next);
    const affectedFileIds = [...new Set(safeTargets.map((row) => String(row.mathKey).split('::blank::')[0]))];
    syncPricingSnapshots(next, affectedFileIds, { announce: safeTargets.length === 1, delay: 0 });
    if (safeTargets.length > 1) {
      toast(`Сбор, надбавка и комиссия применены к ${safeTargets.length} выбранным бланкам. Рабочие PDF обновляются.`, 'info');
    }
  };
  // Перенос новой математики в рабочие копии бланков и в PDF поставщика.
  const syncPricingSnapshots = (next, affectedFileIds, { announce = false, delay = 0 } = {}) => {
    const pricingSnapshots = new Map();
    const nextFiles = filesStateRef.current.map((file) => {
      if (!affectedFileIds.includes(file.id)) return file;
      const verifiedData = verifiedReceiptForSaveWithMath(file, next);
      pricingSnapshots.set(file.id, verifiedData);
      if (!receiptHasMultipleSubReceipts(file)) return { ...file, parsed: verifiedData };
      const subReceipts = (verifiedData.groupTickets || []).map((ticket) => normalizeReceiptDraft(file.type, {
        ...ticket,
        groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
      }));
      return { ...file, parsed: verifiedData, subReceipts };
    });
    // Pricing and the receipt form used to be two competing sources of truth.
    // Persist the priced receipt immediately, so a later review/draft action
    // cannot restore recognized amounts while the PDF job is still queued.
    filesStateRef.current = nextFiles;
    setFiles(nextFiles);
    affectedFileIds.forEach((fileId) => queueWorkingPdfSync(fileId, {
      mode: 'pricing', delay, announce,
      verifiedData: pricingSnapshots.get(fileId), financialEdit: true,
    }));
  };
  const clientTotal = (m) => Math.round(((Number(m.tariff) || 0) + (Number(m.fee) || 0) + (Number(m.markup) || 0)) * 100) / 100;
  const subReceiptMathKey = (fileId, index) => fileId + '::blank::' + index;
  const syncEditorMath = (mathKey, receipt) => {
    const current = mathStateRef.current;
    const contractFee = contractServiceFeeFor(mathKey);
    const next = {
      ...current,
      [mathKey]: {
        ...getMathFrom(current, mathKey, receipt),
        tariff: supplierNet(receipt),
        fee: contractFee === null
          ? Math.round((Number(receipt?.fees) || 0) * 100) / 100
          : contractFee,
      },
    };
    // PDF sync reads this ref outside React's render cycle. Update it before
    // scheduling the job so direct edits in the receipt form cannot be
    // overwritten by the older values from the separate pricing step.
    mathStateRef.current = next;
    setMath(next);
  };
  const mathForFileWithState = (file, mathState) => {
    if (!receiptHasMultipleSubReceipts(file)) return getMathFrom(mathState, file.id, file?.parsed);
    return file.subReceipts.reduce((total, receipt, index) => {
      const row = getMathFrom(mathState, subReceiptMathKey(file.id, index), receipt);
      return {
        tariff: total.tariff + (Number(row.tariff) || 0),
        fee: total.fee + (Number(row.fee) || 0),
        markup: total.markup + (Number(row.markup) || 0),
        commission: total.commission + (Number(row.commission) || 0),
      };
    }, { tariff: 0, fee: 0, markup: 0, commission: 0 });
  };
  const mathForFile = (file) => mathForFileWithState(file, math);

  const fmtSize = (b) => (b / 1024 < 1024 ? Math.max(1, Math.round(b / 1024)) + ' КБ' : (b / 1048576).toFixed(1) + ' МБ');
  const addFiles = (list) => {
    const add = Array.from(list).map((raw) => {
      const type = guessType(raw.name);
      return { id: 'rf' + (RID++), raw, name: raw.name, size: fmtSize(raw.size || 40000), byteSize: raw.size || 0, mime: raw.type || '', lastModified: raw.lastModified || null,
        originalUrl: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(raw) : null,
        type, status: 'queued', parsed: null };
    });
    setFiles((cur) => [...cur, ...add]);
    setStep(1);
    const queue = [...add];
    const workerCount = Math.min(RECEIPT_IMPORT_CONCURRENCY, queue.length);
    let fatalBatchError = null;
    let fatalBatchNotified = false;
    const runWorker = async () => {
      while (queue.length) {
        const entry = queue.shift();
        if (!entry) return;
        if (fatalBatchError) {
          setFiles((cur) => cur.map((item) => item.id === entry.id
            ? { ...item, status: 'done', error: fatalBatchError.message, parsed: { ...emptyReceiptParse(entry), recognitionPending: true } }
            : item));
          continue;
        }
        await (async () => {
      setFiles((cur) => cur.map((item) => item.id === entry.id ? { ...item, status: 'scanning' } : item));
      try {
        const imported = await importReceiptWithRetry(entry.raw);
        const result = await waitForReceiptResult(imported.id);
        const draft = result.draft || {};
        const extracted = result.extracted || {};
        const verified = result.verified_data || {};
        const detectedType = serviceTypeFromBackend(
          extracted.service_kind || verified.service_kind || draft.service_kind,
          extracted.service_type || verified.service_type || draft.service_type,
          entry.type,
        );
        const declaredBlankCount = Number(
          result.source_blank_count || result.sourceBlankCount
          || extracted.source_blank_count || extracted.sourceBlankCount
          || verified.source_blank_count || verified.sourceBlankCount
          || extracted.receipt_count || extracted.receiptCount || 0,
        );
        const subReceipts = receiptImportSubrows(
          detectedType,
          result.receipt_items || extracted.receipt_items || extracted.receipts
            || verified.groupTickets || verified.receipts,
          declaredBlankCount,
        );
        // Legacy regression marker: subReceipts = receiptImportSubrows(detectedType, extracted.receipts)
        const base = emptyReceiptParse({ ...entry, type: detectedType });
        const primaryPassenger = draft.passenger_name || verified.passenger || verified.passenger_name
          || extracted.passenger_name || base.passenger;
        const importedPassengers = receiptImportPassengers(
          draft.passengers,
          verified.passengers,
          extracted.passengers,
        );
        const passengerDefaults = {
          name: primaryPassenger,
          dob: draft.date_of_birth || verified.date_of_birth || verified.dob || extracted.date_of_birth || '',
          document: draft.document_number || verified.document_number || verified.docNo
            || extracted.document_number || '',
          ticketNo: draft.ticket_number || verified.ticket_number || verified.ticketNo
            || extracted.ticket_number || '',
          loyaltyCard: draft.loyalty_card || verified.loyalty_card || verified.loyaltyCard
            || extracted.loyalty_card || '',
        };
        const passengers = importedPassengers.length ? importedPassengers.map((passenger, index) => ({
          ...passenger,
          name: passenger.name || passenger.passenger_name || (index === 0 ? passengerDefaults.name : ''),
          dob: passenger.dob || passenger.date_of_birth || (index === 0 ? passengerDefaults.dob : ''),
          document: passenger.document || passenger.document_number || passenger.docNo
            || (index === 0 ? passengerDefaults.document : ''),
          ticketNo: passenger.ticketNo || passenger.ticket_number
            || (index === 0 ? passengerDefaults.ticketNo : ''),
          loyaltyCard: passenger.loyaltyCard || passenger.loyalty_card
            || (index === 0 ? passengerDefaults.loyaltyCard : ''),
        })) : (primaryPassenger ? [passengerDefaults] : base.passengers);
        const fare = receiptImportMoney(draft.fare, verified.fare, extracted.fare, base.fare);
        const taxes = receiptImportMoney(draft.taxes, verified.taxes, extracted.taxes, base.taxes);
        const fees = receiptImportMoney(draft.fees, verified.fees, extracted.fees, base.fees);
        const total = receiptImportMoney(draft.total, verified.total, verified.originalTotal, extracted.total, fare + taxes + fees);
        const parsed = normalizeReceiptDraft(detectedType, { ...base, ...verified,
          carrier: draft.issuer || extracted.issuer || result.verified_data?.carrier || base.carrier, passenger: primaryPassenger,
          passengers,
          fare, taxes, fees, total, originalTotal: receiptImportMoney(verified.originalTotal, extracted.originalTotal, extracted.total, total),
          ticketCost: receiptImportMoney(draft.ticketCost, draft.ticket_cost, verified.ticketCost, verified.ticket_cost,
            extracted.ticketCost, extracted.ticket_cost, fare),
          reservedSeatCost: receiptImportMoney(draft.reservedSeatCost, draft.reserved_seat_cost, verified.reservedSeatCost,
            verified.reserved_seat_cost, extracted.reservedSeatCost, extracted.reserved_seat_cost),
          agencyServiceFee: receiptImportMoney(draft.agencyServiceFee, draft.agency_service_fee, verified.agencyServiceFee,
            verified.agency_service_fee, extracted.agencyServiceFee, extracted.agency_service_fee, fees),
          additionalFees: receiptImportMoney(draft.additionalFees, draft.additional_fees, verified.additionalFees,
            verified.additional_fees, extracted.additionalFees, extracted.additional_fees),
          fareBreakdown: draft.fare_breakdown || extracted.fare_breakdown || [],
          taxBreakdown: draft.tax_breakdown || extracted.tax_breakdown || [], feeBreakdown: draft.fee_breakdown || extracted.fee_breakdown || [],
          ref: extracted.reference || base.ref, ticketNo: extracted.ticket_number || base.ticketNo,
          supplierOrderNo: extracted.supplier_order_number || extracted.order_number || base.supplierOrderNo,
          hotelBookingNo: extracted.hotel_booking_number || base.hotelBookingNo,
          docNo: extracted.document_number || base.docNo, dob: extracted.date_of_birth || base.dob,
          issueDate: extracted.issue_date || base.issueDate, cls: extracted.booking_class || base.cls,
          fareBasis: extracted.fare_basis || base.fareBasis, baggage: extracted.baggage || base.baggage,
          handBaggage: extracted.hand_baggage || base.handBaggage,
          currency: draft.currency || base.currency, legs: draft.segments?.length ? draft.segments : base.legs,
          tripType: draft.trip_type || extracted.trip_type || base.tripType,
          hotel: draft.hotel || extracted.hotel || base.hotel, rooms: draft.rooms || extracted.rooms || base.rooms,
          vehicle: draft.vehicle || extracted.vehicle || base.vehicle,
          hotelTerms: draft.hotelTerms || extracted.hotelTerms || result.verified_data?.hotelTerms || base.hotelTerms,
          transferTerms: draft.transferTerms || extracted.transferTerms || result.verified_data?.transferTerms || base.transferTerms,
          extras: draft.extras || extracted.extras || [],
          fareInfo: draft.fare_info || extracted.fare_info || base.fareInfo,
          groupTickets: subReceipts,
          receiptCount: Math.max(subReceipts.length, declaredBlankCount, Number(extracted.receipt_count || 0), 1),
          priceSource: total > 0 ? 'document' : 'manual',
          recognitionPending: result.parser_status !== 'parsed', backendWarnings: result.warnings || [] });
        setFiles((cur) => cur.map((item) => item.id === entry.id
          ? {
            ...item,
            status: 'done',
            importId: imported.id,
            sourceDocumentId: result.source_document_id || imported.document_id || null,
            originalUrl: (result.source_document_id || imported.document_id)
              ? documentsApi.supplierPreviewUrl(result.source_document_id || imported.document_id)
              : item.originalUrl,
            sourceOriginalUrl: (result.source_document_id || imported.document_id)
              ? documentsApi.supplierSourcePreviewUrl(result.source_document_id || imported.document_id)
              : item.sourceOriginalUrl,
            type: detectedType,
            parsed,
            subReceipts,
          }
          : item));
      } catch (error) {
        setFiles((cur) => cur.map((item) => item.id === entry.id ? { ...item, status: 'done', error: error.message, parsed: { ...emptyReceiptParse(entry), recognitionPending: true } } : item));
        const isFatalAccessError = [401, 403].includes(Number(error?.status));
        if (isFatalAccessError) fatalBatchError = error;
        if (!isFatalAccessError || !fatalBatchNotified) {
          toast(isFatalAccessError
            ? `${error.message || 'Нет доступа к импорту'}. Пакет остановлен, повторные запросы не отправлялись.`
            : error.message || `Не удалось обработать ${entry.name}`, 'err');
          if (isFatalAccessError) fatalBatchNotified = true;
        }
      }

        })();
        if (queue.length) await receiptImportSleep(RECEIPT_IMPORT_GAP_MS);
      }
    };
    void Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  };
  const onPick = (e) => { if (e.target.files && e.target.files.length) addFiles(e.target.files); e.target.value = ''; };
  const onDragEnter = (e) => { e.preventDefault(); dragDepth.current += 1; setDragActive(true); };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragActive(true); };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };
  const setType = (id, type) => {
    setFiles((cur) => cur.map((f) => (f.id === id ? { ...f, type, parsed: f.parsed ? normalizeReceiptDraft(type, { ...emptyReceiptParse({ ...f, type }), ...f.parsed, recognitionPending: true }) : null } : f)));
    setReviewed((cur) => ({ ...cur, [id]: false }));
  };
  const updateParsed = (id, parsed, options = {}) => {
    const sourceSnapshot = filesStateRef.current.find((file) => file.id === id);
    const financialEdit = Boolean(sourceSnapshot
      && receiptFinancialFingerprint(sourceSnapshot.parsed) !== receiptFinancialFingerprint(parsed));
    const supplierPdfEdit = Boolean(sourceSnapshot
      && receiptSupplierPdfFingerprint(sourceSnapshot.parsed) !== receiptSupplierPdfFingerprint(parsed));
    if (financialEdit) {
      syncEditorMath(id, parsed);
    }
    const updateFiles = (cur) => {
      const source = cur.find((file) => file.id === id);
      const group = options.applyToGroup
        ? receiptDetectedGroups(cur, importMode).find((items) => items.some((file) => file.id === id))
        : null;
      const groupedIds = group?.map((file) => file.id) || options.groupFileIds || [];
      const sharedPatch = source ? receiptSharedGroupPatch(source.type, parsed, options.applyParts) : {};
      const next = cur.map((file) => {
        if (file.id === id) {
          const normalized = normalizeReceiptDraft(file.type, {
          ...parsed,
          recognitionPending: false,
          manualCompletion: Boolean(file.error || file.parsed?.recognitionPending || parsed.manualCompletion),
          });
          const normalizedSubReceipts = normalized.groupTickets?.length > 1
            ? normalized.groupTickets.map((ticket) => normalizeReceiptDraft(file.type, {
              ...ticket,
              groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
            }))
            : [];
          // A compatibility `receipts: [ticket]` value is not a real group.
          // Promoting it to subReceipts made PDF sync aggregate the untouched
          // hidden child and overwrite the prices visible in the single-ticket
          // editor. Clear legacy singleton state and keep the edited parent as
          // the financial source of truth.
          const subReceipts = normalizedSubReceipts.length > 1
            ? normalizedSubReceipts
            : (receiptHasMultipleSubReceipts(file) ? file.subReceipts : []);
          return { ...file, parsed: normalized, subReceipts };
        }
        if (!groupedIds.includes(file.id)) return file;
        const targetPatch = { ...sharedPatch };
        if (source?.type === 'Авиа') {
          const sourceLeg = normalizeReceiptDraft(source.type, parsed).legs?.[0] || {};
          const targetLeg = normalizeReceiptDraft(file.type, file.parsed).legs?.[0] || {};
          const sameDirection = receiptGroupToken(sourceLeg.fromCode || sourceLeg.from) === receiptGroupToken(targetLeg.fromCode || targetLeg.from)
            && receiptGroupToken(sourceLeg.toCode || sourceLeg.to) === receiptGroupToken(targetLeg.toCode || targetLeg.to);
          if (!sameDirection) delete targetPatch.legs;
        }
        const auditEntry = {
          at: new Date().toLocaleString('ru-RU'),
          user: (typeof window !== 'undefined' && window.CURRENT_USER?.name) || 'Оператор',
          label: 'Общие исправления однотипной группы',
          before: 'Индивидуальные данные сохранены',
          after: `Применено из ${source?.name || 'группового бланка'}`,
        };
        const targetSubReceipts = (file.subReceipts || []).map((ticket) => normalizeReceiptDraft(file.type, {
          ...ticket,
          ...targetPatch,
          groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
          auditLog: [...(ticket.auditLog || []), auditEntry],
        }));
        const targetParent = normalizeReceiptDraft(file.type, {
          ...file.parsed,
          ...targetPatch,
          recognitionPending: false,
          auditLog: [...(file.parsed?.auditLog || []), auditEntry],
        });
        return targetSubReceipts.length
          ? { ...file, subReceipts: targetSubReceipts, parsed: aggregateReceiptSubrows(targetParent, targetSubReceipts, file.type) }
          : { ...file, parsed: targetParent };
      });
      // PDF sync is debounced, but a quick "Проверено" click can enqueue a
      // request before React runs the effect that mirrors files into the ref.
      // Keep the imperative snapshot current in the same state transaction.
      return next;
    };
    const nextFiles = updateFiles(filesStateRef.current);
    filesStateRef.current = nextFiles;
    setFiles(nextFiles);
    const reviewedIds = options.applyToGroup ? [id, ...(options.groupFileIds || [])] : [id];
    setReviewed((cur) => reviewedIds.reduce((next, fileId) => ({ ...next, [fileId]: true }), cur));
    [...new Set(reviewedIds)].forEach((fileId) => {
      const changedFile = nextFiles.find((file) => file.id === fileId);
      queueWorkingPdfSync(fileId, {
        mode: 'review',
        verifiedData: changedFile ? verifiedReceiptForReview(changedFile) : null,
        financialEdit: supplierPdfEdit,
      });
    });
  };
  const updateSubReceipt = (fileId, subIndex, parsed) => {
    const sourceFile = filesStateRef.current.find((file) => file.id === fileId);
    // Бланк, который оператор открыл и сохранил, больше не «ожидает
    // распознавания»: иначе агрегат документа навсегда оставался в статусе
    // «Требует проверки» и кнопка «Далее» не разблокировалась.
    const editedChild = normalizeReceiptDraft(sourceFile?.type || 'ЖД', {
      ...parsed,
      recognitionPending: false,
      groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
    });
    const sourceChild = sourceFile?.subReceipts?.[subIndex];
    const financialEdit = !sourceChild
      || receiptFinancialFingerprint(sourceChild) !== receiptFinancialFingerprint(editedChild);
    const supplierPdfEdit = !sourceChild
      || receiptSupplierPdfFingerprint(sourceChild) !== receiptSupplierPdfFingerprint(editedChild);
    if (financialEdit) {
      syncEditorMath(subReceiptMathKey(fileId, subIndex), editedChild);
    }
    const updateFiles = (cur) => {
      const next = cur.map((file) => {
        if (file.id !== fileId) return file;
        const child = normalizeReceiptDraft(file.type, editedChild);
        const subReceipts = (file.subReceipts || []).map((receipt, index) => (
          index === subIndex ? child : receipt
        ));
        const parent = {
          ...file.parsed,
          crmBindingMode: child.crmBindingMode || file.parsed?.crmBindingMode,
          crmOrderId: child.crmOrderId || file.parsed?.crmOrderId,
          crmOrderNo: child.crmOrderNo || file.parsed?.crmOrderNo,
          crmPersonId: child.crmPersonId || file.parsed?.crmPersonId,
          crmPerson: child.crmPerson || file.parsed?.crmPerson,
          crmCompanyId: child.crmCompanyId || file.parsed?.crmCompanyId,
          crmCompany: child.crmCompany || file.parsed?.crmCompany,
          crmService: child.crmService || file.parsed?.crmService,
          crmServiceId: child.crmServiceId || file.parsed?.crmServiceId,
          crmTrip: child.crmTrip || file.parsed?.crmTrip,
          crmTripId: child.crmTripId || file.parsed?.crmTripId,
          output: child.output || file.parsed?.output,
        };
        return {
          ...file,
          subReceipts,
          parsed: aggregateReceiptSubrows(parent, subReceipts, file.type),
        };
      });
      // Keep the imperative snapshot used by the debounced PDF request in
      // lockstep with the visible editor state. Waiting for useEffect here can
      // send the previous ticket prices and produce requested=0.
      return next;
    };
    const nextFiles = updateFiles(filesStateRef.current);
    filesStateRef.current = nextFiles;
    setFiles(nextFiles);
    const changedFile = nextFiles.find((file) => file.id === fileId);
    queueWorkingPdfSync(fileId, {
      mode: 'review',
      verifiedData: changedFile ? verifiedReceiptForReview(changedFile) : null,
      financialEdit: supplierPdfEdit,
    });
  };
  const markReviewed = (id, _parsed, options = {}) => {
    const reviewedIds = options.applyToGroup ? [id, ...(options.groupFileIds || [])] : [id];
    setReviewed((cur) => reviewedIds.reduce((next, fileId) => ({ ...next, [fileId]: true }), cur));
    if (options.continueSequential) {
      const groupIds = options.groupFileIds || [];
      const nextId = groupIds[groupIds.indexOf(id) + 1];
      if (nextId) setEditId(nextId);
    }
    return true;
  };
  const reviewAllReadyReceipts = () => {
    const readyRows = rows.filter((row) => !row.pending).filter((row) => {
      if (excluded[row.f.id] || ['Ошибка', 'Возможный дубль'].includes(row.status)) return false;
      const tickets = receiptGroupedTickets(row.f);
      if (tickets.length > 1) {
        return tickets.every((ticket) => receiptBlankMissingFields(ticket, row.f.type).length === 0);
      }
      return ['Распознано', 'Заполнено вручную'].includes(row.status);
    });
    const readyIds = new Set(readyRows.map((row) => row.f.id));
    if (!readyIds.size) {
      toast('Нет полностью распознанных бланков для экспресс-проверки', 'err');
      return;
    }
    const reviewedAt = new Date().toISOString();
    setFiles((current) => current.map((file) => {
      if (!readyIds.has(file.id)) return file;
      const tickets = receiptGroupedTickets(file);
      if (tickets.length > 1) {
        const reviewedTickets = tickets.map((ticket) => normalizeReceiptDraft(file.type, {
          ...ticket,
          reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,
          reviewedAt, reviewed_at: reviewedAt,
          groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
        }));
        return {
          ...file,
          subReceipts: reviewedTickets,
          parsed: aggregateReceiptSubrows(file.parsed, reviewedTickets, file.type),
        };
      }
      return {
        ...file,
        parsed: normalizeReceiptDraft(file.type, {
          ...file.parsed,
          reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,
          reviewedAt, reviewed_at: reviewedAt,
        }),
      };
    }));
    setReviewed((current) => [...readyIds].reduce((next, fileId) => ({ ...next, [fileId]: true }), current));
    // Отложенная запись PDF читает ref вне цикла рендера — держим его в
    // одном состоянии с видимым списком.
    filesStateRef.current = filesStateRef.current.map((file) => {
      if (!readyIds.has(file.id)) return file;
      const tickets = receiptGroupedTickets(file);
      if (tickets.length > 1) {
        const reviewedTickets = tickets.map((ticket) => normalizeReceiptDraft(file.type, {
          ...ticket,
          reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,
          reviewedAt, reviewed_at: reviewedAt,
          groupTickets: [], receipts: [], railTickets: [], receiptItems: [], receiptCount: 1,
        }));
        return { ...file, subReceipts: reviewedTickets, parsed: aggregateReceiptSubrows(file.parsed, reviewedTickets, file.type) };
      }
      return {
        ...file,
        parsed: normalizeReceiptDraft(file.type, {
          ...file.parsed,
          reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,
          reviewedAt, reviewed_at: reviewedAt,
        }),
      };
    });
    [...readyIds].forEach((fileId) => queueWorkingPdfSync(fileId, { mode: 'review' }));
    const skippedCount = rows.filter((row) => !row.pending && !excluded[row.f.id] && !readyIds.has(row.f.id)).length;
    toast(`Экспресс-проверка завершена: ${readyIds.size} ${plural(readyIds.size, 'файл', 'файла', 'файлов')}.${skippedCount ? ` Требуют ручной проверки: ${skippedCount}.` : ''}`, 'ok');
  };
  const remove = (id) => {
    const timer = pdfSyncTimers.current.get(id);
    if (timer) clearTimeout(timer);
    pdfSyncTimers.current.delete(id);
    const noticeTimer = pdfSyncNoticeTimers.current.get(id);
    if (noticeTimer) clearTimeout(noticeTimer);
    pdfSyncNoticeTimers.current.delete(id);
    setFiles((cur) => cur.filter((f) => f.id !== id));
    setExcluded((e) => { const n = { ...e }; delete n[id]; return n; });
    setReviewed((e) => { const n = { ...e }; delete n[id]; return n; });
    setPdfSync((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const processing = files.some((f) => f.status !== 'done');
  const done = files.filter((f) => f.status === 'done');
  const processedBlankCount = done.reduce((total, file) => {
    const subReceiptCount = Array.isArray(file.subReceipts) ? file.subReceipts.length : 0;
    const declaredCount = Number(file.parsed?.receiptCount || file.parsed?.receipt_count || 0);
    const detectedCount = Math.max(subReceiptCount, declaredCount);
    return total + (detectedCount > 0 ? detectedCount : (file.error ? 0 : 1));
  }, 0);
  const importProgress = files.length ? Math.round((done.length / files.length) * 100) : 0;
  const activeImport = files.find((f) => f.status !== 'done');
  const hasImportProgress = files.length > 0 || step > 0;
  useEffect(() => {
    if (!open || !hasImportProgress) return undefined;
    const guard = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [open, hasImportProgress]);
  const requestClose = () => {
    if (hasImportProgress) setConfirmClose(true);
    else onClose();
  };
  const saveDraft = (closeAfterSave = false) => {
    if (processing) {
      toast('Дождитесь окончания текущего распознавания — затем черновик можно сохранить', 'err');
      return;
    }
    const storedFiles = files.filter((file) => file.status === 'done' && file.importId)
      .map(serializableReceiptImportFile);
    if (!storedFiles.length) {
      toast('Нет обработанных бланков для сохранения', 'err');
      return;
    }
    const draft = {
      version: 1,
      id: draftIdRef.current || createReceiptImportDraftId(),
      savedAt: new Date().toISOString(),
      step: Math.max(step, 2),
      files: storedFiles,
      excluded,
      reviewed,
      bindTarget,
      optAddIncomplete,
      optCreateServices,
      math,
      serviceFeeInfo,
      sel,
      pricingSel,
      importMode,
    };
    draftIdRef.current = draft.id;
    const saved = onDraftSaved?.(draft);
    if (saved === false) return;
    setDraftSavedAt(draft.savedAt);
    if (closeAfterSave) {
      setConfirmClose(false);
      onClose();
    }
    toast(`Черновик импорта сохранён: ${storedFiles.length} ${plural(storedFiles.length, 'файл', 'файла', 'файлов')}.`, 'ok');
  };
  const saveDraftAndClose = () => saveDraft(true);



  // Group review rows must use the latest child reviewStatus values.
  const rows = (() => {
    const seen = new Set();
    return files.map((f) => ({
      f,
      pending: f.status !== 'done',
      status: f.status === 'done' ? receiptStatus(f.parsed, seen, f.type, f.error, f) : (f.status === 'scanning' ? 'Сканируется' : 'В очереди'),
    }));
  })();
  const doneRows = rows.filter((r) => !r.pending);
  const detectedGroups = receiptDetectedGroups(files, importMode);
  const groupInfoByFile = Object.fromEntries(detectedGroups.flatMap((group, groupIndex) => group.map((file) => [file.id, {
    index: groupIndex + 1,
    count: group.length,
    type: file.type,
    position: group.findIndex((item) => item.id === file.id) + 1,
    fileIds: group.map((item) => item.id),
    // Имена нужны диалогу подтверждения: оператор должен видеть, каких именно
    // бланков коснётся массовое применение.
    fileNames: group.map((item) => item.parsed?.passenger || item.name || 'Бланк'),
  }])));
  useEffect(() => {
    if (files.length && !processing && step === 1) setStep(2);
  }, [files.length, processing, step]);


  useEffect(() => {
    setExcluded((cur) => {
      const next = { ...cur };
      doneRows.forEach((r) => { if (r.status === 'Возможный дубль' && next[r.f.id] === undefined) next[r.f.id] = true; });
      return next;
    });
  }, [doneRows.map((r) => r.f.id + r.status).join(',')]);

  const counts = doneRows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const isEligible = (r) => !r.pending && r.f.importId && !excluded[r.f.id] && r.status !== 'Ошибка'
    && !receiptGroupNeedsSequentialReview(r.f)
    && (r.status === 'Распознано' || r.status === 'Заполнено вручную' || reviewed[r.f.id] || optAddIncomplete);
  const toAdd = doneRows.filter(isEligible);
  // Что именно держит переход на следующий шаг. Раньше «Далее» просто гасла,
  // и оператор, отредактировавший все бланки, не понимал, чего от него ждут.
  const blockingRows = doneRows.filter((r) => !excluded[r.f.id] && (
    (r.status === 'Требует проверки' && !reviewed[r.f.id]) || receiptGroupNeedsSequentialReview(r.f)
  ));
  const pendingReview = blockingRows.length;
  const blockingDetails = blockingRows.map((row) => {
    const tickets = receiptGroupedTickets(row.f);
    const reviewedCount = tickets.filter(receiptBlankIsReviewed).length;
    const missing = tickets.length > 1
      ? tickets.filter((ticket) => receiptBlankMissingFields(ticket, row.f.type).length > 0).length
      : receiptBlankMissingFields(row.f.parsed, row.f.type).length > 0 ? 1 : 0;
    return {
      id: row.f.id,
      name: row.f.parsed?.passenger || row.f.name || 'Документ',
      total: tickets.length || 1,
      reviewed: tickets.length > 1 ? reviewedCount : (reviewed[row.f.id] ? 1 : 0),
      incomplete: missing,
    };
  });
  const blockingIncomplete = blockingDetails.filter((row) => row.incomplete > 0).length;
  const editFile = files.find((f) => f.id === editId) || null;
  const mathFile = files.find((f) => f.id === mathId)
    || files.flatMap((file) => (receiptHasMultipleSubReceipts(file) ? receiptGroupedTickets(file) : []).map((receipt, index) => ({
      ...file,
      id: subReceiptMathKey(file.id, index),
      parsed: receipt,
      name: 'Билет ' + (index + 1) + ' · ' + (receipt.passenger || file.name),
      parentFileId: file.id,
      blankIndex: index,
    }))).find((file) => file.id === mathId)
    || null;
  const brandParentFile = files.find((f) => f.id === brandTarget?.fileId) || null;
  const brandFile = receiptBrandFileForBlank(brandParentFile, brandTarget?.blankIndex);
  const subEditParent = files.find((f) => f.id === subEdit?.fileId) || null;
  const subEditReceipt = subEditParent?.subReceipts?.[subEdit?.index] || null;
  const hasOrderTarget = bindTarget.mode === 'order' && bindTarget.order && bindTarget.order.id;
  const hasPersonTarget = bindTarget.mode === 'person' && (bindTarget.id || bindTarget.person?.id);
  const hasCompanyTarget = bindTarget.mode === 'company' && bindTarget.company?.id;
  const canCreateOrderTarget = bindTarget.mode === 'new' && typeof onCreateOrder === 'function';
  const hasBindingTarget = hasOrderTarget || hasPersonTarget || hasCompanyTarget || canCreateOrderTarget;
  const canAttach = toAdd.length > 0 && !processing && hasBindingTarget
    && (!optCreateServices || hasOrderTarget || canCreateOrderTarget);
  // Переходить между шагами можно свободно: непроверенные бланки удерживают
  // только последний шаг, где бланки уходят в заказ. Там же оператор видит,
  // что именно нужно исправить.
  const canNext = [
    files.length > 0,
    files.length > 0 && !processing,
    doneRows.length > 0,
    doneRows.length > 0,
    canAttach,
  ];


  const selIds = doneRows.filter((r) => sel[r.f.id]).map((r) => r.f.id);
  const pricingRows = doneRows.filter((row) => !excluded[row.f.id]).flatMap((row) => {
    const tickets = receiptGroupedTickets(row.f);
    if (tickets.length <= 1) return [{ ...row, parsed: row.f.parsed, mathKey: row.f.id, blankIndex: null }];
    return tickets.map((receipt, index) => ({
      ...row,
      parsed: receipt,
      mathKey: subReceiptMathKey(row.f.id, index),
      blankIndex: index,
    }));
  });
  const selectedPricingRows = pricingRows.filter((row) => pricingSel[row.mathKey]
    && (!mathFile || row.f.type === mathFile.type));
  // Варианты области применения для формы расчёта. «Только этот бланк» есть
  // всегда; массовые варианты появляются, только если есть куда применять.
  const mathScopeOptions = (() => {
    if (!mathFile) return [];
    const sourcePricingRow = pricingRows.find((row) => row.mathKey === mathFile.id);
    const sameTypeRows = pricingRows.filter((row) => row.f.type === mathFile.type);
    const selectedRows = pricingRows.filter((row) => pricingSel[row.mathKey] && row.f.type === sourcePricingRow?.f?.type);
    const options = [{
      key: 'current',
      label: 'Только этот бланк',
      hint: mathFile.parsed?.passenger || mathFile.name || '',
      rows: [{ mathKey: mathFile.id, parsed: mathFile.parsed, f: { type: mathFile.type, name: mathFile.name } }],
    }];
    if (selectedRows.length > 1) options.push({
      key: 'selected',
      label: `Выбранные бланки (${selectedRows.length})`,
      hint: 'отмеченные галочками в таблице расчётов',
      rows: selectedRows,
    });
    if (sameTypeRows.length > 1) options.push({
      key: 'sameType',
      label: `Все загруженные бланки услуги «${mathFile.type}» (${sameTypeRows.length})`,
      hint: 'стоимость и расчёты применятся к каждому бланку этого вида услуги',
      rows: sameTypeRows,
    });
    return options;
  })();

  const identicalPricingRows = (sourceRow) => {
    const type = sourceRow?.f?.type;
    if (!['Авиа', 'ЖД'].includes(type)) return [];
    const signature = receiptPricingCostSignature(type, sourceRow.parsed);
    if (!signature) return [];
    return pricingRows.filter((row) => row.f.type === type
      && receiptPricingCostSignature(type, row.parsed) === signature);
  };
  // Compatibility alias for older rail-only checks; selection is now shared
  // by railway and aviation receipts.
  const identicalRailPricingRows = (sourceRow) => {
    if (sourceRow?.f?.type === 'ЖД') {
      const signature = receiptRailCostSignature(sourceRow.parsed);
      return pricingRows.filter((row) => row.f.type === 'ЖД'
        && receiptRailCostSignature(row.parsed) === signature);
    }
    return identicalPricingRows(sourceRow);
  };
  // Полоса одинаковой стоимости строится по всем загруженным бланкам сразу,
  // а не внутри отдельного PDF: оператору нужен сквозной список вариантов цены.
  const globalCostGroups = receiptGlobalCostGroups(pricingRows);
  // Активная вкладка хранится по ключу «услуга + подпись стоимости», а не по
  // индексу: после правки математики набор групп пересобирается, и выбор
  // пользователя должен пережить пересчёт либо корректно свернуться.
  const activeCostTabKey = globalCostGroups.some((group) => group.key === costTabKey) ? costTabKey : '';
  const openCostTicketEditor = (row) => {
    if (row.blankIndex === null) setEditId(row.f.id);
    else setSubEdit({ fileId: row.f.id, index: row.blankIndex });
  };
  const selectIdenticalPricing = (sourceRow) => {
    const type = sourceRow?.f?.type;
    const matches = identicalPricingRows(sourceRow);
    if (matches.length < 2) {
      toast(`Других ${type === 'Авиа' ? 'авиабилетов' : 'ЖД-билетов'} с идентичной стоимостью не найдено`, 'info');
      return;
    }
    setPricingSel(Object.fromEntries(matches.map((row) => [row.mathKey, true])));
    setStep(3);
    setMathId(sourceRow.mathKey);
    toast(`Выбрано ${type === 'Авиа' ? 'авиабилетов' : 'ЖД-билетов'} с одинаковой стоимостью: ${matches.length}.`, 'ok');
  };
  const selectIdenticalRailPricing = (sourceRow) => selectIdenticalPricing(sourceRow);

  // ——— Сервисный сбор по финансовым условиям контрагента ————————————
  // Правило выбирает backend (POST /service-fee/resolve/). Договорной сбор
  // подставляется в математику автоматически, при отсутствии правила поле
  // остаётся ручным — но оператор всегда видит, что источника нет.
  const feeBindingContext = receiptFeeBindingContext(bindTarget);
  const feeBindingSignature = JSON.stringify(feeBindingContext);
  // База процентного правила — база поставщика из математики бланка, а не
  // итог с уже добавленным сбором: иначе процент считался бы по кругу.
  const serviceFeeBase = (row) => Math.round((Number(getMathFrom(math, row.mathKey, row.parsed).tariff) || 0) * 100) / 100;
  const feeRowsSignature = pricingRows
    .map((row) => [row.mathKey, row.f.type, serviceFeeBase(row), row.parsed?.currency || ''].join(':'))
    .join('|');

  const applyServiceFeeMath = (rows, feeByKey) => {
    const current = mathStateRef.current;
    const targets = rows.filter((row) => feeByKey[row.mathKey] !== undefined
      && Math.abs((Number(getMathFrom(current, row.mathKey, row.parsed).fee) || 0) - feeByKey[row.mathKey]) > 0.005);
    if (!targets.length) return [];
    const next = { ...current };
    targets.forEach((row) => {
      next[row.mathKey] = { ...getMathFrom(current, row.mathKey, row.parsed), fee: feeByKey[row.mathKey] };
    });
    mathStateRef.current = next;
    setMath(next);
    const affectedFileIds = [...new Set(targets.map((row) => String(row.mathKey).split('::blank::')[0]))];
    syncPricingSnapshots(next, affectedFileIds, { announce: false, delay: 600 });
    return targets.map((row) => row.mathKey);
  };

  const announceServiceFeeSource = (rows, previous, next) => {
    const changed = rows.filter((row) => (previous[row.mathKey]?.source || '') !== (next[row.mathKey]?.source || ''));
    if (!changed.length) return;
    const contractRows = changed.filter((row) => next[row.mathKey]?.source === 'contract');
    if (contractRows.length) {
      const sample = next[contractRows[0].mathKey];
      const contract = sample.contractNumber ? `договору ${sample.contractNumber}` : 'условиям контрагента';
      toast(`Сервисный сбор подставлен по ${contract}: ${contractRows.length} ${plural(contractRows.length, ['бланк', 'бланка', 'бланков'])}.`, 'ok');
    }
    // Молча оставлять договорной сбор при смене клиента нельзя: оператор
    // должен увидеть, что теперь сумма на его ответственности. Новые бланки,
    // для которых договора и не было, при этом не шумят.
    const manualRows = changed.filter((row) => next[row.mathKey]?.source !== 'contract'
      && previous[row.mathKey]?.source === 'contract');
    if (manualRows.length) {
      toast(`Клиент изменён: для ${manualRows.length} ${plural(manualRows.length, ['бланка', 'бланков', 'бланков'])} договорных условий нет — проверьте сервисный сбор вручную.`, 'info');
    }
  };

  const applyServiceFeeResolutions = (rows, resolutions) => {
    const previous = serviceFeeInfoRef.current;
    const next = { ...previous };
    const feeByKey = {};
    resolutions.forEach((item) => {
      if (!item || item.key === undefined) return;
      const info = normalizeServiceFeeResolution(item);
      next[item.key] = info;
      if (info.source === 'contract' && info.fee !== null) feeByKey[item.key] = info.fee;
    });
    serviceFeeInfoRef.current = next;
    setServiceFeeInfo(next);
    applyServiceFeeMath(rows, feeByKey);
    announceServiceFeeSource(rows, previous, next);
  };

  useEffect(() => {
    if (!open || !pricingRows.length) return undefined;
    const rows = pricingRows;
    const items = rows.map((row) => ({
      key: row.mathKey,
      service_kind: row.f.type,
      base_amount: serviceFeeBase(row),
      currency: row.parsed?.currency || 'RUB',
    }));
    const manualFor = (reason) => items.map((item) => ({
      key: item.key, source: 'manual', fee: null, reason, currency: item.currency, service_kind: item.service_kind,
    }));
    if (!feeBindingContext.company && !feeBindingContext.order) {
      serviceFeeResolveRef.current = null;
      applyServiceFeeResolutions(rows, manualFor(feeBindingContext.reason || 'no_company'));
      return undefined;
    }
    let active = true;
    let settle = () => {};
    const pending = new Promise((resolve) => { settle = resolve; });
    const release = () => {
      if (serviceFeeResolveRef.current === pending) serviceFeeResolveRef.current = null;
      settle();
    };
    serviceFeeResolveRef.current = pending;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => {
      crmApi.resolveServiceFee({
        company: feeBindingContext.company || null,
        order: feeBindingContext.order || null,
        items,
      }, controller?.signal)
        .then((response) => {
          if (!active) return;
          applyServiceFeeResolutions(rows, Array.isArray(response?.results) ? response.results : []);
        })
        .catch((error) => {
          if (!active || error?.name === 'AbortError') return;
          applyServiceFeeResolutions(rows, manualFor('resolve_failed'));
        })
        .finally(release);
    }, 250);
    return () => { active = false; clearTimeout(timer); controller?.abort(); release(); };
  }, [open, feeBindingSignature, feeRowsSignature]);


  const verifiedReceiptForSaveWithMath = (file, mathState) => {
    const parent = file.parsed;
    if (!receiptHasMultipleSubReceipts(file)) {
      return receiptWithPricing(file.type, parent, mathForFileWithState(file, mathState));
    }
    const pricedTickets = file.subReceipts.map((ticket, index) => {
      const ticketMath = getMathFrom(mathState, subReceiptMathKey(file.id, index), ticket);
      return {
        ...receiptWithPricing(file.type, ticket, ticketMath),
        markup: Number(ticketMath.markup || 0),
        commission: Number(ticketMath.commission || 0),
        clientTotal: clientTotal(ticketMath),
      };
    });
    return {
      ...aggregateReceiptSubrows(parent, pricedTickets, file.type),
      originalTotal: parent.originalTotal,
      groupTickets: pricedTickets,
    };
  };
  const verifiedReceiptForSave = (file) => verifiedReceiptForSaveWithMath(file, math);

  const verifiedReceiptForReview = (file) => {
    if (!receiptHasMultipleSubReceipts(file)) return file.parsed;
    return {
      ...aggregateReceiptSubrows(file.parsed, file.subReceipts, file.type),
      originalTotal: file.parsed?.originalTotal,
      groupTickets: file.subReceipts,
    };
  };

  async function syncWorkingSupplierPdf(fileId, sequence, mode, announce, submittedSnapshot, financialEdit) {
    const file = filesStateRef.current.find((item) => item.id === fileId);
    const sourceDocumentId = file?.sourceDocumentId || file?.serverId;
    if (!file || !sourceDocumentId) return;
    const previousNoticeTimer = pdfSyncNoticeTimers.current.get(fileId);
    if (previousNoticeTimer) clearTimeout(previousNoticeTimer);
    pdfSyncNoticeTimers.current.delete(fileId);
    setPdfSync((current) => ({ ...current, [fileId]: 'saving' }));
    try {
      // Every preview write must include the latest pricing state. A review
      // request can run immediately after a price request (for example when
      // the operator fixes recognition and then marks the blank as checked).
      // Sending the recognized source amounts from that second request used
      // to make the backend legitimately remove the corrected PDF version,
      // so the price appeared to change and then silently reverted.
      const verifiedData = submittedSnapshot
        || (mode === 'pricing'
          ? verifiedReceiptForSaveWithMath(file, mathStateRef.current)
          : verifiedReceiptForReview(file));
      const saved = await documentsApi.updateReceipt(sourceDocumentId, {
        draft: true,
        verified_data: verifiedData,
        output_settings: verifiedData.output || { mode: 'original' },
        audit_log: verifiedData.auditLog || [],
        preview_sync: true,
        pdf_financial_edit: Boolean(financialEdit),
      });
      if (pdfSyncSequence.current[fileId] !== sequence) return;
      let correction = saved?.supplier_pdf_correction || {};
      if (correction.status === 'queued' && correction.job_id) {
        correction = await waitForReceiptPdfJob(correction.job_id);
      }
      if (['manual_required', 'unsupported'].includes(correction.status)) {
        setPdfSync((current) => ({ ...current, [fileId]: 'error' }));
        toast(receiptPdfCorrectionProblem(correction), 'err');
        return;
      }
      const revision = Date.now();
      setFiles((current) => {
        const next = current.map((item) => item.id === fileId ? {
          ...item,
          originalUrl: freshSupplierDocumentUrl(documentsApi.supplierPreviewUrl(sourceDocumentId)),
          supplierPdfRevision: revision,
          supplierPdfCorrection: correction,
        } : item);
        filesStateRef.current = next;
        return next;
      });
      setPdfSync((current) => ({ ...current, [fileId]: 'saved' }));
      const noticeTimer = setTimeout(() => {
        pdfSyncNoticeTimers.current.delete(fileId);
        setPdfSync((current) => {
          if (current[fileId] !== 'saved') return current;
          const next = { ...current };
          delete next[fileId];
          return next;
        });
      }, PDF_SYNC_SUCCESS_NOTICE_MS);
      pdfSyncNoticeTimers.current.set(fileId, noticeTimer);
      if (announce) toast('Стоимость сразу перенесена в рабочую PDF-копию', 'ok');
    } catch (error) {
      if (pdfSyncSequence.current[fileId] !== sequence) return;
      setPdfSync((current) => ({ ...current, [fileId]: 'error' }));
      toast(error.message || 'Не удалось обновить рабочую PDF-копию', 'err');
    }
  }

  function queueWorkingPdfSync(fileId, {
    mode = 'review', delay = 700, announce = false, verifiedData = null, financialEdit = false,
  } = {}) {
    const existing = pdfSyncTimers.current.get(fileId);
    if (existing) clearTimeout(existing);
    const sequence = (pdfSyncSequence.current[fileId] || 0) + 1;
    pdfSyncSequence.current[fileId] = sequence;
    const timer = setTimeout(() => {
      pdfSyncTimers.current.delete(fileId);
      const previous = pdfSyncChains.current[fileId] || Promise.resolve();
      const current = previous
        .catch(() => undefined)
        .then(() => syncWorkingSupplierPdf(fileId, sequence, mode, announce, verifiedData, financialEdit));
      pdfSyncChains.current[fileId] = current;
      void current.finally(() => {
        if (pdfSyncChains.current[fileId] === current) delete pdfSyncChains.current[fileId];
      });
    }, delay);
    pdfSyncTimers.current.set(fileId, timer);
  }

  // Источник сервисного сбора документа: договорной только если каждый его
  // бланк рассчитан по договору. Backend перепроверяет правило при сохранении.
  const receiptServiceFeePayload = (file, fileMath) => {
    const rows = pricingRows.filter((row) => row.f.id === file.id);
    const infos = rows.map((row) => serviceFeeInfo[row.mathKey]).filter(Boolean);
    const contractInfos = infos.filter((info) => info.source === 'contract');
    const isContract = infos.length > 0 && contractInfos.length === infos.length;
    const reference = contractInfos[0] || infos[0] || null;
    return {
      amount: Number(fileMath?.fee || 0),
      currency: file.parsed?.currency || 'RUB',
      service_kind: file.type,
      source: isContract ? 'contract' : 'manual',
      reason: isContract ? '' : (infos.find((info) => info.source !== 'contract')?.reason || 'manual'),
      blanks: rows.length,
      rule_id: isContract ? (reference?.ruleId || '') : '',
      contract_id: isContract ? (reference?.contractId || '') : '',
      agreement_id: isContract ? (reference?.agreementId || '') : '',
      contract_number: isContract ? (reference?.contractNumber || '') : '',
    };
  };

  // Клиента могли выбрать за секунду до сохранения: сначала дожидаемся
  // серверного расчёта сбора, иначе в заказ уйдёт устаревшая сумма.
  const ensureServiceFeesResolved = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const pending = serviceFeeResolveRef.current;
      if (!pending) return;
      try { await pending; } catch { /* ошибка расчёта уже показана оператору */ }
    }
  };
  // Окно создания заказа по бланкам открывается из шага «В заказ» и
  // возвращает созданный заказ либо null, если оператор отказался.
  const requestOrderFromReceipts = (plan) => new Promise((resolve) => {
    orderPlanResolveRef.current = resolve;
    setOrderPlanRequest(plan);
  });
  const closeOrderPlanRequest = (order) => {
    const resolve = orderPlanResolveRef.current;
    orderPlanResolveRef.current = null;
    setOrderPlanRequest(null);
    if (resolve) resolve(order || null);
  };

  const finish = async () => {
    if (!toAdd.length) { toast('Нет квитанций для добавления', 'err'); return; }
    await ensureServiceFeesResolved();
    let finalBindTarget = bindTarget;
    if (bindTarget.mode === 'new') {
      if (typeof onCreateOrder !== 'function') { toast('Создание нового заказа сейчас недоступно', 'err'); return; }
      // Услуги искать не нужно: маршрут, даты, пассажиров и виды услуг берём
      // прямо из бланков и показываем оператору для подтверждения.
      const createdOrder = await requestOrderFromReceipts(receiptOrderPlan(toAdd.map((row) => row.f)));
      if (!createdOrder) return;
      finalBindTarget = { mode: 'order', order: createdOrder, label: 'Заказ № ' + createdOrder.no };
      setBindTarget(finalBindTarget);
    }
    const finalHasOrderTarget = finalBindTarget.mode === 'order' && finalBindTarget.order?.id;
    if (optCreateServices && !finalHasOrderTarget) { toast('Выберите или создайте заказ для создания услуг', 'err'); return; }
    const now = new Date().toLocaleDateString('ru-RU');
    const isPerson = finalBindTarget.mode === 'person';
    const isCompany = finalBindTarget.mode === 'company';
    const orderNo = finalHasOrderTarget ? finalBindTarget.order.no : '—';
    const companyName = finalBindTarget.company?.name || finalBindTarget.company?.shortName || finalBindTarget.label || '';
    const bindText = isPerson ? ('физ. лицу ' + finalBindTarget.client)
      : isCompany ? ('юр. лицу ' + companyName) : ('заказу № ' + orderNo);
    setProcessing(true);
    try {
      const confirmed = await Promise.all(toAdd.map((r) => {
        const p = r.f.parsed; const m = mathForFileWithState(r.f, mathStateRef.current);
        const verifiedForSave = verifiedReceiptForSaveWithMath(r.f, mathStateRef.current);
        const supplierFare = Number(verifiedForSave.fare || 0);
        const supplierTaxes = Number(verifiedForSave.taxes || 0);
        const supplierFees = Number(verifiedForSave.fees || 0);
        return documentsApi.confirmReceipt(r.f.importId, {
          issuer: verifiedForSave.carrier || '', passenger_name: verifiedForSave.passenger || '', segments: verifiedForSave.legs || [],
          trip_type: verifiedForSave.tripType || 'oneway',
          fare: supplierFare,
          taxes: supplierTaxes,
          fees: supplierFees,
          currency: verifiedForSave.currency || 'USD',
          fare_breakdown: verifiedForSave.fareBreakdown || [],
          tax_breakdown: verifiedForSave.taxBreakdown || [],
          fee_breakdown: verifiedForSave.feeBreakdown || [],
          order: finalHasOrderTarget ? finalBindTarget.order.id : null,
          person: isPerson ? (finalBindTarget.id || finalBindTarget.person?.id || null) : null,
          company: isCompany ? (finalBindTarget.company?.id || null) : null,
          create_services: optCreateServices && finalHasOrderTarget,
          service_type: r.f.type,
          original_total: Number(p.originalTotal) || Number(p.total) || 0,
          client_total: clientTotal(m),
          markup: Number(m.markup || 0),
          commission: Number(m.commission || 0),
          service_fee: receiptServiceFeePayload(r.f, m),
          supplier_original: {
            name: r.f.name, size: r.f.size, mime: r.f.mime,
            verified_data: verifiedForSave,
            output_settings: verifiedForSave.output || { mode: 'original' },
            audit_log: verifiedForSave.auditLog || [],
          },
        });
      }));
      const supplierPdfManual = confirmed.filter((result) => result?.supplier_pdf_correction?.status === 'manual_required').length;
      if (supplierPdfManual) {
        toast('Данные сохранены. Для ' + supplierPdfManual + ' файл. не удалось безопасно перенести все суммы в PDF поставщика — исходник оставлен без частичных правок.', 'err');
      }
      const docs = toAdd.map((r, index) => {
      const t = recType(r.f.type); const p = verifiedReceiptForSaveWithMath(r.f, mathStateRef.current); const m = mathForFileWithState(r.f, mathStateRef.current);
      return {
        serverId: confirmed[index].document_id, no: 'D-' + String(confirmed[index].document_id).slice(0, 8).toUpperCase(),
        name: [t.doc, p.passenger || p.carrier || 'Без имени'].filter(Boolean).join(' · '),
        type: t.doc, order: (isPerson || isCompany) ? '—' : orderNo, companyId: isCompany ? finalBindTarget.company?.id : null,
        company: isCompany ? companyName : '', participant: p.passenger || '—', service: r.f.type + (p.manualCompletion ? ' · заполнено вручную' : ' · распознано'),
        finOp: '—', status: 'Черновик', version: 2, date: now, size: r.f.size, parsed: p, recType: r.f.type, origin: 'corrected',

        supplierBlank: { name: r.f.name, size: r.f.size, byteSize: r.f.byteSize, mime: r.f.mime,
          lastModified: r.f.lastModified,
          originalUrl: documentsApi.supplierPreviewUrl(confirmed[index].document_id),
          sourceOriginalUrl: documentsApi.supplierSourcePreviewUrl(confirmed[index].document_id),
          total: Number(p.originalTotal) || Number(p.total) || 0, currency: p.currency },
        math: { ...m, clientTotal: clientTotal(m), currency: p.currency },
        versions: [
          { v: 1, date: now, who: 'Поставщик', note: 'Оригинальный бланк поставщика — без изменений' },
          { v: 2, date: now, who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор', note: 'Проверенные данные CRM / клиентская версия' },
        ],
        history: [
          { t: now, text: 'Оригинальный бланк поставщика сохранён как v1', who: 'CRM' },
          { t: now, text: 'Проверено и привязано к ' + bindText + (optCreateServices ? ' · услуги добавлены в заказ' : ''), who: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор' },
        ],
      };
      });
      onDraftCleared?.(draftIdRef.current);
      await onDone(docs);
      toast(isPerson ? toAdd.length + ' квитанц. привязано к физ. лицу: ' + finalBindTarget.client
        : isCompany ? toAdd.length + ' квитанц. привязано к юр. лицу: ' + companyName
          : toAdd.length + ' квитанц. добавлено в заказ № ' + orderNo, 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить квитанции', 'err'); }
    finally {
      setProcessing(false);
    }
  };

  const Stat = ({ label, value, tone }) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: value ? 'var(--' + tone + ')' : 'var(--muted-2)' }}>{value || 0}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  );

  return (
    <Drawer open={open} onClose={requestClose} title="Импорт документов услуг"
      sub="Авиа, ЖД, отели и трансферы сверяются в специализированных формах. Оригиналы поставщиков не меняются."
      width="min(1180px,98vw)">
      <div>

        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={onPick} accept=".pdf,.jpg,.jpeg,.png" />

        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(110px,1fr))', gap: 8 }}>
            {IMPORT_STEPS.map((s, i) => {
              const active = step === i;
              const doneStep = step > i;
              return (
                <button key={s.key} type="button" onClick={() => setStep(i)}
                  disabled={i > step && !canNext[i - 1]}
                  style={{ cursor: i > step && !canNext[i - 1] ? 'not-allowed' : 'pointer', border: '1px solid ' + (active ? 'var(--blue)' : doneStep ? 'var(--green)' : 'var(--line)'), background: active ? 'var(--blue-soft)' : '#fff', borderRadius: 10, padding: '10px 8px', textAlign: 'left', opacity: i > step && !canNext[i - 1] ? 0.55 : 1 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 7, background: active ? 'var(--blue)' : doneStep ? 'var(--green)' : 'var(--surface-2)', color: active || doneStep ? '#fff' : 'var(--muted)', fontWeight: 800, fontSize: 12 }}>{doneStep ? <Icon name="check" style={{ width: 13, height: 13 }} /> : i + 1}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? 'var(--blue)' : 'var(--ink)' }}>{s.label}</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Icon name="lock" style={{ width: 15, height: 15 }} /> Оригинальный бланк поставщика сохраняется как v1. Правки данных и клиентская версия создаются отдельно.
          </div>
        </div>

        {step === 0 && <>
        <RSub style={{ marginTop: 14 }}>Загрузка документов</RSub>
        <div className="receipt-import-mode" role="group" aria-label="Режим обработки бланков">
          <div><b>Как обработать загружаемые бланки?</b><span>Режим можно изменить после распознавания.</span></div>
          <div className="receipt-import-mode-options">
            {[
              ['auto', 'Определить автоматически', 'Система объединит только совпадающие маршрут, даты и условия.'],
              ['group', 'Групповое редактирование', 'Общие исправления применяются к бланкам одного типа.'],
              ['ordinary', 'Обычное редактирование', 'Каждый файл проверяется и меняется отдельно.'],
            ].map(([value, label, hint]) => <button key={value} type="button"
              className={importMode === value ? 'is-active' : ''} aria-pressed={importMode === value}
              onClick={() => setImportMode(value)}>
              <span>{importMode === value ? <Icon name="check" /> : <Icon name={value === 'group' ? 'users' : value === 'ordinary' ? 'docs' : 'sparkles'} />}</span>
              <b>{label}</b><small>{hint}</small>
            </button>)}
          </div>
        </div>
        <div onClick={() => fileRef.current && fileRef.current.click()} onDrop={onDrop}
          onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave}
          className={'receipt-drop-zone' + (dragActive ? ' is-dragging' : '')}>
          <span className="receipt-drop-icon"><Icon name={dragActive ? 'plus' : 'download'} /></span>
          <div className="receipt-drop-title">{dragActive ? 'Отпустите файлы для загрузки' : 'Перетащите файлы сюда'}</div>
          <div style={{ margin: '8px 0' }}><Button variant="secondary" size="sm">Выбрать файлы</Button></div>
          <div className="receipt-drop-hint">{dragActive ? 'Файлы будут добавлены в очередь распознавания' : 'Авиа, ЖД, отели, трансферы · PDF, JPG, PNG · до 15 МБ · сканы требуют ручной проверки'}</div>
        </div>
        </>}

        {files.length > 0 && step > 0 && (
          <>

            <RSub>{step === 1 ? 'Распознавание бланков' : 'Квитанции обработаны'}</RSub>
            <div className={'receipt-upload-progress' + (processing ? ' is-active' : ' is-complete')}
              role="progressbar" aria-label="Прогресс загрузки и распознавания квитанций"
              aria-valuemin="0" aria-valuemax="100" aria-valuenow={importProgress}>
              <div className="receipt-upload-progress-head">
                <span className="receipt-upload-progress-icon">
                  <Icon name={processing ? 'loader' : 'check'} />
                </span>
                <div>
                  <b>{processing ? 'Загрузка и распознавание квитанций' : 'Все квитанции обработаны'}</b>
                  <span>{processing && activeImport ? `Сейчас обрабатывается: ${activeImport.name}` : 'Можно переходить к проверке данных'}</span>
                </div>
                <strong>{importProgress}%</strong>
              </div>
              <div className="receipt-upload-progress-track" aria-hidden="true">
                <span style={{ width: `${importProgress}%` }} />
              </div>
              <div className="receipt-upload-progress-foot">
                <span>Обработано <b>{done.length}</b> из <b>{files.length}</b> файлов</span>
                <span className="receipt-upload-progress-blanks">Бланков: <b>{processedBlankCount}</b></span>
                <span>{files.length - done.length > 0 ? `Осталось: ${files.length - done.length}` : 'Готово'}</span>
              </div>
            </div>
            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Stat label="Распознано" value={counts['Распознано']} tone="green" />
              <Stat label="Требует проверки" value={counts['Требует проверки']} tone="amber" />
              <Stat label="Заполнено вручную" value={counts['Заполнено вручную']} tone="blue" />
              <Stat label="Дубли" value={counts['Возможный дубль']} tone="red" />
              <Stat label="Ошибка" value={counts['Ошибка']} tone="muted-2" />
            </div>
            {rows.length > 0 && step === 2 && (() => {
              const allSel = doneRows.length > 0 && doneRows.every((r) => sel[r.f.id]);
              return (
              <>
                <RSub>Сверка квитанций</RSub>
                <div style={{ fontSize: 12, color: 'var(--muted)', margin: '-4px 0 10px' }}>
                  PDF с текстовым слоем распознаются сразу. Для сканов используется OCR; если отдельные данные не найдены, проверьте и заполните их вручную.
                </div>

                <div className="receipt-group-review-mode">
                  <span><b>Режим проверки:</b></span>
                  {[['auto', 'Автоматически'], ['group', 'Групповой'], ['ordinary', 'Обычный']].map(([value, label]) => (
                    <button key={value} type="button" className={importMode === value ? 'is-active' : ''}
                      onClick={() => setImportMode(value)}>{label}</button>
                  ))}
                  <Button size="sm" icon="check" disabled={processing || !doneRows.length}
                    onClick={reviewAllReadyReceipts}>Проверить все</Button>
                </div>
                {detectedGroups.length > 0 && <div className="receipt-group-detected" role="status">
                  <Icon name="users" />
                  <span><b>Обнаружено однотипных групп: {detectedGroups.length}</b><small>{detectedGroups.reduce((sum, group) => sum + group.length, 0)} бланк. будут редактироваться группами. Общие поля переносятся вместе, ФИО, документы, номера билетов и стоимость отдельных ЖД-билетов не смешиваются.</small></span>
                </div>}

                <ReceiptCostGroupsBar
                  groups={globalCostGroups}
                  activeKey={activeCostTabKey}
                  onSelect={setCostTabKey}
                  getMath={getMath}
                  clientTotal={clientTotal}
                  onEditTicket={openCostTicketEditor}
                  onEditMath={setMathId}
                  onOpenBrand={setBrandTarget}
                  onEditGroup={selectIdenticalRailPricing} />

                <div className="table-card rec-import-table-card">
                  <table className="tbl rec-import-table">
                    <thead><tr>
                      <th style={{ width: 34 }}>{doneRows.length > 0 && <Checkbox on={allSel} onChange={() => setSel(allSel ? {} : Object.fromEntries(doneRows.map((r) => [r.f.id, true])))} />}</th>
                      <th>Документ</th><th>Детали услуги</th><th style={{ width: 150 }}>Стоимость</th><th style={{ width: 130 }}>Проверка</th><th style={{ width: 420 }}>Операции</th><th style={{ width: 40 }}></th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r) => {
                        const t = recType(r.f.type); const p = r.f.parsed;
                        const displayStatus = r.status === 'Ошибка' && p?.recognitionPending ? 'Требует проверки' : r.status;
                        const st = REC_STATUS[displayStatus] || REC_STATUS['Требует проверки'] || { tone: 'amber', action: 'Проверить' };
                        const skipped = !!excluded[r.f.id];
                        if (r.pending) {
                          return (


                              <tr key={r.f.id} className="rec-import-row is-pending">
                                <td data-label=""></td>
                                <td data-label="Документ"><span className="rec-import-file"><span className="rec-import-icon sk" /><span className="rec-import-main"><span className="sk" style={{ height: 12, width: 120, marginBottom: 6 }} /><span className="sk" style={{ height: 10, width: 80 }} /></span></span></td>
                                <td data-label="Детали услуги"><div className="sk" style={{ height: 12, width: 140, marginBottom: 6 }} /><div className="sk" style={{ height: 10, width: 90 }} /></td>
                                <td data-label="Стоимость"><div className="sk" style={{ height: 12, width: 90, marginBottom: 6 }} /><div className="sk" style={{ height: 10, width: 70 }} /></td>
                                <td data-label="Проверка"><Pill tone={r.status === 'Сканируется' ? 'blue' : 'gray'}>{r.status}</Pill></td>
                                <td data-label="Операции" colSpan={2}></td>
                              </tr>
                          );
                        }
                          const m = getMath(r.f.id, p);
                          const detailLines = receiptDetailsLines(r.f.type, p);
                          const carrierText = (p.carrier || '').trim() || r.f.name;
                          const subReceiptCount = Math.max(
                            r.f.subReceipts?.length || 0,
                            Number(p.receiptCount || p.receipt_count || 0),
                          );
                          const reviewedBlankCount = (r.f.subReceipts || []).filter(receiptBlankIsReviewed).length;
                          return (
                            <React.Fragment key={r.f.id}>
                            <tr className={'rec-import-row' + (r.f.subReceipts?.length ? ' has-subrows' : '')} style={{ opacity: skipped ? 0.5 : 1 }}>
                              <td data-label=""><Checkbox on={!!sel[r.f.id]} onChange={() => setSel((s) => ({ ...s, [r.f.id]: !s[r.f.id] }))} /></td>
                              <td data-label="Документ">
                                <span className="rec-import-file">
                                  <span className="rec-import-icon" style={{ background: t.color }}><Icon name={t.icon} /></span>
                                  <span className="rec-import-main">
                                    <span className="rec-import-title"><ReceiptParticipantSummary draft={p} noun={r.f.type === 'Гостиница' ? 'гостей' : 'пассажиров'} /></span>
                                    <span className="rec-import-meta">{carrierText}</span>
                                    {groupInfoByFile[r.f.id] && <span className="receipt-similar-group-pill">Группа {groupInfoByFile[r.f.id].index} · {groupInfoByFile[r.f.id].count} бланк.</span>}
                                    <Select aria-label="Тип услуги" options={[
                                      { value: 'Прочее', label: 'Тип не определён' },
                                      ...REC_TYPES.filter((item) => item.key !== 'Прочее').map((item) => item.key),
                                    ]}
                                      value={r.f.type} onChange={(event) => setType(r.f.id, event.target.value)} className="select rec-import-type-select" />
                                    {!!subReceiptCount && (
                                      <span className={'receipt-subrows-inline' + (expandedReceipts[r.f.id] ? ' is-expanded' : '')}>
                                        <span className="receipt-subrows-inline-count">Бланков: <b>{subReceiptCount}</b></span>
                                        <button type="button" className="receipt-subrows-inline-toggle"
                                          aria-expanded={!!expandedReceipts[r.f.id]}
                                          onClick={() => setExpandedReceipts((current) => ({ ...current, [r.f.id]: !current[r.f.id] }))}>
                                          <span>{expandedReceipts[r.f.id] ? 'Скрыть' : 'Показать'}</span>
                                          <Icon name={expandedReceipts[r.f.id] ? 'chevUp' : 'chevDown'} />
                                        </button>
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </td>
                              <td data-label="Детали услуги">
                                <span className="rec-import-details">{detailLines.slice(0, 3).map((line, index) => <span key={index}>{line}</span>)}</span>
                              </td>
                              <td data-label="Стоимость">
                                <button type="button" className="btn btn-ghost btn-sm rec-import-money" title="Изменить математику" onClick={() => setMathId(r.f.id)}>
                                  <span className={'rec-import-money-total' + (!recHasSourceAmount(p) ? ' is-missing' : '')}>
                                    {recHasSourceAmount(p)
                                      ? `${subReceiptCount > 1 ? 'Сумма группы: ' : ''}${recMoney(clientTotal(m), p.currency)}`
                                      : 'Стоимость не распознана'}
                                  </span>
                                  <span className="rec-import-money-source">{subReceiptCount > 1 ? 'закупка группы' : 'закупка'} {recSourceMoney(p)}</span>
                                  <span className="rec-import-money-fee">сбор {m.fee || 0} · изменить</span>
                                </button>
                              </td>
                              <td data-label="Проверка">
                                <Pill tone={st.tone}>{displayStatus}</Pill>
                                {subReceiptCount > 1 && <div style={{ marginTop: 5 }}><Pill tone={reviewedBlankCount === subReceiptCount ? 'green' : 'amber'}>
                                  Проверено {reviewedBlankCount} из {subReceiptCount}
                                </Pill></div>}
                                {reviewed[r.f.id] && subReceiptCount <= 1 && <div style={{ marginTop: 5 }}><Pill tone="green">Проверено</Pill></div>}
                              </td>
                              <td data-label="Операции">
                                {r.status === 'Возможный дубль'
                                  ? <button className="btn btn-ghost btn-sm" onClick={() => setExcluded((e) => ({ ...e, [r.f.id]: !e[r.f.id] }))}>{skipped ? 'Вернуть' : 'Пропустить'}</button>
                                  : (
                                    <div className="rec-import-actions">
                                      <button className="btn btn-ghost btn-sm" onClick={() => {
                                        if (r.status === 'Ошибка' && !p?.recognitionPending && r.f.raw) {
                                          const raw = r.f.raw;
                                          remove(r.f.id);
                                          addFiles([raw]);
                                        } else setEditId(r.f.id);
                                      }}>{(r.f.subReceipts || []).length > 1 ? 'Проверить бланки по очереди' : (displayStatus === 'Требует проверки' ? 'Проверить и заполнить' : st.action)}</button>
                                      {r.f.originalUrl && <button className="btn btn-ghost btn-sm" onClick={() => window.open(inlineSupplierDocumentUrl(r.f.originalUrl), '_blank', 'noopener,noreferrer')}><Icon name="eye" /> Оригинал</button>}
                                      <button className="btn btn-ghost btn-sm" onClick={() => setExcluded((state) => ({ ...state, [r.f.id]: !state[r.f.id] }))}>
                                        <Icon name={!skipped ? 'check' : 'orders'} /> {!skipped ? 'Добавляется' : 'Добавить в заказ'}
                                      </button>
                                      <button className="btn btn-ghost btn-sm" title="Предпросмотр и сохранение на фирменном бланке" onClick={() => setBrandTarget({ fileId: r.f.id, blankIndex: 0 })}><Icon name="template" style={{ width: 14, height: 14 }} /> На бланке</button>
                                    </div>
                                  )}
                              </td>
                              <td data-label=""><button className="btn btn-ghost btn-sm rec-import-remove" onClick={() => {
                                if (window.confirm(`Удалить «${r.f.name}» из импорта? Оригинальный файл на компьютере не будет удалён.`)) remove(r.f.id);
                              }}><Icon name="trash" style={{ width: 16, height: 16 }} /></button></td>
                            </tr>
                            {expandedReceipts[r.f.id] && (r.f.subReceipts || []).map((subReceipt, subIndex) => {
                              const subDetails = receiptDetailsLines(r.f.type, subReceipt);
                              const railLeg = subReceipt.legs?.[0] || {};
                              const currentPricingRow = pricingRows.find((row) => row.mathKey === subReceiptMathKey(r.f.id, subIndex));
                              const identicalCostRows = currentPricingRow ? identicalRailPricingRows(currentPricingRow) : [];
                              const identicalCostCount = identicalCostRows.length;
                              const includedVat = (subReceipt.includedTaxBreakdown || []).filter((row) => Number(row.amount) > 0);
                              return (
                                <tr key={`${r.f.id}-ticket-${subIndex}`} className="rec-import-subrow" style={{ opacity: skipped ? 0.5 : 1 }}>
                                  <td data-label=""></td>
                                  <td data-label="Билет">
                                    <span className="rec-import-subrow-document">
                                      <span className="rec-import-subrow-branch" aria-hidden="true">↳</span>
                                      <span>
                                        <b>Билет {subIndex + 1} из {r.f.subReceipts.length}</b>
                                        <span>{subReceipt.passenger || 'Пассажир не распознан'}</span>
                                        {subReceipt.ticketNo && <span>№ {subReceipt.ticketNo}</span>}
                                      </span>
                                    </span>
                                  </td>
                                  <td data-label="Маршрут">
                                    <span className="rec-import-details">
                                      {subDetails.slice(0, 2).map((line, index) => <span key={index}>{line}</span>)}
                                      <span>{r.f.type === 'ЖД' ? ([
                                        railLeg.flightNo ? `Поезд ${railLeg.flightNo}` : '',
                                        railLeg.coach ? `вагон ${railLeg.coach}` : '',
                                        railLeg.seat ? `место ${railLeg.seat}` : '',
                                      ].filter(Boolean).join(' · ') || 'Поезд, вагон и место не распознаны') : ([
                                        railLeg.flightNo ? `Рейс ${railLeg.flightNo}` : '',
                                        railLeg.carrier || subReceipt.carrier || '',
                                      ].filter(Boolean).join(' · ') || 'Рейс не распознан')}</span>
                                    </span>
                                  </td>
                                  <td data-label="Стоимость">
                                    <span className="rec-import-subrow-cost">
                                      <b>{recSourceMoney(subReceipt)}</b>
                                      {r.f.type === 'ЖД' ? <>
                                        <span>Билет: {recMoney(Number(subReceipt.ticketCost) || 0, subReceipt.currency)}</span>
                                        <span>Плацкарта: {recMoney(Number(subReceipt.reservedSeatCost) || 0, subReceipt.currency)}</span>
                                      </> : <>
                                        <span>Тариф: {recMoney(Number(subReceipt.fare) || 0, subReceipt.currency)}</span>
                                        <span>Таксы: {recMoney(Number(subReceipt.taxes) || 0, subReceipt.currency)}</span>
                                        <span>Сборы: {recMoney(Number(subReceipt.fees) || 0, subReceipt.currency)}</span>
                                      </>}
                                      {includedVat.map((row) => <span key={row.code}>{row.label}: {recMoney(Number(row.amount), row.currency || subReceipt.currency)}</span>)}
                                      {identicalCostCount > 1 && <em>Такая же стоимость у {identicalCostCount} билетов</em>}
                                    </span>
                                  </td>
                                  <td data-label="Проверка"><Pill tone={receiptBlankIsReviewed(subReceipt) ? 'green' : 'amber'}>{receiptBlankIsReviewed(subReceipt) ? 'Проверено' : 'Не проверено'}</Pill></td>
                                  <td data-label="Операции">
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSubEdit({ fileId: r.f.id, index: subIndex })}>
                                      Изменить билет
                                    </button>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBrandTarget({ fileId: r.f.id, blankIndex: subIndex })}>
                                      На бланке
                                    </button>
                                    {['Авиа', 'ЖД'].includes(r.f.type) && identicalCostCount > 1 && <button type="button" className="btn btn-ghost btn-sm"
                                      onClick={() => selectIdenticalRailPricing(currentPricingRow)}>
                                      Редактировать одинаковую стоимость ({identicalCostCount})
                                    </button>}
                                    <span className="rec-import-meta">В составе общего PDF</span>
                                  </td>
                                  <td data-label=""></td>
                                </tr>
                              );
                            })}
                            </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
              );
            })()}


            {step === 3 && doneRows.length > 0 && (
              <>
            <RSub>Внутренняя математика по бланкам</RSub>
                <div style={{ fontSize: 12, color: 'var(--muted)', margin: '-4px 0 10px' }}>
                  Это вторая форма расчёта, отдельная от редактора данных бланка. Для ЖД база — билет и плацкарта, для авиа — тариф и таксы. Финансовые изменения переносятся в рабочую копию PDF поставщика.
                </div>
                <ServiceFeeBindingSummary rows={pricingRows} info={serviceFeeInfo} context={feeBindingContext}
                  dismissed={feeSummaryDismissed} onDismiss={() => setFeeSummaryDismissed(true)}
                  hint="Клиент выбирается на шаге «В заказ» — после выбора сбор пересчитается автоматически." />
                {selectedPricingRows.length > 0 && <div className="receipt-pricing-selection" role="status">
                  <Icon name="checkCircle" />
                  <span><b>Выбрано бланков: {selectedPricingRows.length}</b><small>Общие сбор, надбавка и комиссия применяются только внутри одного вида услуги. База поставщика остаётся индивидуальной.</small></span>
                  <Button size="sm" variant="ghost" onClick={() => setPricingSel({})}>Снять выбор</Button>
                </div>}
                <ReceiptCostGroupsBar
                  groups={globalCostGroups}
                  activeKey={activeCostTabKey}
                  onSelect={setCostTabKey}
                  getMath={getMath}
                  clientTotal={clientTotal}
                  onEditTicket={openCostTicketEditor}
                  onEditMath={setMathId}
                  onOpenBrand={setBrandTarget}
                  onEditGroup={selectIdenticalRailPricing} />

                <div className="table-card receipt-pricing-card">
                  <table className="tbl receipt-pricing-table">
                    <thead><tr><th aria-label="Выбор"></th><th>Бланк</th><th>База поставщика</th><th>Внутренняя математика</th><th>Версии</th><th></th></tr></thead>
                    <tbody>{pricingRows.map((r) => {
                      const p = r.parsed; const m = getMath(r.mathKey, p); const t = recType(r.f.type);
                      return (
                        <tr key={r.mathKey}>
                          <td data-label="Выбор"><Checkbox on={!!pricingSel[r.mathKey]} onChange={() => setPricingSel((current) => ({ ...current, [r.mathKey]: !current[r.mathKey] }))} /></td>
                          <td data-label="Бланк"><span className="receipt-pricing-document"><span className="rec-import-icon" style={{ background: t.color }}><Icon name={t.icon} /></span><span><b>{p.passenger || r.f.name}{r.blankIndex !== null ? ' · билет ' + (r.blankIndex + 1) : ''}</b><small>{p.carrier || 'Поставщик'} · {routeSummary(p)}</small></span></span></td>
                          <td data-label="База поставщика"><b>{recMoney(Number(m.tariff) || 0, p.currency)}</b><small className="receipt-pricing-meta">{r.f.type === 'ЖД' ? 'билет + плацкарта' : r.f.type === 'Авиа' ? 'тариф + таксы' : 'закупочная стоимость'}</small></td>
                          <td data-label="Внутренняя математика"><button type="button" className="btn btn-ghost btn-sm receipt-pricing-math" onClick={() => setMathId(r.mathKey)}><b>{recMoney(clientTotal(m), p.currency)}</b><small>сбор {recMoney(Number(m.fee) || 0, p.currency)} · надбавка {recMoney(Number(m.markup) || 0, p.currency)}</small><small>комиссия {recMoney(Number(m.commission) || 0, p.currency)} · изменить</small></button>
                            {serviceFeeInfo[r.mathKey]?.source === 'contract'
                              ? <small className="receipt-pricing-fee-source">{serviceFeeSourceLabel(serviceFeeInfo[r.mathKey])}</small>
                              : <small className="receipt-pricing-fee-source is-manual">{serviceFeeManualHint(serviceFeeInfo[r.mathKey])}</small>}
                          </td>
                          <td data-label="Версии"><span className="receipt-pricing-versions"><Pill tone="blue">v1 поставщик</Pill><Pill tone="amber">v2 CRM</Pill>{pdfSync[r.f.id] === 'saving' && <Pill tone="blue">PDF обновляется</Pill>}{pdfSync[r.f.id] === 'saved' && <Pill tone="green">PDF обновлён</Pill>}{pdfSync[r.f.id] === 'error' && <Pill tone="red">Проверьте PDF</Pill>}</span></td>
                          <td data-label="Документ"><Button size="sm" variant="secondary" icon="template" onClick={() => setBrandTarget({ fileId: r.f.id, blankIndex: r.blankIndex })}>Бланк CRM</Button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </>
            )}

            {step === 4 && <>
            <RSub>Настройка добавления</RSub>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--body)' }}>
                <span style={{ fontWeight: 600, color: 'var(--muted)', minWidth: 150 }}>Заказ для привязки</span>

                <UnifiedBindField value={bindTarget} onChange={setBindTarget} modes={['new', 'order', 'company', 'person']}
                  orderOptions={orders} companyOptions={companies} style={{ flex: 1 }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--body)', cursor: 'pointer' }}>
                <Checkbox on={optCreateServices && !['person', 'company'].includes(bindTarget.mode)}
                  onChange={() => !['person', 'company'].includes(bindTarget.mode) && setOptCreateServices((v) => !v)} /> Создавать услуги в заказе по квитанциям
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--body)', cursor: 'pointer' }}>
                <Checkbox on={optAddIncomplete} onChange={() => setOptAddIncomplete((v) => !v)} /> Добавлять квитанции с неполными данными
              </label>
            </div>
            <ServiceFeeBindingSummary rows={pricingRows} info={serviceFeeInfo} context={feeBindingContext}
              dismissed={feeSummaryDismissed} onDismiss={() => setFeeSummaryDismissed(true)} />
            <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)' }}>
              Будет добавлено в заказ: {toAdd.length}. Непроверенные, ошибки и исключённые дубли не попадут в итог.
              {bindTarget.mode === 'new' ? ' Перед сохранением откроется окно создания заказа по бланкам: маршрут, даты, пассажиры и услуги уже заполнены из квитанций — останется выбрать клиента или создать новое физлицо. Искать услуги не нужно.' : ''}
            </div>
            {pendingReview > 0 && (
              <div className="receipt-next-blocked" role="status">
                <Icon name="alertCircle" />
                <div className="receipt-next-blocked-main">
                  <b>Нельзя добавить в заказ: не подтверждено {pendingReview} {plural(pendingReview, ['документ', 'документа', 'документов'])}</b>
                  <small>
                    {blockingIncomplete
                      ? `В ${blockingIncomplete} ${plural(blockingIncomplete, ['документе', 'документах', 'документах'])} остались незаполненные обязательные поля — их нужно открыть и дозаполнить. `
                      : 'Данные заполнены — осталось подтвердить бланки. '}
                    Редактирование бланка проверкой не считается: нажмите «Проверено» в редакторе или подтвердите всё сразу.
                  </small>
                  <ul className="receipt-next-blocked-list">
                    {blockingDetails.slice(0, 6).map((row) => (
                      <li key={row.id}>
                        <span>{row.name}</span>
                        <b>{row.total > 1 ? `проверено ${row.reviewed} из ${row.total}` : 'ожидает подтверждения'}</b>
                        {row.incomplete > 0 && <em>не заполнено: {row.incomplete}</em>}
                      </li>
                    ))}
                    {blockingDetails.length > 6 && <li className="is-more">…и ещё {blockingDetails.length - 6}</li>}
                  </ul>
                </div>
                <div className="receipt-next-blocked-actions">
                  <Button size="sm" icon="check" onClick={reviewAllReadyReceipts}>Подтвердить все готовые</Button>
                  {blockingDetails[0] && <Button size="sm" variant="secondary" icon="edit"
                    onClick={() => setEditId(blockingDetails[0].id)}>Открыть первый документ</Button>}
                </div>
              </div>
            )}
            </>}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={requestClose}>Отмена</Button>
          {step > 0 && done.length > 0 && <Button variant="secondary" icon="save" disabled={processing} onClick={() => saveDraft(false)}>
            {draftSavedAt ? 'Сохранить изменения черновика' : 'Сохранить черновик'}
          </Button>}
          {step > 0 && <Button variant="secondary" icon="chevLeft" onClick={() => setStep((s) => Math.max(0, s - 1))}>Назад</Button>}
          {step < IMPORT_STEPS.length - 1
            ? <Button icon="chevRight" disabled={!canNext[step]}
              title={canNext[step] ? '' : 'Дождитесь обработки загруженных файлов'}
              onClick={() => setStep((s) => Math.min(IMPORT_STEPS.length - 1, s + 1))}>Далее</Button>
            : <Button icon="check" disabled={processing || !toAdd.length || pendingReview > 0 || !hasBindingTarget || (optCreateServices && !hasOrderTarget && !canCreateOrderTarget)}
              title={pendingReview > 0
                ? `Не подтверждено документов: ${pendingReview}. Нажмите «Подтвердить все готовые» или откройте документ и отметьте бланки проверенными.`
                : ''}
              onClick={finish}>
              {bindTarget.mode === 'new' ? 'Создать заказ и добавить'
                : ['person', 'company'].includes(bindTarget.mode) ? 'Привязать бланки' : 'Добавить в заказ'}{toAdd.length ? ' (' + toAdd.length + ')' : ''}</Button>}
        </div>
      </div>

      <ReceiptEditDrawer open={!!editFile} file={editFile} onClose={() => setEditId(null)} onChange={updateParsed} onSubChange={updateSubReceipt} onReview={markReviewed}
        pdfSyncStatus={editFile ? pdfSync[editFile.id] : ''}
        groupInfo={editFile ? groupInfoByFile[editFile.id] : null}
        onBrand={(blankIndex) => { setBrandTarget({ fileId: editId, blankIndex }); }} />
      <ReceiptEditDrawer open={!!subEditReceipt} file={subEditReceipt ? {
        id: `${subEdit.fileId}-ticket-${subEdit.index}`,
        type: subEditParent.type,
        parsed: subEditReceipt,
        originalUrl: subEditParent.originalUrl,
        supplierPdfRevision: subEditParent.supplierPdfRevision,
      } : null}
        pdfSyncStatus={subEditParent ? pdfSync[subEditParent.id] : ''}
        onClose={() => setSubEdit(null)}
        onChange={(_id, parsed) => updateSubReceipt(subEdit.fileId, subEdit.index, parsed)}
        onReview={(_id, parsed) => {
          // «Проверено» в редакторе отдельного билета отмечает именно этот
          // бланк: без метки группа считалась непроверенной целиком.
          const reviewedAt = new Date().toISOString();
          updateSubReceipt(subEdit.fileId, subEdit.index, {
            ...parsed,
            reviewStatus: 'reviewed', review_status: 'reviewed', reviewed: true,
            reviewedAt, reviewed_at: reviewedAt,
          });
          return true;
        }}
        onBrand={() => { setBrandTarget({ fileId: subEdit.fileId, blankIndex: subEdit.index }); }} />
      <ReceiptMathDrawer open={!!mathFile} file={mathFile} math={mathFile ? getMath(mathFile.id, mathFile.parsed) : null}
        scopeOptions={mathScopeOptions}
        feeInfo={mathFile ? serviceFeeInfo[mathFile.id] : null}
        onSave={(patch, targets) => { setMathFor(mathFile.id, mathFile.parsed, patch, targets); }} onClose={() => setMathId(null)} />

      <ReceiptBrandDocumentDrawer open={!!brandFile} type={brandFile?.type} draft={brandFile?.parsed}
        originalUrl={brandFile?.originalUrl} sourceOriginalUrl={brandFile?.sourceOriginalUrl}
        onClose={() => setBrandTarget(null)} />
      <ReceiptOrderCreateDrawer open={!!orderPlanRequest} plan={orderPlanRequest}
        clients={clients} companies={companies}
        onCancel={closeOrderPlanRequest}
        onSubmit={(draft) => onCreateOrder(draft)} />
      <Drawer open={confirmClose} onClose={() => setConfirmClose(false)} title="Закрыть импорт?"
        sub="Проверьте, какие бланки сохранятся в черновик"
        width="min(780px,96vw)"
        footer={
          <div className="receipt-close-actions">
            <Button variant="secondary" onClick={() => setConfirmClose(false)}>Продолжить работу</Button>
            <Button variant="danger" onClick={() => {
              onDraftCleared?.(draftIdRef.current);
              setConfirmClose(false);
              onClose();
            }}>Закрыть без сохранения</Button>
            <Button icon="save" disabled={processing || !done.length} onClick={saveDraftAndClose}>
              Сохранить черновик и выйти
            </Button>
          </div>
        }>
        <div className="receipt-close-summary">
          <div className="receipt-close-overview">
            <div><span>Всего загружено</span><b>{files.length}</b><small>файлов</small></div>
            <div><span>Обработано</span><b>{done.length}</b><small>из {files.length}</small></div>
            <div><span>Требуют внимания</span><b>{(counts['Требует проверки'] || 0) + (counts['Ошибка'] || 0) + (files.length - done.length)}</b><small>проверить</small></div>
            <div><span>Сохранится</span><b>{doneRows.filter((row) => !excluded[row.f.id]).length}</b><small>бланков</small></div>
          </div>

          <section className="receipt-close-section">
            <div className="receipt-close-section-head">
              <span><Icon name="docs" /></span>
              <div><b>Бланки в текущем импорте</b><small>Название, услуга, участник и статус — каждый файл отдельной строкой</small></div>
            </div>
            <div className="receipt-close-files">
              {rows.map((row, index) => {
                const file = row.f;
                const parsed = file.parsed || {};
                const typeMeta = recType(file.type);
                const statusCfg = REC_STATUS[row.status] || { tone: 'gray' };
                const participant = receiptParticipantLabel(parsed, 'Участники не распознаны');
                const route = routeSummary(parsed);
                const excludedFromDraft = !!excluded[file.id];
                return (
                  <div className={'receipt-close-file' + (excludedFromDraft ? ' is-muted' : '')} key={file.id}>
                    <span className="receipt-close-file-index">{index + 1}</span>
                    <span className="receipt-close-file-icon" style={{ background: typeMeta.color }}><Icon name={typeMeta.icon} /></span>
                    <span className="receipt-close-file-main">
                      <b>{file.name}</b>
                      <span>{file.type} · {participant}</span>
                      {route && route !== '—' && <small>{route}</small>}
                    </span>
                    <span className="receipt-close-file-state">
                      <Pill tone={statusCfg.tone}>{row.status}</Pill>
                      <small>{row.pending
                        ? 'Распознавание не завершено'
                        : excludedFromDraft
                          ? 'Исключён из добавления'
                          : reviewed[file.id]
                            ? 'Проверено — сохранится'
                            : 'Сохранится в черновик'}</small>
                    </span>
                  </div>
                );
              })}
              {!rows.length && <EmptyState icon="docs" title="Бланки не загружены" />}
            </div>
          </section>

          <div className="receipt-close-save-note">
            <span><Icon name="save" /></span>
            <div>
              <b>Что сохранится в черновике</b>
              <span>Распознанные поля, разбивка на бланки, результаты проверки, привязки и настройки стоимости.</span>
            </div>
          </div>

          {processing && (
            <div className="receipt-close-warning">
              <Icon name="alertCircle" />
              <span><b>Распознавание ещё идёт.</b> Дождитесь обработки всех файлов, чтобы сохранить полный черновик.</span>
            </div>
          )}
        </div>
      </Drawer>
    </Drawer>
  );
}







function ReceiptEditorPage({ documents = [], orders = [], services = [], companies = [], clients = [], onChanged, onOpenOrder, onCreateOrder }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const editDirty = useRef(false);
  const [confirmEditorClose, setConfirmEditorClose] = useState(false);
  const [expandedRegistry, setExpandedRegistry] = useState({});
  const [brandEdit, setBrandEdit] = useState(null);
  const [importing, setImporting] = useState(false);
  const [resumeImportDraftId, setResumeImportDraftId] = useState(null);
  const [importDrafts, setImportDrafts] = useState(() => (
    typeof window === 'undefined' ? [] : readReceiptImportDrafts(window.localStorage)
  ));
  const [imported, setImported] = useState([]);
  const [registryView, setRegistryView] = useState('active');
  const [registryPdfSync, setRegistryPdfSync] = useState({});
  const registryPdfSyncTimers = useRef(new Map());
  const registryPdfSyncNoticeTimers = useRef(new Map());
  const registryPdfSyncSequence = useRef({});
  const registryPdfSyncChains = useRef({});
  useEffect(() => {
    if (typeof window !== 'undefined') setImportDrafts(readReceiptImportDrafts(window.localStorage));
  }, []);
  useEffect(() => () => {
    registryPdfSyncTimers.current.forEach((timer) => clearTimeout(timer));
    registryPdfSyncTimers.current.clear();
    registryPdfSyncNoticeTimers.current.forEach((timer) => clearTimeout(timer));
    registryPdfSyncNoticeTimers.current.clear();
  }, []);
  const saveImportDraft = (draft) => {
    const next = upsertReceiptImportDraft(importDrafts, draft);
    if (typeof window === 'undefined' || !writeReceiptImportDrafts(window.localStorage, next)) {
      toast('Не удалось сохранить черновик в браузере. Освободите место и попробуйте снова.', 'err');
      return false;
    }
    setImportDrafts(next);
    setResumeImportDraftId(draft.id);
    return true;
  };
  const clearImportDraft = (draftId) => {
    if (!draftId) return;
    const next = removeReceiptImportDraft(importDrafts, draftId);
    if (typeof window === 'undefined' || !writeReceiptImportDrafts(window.localStorage, next)) {
      toast('Не удалось удалить черновик из хранилища браузера. Попробуйте ещё раз.', 'err');
      return;
    }
    setImportDrafts(next);
    setResumeImportDraftId((current) => current === draftId ? null : current);
  };
  const activeImportDraft = importDrafts.find((draft) => draft.id === resumeImportDraftId) || null;
  const continueImportDraft = (draftId) => {
    setResumeImportDraftId(draftId);
    setImporting(true);
  };
  const backendDocuments = documents
    .map((item) => item?.serverId ? item : toLegacyDocument(item, orders))
    .filter((document) => ['Маршрутная квитанция', 'Ваучер', 'Билет'].includes(document.type));
  const all = [...imported, ...backendDocuments]
    .filter((document, index, rows) => rows.findIndex((item) => String(item.serverId || item.no) === String(document.serverId || document.no)) === index)
    .map((document) => {
      const editorType = document.recType || serviceTypeFromBackend(document.service_kind, document.service_type,
        guessType(`${document.name || ''} ${document.service || ''}`));
      const stored = document.parsed || document.supplierBlank?.verified_data || document.supplier_original?.verified_data;
      const normalized = normalizeReceiptDraft(editorType, {
        ...(stored || {
          passenger: document.participant !== '—' ? document.participant : '',
          recognitionPending: true,
        }),
        crmOrderId: stored?.crmOrderId || document.orderId || '',
        crmOrderNo: stored?.crmOrderNo || (document.order !== '—' ? String(document.order) : ''),
        crmPersonId: stored?.crmPersonId || document.personId || '',
      });
      const storedTickets = receiptImportSubrows(editorType,
        stored?.groupTickets || stored?.receiptItems || stored?.receipt_items || stored?.receipts || stored?.railTickets);
      const boundCompany = companies.find((company) => String(company.id) === String(document.companyId || ''));
      const normalizedWithBinding = document.companyId && !normalized.crmOrderId && !normalized.crmPersonId
        ? normalizeReceiptDraft(editorType, {
          ...normalized,
          crmBindingMode: 'company',
          crmCompanyId: normalized.crmCompanyId || document.companyId,
          crmCompany: normalized.crmCompany || boundCompany?.name || boundCompany?.shortName || '',
        })
        : normalized;
      const parsed = storedTickets.length
        ? aggregateReceiptSubrows(normalizedWithBinding, storedTickets, editorType)
        : normalizedWithBinding;
      return {
        ...document,
        id: document.serverId || document.no,
        editorType,
        parsed,
        originalUrl: document.serverId ? documentsApi.supplierPreviewUrl(document.serverId) : document.supplierBlank?.originalUrl,
        sourceOriginalUrl: document.serverId ? documentsApi.supplierSourcePreviewUrl(document.serverId) : document.supplierBlank?.sourceOriginalUrl,
      };
    });
  const registryDraftCount = all.filter((document) => document.isReceiptDraft).length;
  const receipts = all.filter((document) => (
    registryView === 'drafts' ? document.isReceiptDraft : !document.isReceiptDraft
  )).filter((document) => {
    const details = receiptDetailsLines(document.editorType, document.parsed).join(' ');
    return !q || `${document.no} ${document.name} ${document.order} ${document.participant} ${details}`.toLowerCase().includes(q.toLowerCase());
  });

  const syncRegistrySupplierPdf = async (fileId, verifiedData, sequence) => {
    const previousNoticeTimer = registryPdfSyncNoticeTimers.current.get(fileId);
    if (previousNoticeTimer) clearTimeout(previousNoticeTimer);
    registryPdfSyncNoticeTimers.current.delete(fileId);
    setRegistryPdfSync((current) => ({ ...current, [fileId]: 'saving' }));
    try {
      const saved = await documentsApi.updateReceipt(fileId, {
        draft: false,
        verified_data: verifiedData,
        output_settings: verifiedData.output || { mode: 'original' },
        audit_log: verifiedData.auditLog || [],
        preview_sync: true,
      });
      if (registryPdfSyncSequence.current[fileId] !== sequence) return;
      let correction = saved?.supplier_pdf_correction || {};
      if (correction.status === 'queued' && correction.job_id) {
        correction = await waitForReceiptPdfJob(correction.job_id);
      }
      if (!['corrected', 'source'].includes(correction.status)) {
        setRegistryPdfSync((current) => ({ ...current, [fileId]: 'error' }));
        toast(receiptPdfCorrectionProblem(correction), 'err');
        return;
      }
      const revision = Date.now();
      setEdit((current) => current && String(current.id) === String(fileId) ? {
        ...current,
        originalUrl: freshSupplierDocumentUrl(documentsApi.supplierPreviewUrl(fileId)),
        supplierPdfRevision: revision,
        supplierPdfCorrection: correction,
      } : current);
      setRegistryPdfSync((current) => ({ ...current, [fileId]: 'saved' }));
      const noticeTimer = setTimeout(() => {
        registryPdfSyncNoticeTimers.current.delete(fileId);
        setRegistryPdfSync((current) => {
          if (current[fileId] !== 'saved') return current;
          const next = { ...current };
          delete next[fileId];
          return next;
        });
      }, PDF_SYNC_SUCCESS_NOTICE_MS);
      registryPdfSyncNoticeTimers.current.set(fileId, noticeTimer);
    } catch (error) {
      if (registryPdfSyncSequence.current[fileId] !== sequence) return;
      setRegistryPdfSync((current) => ({ ...current, [fileId]: 'error' }));
      toast(error.message || 'Не удалось обновить рабочую PDF-копию', 'err');
    }
  };
  const queueRegistrySupplierPdfSync = (fileId, verifiedData) => {
    const existing = registryPdfSyncTimers.current.get(fileId);
    if (existing) clearTimeout(existing);
    const sequence = (registryPdfSyncSequence.current[fileId] || 0) + 1;
    registryPdfSyncSequence.current[fileId] = sequence;
    setRegistryPdfSync((current) => ({ ...current, [fileId]: 'saving' }));
    const timer = setTimeout(() => {
      registryPdfSyncTimers.current.delete(fileId);
      const previous = registryPdfSyncChains.current[fileId] || Promise.resolve();
      const current = previous
        .catch(() => undefined)
        .then(() => syncRegistrySupplierPdf(fileId, verifiedData, sequence));
      registryPdfSyncChains.current[fileId] = current;
      void current.finally(() => {
        if (registryPdfSyncChains.current[fileId] === current) delete registryPdfSyncChains.current[fileId];
      });
    }, 700);
    registryPdfSyncTimers.current.set(fileId, timer);
  };
  const updateLocalReceipt = (fileId, parsed) => {
    const activeEdit = edit && String(edit.id) === String(fileId) ? edit : null;
    const supplierPdfChanged = activeEdit
      && receiptSupplierPdfFingerprint(activeEdit.parsed) !== receiptSupplierPdfFingerprint(parsed);
    editDirty.current = true;
    setEdit((current) => current && String(current.id) === String(fileId) ? { ...current, parsed } : current);
    if (supplierPdfChanged && activeEdit?.serverId) {
      queueRegistrySupplierPdfSync(activeEdit.serverId, parsed);
    }
    if (edit?.groupTicketIndex !== undefined) return;
    setImported((current) => {
      const source = all.find((row) => String(row.id) === String(fileId));
      if (!source) return current;
      const next = { ...source, parsed, recType: source.editorType, participant: parsed.passenger || source.participant };
      const exists = current.some((row) => String(row.serverId || row.no) === String(source.serverId || source.no));
      return exists
        ? current.map((row) => String(row.serverId || row.no) === String(source.serverId || source.no) ? next : row)
        : [next, ...current];
    });
  };
  const saveReceipt = async (fileId, parsed, asDraft = false) => {
    try {
      const groupEdit = edit && String(edit.id) === String(fileId) && edit.groupTicketIndex !== undefined;
      let verifiedData = parsed;
      if (groupEdit) {
        const tickets = [...(edit.groupParentParsed?.groupTickets || [])];
        tickets[edit.groupTicketIndex] = parsed;
        verifiedData = aggregateReceiptSubrows({
          ...edit.groupParentParsed,
          output: parsed.output || edit.groupParentParsed.output,
          crmBindingMode: parsed.crmBindingMode || edit.groupParentParsed.crmBindingMode,
          crmOrderId: parsed.crmOrderId || edit.groupParentParsed.crmOrderId,
          crmOrderNo: parsed.crmOrderNo || edit.groupParentParsed.crmOrderNo,
          crmPersonId: parsed.crmPersonId || edit.groupParentParsed.crmPersonId,
        }, tickets, edit.editorType);
      }
      const savedDocument = await documentsApi.updateReceipt(fileId, {
        draft: asDraft,
        verified_data: verifiedData,
        order: verifiedData.crmBindingMode === 'order' ? (verifiedData.crmOrderId || null) : null,
        person: verifiedData.crmBindingMode === 'person' ? (verifiedData.crmPersonId || null) : null,
        company: verifiedData.crmBindingMode === 'company' ? (verifiedData.crmCompanyId || null) : null,
        output_settings: verifiedData.output || { mode: 'original' },
        audit_log: verifiedData.auditLog || [],
      });
      if (asDraft) {
        const savedDraft = toLegacyDocument(savedDocument, orders);
        setImported((current) => [
          savedDraft,
          ...current.filter((row) => String(row.serverId || row.no) !== String(savedDraft.serverId || savedDraft.no)),
        ]);
      } else if (!groupEdit) {
        updateLocalReceipt(fileId, { ...verifiedData, recognitionPending: false });
      }
      editDirty.current = false;
      if (!asDraft) await onChanged?.();
      const supplierPdfCorrection = savedDocument?.supplier_pdf_correction;
      if (!asDraft && supplierPdfCorrection?.status === 'manual_required') {
        toast(receiptPdfCorrectionProblem(supplierPdfCorrection), 'err');
      } else if (!asDraft && supplierPdfCorrection?.status === 'corrected') {
        toast('Данные сохранены · суммы перенесены в копию оригинала поставщика с исходным шрифтом', 'ok');
      } else {
        toast(asDraft ? 'Черновик квитанции сохранён' : 'Проверенные данные и настройки бланка сохранены', 'ok');
      }
      return true;
    } catch (error) {
      toast(error.message || 'Не удалось сохранить квитанцию', 'err');
      return false;
    }
  };
  const closeReceiptEditor = () => {
    if (edit && editDirty.current) {
      setConfirmEditorClose(true);
      return;
    }
    setEdit(null);
  };
  const openGroupTicketEditor = (document, ticketIndex) => {
    const ticket = document.parsed.groupTickets[ticketIndex];
    const parsed = normalizeReceiptDraft(document.editorType, {
      ...ticket,
      output: document.parsed.output,
      crmBindingMode: document.parsed.crmBindingMode,
      crmOrderId: document.parsed.crmOrderId,
      crmOrderNo: document.parsed.crmOrderNo,
      crmPersonId: document.parsed.crmPersonId,
      crmCompanyId: document.parsed.crmCompanyId,
      crmCompany: document.parsed.crmCompany,
      groupTickets: [],
      receiptCount: 1,
    });
    editDirty.current = false;
    setEdit({
      ...document,
      parsed,
      groupParentParsed: document.parsed,
      groupTicketIndex: ticketIndex,
    });
  };
  useEffect(() => {
    if (!edit) return undefined;
    const guard = (event) => {
      if (!editDirty.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [edit]);

  const removeReceipt = async (document) => {
    if (!window.confirm(`Удалить «${document.name}» из CRM? Оригинальный файл будет помечен как аннулированный.`)) return;
    try {
      if (document.serverId) await documentsApi.void(document.serverId, 'Удалено оператором из редактора квитанций');
      setImported((current) => current.filter((row) => String(row.serverId || row.no) !== String(document.serverId || document.no)));
      await onChanged?.();
      toast('Документ удалён из активного реестра', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось удалить документ', 'err');
    }
  };

  return (
    <>
      <Topbar title="Редактор квитанций" />
      <div className="content">
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Единый реестр авиа, ЖД, отельных и трансферных документов. Исходный PDF хранится отдельно без изменений; финансовые правки переносятся в рабочую копию оригинала поставщика.
              </div>
            </div>
            <SearchBox value={q} onChange={setQ} placeholder="Документ, участник, маршрут…" style={{ width: 280 }} />
            <div className="seg-toggle" aria-label="Список квитанций">
              <button type="button" className={'seg-btn' + (registryView === 'active' ? ' active' : '')}
                onClick={() => setRegistryView('active')}>Рабочий список</button>
              <button type="button" className={'seg-btn' + (registryView === 'drafts' ? ' active' : '')}
                onClick={() => setRegistryView('drafts')}>Черновики ({registryDraftCount + importDrafts.length})</button>
            </div>
            <Button icon="download" onClick={() => {
              setResumeImportDraftId(null);
              setImporting(true);
            }}>Импорт документов</Button>
          </div>

          {registryView === 'drafts' && importDrafts.map((draft) => (
            <div className="receipt-import-draft-banner" key={draft.id}>
              <span className="receipt-import-draft-icon"><Icon name="save" /></span>
              <span>
                <b>{receiptImportDraftTitle(draft)}</b>
                <small>
                  Черновик импорта · {draft.files.length} {plural(draft.files.length, 'квитанция', 'квитанции', 'квитанций')} · сохранён {new Date(draft.savedAt).toLocaleString('ru-RU')}
                </small>
              </span>
              <Button size="sm" icon="edit" onClick={() => continueImportDraft(draft.id)}>Продолжить редактирование</Button>
              <Button size="sm" variant="ghost" onClick={() => {
                if (window.confirm(`Удалить черновик «${receiptImportDraftTitle(draft)}»? Загруженные оригиналы в CRM не удаляются.`)) {
                  clearImportDraft(draft.id);
                }
              }}>Удалить черновик</Button>
            </div>
          ))}

          {receipts.length ? (
            <div className="table-card receipt-registry-card" style={{ overflowX: 'auto' }}>
              <table className="tbl receipt-registry-table">
                <thead><tr><th>Документ</th><th>Детали услуги</th><th>Стоимость</th><th>Проверка</th><th>Операции</th></tr></thead>
                <tbody>
                  {receipts.map((d) => {
                    const t = recType(d.editorType);
                    const details = receiptDetailsLines(d.editorType, d.parsed);
                    const groupReviewCount = (d.parsed.groupTickets || []).filter(receiptBlankIsReviewed).length;
                    const recognition = d.isReceiptDraft
                      ? 'Черновик'
                      : d.parsed.groupTickets?.length && groupReviewCount === d.parsed.groupTickets.length
                        ? 'Проверено'
                      : d.parsed.manualCompletion
                        ? 'Заполнено вручную'
                        : receiptStatus(d.parsed, new Set(), d.editorType, null);
                    const statusCfg = REC_STATUS[recognition];
                    const clientTotal = receiptFinancialTotal(d.editorType, d.parsed);
                    const supplierTotal = Number(d.parsed.supplierCost || d.parsed.fare || d.supplierBlank?.total || 0);
                    const order = orders.find((row) => String(row.no) === String(d.order));
                    return (
                      <React.Fragment key={d.serverId || d.no}>
                      <tr className={d.parsed.groupTickets?.length ? 'has-subrows' : ''}>
                        <td data-label="Документ"><span className="rec-import-file">
                          <span className="rec-import-icon" style={{ background: t.color }}><Icon name={t.icon} /></span>
                          <span className="rec-import-main">
                            <span className="rec-import-title"><ReceiptParticipantSummary draft={d.parsed} noun={d.editorType === 'Гостиница' ? 'гостей' : 'пассажиров'} />
                              {!!d.parsed.groupTickets?.length && <button type="button" className="receipt-subrows-toggle"
                                aria-expanded={!!expandedRegistry[d.id]}
                                onClick={() => setExpandedRegistry((current) => ({ ...current, [d.id]: !current[d.id] }))}>
                                {expandedRegistry[d.id] ? 'Скрыть' : 'Показать'} бланки ({d.parsed.groupTickets.length})
                                <Icon name={expandedRegistry[d.id] ? 'chevUp' : 'chevDown'} />
                              </button>}
                            </span>
                            <span className="rec-import-meta">{d.editorType} · {d.no} · {d.name}</span>
                          </span>
                        </span></td>
                        <td data-label="Детали услуги"><span className="rec-import-details">{details.map((line, index) => <span key={index}>{line}</span>)}</span></td>
                        <td data-label="Стоимость"><b>{recMoney(clientTotal, d.parsed.currency)}</b>
                          <div className="rec-import-meta">закупка {supplierTotal ? recMoney(supplierTotal, d.parsed.currency) : 'не указана'}</div>
                          {!!Number(d.parsed.fees || d.parsed.agencyServiceFee) && <div className="rec-import-meta">сбор {recMoney(Number(d.parsed.fees || d.parsed.agencyServiceFee), d.parsed.currency)}</div>}
                        </td>
                        <td data-label="Проверка"><Pill tone={statusCfg.tone}>{recognition}</Pill>
                          {!!d.parsed.groupTickets?.length && <div className="rec-import-meta">Проверено {groupReviewCount} из {d.parsed.groupTickets.length}</div>}
                          <div className="rec-import-meta">v{d.version || 1} · {d.date || '—'}</div>
                        </td>
                        <td data-label="Операции"><div className="rec-import-actions">
                          <Button size="sm" variant="ghost" onClick={() => { editDirty.current = false; setEdit(d); }}>{d.isReceiptDraft ? 'Продолжить черновик' : recognition === 'Требует проверки' ? 'Проверить' : 'Изменить'}</Button>
                          {d.originalUrl && <Button size="sm" variant="ghost" icon="eye" onClick={() => window.open(freshSupplierDocumentUrl(d.originalUrl), '_blank', 'noopener,noreferrer')}>Оригинал с правками</Button>}
                          {d.sourceOriginalUrl && <Button size="sm" variant="ghost" onClick={() => window.open(inlineSupplierDocumentUrl(d.sourceOriginalUrl), '_blank', 'noopener,noreferrer')}>Исходный</Button>}
                          <Button size="sm" variant="ghost" icon="template" onClick={() => setBrandEdit(receiptBrandFileForBlank(d, 0))}>На бланке</Button>
                          {order && <Button size="sm" variant="ghost" icon="orders" onClick={() => onOpenOrder?.(order, 'documents')}>Заказ</Button>}
                          <Button size="sm" variant="ghost" icon="trash" onClick={() => removeReceipt(d)}>Удалить</Button>
                        </div></td>
                      </tr>
                      {expandedRegistry[d.id] && (d.parsed.groupTickets || []).map((ticket, ticketIndex) => {
                        const ticketLeg = ticket.legs?.[0] || {};
                        return (
                          <tr key={`${d.serverId || d.no}-ticket-${ticketIndex}`} className="receipt-registry-subrow">
                            <td data-label="Билет">
                              <span className="rec-import-subrow-document">
                                <span className="rec-import-subrow-branch" aria-hidden="true">↳</span>
                                <span>
                                  <b>Билет {ticketIndex + 1} из {d.parsed.groupTickets.length}</b>
                                  <span>{ticket.passenger}</span>
                                  <span>№ {ticket.ticketNo}</span>
                                </span>
                              </span>
                            </td>
                            <td data-label="Маршрут"><span className="rec-import-details">
                              <span>{routeSummary(ticket)}</span>
                              <span>{ticketLeg.date} · {ticketLeg.dep}–{ticketLeg.arr}</span>
                              <span>Поезд {ticketLeg.flightNo} · вагон {ticketLeg.coach} · место {ticketLeg.seat}</span>
                            </span></td>
                            <td data-label="Стоимость"><span className="rec-import-subrow-cost">
                              <b>{recSourceMoney(ticket)}</b>
                              <span>Билет: {recMoney(Number(ticket.ticketCost) || 0, ticket.currency)}</span>
                              <span>Плацкарта: {recMoney(Number(ticket.reservedSeatCost) || 0, ticket.currency)}</span>
                            </span></td>
                            <td data-label="Проверка"><Pill tone={receiptBlankIsReviewed(ticket) ? 'green' : 'amber'}>
                              {receiptBlankIsReviewed(ticket) ? 'Проверено' : 'Не проверено'}
                            </Pill></td>
                            <td data-label="Операции"><Button size="sm" variant="ghost" onClick={() => openGroupTicketEditor(d, ticketIndex)}>Изменить бланк</Button>
                              <Button size="sm" variant="ghost" icon="template" onClick={() => setBrandEdit(receiptBrandFileForBlank(d, ticketIndex))}>На бланке</Button></td>
                          </tr>
                        );
                      })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : registryView === 'drafts' && importDrafts.length ? null : <EmptyState icon={registryView === 'drafts' ? 'save' : 'route'}
            title={registryView === 'drafts' ? 'Черновики не найдены' : 'Документы не найдены'}
            sub={registryView === 'drafts' ? 'Сохранённые черновики появятся в этом списке.' : 'Импортируйте авиа, ЖД, отельный или трансферный документ.'} />}
        </div>
      </div>

      <ReceiptEditDrawer open={!!edit} file={edit ? { ...edit, type: edit.editorType } : null} onClose={closeReceiptEditor}
        onChange={updateLocalReceipt} onReview={(fileId, parsed) => saveReceipt(fileId, parsed, false)}
        pdfSyncStatus={edit ? registryPdfSync[edit.serverId || edit.id] : ''}
        orders={orders} services={services} companies={companies}
        onBrand={(blankIndex) => { setBrandEdit(receiptBrandFileForBlank(edit, blankIndex)); }} />

      <ReceiptBrandDocumentDrawer open={!!brandEdit} type={brandEdit?.editorType} draft={brandEdit?.parsed}
        originalUrl={brandEdit?.originalUrl} sourceOriginalUrl={brandEdit?.sourceOriginalUrl}
        onClose={() => setBrandEdit(null)} />

      <ReceiptImportModal open={importing} initialDraft={activeImportDraft}
        orders={orders} companies={companies} clients={clients} onCreateOrder={onCreateOrder}
        onClose={() => {
          setImporting(false);
        }}
        onDraftSaved={saveImportDraft} onDraftCleared={clearImportDraft}
        onDone={async (docs) => {
          setImported((cur) => [...docs, ...cur]);
          setImporting(false);
          setResumeImportDraftId(null);
          await onChanged?.();
        }} />
      <ConfirmDialog open={confirmEditorClose} title="Сохранить изменения?"
        message="В квитанции есть несохранённые изменения. Сохраните их как черновик, чтобы продолжить позже."
        confirmLabel="Сохранить черновик" confirmVariant="primary"
        onCancel={() => setConfirmEditorClose(false)}
        onConfirm={async () => {
          if (!edit) return;
          const current = edit;
          const saved = await saveReceipt(current.id, current.parsed, true);
          if (saved) {
            setConfirmEditorClose(false);
            setEdit(null);
          }
        }} />
    </>
  );
}




function FulfillmentRegistry({ onOpenOrder, rows = [], orders = [] }) {
  const [cat, setCat] = useState('payment');
  const CATS = [
    { key: 'payment', label: 'Требуют оплаты', icon: 'finance' },
    { key: 'docs', label: 'Нет документов', icon: 'docs' },
    { key: 'overdue', label: 'Просрочено', icon: 'clock' },
    { key: 'return', label: 'Возвраты в обработке', icon: 'refund' },
  ];
  const shownRows = rows.filter((r) => r.cat === cat);
  const goOrder = (no, client) => { const o = orders.find((x) => x.no === no) || { no, client, requestType: 'Индивидуальная', status: 'В работе', operator: 'Не назначен', date: new Date().toLocaleDateString('ru-RU') }; onOpenOrder(o); };

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {CATS.map((c) => {
          const n = rows.filter((r) => r.cat === c.key).length;
          const overdue = c.key === 'overdue' || rows.some((r) => r.cat === c.key && r.overdue);
          return (
            <div key={c.key} className="stat-card" style={{ cursor: 'pointer', borderColor: cat === c.key ? 'var(--blue)' : 'var(--line)', boxShadow: cat === c.key ? '0 0 0 3px var(--blue-soft)' : 'var(--shadow-card)' }} onClick={() => setCat(c.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Icon name={c.icon} style={{ width: 18, height: 18, color: cat === c.key ? 'var(--blue)' : 'var(--muted-2)' }} /><span className="s-label" style={{ margin: 0 }}>{c.label}</span></div>
              <div className="s-value" style={c.key === 'overdue' && n ? { color: 'var(--red)' } : null}>{n}</div>
            </div>
          );
        })}
      </div>

      <div className="table-card">
        {shownRows.length ? (
          <table className="tbl">
            <thead><tr><th>Заказ</th><th>Клиент</th><th>Действие</th><th>Сумма</th><th>Срок</th><th>Ответственный</th><th></th></tr></thead>
            <tbody>
              {shownRows.map((r, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => goOrder(r.order, r.client)}>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 700 }}>№ {r.order}</span></td>
                  <td className="t-strong">{r.client}</td>
                  <td>{r.detail}</td>
                  <td className="t-strong">{r.amount}</td>
                  <td><span style={r.overdue ? { color: 'var(--red)', fontWeight: 600 } : null}>{r.due}</span></td>
                  <td>{r.resp}</td>
                  <td onClick={(e) => e.stopPropagation()}><Button variant="secondary" size="sm" iconRight="chevRight" onClick={() => goOrder(r.order, r.client)}>В заказ</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="checkCircle" title="Здесь чисто" sub="Нет задач в этой категории" />}
      </div>
    </div>
  );
}

function FulfillmentPage({ onOpenOrder, orders = [], documents = [], returns = [] }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    financeApi.obligations({}, controller.signal).then((payload) => {
      const obligations = resultsOf(payload).filter((item) => ['open', 'partial'].includes(item.status) && Number(item.outstanding || 0) > 0);
      const paymentRows = obligations.map((item) => {
        const order = orders.find((entry) => entry.id === item.order);
        const overdue = Boolean(item.due_date && new Date(`${item.due_date}T23:59:59`) < new Date());
        return {
          cat: overdue ? 'overdue' : 'payment', order: order?.no || item.order_number || String(item.order || '').slice(0, 8),
          client: item.client_name || item.supplier_name || order?.client || 'Контрагент',
          detail: item.direction === 'supplier_payable' ? 'Оплатить поставщику' : 'Получить оплату от клиента',
          amount: fUsd(Number(item.outstanding || 0), item.currency), due: item.due_date ? item.due_date.split('-').reverse().join('.') : '—',
          resp: order?.operator || 'Не назначен', overdue,
        };
      });
      const documented = new Set(documents.map((item) => item.order).filter(Boolean));
      const documentRows = orders.filter((order) => order.services > 0 && !documented.has(order.id)).map((order) => ({
        cat: 'docs', order: order.no, client: order.client, detail: 'Подготовить документы по услугам',
        amount: fUsd(order.sum || 0, order.currency), due: order.planned_start ? String(order.planned_start).split('-').reverse().join('.') : '—',
        resp: order.operator, overdue: false,
      }));
      const returnRows = returns.filter((item) => !['executed', 'cancelled', 'closed'].includes(item.status)).map((item) => {
        const order = orders.find((entry) => entry.id === item.order);
        return { cat: 'return', order: order?.no || String(item.order || '').slice(0, 8), client: order?.client || 'Клиент', detail: item.reason || 'Возврат в обработке', amount: fUsd(Number(item.refund_amount || item.client_refund || 0), item.currency || 'USD'), due: item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : '—', resp: order?.operator || 'Не назначен', overdue: false };
      });
      setRows([...paymentRows, ...documentRows, ...returnRows]);
    }).catch((error) => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, [documents, orders, returns]);
  return (<><Topbar title="Оформление" /><div className="content"><FulfillmentRegistry onOpenOrder={onOpenOrder} rows={rows} orders={orders} /></div></>);
}

Object.assign(window, {
  OrderStageBar, FinanceOpCard, FinanceRegistry, FinancePageNew,
  DocCard, DocCenter, DocCenterPage, DocUploadModal, ReceiptEditorPage, FulfillmentRegistry, FulfillmentPage,
  fUsd, finPayable, finDebt,
});



export { fUsd, finPayable, finDebt, companyForDoc, OrderStageBar, FinanceOpCard, FinanceRegistry, FinancePageNew, DOC_BOOKKEEPING, now, DocPreviewModal, DocCard, DocPassengerGroup, correctionSubjects, DOC_UPLOAD_TYPES, DocUploadModal, DocCenter, DocCenterPage, REC_TYPES, recType, RECOG_STEPS, TRIP_TYPES, tripLabel, legCode, routeSummary, RID, emptyReceiptParse, guessType, recMoney, recComputed, LegLine, RouteView, RSub, ReceiptPreview, ReceiptEditForm, REC_STATUS, receiptStatus, ReceiptEditDrawer, ReceiptMathDrawer, ReceiptImportModal, ReceiptEditorPage, FulfillmentRegistry, FulfillmentPage };
