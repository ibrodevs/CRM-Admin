import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { aftersalesApi, documentsApi, workspaceActionsApi } from './api/resources';
import { toLegacyReturn } from './api/legacy-adapters';
import { resultsOf } from './api/client';
import { ActionMenu, Button, Checkbox, ConfirmDialog, DateField, Drawer, EmptyState, Field, FilterChip, Input, Pill, SearchBox, Select, Th, fmtDate, useSort, useToast } from './ui';
import { DOC_STATUS2, ORDERS, ORDER_PARTICIPANTS, ORDER_SERVICES, RETURNS, RETURN_FLOW, RETURN_STATUS, RETURN_TYPE } from './data';
import { Topbar } from './layout';
import { AirportField } from './page_flights';




function rUsd(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }
function calcRefund(fin) { return Math.max(0, fin.original - fin.supplierPenalty - fin.serviceFee - fin.extraHold); }
const isTerminal = (s) => s === 'Отменено' || s === 'Отклонено';
const nextStatus = (s) => { const i = RETURN_FLOW.indexOf(s); return i >= 0 && i < RETURN_FLOW.length - 1 ? RETURN_FLOW[i + 1] : s; };


function ProcessFlow({ steps, current }) {
  const idx = steps.indexOf(current);
  return (
    <div className="stage-bar">
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : '';
        return (
          <React.Fragment key={s}>
            {i > 0 && <span className={'stage-line' + (i <= idx ? ' done' : '')} />}
            <div className={'stage ' + state}>
              <span className="dot">{i < idx ? <Icon name="check" strokeWidth={3} /> : i + 1}</span>
              <span className="lbl">{s}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}


function NewReturnModal({ open, order, services, participants = [], onClose, onCreate }) {
  const toast = useToast();
  const [type, setType] = useState('Возврат билета');
  const [svc, setSvc] = useState('');
  const [reason, setReason] = useState('');
  const [voluntary, setVoluntary] = useState(true);
  const [pax, setPax] = useState([]);
  const [docs, setDocs] = useState([]);
  const [nf, setNf] = useState({ from: '', to: '', date: null, flightNo: '' });
  const [reqMode, setReqMode] = useState('request');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (open) { setType('Возврат билета'); setSvc(''); setReason(''); setVoluntary(true); setPax([]); setDocs([]); setNf({ from: '', to: '', date: null, flightNo: '' }); setReqMode('request'); setConfirm(false); } }, [open]);
  if (!open) return null;

  const roster = (participants && participants.length
    ? participants
    : (order && order.participants && order.participants.length ? order.participants : ORDER_PARTICIPANTS)
  ).map((p) => (typeof p === 'string' ? { name: p, role: '' } : { ...p, id: p.serverId || p.id, name: p.name || p.person_name || p.guest_snapshot?.name || 'Участник' }));
  const availableServices = services && services.length ? services : ORDER_SERVICES;
  const serviceOptions = availableServices.map((s) => {
    const id = s.serverId || s.id;
    return { value: String(id), label: `${s.kind} · ${s.title}` };
  });
  const base = availableServices.find((s) => String(s.serverId || s.id) === String(svc));
  const original = base ? base.sum : 0;
  const isRefund = type === 'Возврат билета';
  const isExchange = type === 'Обмен билета';
  const isAnnul = type === 'Аннуляция бронирования';
  const needsPax = isRefund || isExchange;
  const paxCount = Math.max(1, pax.length || (needsPax ? 0 : 1));
  const perUnit = original / Math.max(1, roster.length);
  const scoped = needsPax && pax.length ? Math.round(perUnit * pax.length) : original;
  const penalty = isAnnul ? scoped : (voluntary ? Math.round(scoped * 0.2) : 0);
  const fee = type === 'Оформление справки' ? 10 : (voluntary || isAnnul ? 14 : 0);
  const refund = Math.max(0, scoped - penalty - fee);
  const togglePax = (i) => setPax((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const addDoc = () => setDocs((d) => [...d, { name: 'Документ ' + (d.length + 1) + '.pdf' }]);


  const validate = () => {
    if (!svc) { toast('Выберите услугу заказа', 'err'); return false; }
    if (needsPax && !pax.length) { toast('Выберите, на кого оформляется ' + (isExchange ? 'обмен' : 'возврат'), 'err'); return false; }
    if (isRefund && !voluntary && !docs.length) { toast('Приложите документ-основание для вынужденного возврата', 'err'); return false; }
    if (isExchange && (!nf.to || !nf.date)) { toast('Заполните новый рейс (направление и дату)', 'err'); return false; }
    return true;
  };
  const submit = () => {
    onCreate({ type, serviceId: svc, serviceLabel: serviceOptions.find((item) => item.value === svc)?.label || svc, reason, original, penalty, fee, refund, voluntary,
      participantIds: pax.map((i) => roster[i].id).filter(Boolean), participants: pax.map((i) => roster[i].name), docs: docs.map((d) => d.name),
      newFlight: isExchange ? nf : null, reqMode: isExchange ? reqMode : null });
  };

  const confirmMsg = isAnnul
    ? 'Бронирование по услуге «' + svc + '» будет аннулировано. Действие необратимо.'
    : isExchange
      ? (reqMode === 'request' ? 'Будет отправлен запрос на обмен авиакомпании' : 'Обмен будет проведён') + ' для ' + pax.length + ' пасс. Новый рейс: ' + (nf.from || '—') + ' → ' + (nf.to || '—') + '.'
      : 'Будет создан ' + (voluntary ? 'добровольный' : 'вынужденный') + ' возврат для ' + pax.length + ' пасс. на сумму ' + rUsd(refund) + '.';

  return (
    <>
    <Drawer open={open} onClose={onClose} title="Новый запрос" sub={order ? `Заказ № ${order.no} · ${order.client}` : 'Постпродажное обслуживание'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon={isAnnul ? 'trash' : 'plus'} variant={isAnnul ? 'danger' : 'primary'} disabled={!svc} onClick={() => { if (validate()) setConfirm(true); }}>
          {isExchange ? (reqMode === 'request' ? 'Запросить обмен' : 'Провести обмен') : isAnnul ? 'Аннулировать' : 'Создать запрос'}
        </Button>
      </>}>
        <div className="kp-sec-h" style={{ marginTop: 0 }}>Тип операции</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {Object.keys(RETURN_TYPE).map((t) => (
            <button key={t} className="add-svc-card" style={{ flexDirection: 'row', justifyContent: 'flex-start', gap: 12, borderColor: type === t ? 'var(--blue)' : 'var(--line)', background: type === t ? 'var(--blue-soft)' : '#fff' }} onClick={() => setType(t)}>
              <span className="ic" style={{ width: 36, height: 36, background: 'var(--blue)' }}><Icon name={RETURN_TYPE[t].icon} style={{ width: 18, height: 18 }} /></span>
              <span className="nm">{t}</span>
            </button>
          ))}
        </div>
        <Field label="Услуга"><Select placeholder="Выберите услугу заказа" options={serviceOptions} value={svc} onChange={(e) => setSvc(e.target.value)} /></Field>


        {(isRefund || isExchange) && (
          <>
            <div className="kp-sec-h">Характер {isExchange ? 'обмена' : 'возврата'}</div>
            <div className="seg-toggle" style={{ maxWidth: 360 }}>
              <button className={'seg-btn' + (voluntary ? ' active' : '')} onClick={() => setVoluntary(true)}>Добровольный</button>
              <button className={'seg-btn' + (!voluntary ? ' active' : '')} onClick={() => setVoluntary(false)}>Вынужденный</button>
            </div>
          </>
        )}


        {needsPax && (
          <>
            <div className="kp-sec-h">На кого оформляется {isExchange ? 'обмен' : 'возврат'}</div>
            <label className="hp-check-row" style={{ marginBottom: 6 }}>
              <Checkbox on={pax.length === roster.length} onChange={() => setPax(pax.length === roster.length ? [] : roster.map((_, i) => i))} />
              <span className="hp-check-label" style={{ flex: 1, fontWeight: 600 }}>Выбрать всех ({roster.length})</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roster.map((p, i) => (
                <label key={i} className="hp-check-row" style={{ border: '1px solid ' + (pax.includes(i) ? 'var(--blue)' : 'var(--line)'), borderRadius: 10, padding: '8px 12px' }}>
                  <Checkbox on={pax.includes(i)} onChange={() => togglePax(i)} />
                  <span className="hp-check-label" style={{ flex: 1 }}>{p.name}</span>
                  {p.role && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.role}</span>}
                </label>
              ))}
            </div>
          </>
        )}


        {isRefund && !voluntary && (
          <>
            <div className="kp-sec-h">Документы-основания</div>
            <div className="card" style={{ padding: 14, borderLeft: '3px solid var(--amber)', background: 'var(--amber-soft, #fff8ec)', marginBottom: 10, display: 'flex', gap: 10 }}>
              <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--body)' }}>Приложите справки/подтверждающие документы. <b>Ознакомьтесь с правилами авиакомпании по документам</b> для вынужденного возврата (мед. справка, свидетельство и т.п.).</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px' }}>
                  <Icon name="docs" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDocs((x) => x.filter((_, j) => j !== i))}><Icon name="trash" /></button>
                </div>
              ))}
              <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)', width: '100%' }} onClick={addDoc}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" style={{ width: 16, height: 16 }} />Загрузить документ</span>
              </button>
            </div>
          </>
        )}


        {isExchange && (
          <>
            <div className="card" style={{ padding: 12, borderLeft: '3px solid var(--amber)', marginTop: 8, display: 'flex', gap: 10 }}>
              <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--body)' }}>Проверьте <b>правила авиакомпании по обмену</b>: допустимость изменения даты/маршрута, сбор за обмен и разница тарифа зависят от условий применённого тарифа.</div>
            </div>
            <div className="kp-sec-h">Новый рейс для запроса обмена</div>
            <div className="svcp-search-bar" style={{ flexWrap: 'wrap', gap: 10 }}>
              <AirportField label="Откуда" value={nf.from} onChange={(v) => setNf((s) => ({ ...s, from: v }))} />
              <AirportField label="Куда" value={nf.to} onChange={(v) => setNf((s) => ({ ...s, to: v }))} />
              <div className="av-field" style={{ minWidth: 150 }}><DateField label="Дата вылета" value={nf.date} onChange={(d) => setNf((s) => ({ ...s, date: d }))} placeholder="Выбрать" /></div>
              <div className="av-field" style={{ minWidth: 140 }}><span className="label">Рейс (если известен)</span><Input value={nf.flightNo} onChange={(e) => setNf((s) => ({ ...s, flightNo: e.target.value }))} placeholder="напр. KC 132" /></div>
            </div>
            <div className="kp-sec-h">Как оформить</div>
            <div className="seg-toggle" style={{ maxWidth: 420 }}>
              <button className={'seg-btn' + (reqMode === 'request' ? ' active' : '')} onClick={() => setReqMode('request')}>Запросить у авиакомпании</button>
              <button className={'seg-btn' + (reqMode === 'now' ? ' active' : '')} onClick={() => setReqMode('now')}>Провести сразу</button>
            </div>
          </>
        )}

        <div style={{ height: 12 }} />
        <Field label="Причина обращения"><Input placeholder="Кратко опишите причину…" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>

        {svc && type !== 'Оформление справки' && (
          <div className="card card-pad" style={{ margin: '16px 0 4px', background: 'var(--surface-2)' }}>
            <div className="amt-row"><span className="k">{needsPax && pax.length ? 'Стоимость выбранных (' + pax.length + ')' : 'Первоначальная стоимость'}</span><span className="v">{rUsd(scoped)}</span></div>
            <div className="amt-row minus"><span className="k">Предв. штраф поставщика</span><span className="v">− {rUsd(penalty)}</span></div>
            <div className="amt-row minus"><span className="k">Сервисный сбор</span><span className="v">− {rUsd(fee)}</span></div>
            <div className="amt-row total"><span className="k">{isExchange ? 'Предв. доплата/возврат' : 'Предв. сумма к возврату'}</span><span className="v">{rUsd(refund)}</span></div>
          </div>
        )}

    </Drawer>


      <ConfirmDialog open={confirm} title={'Подтвердите: ' + type + '?'} message={confirmMsg}
        confirmLabel={isAnnul ? 'Аннулировать' : isExchange ? (reqMode === 'request' ? 'Запросить' : 'Провести') : 'Создать'}
        confirmVariant={isAnnul ? 'danger' : 'primary'}
        onConfirm={() => { setConfirm(false); submit(); }} onCancel={() => setConfirm(false)} />
    </>
  );
}


function ReturnCard({ op, onBack, onChange }) {
  const toast = useToast();
  const meta = RETURN_TYPE[op.type] || RETURN_TYPE['Возврат билета'];
  const refund = calcRefund(op.fin);
  const isExchange = op.type === 'Обмен билета';
  const terminal = isTerminal(op.status);


  const [confirm, setConfirm] = useState(null);
  const [documents, setDocuments] = useState(op.documents || []);
  const [history, setHistory] = useState(op.history || []);
  const [comment, setComment] = useState('');
  const fileRef = useRef(null);
  useEffect(() => {
    if (!op.serverId) return undefined;
    const controller = new AbortController();
    Promise.all([
      aftersalesApi.documents(op.serverId, controller.signal),
      aftersalesApi.history(op.serverId, controller.signal),
      workspaceActionsApi.list({ action: 'service.aftersale.comment', resource_type: 'AfterSaleCase', resource_id: op.serverId }, controller.signal),
    ]).then(([docs, events, comments]) => {
      setDocuments((docs || []).map((doc) => ({ ...doc, name: doc.title, kind: doc.kind, v: doc.current_version, status: doc.status })));
      const rows = (events || []).map((event) => ({ t: new Date(event.created_at).toLocaleString('ru-RU'), who: event.actor || 'Система', text: event.details?.reason || event.action }));
      const notes = (comments || []).map((row) => ({ t: new Date(row.created_at).toLocaleString('ru-RU'), who: 'Сотрудник', text: row.payload?.comment || '' }));
      setHistory([...rows, ...notes].sort((a, b) => String(a.t).localeCompare(String(b.t))));
    }).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); });
    return () => controller.abort();
  }, [op.serverId]);

  const uploadDocument = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      const created = await documentsApi.upload(file, { order: op.orderId, service: op.service || null, kind: 'other', title: file.name, source: 'upload', metadata: { aftersale_case: op.serverId } });
      setDocuments((current) => [...current, { ...created, name: created.title, kind: created.kind, v: created.current_version, status: created.status }]);
      toast('Документ загружен', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const generateCertificate = async () => {
    try {
      const created = await documentsApi.create({ order: op.orderId, service: op.service || null, kind: 'certificate', title: `Справка ${op.no}`, source: 'generated', metadata: { aftersale_case: op.serverId } });
      await documentsApi.generate(created.id, { context: { case_number: op.no, type: op.type } });
      const refreshed = await aftersalesApi.documents(op.serverId);
      setDocuments(refreshed.map((doc) => ({ ...doc, name: doc.title, kind: doc.kind, v: doc.current_version, status: doc.status })));
      toast('Справка сформирована', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const addComment = async () => {
    const value = comment.trim(); if (!value) return;
    try {
      const row = await workspaceActionsApi.execute('service.aftersale.comment', { resourceType: 'AfterSaleCase', resourceId: op.serverId, payload: { comment: value } });
      setHistory((current) => [...current, { t: new Date(row.created_at).toLocaleString('ru-RU'), who: 'Сотрудник', text: value }]);
      setComment(''); toast('Комментарий добавлен', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const ask = (title, message, onConfirm, confirmLabel = 'Подтвердить', confirmVariant = 'danger') => setConfirm({ title, message, onConfirm, confirmLabel, confirmVariant });
  const setStatus = (s) => onChange(op.no, { status: s }, `Статус изменён: ${s}`);
  const doAdvance = async () => {
    const ns = nextStatus(op.status);
    if (ns === 'Завершено') {
      const updated = await onChange(op.no, { status: 'Завершено' },
        isExchange ? 'Обмен переоформлен · заказ обновлён' : 'Возврат исполнен · создана фин. операция «Возврат»');
      if (updated) toast(isExchange ? 'Обмен переоформлен, заказ обновлён' : `Создана фин. операция «Возврат» на ${rUsd(refund)} · задолженность обновлена`, 'ok');
    } else {
      const updated = await onChange(op.no, { status: ns }, `Статус: ${ns}`);
      if (updated) toast('Статус: ' + updated.status, 'info');
    }
  };

  const advance = () => {
    const ns = nextStatus(op.status);
    if (ns === 'Завершено') {
      ask(isExchange ? 'Переоформить обмен?' : 'Исполнить возврат?',
        isExchange ? 'Обмен будет переоформлен, заказ обновлён. Действие необратимо.' : `Будет создана фин. операция «Возврат» на ${rUsd(refund)}. Действие необратимо.`,
        doAdvance, isExchange ? 'Переоформить' : 'Исполнить', 'primary');
    } else { doAdvance(); }
  };
  const primaryLabel = {
    'Создано': 'Отправить на проверку', 'На проверке': 'Запросить согласование',
    'Ожидает согласования клиента': 'Согласовано клиентом', 'Передано поставщику': 'Взять в обработку',
    'В обработке': isExchange ? 'Переоформить' : 'Исполнить возврат',
  }[op.status];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Возвраты и обмены / {op.no}</span>
      </div>


      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <span className="oc-svc-ic" style={{ background: op.status === 'Завершено' ? 'var(--green)' : terminal ? 'var(--red)' : 'var(--blue)' }}><Icon name={meta.icon} /></span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 className="card-title">{op.type}</h2>
            <ActionMenu trigger={<button style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pill tone={RETURN_STATUS[op.status]}>{op.status}</Pill><Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} /></button>}
              items={Object.keys(RETURN_STATUS).map((s) => ({ icon: op.status === s ? 'check' : null, label: s, onClick: () => setStatus(s) }))} />
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{op.no} · {op.service} · заказ № {op.order}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Дедлайн исполнения</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>{op.deadline}</div>
        </div>
        {!terminal && primaryLabel && <Button icon="arrowRight" onClick={advance}>{primaryLabel}</Button>}
        {!terminal && <ActionMenu trigger={<button className="btn btn-secondary btn-icon"><Icon name="more" /></button>}
          items={[
            { icon: 'x', label: 'Отклонить', danger: true, onClick: () => ask('Отклонить запрос?', 'Запрос ' + op.no + ' будет отклонён. Дальнейшие действия по нему станут недоступны.', () => setStatus('Отклонено'), 'Отклонить') },
            { icon: 'trash', label: 'Отменить', danger: true, onClick: () => ask('Отменить операцию?', 'Операция ' + op.no + ' будет отменена. Действие необратимо.', () => setStatus('Отменено'), 'Отменить') },
          ]} />}
      </div>

      {terminal ? (
        <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--red-bg)' }}>
          <Icon name="alertCircle" style={{ width: 22, height: 22, color: 'var(--red)' }} />
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Операция {op.status.toLowerCase()}. Дальнейшие действия недоступны.</div>
        </div>
      ) : (
        <div className="card card-pad" style={{ marginBottom: 18 }}><ProcessFlow steps={RETURN_FLOW} current={op.status} /></div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>

        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Общая информация</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Заказ</span><span className="v" style={{ color: 'var(--blue)' }}>№ {op.order}</span></div>
            <div className="kv-row"><span className="k">Клиент</span><span className="v">{op.client}</span></div>
            <div className="kv-row"><span className="k">Услуга</span><span className="v">{op.service}</span></div>
            <div className="kv-row"><span className="k">Поставщик</span><span className="v">{op.supplier}</span></div>
            <div className="kv-row"><span className="k">Инициатор запроса</span><span className="v">{op.initiator}</span></div>
            <div className="kv-row"><span className="k">Ответственный</span><span className="v">{op.resp}</span></div>
            <div className="kv-row"><span className="k">Участники</span><span className="v">{op.participants.join(', ')}</span></div>
          </div>
        </div>


        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Финансовый расчёт</h3>
          <div className="amt-row"><span className="k">Первоначальная стоимость</span><span className="v">{rUsd(op.fin.original, op.currency)}</span></div>
          <div className="amt-row minus"><span className="k">Штраф поставщика</span><span className="v">− {rUsd(op.fin.supplierPenalty, op.currency)}</span></div>
          <div className="amt-row minus"><span className="k">Сервисный сбор</span><span className="v">− {rUsd(op.fin.serviceFee, op.currency)}</span></div>
          {op.fin.extraHold > 0 && <div className="amt-row minus"><span className="k">Дополнительные удержания</span><span className="v">− {rUsd(op.fin.extraHold, op.currency)}</span></div>}
          {isExchange ? (
            <div className="amt-row total"><span className="k">{op.exchange.diff >= 0 ? 'Доплата клиента' : 'К возврату клиенту'}</span><span className="v" style={{ color: op.exchange.diff >= 0 ? 'var(--ink)' : 'var(--green)' }}>{rUsd(Math.abs(op.exchange.diff), op.currency)}</span></div>
          ) : (
            <div className="amt-row total"><span className="k">Сумма к возврату</span><span className="v" style={{ color: 'var(--green)' }}>{rUsd(refund, op.currency)}</span></div>
          )}
          {op.status === 'Завершено' && op.finOp && <div style={{ marginTop: 10 }}><span className="link-chip"><Icon name="finance" />Фин. операция {op.finOp}</span></div>}
        </div>
      </div>


      {isExchange && (
        <>
          <h3 className="section-title" style={{ fontSize: 20, margin: '26px 0 14px' }}>Параметры обмена</h3>
          <div className="grid-2" style={{ alignItems: 'stretch' }}>
            <div className="card card-pad" style={{ borderColor: 'var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Pill tone="gray">Старый вариант</Pill></div>
              <div className="kv">
                <div className="kv-row"><span className="k">Маршрут</span><span className="v">{op.exchange.oldP.route}</span></div>
                <div className="kv-row"><span className="k">Даты</span><span className="v">{op.exchange.oldP.date}</span></div>
                <div className="kv-row"><span className="k">Тариф</span><span className="v">{op.exchange.oldP.fare}</span></div>
                <div className="kv-row"><span className="k">Стоимость</span><span className="v">{rUsd(op.exchange.oldP.price)}</span></div>
              </div>
            </div>
            <div className="card card-pad" style={{ borderColor: 'var(--blue)', boxShadow: '0 0 0 3px var(--blue-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Pill tone="blue">Новый вариант</Pill>
                <Button variant="ghost" size="sm" icon="search" onClick={() => window.__toastNav && window.__toastNav('services')}>Подобрать</Button>
              </div>
              <div className="kv">
                <div className="kv-row"><span className="k">Маршрут</span><span className="v">{op.exchange.newP.route}</span></div>
                <div className="kv-row"><span className="k">Даты</span><span className="v">{op.exchange.newP.date}</span></div>
                <div className="kv-row"><span className="k">Тариф</span><span className="v">{op.exchange.newP.fare}</span></div>
                <div className="kv-row"><span className="k">Стоимость</span><span className="v">{rUsd(op.exchange.newP.price)}</span></div>
              </div>
            </div>
          </div>
          <div className="card card-pad" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="swap" style={{ width: 22, height: 22, color: 'var(--blue)' }} />
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Разница стоимости</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: op.exchange.diff >= 0 ? 'var(--ink)' : 'var(--green)' }}>{op.exchange.diff >= 0 ? '+ ' : '− '}{rUsd(Math.abs(op.exchange.diff))}{op.exchange.diff >= 0 ? ' (доплата)' : ' (возврат)'}</span>
          </div>
        </>
      )}


      <h3 className="section-title" style={{ fontSize: 20, margin: '26px 0 14px' }}>Документы операции</h3>
      <div className="card card-pad">
        {documents.length ? documents.map((d, i) => (
          <div className="ver-row" key={i}>
            <span className="ver-badge" style={{ background: 'var(--blue-soft)' }}><Icon name="docs" style={{ width: 16, height: 16 }} /></span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.kind} · v{d.v}</div></div>
            <Pill tone={DOC_STATUS2[d.status] || 'gray'}>{d.status}</Pill>
            <button className="icon-btn" onClick={() => window.location.assign(documentsApi.downloadUrl(d.id))} style={{ marginLeft: 8 }}><Icon name="download" /></button>
          </div>
        )) : <div style={{ color: 'var(--muted-2)', padding: '8px 0' }}>Документы ещё не приложены</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <input ref={fileRef} type="file" hidden onChange={uploadDocument} />
          <Button variant="secondary" size="sm" icon="plus" onClick={() => fileRef.current?.click()}>Загрузить</Button>
          {op.type === 'Оформление справки' && <Button size="sm" icon="docs" onClick={generateCertificate}>Сформировать справку</Button>}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted-2)' }}>Все документы автоматически связываются с операцией {op.no} и заказом № {op.order}.</div>
      </div>


      <h3 className="section-title" style={{ fontSize: 20, margin: '26px 0 14px' }}>История изменений</h3>
      <div className="card card-pad" style={{ maxWidth: 680 }}>
        <div className="timeline">
          {[...history].reverse().map((h, i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Комментарий сотрудника…" style={{ flex: 1 }} /><Button icon="send" onClick={addComment}>Добавить</Button>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} title={confirm && confirm.title} message={confirm && confirm.message}
        confirmLabel={confirm && confirm.confirmLabel} confirmVariant={confirm && confirm.confirmVariant}
        onConfirm={() => { const c = confirm; setConfirm(null); c && c.onConfirm && c.onConfirm(); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}




function ReturnsModule({ scopeOrder, onOpenOrder, compact, order, initialCases, orders = [], services = [], participants = [] }) {
  const toast = useToast();
  const effectiveOrder = order && participants.length ? { ...order, participants } : order;
  const contextOrders = effectiveOrder ? [effectiveOrder, ...orders.filter((item) => item.id !== effectiveOrder.id)] : orders;
  const availableServices = services && services.length ? services : ORDER_SERVICES;
  const mappedCases = () => (initialCases || []).map((item) => toLegacyReturn(item, contextOrders, availableServices)).filter((item) => !scopeOrder || item.order === scopeOrder);
  const [ops, setOps] = useState(mappedCases);
  useEffect(() => { if (Array.isArray(initialCases)) setOps(mappedCases()); }, [initialCases, orders, scopeOrder, order, services, participants]);
  useEffect(() => {
    if (Array.isArray(initialCases) || !order?.id) return;
    const controller = new AbortController();
    aftersalesApi.list({ order: order.id }, controller.signal)
      .then((payload) => setOps(resultsOf(payload).map((item) => toLegacyReturn(item, contextOrders, availableServices))))
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить постпродажные операции', 'err'); });
    return () => controller.abort();
  }, [initialCases, order?.id, services, participants]);
  const [view, setView] = useState('list');
  const [activeNo, setActiveNo] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState('');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [sel, setSel] = useState([]);
  const { sort, onSort, apply } = useSort({ col: 'created', dir: 'desc' });

  const active = ops.find((o) => o.no === activeNo);
  const updateOp = async (no, patch, histText) => {
    const current = ops.find((item) => item.no === no);
    if (!current || !patch.status || !current.serverId) {
      const local = current ? { ...current, ...patch, history: histText ? [...current.history, { t: 'сейчас', text: histText, who: 'Даниель' }] : current.history } : null;
      setOps((cur) => cur.map((item) => item.no === no ? local : item));
      return local;
    }
    const target = { 'Создано': 'created', 'На проверке': 'review', 'Ожидает согласования клиента': 'awaiting_client_approval', 'Передано поставщику': 'submitted_to_supplier', 'В обработке': 'processing', 'Завершено': 'completed', 'Отменено': 'cancelled', 'Отклонено': 'rejected' }[patch.status];
    try {
      let updated;
      if (target === 'completed') {
        updated = await aftersalesApi.execute(current.serverId, current.currentQuoteVersion ? {} : { manual_exception: true, reason: histText || 'Исключение подтверждено оператором' });
      } else if (target === 'cancelled') {
        updated = await aftersalesApi.cancel(current.serverId, histText || 'Отменено оператором');
      } else if (target === 'awaiting_client_approval') {
        updated = await aftersalesApi.sendForApproval(current.serverId);
      } else if (target === 'submitted_to_supplier' && ['Возврат билета', 'Обмен билета'].includes(current.type)) {
        let approvalCase = current;
        if (current.status !== 'Ожидает согласования клиента') {
          approvalCase = toLegacyReturn(await aftersalesApi.sendForApproval(current.serverId), contextOrders, availableServices);
        }
        if (approvalCase.currentQuoteVersion) await aftersalesApi.clientApprove(current.serverId, approvalCase.currentQuoteVersion);
        updated = await aftersalesApi.submit(current.serverId);
      } else {
        updated = await aftersalesApi.transition(current.serverId, target, histText || '');
      }
      const mapped = { ...current, ...toLegacyReturn(updated, contextOrders, availableServices) };
      setOps((items) => items.map((item) => item.no === no ? mapped : item));
      return mapped;
    } catch (error) { toast(error.message || 'Не удалось изменить статус', 'err'); return null; }
  };
  const createOp = async (d) => {
    const selectedOrder = order || orders.find((item) => item.no === scopeOrder) || orders[0];
    if (!selectedOrder) { toast('Сначала создайте или выберите заказ', 'err'); return; }
    const parts = d.participants && d.participants.length ? d.participants : ['—'];
    const kinds = { 'Возврат билета': 'refund', 'Обмен билета': 'exchange', 'Аннуляция бронирования': 'cancellation', 'Оформление справки': 'certificate' };
    try {
      const created = await aftersalesApi.create({
        order: selectedOrder.id,
        service: d.serviceId || null,
        participants: d.participantIds?.length ? d.participantIds : undefined,
        type: kinds[d.type] || 'refund',
        initiator: 'operator',
        currency: 'USD',
        external_references: {
          reason: d.reason || '',
          voluntary: d.voluntary,
          requested_documents: d.docs || [],
          new_flight: d.newFlight || null,
          exchange_mode: d.reqMode || null,
        },
      });
      let detail = created;
      if (['Возврат билета', 'Обмен билета'].includes(d.type)) {
        await aftersalesApi.quote(created.id, {
          currency: 'USD',
          original_paid: String(d.original || 0),
          supplier_penalty: String(d.penalty || 0),
          agency_service_fee: String(d.fee || 0),
          other_withholdings: '0',
          old_itinerary: d.serviceLabel ? { service: d.serviceLabel } : null,
          new_itinerary: d.newFlight || null,
          exchange_difference: d.type === 'Обмен билета' ? String(d.refund || 0) : null,
          details: { reason: d.reason || '', voluntary: d.voluntary },
        });
        detail = await aftersalesApi.detail(created.id);
      }
      const np = { ...toLegacyReturn(detail, contextOrders, availableServices), participants: parts };
      setOps((cur) => [np, ...cur]); setNewOpen(false); setActiveNo(np.no); setView('card');
      toast(np.no + ' создан', 'ok', { title: 'Запрос оформлен', action: { label: 'Открыть «Возвраты и обмены»', route: 'returns' } });
    } catch (error) { toast(error.message, 'err'); }
  };

  if (view === 'card' && active) return (
    <>
      <ReturnCard op={active} onBack={() => setView('list')} onChange={updateOp} />
      <NewReturnModal open={newOpen} order={order} services={availableServices} participants={participants} onClose={() => setNewOpen(false)} onCreate={createOp} />
    </>
  );


  if (compact) {
    const activeReturns = ops.filter((o) => o.type !== 'Обмен билета' && !isTerminal(o.status) && o.status !== 'Завершено');
    const activeExch = ops.filter((o) => o.type === 'Обмен билета' && !isTerminal(o.status) && o.status !== 'Завершено');
    const done = ops.filter((o) => o.status === 'Завершено' || isTerminal(o.status));
    const Row = (o) => (
      <div className="oc-svc" key={o.no} onClick={() => { setActiveNo(o.no); setView('card'); }}>
        <span className="oc-svc-ic" style={{ background: o.status === 'Завершено' ? 'var(--green)' : isTerminal(o.status) ? '#9aa3b2' : 'var(--blue)' }}><Icon name={RETURN_TYPE[o.type].icon} /></span>
        <div style={{ flex: 1, minWidth: 0 }}><div className="oc-svc-t">{o.type}</div><div className="oc-svc-s">{o.no} · {o.service}</div></div>
        <Pill tone={RETURN_STATUS[o.status]}>{o.status}</Pill>
        <div style={{ width: 96, textAlign: 'right', fontWeight: 700 }}>{o.type === 'Обмен билета' ? (o.exchange.diff >= 0 ? '+' : '−') + rUsd(Math.abs(o.exchange.diff)) : rUsd(calcRefund(o.fin))}</div>
        <Icon name="chevRight" style={{ width: 20, height: 20, color: 'var(--faint)' }} />
      </div>
    );
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>Постпродажное обслуживание заказа</span>
          <div style={{ flex: 1 }} /><Button icon="plus" onClick={() => setNewOpen(true)}>Возврат / обмен</Button>
        </div>
        {!ops.length && <EmptyState icon="refund" title="Операций постпродажи нет" sub="Создайте возврат, обмен, аннуляцию или справку" />}
        {activeReturns.length > 0 && <><div className="kp-sec-h">Активные возвраты</div>{activeReturns.map(Row)}</>}
        {activeExch.length > 0 && <><div className="kp-sec-h">Активные обмены</div>{activeExch.map(Row)}</>}
        {done.length > 0 && <><div className="kp-sec-h">История завершённых</div>{done.map(Row)}</>}
        <NewReturnModal open={newOpen} order={order} services={availableServices} participants={participants} onClose={() => setNewOpen(false)} onCreate={createOp} />
      </div>
    );
  }


  let rows = ops.filter((o) => (!fType || o.type === fType) && (!fStatus || o.status === fStatus) &&
    (!q || `${o.no} ${o.order} ${o.client} ${o.service}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { no: (r) => r.no, order: (r) => r.order, refund: (r) => calcRefund(r.fin), created: (r) => r.created });

  const activeCount = ops.filter((o) => !isTerminal(o.status) && o.status !== 'Завершено').length;
  const STATS = [['Активные', activeCount], ['Возвраты', ops.filter((o) => o.type === 'Возврат билета').length], ['Обмены', ops.filter((o) => o.type === 'Обмен билета').length], ['Сумма к возврату', rUsd(ops.reduce((s, o) => s + (o.status !== 'Отклонено' && o.status !== 'Отменено' ? calcRefund(o.fin) : 0), 0))]];

  const toggleSel = (no) => setSel((s) => s.includes(no) ? s.filter((x) => x !== no) : [...s, no]);
  const bulkAdvance = async () => {
    let done = 0;
    for (const item of ops) {
      if (!sel.includes(item.no) || isTerminal(item.status) || item.status === 'Завершено') continue;
      const updated = await updateOp(item.no, { status: nextStatus(item.status) }, 'Массовый перевод на следующий этап');
      if (updated) done += 1;
    }
    toast(`Переведено операций: ${done}`, done === sel.length ? 'ok' : 'warn');
    setSel([]);
  };

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: №, заказ, клиент…" style={{ width: 260 }} />
        <FilterChip label="Тип" value={fType} onChange={setFType} options={Object.keys(RETURN_TYPE)} />
        <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(RETURN_STATUS)} />
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={() => setNewOpen(true)}>Новый запрос</Button>
      </div>

      {sel.length > 0 && (
        <div className="cmp-tray" style={{ position: 'static', marginBottom: 16, marginTop: 0 }}>
          <span style={{ fontWeight: 600 }}>Выбрано: {sel.length}</span>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={() => setSel([])}>Сбросить</Button>
          <Button size="sm" icon="arrowRight" onClick={bulkAdvance}>Перевести на след. этап</Button>
        </div>
      )}

      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 40 }}><Checkbox on={sel.length === rows.length && rows.length > 0} onChange={() => setSel(sel.length === rows.length ? [] : rows.map((r) => r.no))} /></th>
              <Th label="№" col="no" sort={sort} onSort={onSort} />
              <Th label="Заказ" col="order" sort={sort} onSort={onSort} />
              <th>Клиент</th><th>Тип</th><th>Услуга</th><th>Статус</th>
              <Th label="Возврат" col="refund" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th style={{ textAlign: 'right' }}>Штраф</th><th>Ответств.</th>
              <Th label="Создан" col="created" sort={sort} onSort={onSort} />
              <th>Дедлайн</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.no} style={{ cursor: 'pointer' }} onClick={() => { setActiveNo(o.no); setView('card'); }}>
                  <td onClick={(e) => e.stopPropagation()}><Checkbox on={sel.includes(o.no)} onChange={() => toggleSel(o.no)} /></td>
                  <td className="t-strong">{o.no}</td>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {o.order}</span></td>
                  <td>{o.client}</td>
                  <td><Pill tone={RETURN_TYPE[o.type].tone}>{o.type}</Pill></td>
                  <td className="t-muted">{o.service}</td>
                  <td><Pill tone={RETURN_STATUS[o.status]}>{o.status}</Pill></td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{o.type === 'Обмен билета' ? '—' : rUsd(calcRefund(o.fin))}</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)' }}>{o.fin.supplierPenalty ? rUsd(o.fin.supplierPenalty) : '—'}</td>
                  <td>{o.resp}</td>
                  <td>{o.created}</td>
                  <td><span style={!isTerminal(o.status) && o.status !== 'Завершено' ? { color: 'var(--red)', fontWeight: 600 } : { color: 'var(--muted-2)' }}>{o.deadline}</span></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[{ icon: 'eye', label: 'Открыть', onClick: () => { setActiveNo(o.no); setView('card'); } }, { icon: 'orders', label: 'Перейти в заказ', onClick: () => { const ord = ORDERS.find((x) => x.no === o.order) || { no: o.order, client: o.client, requestType: 'Индивидуальная', status: 'В работе', operator: o.resp, date: '15.06.25' }; onOpenOrder && onOpenOrder(ord); } }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="refund" title="Операций не найдено" sub="Измените фильтры или создайте запрос" />}
      </div>
      <NewReturnModal open={newOpen} order={order} services={availableServices} participants={participants} onClose={() => setNewOpen(false)} onCreate={createOp} />
    </div>
  );
}

function ReturnsPage({ onOpenOrder, cases = [], orders = [] }) {
  return (<><Topbar title="Возвраты и обмены" /><div className="content"><ReturnsModule initialCases={cases} orders={orders} onOpenOrder={onOpenOrder} /></div></>);
}

Object.assign(window, { ReturnsModule, ReturnCard, ReturnsPage, NewReturnModal, ProcessFlow });



export { rUsd, calcRefund, isTerminal, nextStatus, ProcessFlow, NewReturnModal, ReturnCard, ReturnsModule, ReturnsPage };
