import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { Button, ConfirmDialog, Drawer, Field, Input, Pill, Select, Tabs, useToast } from './ui';
import { CURRENT_USER, FEE_DESC_DEFAULTS, FEE_SCHEMA, FEE_SERVICE_TYPES, FEE_TEMPLATES, SERVICE_DESC_DEFAULTS, SETTLEMENT_TYPES, applyAgreementFees, companyFinance, creditAvailable, depositAvailable, descsFromDefaults, feeDescOf, feeDescsFromDefaults, feeTemplate, feesFromTemplate, registerFeeTemplate } from './data';
import { FIN_COUNTERPARTIES, f$ } from './data/finance';
import { FinCounterpartyDrawer } from './page_finance';



function fM(n) { return Math.round(n || 0).toLocaleString('ru-RU') + ' $'; }
function feeCellText(fee) {
  if (!fee) return '—';
  return fee.type === 'percent' ? (fee.value || 0) + ' %' : fM(fee.value || 0);
}
const cfUid = (p) => p + Math.random().toString(36).slice(2, 7);
function cfNow() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}


function DepositCard({ deposit }) {
  const avail = depositAvailable(deposit);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="bank" style={{ width: 18, height: 18, color: 'var(--blue)' }} />
        <h3 className="card-title" style={{ fontSize: 16, margin: 0 }}>Депозитный баланс</h3>
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="stat-card"><div className="s-label">Текущий остаток</div><div className="s-value" style={{ fontSize: 22 }}>{fM(deposit.balance)}</div></div>
        <div className="stat-card"><div className="s-label">Зарезервировано</div><div className="s-value" style={{ fontSize: 22, color: 'var(--amber)' }}>{fM(deposit.reserved)}</div></div>
      </div>
      <div className="stat-card" style={{ marginTop: 12, background: 'var(--green-bg, #eafaf0)' }}>
        <div className="s-label">Доступный остаток</div>
        <div className="s-value" style={{ fontSize: 26, color: avail > 0 ? 'var(--green)' : 'var(--red)' }}>{fM(avail)}</div>
      </div>
    </div>
  );
}
function CreditCard({ credit }) {
  const avail = creditAvailable(credit);
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon name="sla" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
        <h3 className="card-title" style={{ fontSize: 16, margin: 0 }}>Отсрочка платежа</h3>
      </div>
      <div className="kv">
        <div className="kv-row"><span className="k">Кредитный лимит</span><span className="v">{fM(credit.limit)}</span></div>
        <div className="kv-row"><span className="k">Срок отсрочки</span><span className="v">{credit.termDays} дн.</span></div>
        <div className="kv-row"><span className="k">Текущая задолженность</span><span className="v" style={{ color: 'var(--ink)' }}>{fM(credit.debt)}</span></div>
        <div className="kv-row"><span className="k">Доступный остаток лимита</span><span className="v" style={{ color: avail > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fM(avail)}</span></div>
        <div className="kv-row"><span className="k">Просроченная задолженность</span><span className="v" style={{ color: credit.overdue > 0 ? 'var(--red)' : 'var(--muted)', fontWeight: 700 }}>{fM(credit.overdue)}</span></div>
      </div>
      {credit.overdue > 0 && <div className="card" style={{ marginTop: 12, padding: '10px 12px', borderLeft: '3px solid var(--red)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Icon name="alertCircle" style={{ width: 16, height: 16, color: 'var(--red)' }} />
        <span style={{ fontSize: 12, color: 'var(--body)' }}>Есть просроченная задолженность — оформление новых заказов требует подтверждения.</span>
      </div>}
    </div>
  );
}
function DepositHistoryDrawer({ open, deposit, onClose }) {
  return (
    <Drawer open={open} onClose={onClose} title="История депозита"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Дата</th><th>Операция</th><th style={{ textAlign: 'right' }}>Сумма</th><th>Примечание</th></tr></thead>
          <tbody>
            {(deposit ? deposit.history : []).map((h, i) => (
              <tr key={i}>
                <td className="t-muted">{h.date}</td>
                <td><Pill tone={h.amount >= 0 ? 'green' : (h.type === 'Резерв' ? 'amber' : 'red')}>{h.type}</Pill></td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: h.amount >= 0 ? 'var(--green)' : 'var(--red)' }}>{h.amount >= 0 ? '+ ' : '− '}{fM(Math.abs(h.amount))}</td>
                <td style={{ fontSize: 13, color: 'var(--body)' }}>{h.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}


function CompanyFinanceSection({ fin, onChangeSettlement }) {
  const toast = useToast();
  const [histOpen, setHistOpen] = useState(false);
  return (
    <>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>Тип взаиморасчётов</h3>
          {fin.settlement === 'депозит' && fin.deposit && <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История депозита</Button>}
        </div>
        <div className="seg-toggle" style={{ maxWidth: 460 }}>
          {SETTLEMENT_TYPES.map((t) => (
            <button key={t} className={'seg-btn' + (fin.settlement === t ? ' active' : '')}
              onClick={() => { onChangeSettlement(t); toast('Тип взаиморасчётов: ' + t, 'ok'); }}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>

      {fin.settlement === 'депозит' && fin.deposit && <div style={{ marginBottom: 16 }}><DepositCard deposit={fin.deposit} /></div>}
      {fin.settlement === 'отсрочка' && fin.credit && <div style={{ marginBottom: 16 }}><CreditCard credit={fin.credit} /></div>}
      {fin.settlement === 'предоплата' && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="checkCircle" style={{ width: 20, height: 20, color: 'var(--green)' }} />
          <span style={{ color: 'var(--body)' }}>Работа по предоплате — заказы оформляются после поступления оплаты. Баланс не ведётся.</span>
        </div>
      )}

      <DepositHistoryDrawer open={histOpen} deposit={fin.deposit} onClose={() => setHistOpen(false)} />
    </>
  );
}


function AgreementFeesView({ agreement }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {FEE_SERVICE_TYPES.map((svc) => (
        <div key={svc}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13, marginBottom: 6 }}>{svc}</div>
          <div className="table-card">
            <table className="tbl">
              <thead><tr>{FEE_SCHEMA[svc].map((f) => <th key={f.key} style={{ fontSize: 12 }}>{f.label}</th>)}</tr></thead>
              <tbody><tr>{FEE_SCHEMA[svc].map((f) => <td key={f.key}>{feeCellText(agreement.fees[svc] && agreement.fees[svc][f.key])}</td>)}</tr></tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Описание для документов: «{agreement.descs[svc] || SERVICE_DESC_DEFAULTS[svc] || '—'}»</div>
        </div>
      ))}
    </div>
  );
}


function AgreementEditor({ open, agreement, onClose, onSave }) {
  const [tab, setTab] = useState(FEE_SERVICE_TYPES[0]);
  const [tpl, setTpl] = useState(agreement ? agreement.template : 'standard');
  const [fees, setFees] = useState(() => (agreement ? JSON.parse(JSON.stringify(agreement.fees)) : feesFromTemplate('standard')));
  const [descs, setDescs] = useState(() => (agreement ? { ...agreement.descs } : descsFromDefaults()));
  const [feeDescs, setFeeDescs] = useState(() => (agreement && agreement.feeDescs ? JSON.parse(JSON.stringify(agreement.feeDescs)) : feeDescsFromDefaults()));
  const [tplName, setTplName] = useState('');
  const [tplNameOpen, setTplNameOpen] = useState(false);
  const [tplTick, setTplTick] = useState(0);
  const toast = useToast();
  useEffect(() => {
    if (open && agreement) { setTpl(agreement.template); setFees(JSON.parse(JSON.stringify(agreement.fees))); setDescs({ ...agreement.descs }); setFeeDescs(agreement.feeDescs ? JSON.parse(JSON.stringify(agreement.feeDescs)) : feeDescsFromDefaults()); setTab(FEE_SERVICE_TYPES[0]); }
  }, [open, agreement]);
  if (!open) return null;

  const applyTpl = (id) => { setTpl(id); setFees(feesFromTemplate(id)); toast('Применён шаблон «' + feeTemplate(id).name + '»', 'ok'); };
  const saveAsTemplate = () => {
    const name = tplName.trim();
    if (!name) { toast('Введите название шаблона', 'info'); return; }
    const id = registerFeeTemplate(name, fees);
    setTpl(id); setTplName(''); setTplNameOpen(false); setTplTick((t) => t + 1);
    toast('Создан шаблон «' + name + '»', 'ok');
  };
  const setFee = (svc, key, patch) => setFees((f) => ({ ...f, [svc]: { ...f[svc], [key]: { ...f[svc][key], ...patch } } }));
  const setDesc = (svc, v) => setDescs((d) => ({ ...d, [svc]: v }));
  const setFeeDesc = (svc, key, v) => setFeeDescs((d) => ({ ...d, [svc]: { ...d[svc], [key]: v } }));


  const diffFields = () => {
    const out = [];
    FEE_SERVICE_TYPES.forEach((svc) => {
      FEE_SCHEMA[svc].forEach((f) => {
        const a = fees[svc][f.key], b = agreement.fees[svc] && agreement.fees[svc][f.key];
        if (!b || a.type !== b.type || a.value !== b.value) out.push(f.label + ' (' + svc + ')');
        const fdA = feeDescOf({ feeDescs }, svc, f.key), fdB = feeDescOf(agreement, svc, f.key);
        if (fdA !== fdB) out.push('Формулировка «' + f.label + '» (' + svc + ')');
      });
      if ((descs[svc] || '') !== (agreement.descs[svc] || '')) out.push('Описание (' + svc + ')');
    });
    return out;
  };

  const save = () => {
    const fields = diffFields();
    if (!fields.length && tpl === agreement.template) { toast('Изменений нет', 'info'); return; }
    onSave({ template: tpl, fees, descs, feeDescs }, fields.length ? fields : ['Применён шаблон «' + feeTemplate(tpl).name + '»']);
    onClose();
  };


  return (
    <Drawer open={open} onClose={onClose} width="min(820px,96vw)"
      title={'Редактирование ' + agreement.no} sub="Сохранение создаёт новую версию доп. соглашения"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={save}>Сохранить как новую версию</Button>
      </>}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: tplNameOpen ? 10 : 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Шаблон сборов:</span>
          <div style={{ maxWidth: 260 }} key={tplTick}>
            <Select options={FEE_TEMPLATES.map((t) => ({ value: t.id, label: t.name + (t.custom ? ' (индивид.)' : '') }))} value={tpl} onChange={(e) => applyTpl(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>можно донастроить вручную ниже</span>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" icon="plus" onClick={() => setTplNameOpen((v) => !v)}>Сохранить как шаблон</Button>
        </div>
        {tplNameOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Название нового шаблона:</span>
            <div style={{ width: 240 }}>
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="напр. «Корп. клиент 2026»"
                onKeyDown={(e) => { if (e.key === 'Enter') saveAsTemplate(); }} />
            </div>
            <Button size="sm" icon="check" onClick={saveAsTemplate}>Создать</Button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Текущие сборы по всем услугам сохранятся как переиспользуемый шаблон.</span>
          </div>
        )}

        <Tabs tabs={FEE_SERVICE_TYPES.map((s) => ({ key: s, label: s }))} value={tab} onChange={setTab} />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Сборы · {tab}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEE_SCHEMA[tab].map((f) => {
              const fee = fees[tab][f.key];
              return (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ flex: 1, minWidth: 160, fontSize: 13, color: 'var(--body)' }}>{f.label}</span>
                  <div className="seg-toggle" style={{ width: 168 }}>
                    <button className={'seg-btn' + (fee.type === 'percent' ? ' active' : '')} onClick={() => setFee(tab, f.key, { type: 'percent' })}>%</button>
                    <button className={'seg-btn' + (fee.type === 'fixed' ? ' active' : '')} onClick={() => setFee(tab, f.key, { type: 'fixed' })}>Фикс.</button>
                  </div>
                  <div style={{ width: 130 }}>
                    <Input type="number" value={fee.value} onChange={(e) => setFee(tab, f.key, { value: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <span style={{ width: 20, color: 'var(--muted)', fontSize: 13 }}>{fee.type === 'percent' ? '%' : '$'}</span>
                </div>
              );
            })}
          </div>


          <div style={{ fontWeight: 700, color: 'var(--ink)', margin: '20px 0 4px' }}>Описание услуги и сборов для закрывающих документов · {tab}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Общее описание услуги — заголовок позиции в акте / счёте / УПД. Описания сборов и сборов поставщиков печатаются отдельными строками под ним.</div>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--body)', marginBottom: 5 }}>Общее описание услуги</div>
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical', padding: '10px 12px', width: '100%' }}
            value={descs[tab] || ''} onChange={(e) => setDesc(tab, e.target.value)}
            placeholder={SERVICE_DESC_DEFAULTS[tab] || 'Описание услуги…'} />
          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px' }}>По умолчанию: «{SERVICE_DESC_DEFAULTS[tab] || '—'}»</div>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--body)', marginBottom: 8 }}>Описания сборов (отдельные позиции документа)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FEE_SCHEMA[tab].map((f) => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 168, flexShrink: 0, fontSize: 12, color: 'var(--muted)' }}>{f.key === 'supplier' ? 'Сборы поставщиков' : f.label}</span>
                <div className="input-wrap" style={{ flex: 1 }}>
                  <input className="input" style={{ height: 36, padding: '6px 10px', fontSize: 13 }}
                    value={(feeDescs[tab] && feeDescs[tab][f.key]) || ''} onChange={(e) => setFeeDesc(tab, f.key, e.target.value)}
                    placeholder={FEE_DESC_DEFAULTS[f.key] || 'Формулировка в документе…'} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Каждая формулировка (включая сборы поставщиков) печатается в закрывающем документе отдельной строкой.</div>
        </div>
      </div>
    </Drawer>
  );
}


function AgreementHistoryDrawer({ open, agreement, onClose }) {
  return (
    <Drawer open={open} onClose={onClose} title="История изменений соглашения"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div className="timeline">
        {(agreement ? [...agreement.history].reverse() : []).map((v, i) => (
          <div className="tl-item" key={i}>
            <span className="tl-dot" /><span className="tl-line" />
            <div style={{ paddingBottom: 8 }}>
              <div className="tl-time">{v.date} · {v.user}</div>
              <div className="tl-text" style={{ fontWeight: 600 }}>{v.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{v.fields.join(', ')}</div>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}


function CompanyContracts({ fin, coName, onFinChange, onOpenClosing }) {
  const toast = useToast();
  const [editAgr, setEditAgr] = useState(null);
  const [histAgr, setHistAgr] = useState(null);
  const [expanded, setExpanded] = useState(() => (fin.contracts[0] ? { [fin.contracts[0].id]: true } : {}));

  const saveAgreement = (contractId, agr, patch, fields) => {
    const nextFin = JSON.parse(JSON.stringify(fin));
    const c = nextFin.contracts.find((x) => x.id === contractId);
    const a = c.agreements.find((x) => x.id === agr.id);
    const newVersion = Math.max(...c.agreements.map((x) => x.version)) + 1;

    a.status = 'Архив';
    const created = {
      id: cfUid('A'), no: 'ДС № ' + newVersion, date: cfNow().split(' ')[0], version: newVersion, status: 'Действующий',
      template: patch.template, fees: patch.fees, descs: patch.descs, feeDescs: patch.feeDescs,
      history: [...a.history, { date: cfNow(), user: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор', title: 'ДС № ' + newVersion + ' · изменение условий', fields }],
    };
    c.agreements.push(created);
    onFinChange(nextFin);
    toast('Создана версия ' + created.no, 'ok');
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px' }}>
        <h3 className="section-title" style={{ fontSize: 20, margin: 0 }}>Договоры и доп. соглашения</h3>
        <Button variant="secondary" size="sm" icon="plus" onClick={() => toast('Добавление договора', 'info')}>Договор</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fin.contracts.map((c) => {
          const isOpen = !!expanded[c.id];
          return (
            <div className="card" key={c.id} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }}
                onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}>
                <span className="oc-svc-ic" style={{ background: '#2566ff', width: 40, height: 40, borderRadius: 11 }}><Icon name="docs" style={{ width: 20, height: 20 }} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Договор {c.no}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>от {c.date} · {c.agreements.length} доп. соглашение(ий)</div>
                </div>
                <Pill tone={c.status === 'Действующий' ? 'green' : 'gray'}>{c.status}</Pill>
                <Icon name={isOpen ? 'chevUp' : 'chevDown'} style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--line)', padding: '14px 18px', background: 'var(--surface-2)' }}>
                  {c.agreements.map((a) => (
                    <div className="card card-pad" key={a.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>{a.no}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>от {a.date} · v{a.version}</span>
                        <Pill tone={a.status === 'Действующий' ? 'green' : 'gray'}>{a.status}</Pill>
                        <Pill tone="blue">Шаблон: {feeTemplate(a.template).name}</Pill>
                        <div style={{ flex: 1 }} />
                        <Button variant="ghost" size="sm" icon="clock" onClick={() => setHistAgr(a)}>История</Button>
                        {a.status === 'Действующий' && <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditAgr({ contractId: c.id, agreement: a })}>Изменить условия</Button>}
                        {a.status === 'Действующий' && <Button size="sm" icon="download" onClick={() => onOpenClosing(a)}>Закрывающие</Button>}
                      </div>
                      <AgreementFeesView agreement={a} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AgreementEditor open={!!editAgr} agreement={editAgr && editAgr.agreement}
        onClose={() => setEditAgr(null)}
        onSave={(patch, fields) => saveAgreement(editAgr.contractId, editAgr.agreement, patch, fields)} />
      <AgreementHistoryDrawer open={!!histAgr} agreement={histAgr} onClose={() => setHistAgr(null)} />
    </>
  );
}


const ACCOUNTING_SYSTEMS = ['Эльба', 'Контур', '1С', 'Мое дело'];
const CLOSING_DOC_TYPES = ['Акт', 'Счёт', 'УПД'];
function ClosingDocsPreview({ open, agreement, coName, co, onClose }) {
  const toast = useToast();
  const [sys, setSys] = useState('Эльба');
  const [docType, setDocType] = useState('Акт');
  const [confirmSend, setConfirmSend] = useState(false);

  const baseRows = [
    { svc: 'Авиа', base: 1600 },
    { svc: 'Гостиница', base: 955 },
    { svc: 'Трансфер', base: 60 },
  ];
  const [rows, setRows] = useState(() => baseRows.map((r) => ({ ...r, desc: (agreement && agreement.descs[r.svc]) || SERVICE_DESC_DEFAULTS[r.svc] || r.svc })));
  useEffect(() => {
    if (open) setRows(baseRows.map((r) => ({ ...r, desc: (agreement && agreement.descs[r.svc]) || SERVICE_DESC_DEFAULTS[r.svc] || r.svc })));
  }, [open, agreement]);
  if (!open) return null;

  const vatRate = co && co.vat && /\d/.test(co.vat) ? parseFloat(co.vat) : 0;
  const vatOf = (sum) => Math.round(sum * vatRate / (100 + vatRate));


  const positions = [];
  rows.forEach((r, ri) => {
    positions.push({ svc: r.svc, kind: 'service', desc: r.desc, amount: r.base, rowIndex: ri });
    const f = applyAgreementFees(agreement, r.svc, r.base);
    FEE_SCHEMA[r.svc].forEach((fs) => {
      const amt = f.fees[fs.key] || 0;
      if (amt > 0) positions.push({ svc: r.svc, kind: 'fee', desc: feeDescOf(agreement, r.svc, fs.key), amount: amt });
    });
  });
  const total = positions.reduce((s, p) => s + p.amount, 0);
  const totalVat = positions.reduce((s, p) => s + vatOf(p.amount), 0);
  const totalFees = positions.filter((p) => p.kind === 'fee').reduce((s, p) => s + p.amount, 0);

  const setDesc = (i, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, desc: v } : r)));

  return (
    <Drawer open={open} onClose={onClose} width="min(860px,96vw)"
      title="Предпросмотр закрывающих документов" sub={coName + ' · перед выгрузкой в онлайн-бухгалтерию'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="send" onClick={() => setConfirmSend(true)}>Передать в «{sys}»</Button>
      </>}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ minWidth: 180 }}><Field label="Бухгалтерия"><Select options={ACCOUNTING_SYSTEMS.map((s) => ({ value: s, label: s }))} value={sys} onChange={(e) => setSys(e.target.value)} /></Field></div>
          <div style={{ minWidth: 160 }}><Field label="Тип документа"><Select options={CLOSING_DOC_TYPES.map((s) => ({ value: s, label: s }))} value={docType} onChange={(e) => setDocType(e.target.value)} /></Field></div>
        </div>


        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{docType} · {coName}</div>
          <div className="grid-2" style={{ gap: '2px 24px' }}>
            <div className="kv-row"><span className="k">Контрагент</span><span className="v">{coName}</span></div>
            <div className="kv-row"><span className="k">ИНН</span><span className="v">{co && co.inn}</span></div>
            <div className="kv-row"><span className="k">Договор / ДС</span><span className="v">{(co && co.contract) || '—'} · {agreement && agreement.no}</span></div>
            <div className="kv-row"><span className="k">НДС</span><span className="v">{(co && co.vat) || '—'}</span></div>
          </div>
        </div>


        <div className="table-card" style={{ marginBottom: 6 }}>
          <table className="tbl">
            <thead><tr><th>Позиция / описание</th><th style={{ textAlign: 'right' }}>Сумма</th><th style={{ textAlign: 'right' }}>в т.ч. НДС</th></tr></thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={i} style={p.kind === 'fee' ? { background: 'var(--surface-2)' } : null}>
                  <td style={{ minWidth: 300 }}>
                    {p.kind === 'service' ? (
                      <>
                        <input className="input" style={{ height: 34, padding: '4px 8px', fontWeight: 600 }} value={p.desc} onChange={(e) => setDesc(p.rowIndex, e.target.value)} />
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.svc} · основная услуга</div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12 }}>
                        <Icon name="chevRight" style={{ width: 14, height: 14, color: 'var(--muted-2)' }} />
                        <span style={{ fontSize: 13, color: 'var(--body)' }}>{p.desc}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: p.kind === 'service' ? 600 : 400, color: p.kind === 'fee' ? 'var(--muted)' : 'var(--ink)' }}>{fM(p.amount)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{vatRate ? fM(vatOf(p.amount)) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Заголовок услуги можно скорректировать разово перед отправкой. Формулировки сборов берутся из доп. соглашения.</div>


        <div className="card card-pad" style={{ marginBottom: 14 }}>
          <div className="kv">
            <div className="kv-row"><span className="k">Сервисные сборы и надбавки</span><span className="v">{fM(totalFees)}</span></div>
            <div className="kv-row"><span className="k">Итого к оплате</span><span className="v" style={{ fontSize: 18, fontWeight: 700 }}>{fM(total)}</span></div>
            <div className="kv-row"><span className="k">в том числе НДС ({(co && co.vat) || '—'})</span><span className="v">{vatRate ? fM(totalVat) : 'без НДС'}</span></div>
          </div>
        </div>

        <div className="card" style={{ padding: '10px 12px', borderLeft: '3px solid var(--blue)', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Icon name="eye" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
          <span style={{ fontSize: 12, color: 'var(--body)' }}>Проверьте описание услуг, суммы, сборы, надбавки, реквизиты, НДС и итог. Выгрузка в «{sys}» произойдёт только после подтверждения.</span>
        </div>

      <ConfirmDialog open={confirmSend} title={'Передать документы в «' + sys + '»?'}
        message={'Будет выгружен ' + docType + ' на сумму ' + fM(total) + '. Проверьте данные перед отправкой.'}
        confirmLabel="Передать" confirmVariant="primary"
        onConfirm={() => { setConfirmSend(false); toast(docType + ' передан в «' + sys + '»', 'ok'); onClose(); }}
        onCancel={() => setConfirmSend(false)} />
    </Drawer>
  );
}


function CompanySettlementsBlock({ co }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const cp = FIN_COUNTERPARTIES.find((c) => c.name === co.name || c.legal === co.name
    || (co.name && (c.name.includes(co.name) || co.name.includes(c.name))));
  if (!cp) {
    return (
      <div className="card card-pad" style={{ color: 'var(--muted)' }}>
        По этой организации ещё нет проведённых взаиморасчётов. Они появятся после первого счёта или оплаты.
      </div>
    );
  }
  const debit = cp.obligations.reduce((s, o) => s + o.sum, 0);
  const credit = cp.obligations.reduce((s, o) => s + o.paid, 0);
  const overdue = cp.obligations.some((o) => o.overdueDays > 0);
  const stat = (label, value, tone) => (
    <div style={{ padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: tone || 'var(--ink)' }}>{value}</div>
    </div>
  );
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>Взаиморасчёты</h3>
        {overdue && <Pill tone="red">есть просрочка</Pill>}
        <div style={{ flex: 1 }} />
        <Button size="sm" icon="finance" onClick={() => setOpen(true)}>Открыть детализацию</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 12 }}>
        {stat('Дебет (начислено)', f$(debit))}
        {stat('Кредит (оплачено)', f$(credit), 'var(--green)')}
        {stat('Сальдо (остаток)', f$(debit - credit), debit - credit > 0 ? 'var(--amber)' : 'var(--green)')}
        {stat('Свободный лимит', cp.limit ? f$(Math.max(0, cp.limit - cp.used)) : '—')}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button size="sm" variant="secondary" icon="download" onClick={() => toast('Акт сверки по «' + cp.name + '» сформирован (демо)', 'ok')}>Акт сверки</Button>
        <Button size="sm" variant="secondary" icon="download" onClick={() => toast('Счёт по «' + cp.name + '» сформирован (демо)', 'ok')}>Счёт</Button>
        <Button size="sm" variant="secondary" icon="download" onClick={() => toast('УПД по «' + cp.name + '» сформирован (демо)', 'ok')}>УПД</Button>
        <Button size="sm" variant="secondary" icon="send" onClick={() => toast('Данные переданы в 1С:Бухгалтерию (демо)', 'ok')}>В бухгалтерию</Button>
      </div>
      {open && <FinCounterpartyDrawer cp={cp} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CompanyFinanceBlock({ co }) {
  const seeded = companyFinance(co.id);
  const [fin, setFin] = useState(() => (seeded ? JSON.parse(JSON.stringify(seeded)) : null));
  const [closing, setClosing] = useState(null);
  if (!fin) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Финансовые условия для этой организации не заведены.</div>;

  const setSettlement = (t) => setFin((f) => ({ ...f, settlement: t }));

  return (
    <div className="fade-in">
      <CompanyFinanceSection fin={fin} onChangeSettlement={setSettlement} />
      <div style={{ height: 8 }} />
      <CompanySettlementsBlock co={co} />
      <div style={{ height: 8 }} />
      <CompanyContracts fin={fin} coName={co.name} onFinChange={setFin} onOpenClosing={(a) => setClosing(a)} />
      <ClosingDocsPreview open={!!closing} agreement={closing} co={co} coName={co.name} onClose={() => setClosing(null)} />
    </div>
  );
}

Object.assign(window, {
  CompanyFinanceBlock, CompanyFinanceSection, CompanyContracts, AgreementEditor, ClosingDocsPreview,
  DepositCard, CreditCard,
});

if (typeof window !== 'undefined') window.cfNow = cfNow;



export { fM, feeCellText, cfUid, cfNow, DepositCard, CreditCard, DepositHistoryDrawer, CompanyFinanceSection, AgreementFeesView, AgreementEditor, AgreementHistoryDrawer, CompanyContracts, ACCOUNTING_SYSTEMS, CLOSING_DOC_TYPES, ClosingDocsPreview, CompanyFinanceBlock };
