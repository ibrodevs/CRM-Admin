import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from './icons';
import { ActionMenu, Button, Drawer, Input, Pill, Toggle, useToast } from './ui';
import { CURRENT_USER } from './data';
import { workspaceActionsApi } from './api/resources';





function shM(n) { return Math.round(n).toLocaleString('ru-RU') + ' $'; }
function shPct(n) { return (Math.round(n * 10) / 10).toLocaleString('ru-RU') + ' $'; }


const MOTIVATION_SERVICES = ['Авиа', 'ЖД', 'Гостиницы', 'Трансферы', 'Страхование', 'Визы', 'Прочее'];
const MOTIVATION_DEFAULT = { service: 30, markup: 20, commission: 10 };

const OPERATOR_MOTIVATION = window.OPERATOR_MOTIVATION || (window.OPERATOR_MOTIVATION = {
  'Даниель': {
    uniform: false,
    base: { ...MOTIVATION_DEFAULT },
    perService: {
      'Авиа': { service: 30, markup: 20, commission: 10 },
      'ЖД': { service: 25, markup: 15, commission: 10 },
      'Гостиницы': { service: 20, markup: 25, commission: 15 },
      'Трансферы': { service: 20, markup: 20, commission: 10 },
      'Страхование': { service: 25, markup: 20, commission: 10 },
      'Визы': { service: 25, markup: 20, commission: 10 },
      'Прочее': { service: 20, markup: 15, commission: 10 },
    },
  },
});
function motivationFor(name) {
  if (!OPERATOR_MOTIVATION[name]) {
    OPERATOR_MOTIVATION[name] = {
      uniform: true, base: { ...MOTIVATION_DEFAULT },
      perService: MOTIVATION_SERVICES.reduce((m, s) => (m[s] = { ...MOTIVATION_DEFAULT }, m), {}),
    };
  }
  return OPERATOR_MOTIVATION[name];
}
function motivationRates(mot, svc) { return mot.uniform ? mot.base : (mot.perService[svc] || mot.base); }

function operatorEarn(op, mot) {
  const r = motivationRates(mot, op.svc);
  return op.serviceFee * r.service / 100 + op.markup * r.markup / 100 + op.commission * r.commission / 100;
}


const SHIFT_DEMO_OPS = [
  { time: '09:12', order: 51162, svc: 'Авиа', title: 'FRU → IST · Turkish Airlines', supplier: 'Sirena', type: 'Выписка', cost: 1640, serviceFee: 82, markup: 49, commission: 33 },
  { time: '09:47', order: 51163, svc: 'Гостиницы', title: 'Jannat Hotel · 3 ночи', supplier: 'Ratehawk', type: 'Выписка', cost: 955, serviceFee: 48, markup: 29, commission: 19 },
  { time: '10:20', order: 51154, svc: 'Трансферы', title: 'Аэропорт Манас → отель', supplier: 'Karimov Transfer', type: 'Выписка', cost: 60, serviceFee: 6, markup: 4, commission: 2 },
  { time: '11:05', order: 51156, svc: 'ЖД', title: 'Москва → Санкт-Петербург · Купе', supplier: 'УФС', type: 'Выписка', cost: 320, serviceFee: 16, markup: 10, commission: 6 },
  {
    time: '12:32', order: 51162, svc: 'Авиа', title: 'FRU → IST · обмен даты вылета', supplier: 'Sirena', type: 'Обмен', cost: 120, serviceFee: 25, markup: 0, commission: 5,
    history: [
      { time: '09:12', text: 'Первичное оформление: сервисный сбор 82 $, надбавка 49 $, комиссия 33 $' },
      { time: '12:32', text: 'Обмен: сбор за обмен 25 $, комиссия 5 $ — начисления пересчитаны автоматически' },
    ],
  },
  { time: '14:10', order: 51170, svc: 'Страхование', title: 'Полис ВЗР · 2 чел · 14 дней', supplier: 'Asia Insurance', type: 'Выписка', cost: 84, serviceFee: 12, markup: 8, commission: 6 },
  {
    time: '15:44', order: 51155, svc: 'Трансферы', title: 'Возврат трансфера 08.07', supplier: 'Айбек Асылов', type: 'Возврат', cost: -70, serviceFee: 10, markup: -4, commission: -2,
    history: [
      { time: '10:20', text: 'Первичное оформление: сервисный сбор 6 $, надбавка 4 $, комиссия 2 $' },
      { time: '15:44', text: 'Возврат: удержан сбор за возврат 10 $, надбавка и комиссия сторнированы — начисления пересчитаны' },
    ],
  },
  { time: '16:20', order: 51171, svc: 'Авиа', title: 'FRU → DXB · Air Astana', supplier: 'NDC', type: 'Выписка', cost: 890, serviceFee: 45, markup: 27, commission: 18 },
];
const SHIFT_REQUESTS_HANDLED = 21;

function shiftTotals(ops, mot) {
  const t = {
    orders: new Set(ops.map((o) => o.order)).size,
    byService: {}, exchanges: 0, refunds: 0,
    cost: 0, serviceFee: 0, markup: 0, commission: 0, earn: 0,
  };
  ops.forEach((op) => {
    t.byService[op.svc] = (t.byService[op.svc] || 0) + 1;
    if (op.type === 'Обмен') t.exchanges += 1;
    if (op.type === 'Возврат') t.refunds += 1;
    t.cost += Math.max(0, op.cost);
    t.serviceFee += op.serviceFee; t.markup += op.markup; t.commission += op.commission;
    t.earn += operatorEarn(op, mot);
  });
  t.feesTotal = t.serviceFee + t.markup + t.commission;
  t.profit = t.feesTotal - t.earn;
  return t;
}

function shiftFmtTime(d) { const p = (n) => String(n).padStart(2, '0'); return p(d.getHours()) + ':' + p(d.getMinutes()); }
function shiftDuration(from, to) {
  const ms = Math.max(0, (to || new Date()) - from);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h + ' ч ' + String(m).padStart(2, '0') + ' мин';
}


function MotivationDrawer({ open, operator, onClose }) {
  const toast = useToast();
  const [mot, setMot] = useState(() => JSON.parse(JSON.stringify(motivationFor(operator || 'Оператор'))));
  useEffect(() => { if (open && operator) setMot(JSON.parse(JSON.stringify(motivationFor(operator)))); }, [open, operator]);
  if (!open) return null;

  const setBase = (k, v) => setMot((m) => ({ ...m, base: { ...m.base, [k]: v } }));
  const setSvc = (svc, k, v) => setMot((m) => ({ ...m, perService: { ...m.perService, [svc]: { ...(m.perService[svc] || m.base), [k]: v } } }));
  const save = () => {
    OPERATOR_MOTIVATION[operator] = JSON.parse(JSON.stringify(mot));
    toast('Мотивация оператора сохранена', 'ok'); onClose();
  };
  const pctInput = (val, onCh) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 86 }}><Input type="number" min="0" max="100" value={val} onChange={(e) => onCh(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} /></div>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>%</span>
    </div>
  );
  const ROWS = [['service', 'от сервисного сбора'], ['markup', 'от агентской надбавки'], ['commission', 'от комиссионного вознаграждения']];

  return (
    <Drawer open={open} onClose={onClose} title="Система мотивации" sub={'Оператор: ' + operator} width="min(680px,96vw)"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="check" onClick={save}>Сохранить</Button></>}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 16px', borderBottom: '1px solid var(--line)', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Единые настройки для всех видов услуг</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Выключите, чтобы задать разные проценты для каждого вида услуг</div>
        </div>
        <Toggle on={mot.uniform} onChange={(v) => setMot((m) => ({ ...m, uniform: v }))} />
      </div>

      {mot.uniform ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
          {ROWS.map(([k, label]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>Процент {label}</span>
              {pctInput(mot.base[k], (v) => setBase(k, v))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {MOTIVATION_SERVICES.map((svc) => {
            const r = mot.perService[svc] || mot.base;
            return (
              <div className="card card-pad" key={svc} style={{ padding: '14px 18px' }}>
                <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{svc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ROWS.map(([k, label]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>{label}</span>
                      {pctInput(r[k], (v) => setSvc(svc, k, v))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
        Начисления рассчитываются автоматически после оформления услуги и отображаются в отчёте оператора.
        При обмене, возврате или изменении стоимости заказа начисления пересчитываются с сохранением истории изменений.
      </div>
    </Drawer>
  );
}


function ShiftReportDrawer({ open, onClose, operator, shift, closing, onConfirmClose, onOpenOrder }) {
  const toast = useToast();
  const [detailOp, setDetailOp] = useState(null);
  if (!open || !shift) return null;
  const sendTo = async (who) => {
    try {
      await workspaceActionsApi.execute('profile.shift_report.send', { resourceType: 'shift', resourceId: String(shift.serverId || shift.id || operator), payload: { recipient: who, operator } });
      toast('Отчёт по смене отправлен ' + who, 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const openOrderNo = (no) => {
    const ord = (window.ORDERS || []).find((o) => o.no === no);
    if (ord && onOpenOrder) { onClose(); onOpenOrder(ord); }
    else toast('Заказ № ' + no + ' не найден в реестре', 'info');
  };
  const mot = motivationFor(operator);
  const ops = shift.ops;
  const t = shiftTotals(ops, mot);
  const end = shift.closedAt || new Date();

  const METRICS = [
    ['Начало смены', shiftFmtTime(shift.openedAt)], ['Окончание смены', shift.closedAt ? shiftFmtTime(end) : (closing ? shiftFmtTime(end) : '— (смена открыта)')],
    ['Продолжительность', shiftDuration(shift.openedAt, end)], ['Обработано заявок', SHIFT_REQUESTS_HANDLED],
    ['Оформлено заказов', t.orders], ['Оформлено услуг', ops.filter((o) => o.type === 'Выписка').length],
    ['Обменов', t.exchanges], ['Возвратов', t.refunds],
  ];
  const MONEY = [
    ['Общая стоимость оформленных услуг', shM(t.cost)],
    ['Сумма сервисных сборов', shM(t.serviceFee)],
    ['Сумма агентских надбавок', shM(t.markup)],
    ['Сумма комиссионных вознаграждений', shM(t.commission)],
    ['Прибыль компании', shM(t.profit)],
  ];

  return (
    <Drawer open={open} onClose={onClose} title={closing ? 'Закрытие смены' : 'Отчёт по смене'} sub={'Оператор: ' + operator} width="min(900px,97vw)"
      footer={closing
        ? <><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="danger" icon="clock" onClick={onConfirmClose}>Закрыть смену</Button></>
        : <Button variant="secondary" onClick={onClose}>Закрыть</Button>}>


      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="download" onClick={() => window.print()}>Скачать PDF</Button>
        <Button variant="secondary" size="sm" icon="send" onClick={() => sendTo('администратору')}>Отправить администратору</Button>
        <Button variant="secondary" size="sm" icon="send" onClick={() => sendTo('бухгалтеру')}>Отправить бухгалтеру</Button>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {METRICS.map(([l, v], i) => (
          <div className="stat-card" key={i}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 18 }}>{v}</div></div>
        ))}
      </div>


      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Оформленные услуги по видам</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(t.byService).map(([svc, n]) => (
            <span key={svc} className="chip" style={{ cursor: 'default' }}>{svc}: <b style={{ marginLeft: 4 }}>{n}</b></span>
          ))}
        </div>
      </div>


      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 16 }}>
        <div className="card card-pad">
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Финансовый итог</div>
          <div className="kv">
            {MONEY.map(([k, v], i) => (
              <div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="card card-pad" style={{ background: 'var(--blue-soft)', border: '1px solid var(--blue)' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Заработок оператора за смену</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--blue)', margin: '6px 0' }}>{shPct(t.earn)}</div>
          <div style={{ fontSize: 12, color: 'var(--body)' }}>
            Рассчитан по индивидуальной мотивации: {mot.uniform
              ? `${mot.base.service}% от серв. сбора · ${mot.base.markup}% от надбавки · ${mot.base.commission}% от комиссии (единые для всех услуг)`
              : 'проценты заданы отдельно по каждому виду услуг'}
          </div>
        </div>
      </div>


      <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Детализация по операциям</div>
      <div className="table-card" style={{ marginBottom: 8, overflowX: 'auto' }}>
        <table className="tbl" style={{ minWidth: 860 }}>
          <thead><tr><th>Время</th><th>Заказ</th><th>Услуга</th><th>Поставщик</th><th>Операция</th>
            <th style={{ textAlign: 'right' }}>Серв. сбор</th><th style={{ textAlign: 'right' }}>Надбавка</th><th style={{ textAlign: 'right' }}>Комиссия</th><th style={{ textAlign: 'right' }}>Оператору</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {ops.map((op, i) => {
              const earn = operatorEarn(op, mot);
              return (
                <tr key={i}>
                  <td className="t-muted">{op.time}</td>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 600, cursor: 'pointer' }} onClick={() => openOrderNo(op.order)}>№ {op.order}</span></td>
                  <td>

                    <span style={{ cursor: 'pointer' }} onClick={() => openOrderNo(op.order)}>
                      <span style={{ fontWeight: 600, color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>{op.svc}<Icon name="arrowUpRight" style={{ width: 12, height: 12 }} /></span>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{op.title}</div>
                    </span>
                  </td>
                  <td>{op.supplier}</td>
                  <td><Pill tone={op.type === 'Возврат' ? 'red' : op.type === 'Обмен' ? 'amber' : 'green'}>{op.type}</Pill></td>
                  <td style={{ textAlign: 'right' }}>{shPct(op.serviceFee)}</td>
                  <td style={{ textAlign: 'right', color: op.markup < 0 ? 'var(--red)' : 'inherit' }}>{shPct(op.markup)}</td>
                  <td style={{ textAlign: 'right', color: op.commission < 0 ? 'var(--red)' : 'inherit' }}>{shPct(op.commission)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{shPct(earn)}</td>
                  <td style={{ textAlign: 'center' }}>{op.history && <button className="icon-btn" title="История пересчёта" onClick={() => setDetailOp(op)}><Icon name="clock" style={{ width: 16, height: 16 }} /></button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
        Услуга и номер заказа кликабельны — открывают карточку заказа. Начисления пересчитываются автоматически при обмене, возврате или изменении стоимости — нажмите на <Icon name="clock" style={{ width: 12, height: 12, verticalAlign: -2 }} />, чтобы увидеть историю изменений.
      </div>


      {detailOp && (
        <div className="card card-pad" style={{ marginTop: 8, borderLeft: '3px solid var(--blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', flex: 1 }}>История изменений · заказ № {detailOp.order} · {detailOp.title}</div>
            <button className="modal-close" onClick={() => setDetailOp(null)}><Icon name="x" /></button>
          </div>
          <div className="timeline">
            {detailOp.history.map((h, i) => (
              <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
                <div><div className="tl-time">{h.time}</div><div className="tl-text">{h.text}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}


function FeesReportDrawer({ open, onClose, operator, shift }) {
  const toast = useToast();
  if (!open || !shift) return null;
  const mot = motivationFor(operator);
  const rows = {};
  shift.ops.forEach((op) => {
    if (!rows[op.svc]) rows[op.svc] = { svc: op.svc, serviceFee: 0, markup: 0, commission: 0, earn: 0, ops: 0 };
    rows[op.svc].serviceFee += op.serviceFee; rows[op.svc].markup += op.markup; rows[op.svc].commission += op.commission;
    rows[op.svc].earn += operatorEarn(op, mot); rows[op.svc].ops += 1;
  });
  const list = Object.values(rows);
  const tot = list.reduce((a, r) => ({ serviceFee: a.serviceFee + r.serviceFee, markup: a.markup + r.markup, commission: a.commission + r.commission, earn: a.earn + r.earn, ops: a.ops + r.ops }), { serviceFee: 0, markup: 0, commission: 0, earn: 0, ops: 0 });
  return (
    <Drawer open={open} onClose={onClose} title="Отчёт по сборам" sub={'Оператор: ' + operator + ' · текущая смена'} width="min(760px,96vw)"
      footer={<><Button variant="secondary" icon="download" onClick={() => window.print()}>Скачать</Button><Button variant="secondary" onClick={onClose}>Закрыть</Button></>}>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Вид услуг</th><th>Операций</th><th style={{ textAlign: 'right' }}>Сервисные сборы</th><th style={{ textAlign: 'right' }}>Агентские надбавки</th><th style={{ textAlign: 'right' }}>Комиссии</th><th style={{ textAlign: 'right' }}>Начислено оператору</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.svc}>
                <td className="t-strong">{r.svc}</td><td>{r.ops}</td>
                <td style={{ textAlign: 'right' }}>{shPct(r.serviceFee)}</td>
                <td style={{ textAlign: 'right' }}>{shPct(r.markup)}</td>
                <td style={{ textAlign: 'right' }}>{shPct(r.commission)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{shPct(r.earn)}</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface-2)' }}>
              <td className="t-strong">Итого</td><td style={{ fontWeight: 700 }}>{tot.ops}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{shPct(tot.serviceFee)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{shPct(tot.markup)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{shPct(tot.commission)}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{shPct(tot.earn)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Суммы рассчитаны по операциям текущей смены с учётом индивидуальной мотивации оператора.</div>
    </Drawer>
  );
}


function ShiftControl({ role, onOpenOrder }) {
  const toast = useToast();
  const operator = CURRENT_USER.name;
  const [shift, setShift] = useState(window.SHIFT_STATE || null);
  const [panel, setPanel] = useState(null);
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!shift || shift.closedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [shift]);

  if (role !== 'Оператор' && role !== 'Админ') return null;

  const openShift = () => {
    const s = { openedAt: new Date(), closedAt: null, ops: SHIFT_DEMO_OPS };
    window.SHIFT_STATE = s; setShift(s);
    window.dispatchEvent(new CustomEvent('shift-change'));
    toast('Смена открыта · ' + shiftFmtTime(s.openedAt), 'ok');
  };
  const confirmClose = () => {
    const s = { ...shift, closedAt: new Date() };
    window.SHIFT_STATE = null; setShift(null); setPanel(null);
    window.dispatchEvent(new CustomEvent('shift-change'));
    toast('Смена закрыта · ' + shiftDuration(s.openedAt, s.closedAt), 'ok');
  };

  return (
    <>
      {!shift ? (
        <button className="chip" style={{ height: 36 }} title="Открыть смену" onClick={openShift}>
          <Icon name="clock" />Открыть смену
        </button>
      ) : (
        <ActionMenu
          trigger={
            <button className="chip" style={{ height: 36, borderColor: 'var(--green)' }} title="Смена открыта">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              Смена · {shiftDuration(shift.openedAt)}
              <Icon name="chevDown" />
            </button>
          }
          items={[
            { icon: 'pie', label: 'Отчёт по смене', onClick: () => setPanel('report') },
            { icon: 'finance', label: 'Отчёт по сборам', onClick: () => setPanel('fees') },
            { sep: true },
            { icon: 'clock', label: 'Закрыть смену', danger: true, onClick: () => setPanel('close') },
          ]} />
      )}

      {ReactDOM.createPortal(
        <>
          <ShiftReportDrawer open={panel === 'report' || panel === 'close'} closing={panel === 'close'}
            operator={operator} shift={shift} onClose={() => setPanel(null)} onConfirmClose={confirmClose} onOpenOrder={onOpenOrder} />
          <FeesReportDrawer open={panel === 'fees'} operator={operator} shift={shift} onClose={() => setPanel(null)} />
        </>,
        document.body
      )}
    </>
  );
}

Object.assign(window, {
  ShiftControl, ShiftReportDrawer, FeesReportDrawer, MotivationDrawer,
  OPERATOR_MOTIVATION, motivationFor, operatorEarn, MOTIVATION_SERVICES,
});



export { shM, shPct, MOTIVATION_SERVICES, MOTIVATION_DEFAULT, OPERATOR_MOTIVATION, motivationFor, motivationRates, operatorEarn, SHIFT_DEMO_OPS, SHIFT_REQUESTS_HANDLED, shiftTotals, shiftFmtTime, shiftDuration, MotivationDrawer, ShiftReportDrawer, FeesReportDrawer, ShiftControl };
