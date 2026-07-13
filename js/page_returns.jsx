// ===== Возвраты и обмены (постпродажное обслуживание) =====
// Надстройка над финансами / документами / авиауслугами.

function rUsd(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }
function calcRefund(fin) { return Math.max(0, fin.original - fin.supplierPenalty - fin.serviceFee - fin.extraHold); }
const isTerminal = (s) => s === 'Отменено' || s === 'Отклонено';
const nextStatus = (s) => { const i = RETURN_FLOW.indexOf(s); return i >= 0 && i < RETURN_FLOW.length - 1 ? RETURN_FLOW[i + 1] : s; };

/* generic process-flow indicator (reuses stage-bar styles) */
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

/* ---------- initiation request ---------- */
function NewReturnModal({ open, order, services, onClose, onCreate }) {
  const toast = useToast();
  const [type, setType] = useState('Возврат билета');
  const [svc, setSvc] = useState('');
  const [reason, setReason] = useState('');
  const [voluntary, setVoluntary] = useState(true);          // добровольный / вынужденный
  const [pax, setPax] = useState([]);                        // выбранные пассажиры (индексы)
  const [docs, setDocs] = useState([]);                      // документы-основания (вынужденный)
  const [nf, setNf] = useState({ from: '', to: '', date: null, flightNo: '' }); // новый рейс для обмена
  const [reqMode, setReqMode] = useState('request');         // запросить у АК / провести сразу
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (open) { setType('Возврат билета'); setSvc(''); setReason(''); setVoluntary(true); setPax([]); setDocs([]); setNf({ from: '', to: '', date: null, flightNo: '' }); setReqMode('request'); setConfirm(false); } }, [open]);
  if (!open) return null;

  const roster = (order && order.participants && order.participants.length ? order.participants.map((n) => ({ name: n, role: '' })) : ORDER_PARTICIPANTS);
  const svcOptions = (services && services.length ? services : ORDER_SERVICES).map((s) => `${s.kind} · ${s.title}`);
  const base = (services || ORDER_SERVICES).find((s) => `${s.kind} · ${s.title}` === svc);
  const original = base ? base.sum : 0;
  const isRefund = type === 'Возврат билета';
  const isExchange = type === 'Обмен билета';
  const isAnnul = type === 'Аннуляция бронирования';
  const needsPax = isRefund || isExchange;                   // выборка пассажира — для возврата и обмена
  const paxCount = Math.max(1, pax.length || (needsPax ? 0 : 1));
  const perUnit = original / Math.max(1, roster.length);
  const scoped = needsPax && pax.length ? Math.round(perUnit * pax.length) : original;
  const penalty = isAnnul ? scoped : (voluntary ? Math.round(scoped * 0.2) : 0); // вынужденный — без штрафа
  const fee = type === 'Оформление справки' ? 10 : (voluntary || isAnnul ? 14 : 0);
  const refund = Math.max(0, scoped - penalty - fee);
  const togglePax = (i) => setPax((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  const addDoc = () => setDocs((d) => [...d, { name: 'Документ ' + (d.length + 1) + '.pdf' }]);

  // Проверки перед подтверждением — искореняют случайные/неполные действия оператора (ответ клиента #2)
  const validate = () => {
    if (!svc) { toast('Выберите услугу заказа', 'err'); return false; }
    if (needsPax && !pax.length) { toast('Выберите, на кого оформляется ' + (isExchange ? 'обмен' : 'возврат'), 'err'); return false; }
    if (isRefund && !voluntary && !docs.length) { toast('Приложите документ-основание для вынужденного возврата', 'err'); return false; }
    if (isExchange && (!nf.to || !nf.date)) { toast('Заполните новый рейс (направление и дату)', 'err'); return false; }
    return true;
  };
  const submit = () => {
    onCreate({ type, svc, reason, original, penalty, fee, refund, voluntary,
      participants: pax.map((i) => roster[i].name), docs: docs.map((d) => d.name),
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
        <Field label="Услуга"><Select placeholder="Выберите услугу заказа" options={svcOptions} value={svc} onChange={(e) => setSvc(e.target.value)} /></Field>

        {/* Добровольный / вынужденный — для возврата и обмена */}
        {(isRefund || isExchange) && (
          <>
            <div className="kp-sec-h">Характер {isExchange ? 'обмена' : 'возврата'}</div>
            <div className="seg-toggle" style={{ maxWidth: 360 }}>
              <button className={'seg-btn' + (voluntary ? ' active' : '')} onClick={() => setVoluntary(true)}>Добровольный</button>
              <button className={'seg-btn' + (!voluntary ? ' active' : '')} onClick={() => setVoluntary(false)}>Вынужденный</button>
            </div>
          </>
        )}

        {/* Выборка пассажиров, на кого оформляется возврат/обмен (ответ клиента #2) */}
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

        {/* Загрузка документов-оснований при вынужденном возврате (ответ клиента #2) */}
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

        {/* Обмен: форма нового рейса (как при поиске перелёта, без выбора пассажира) + способ (ответ клиента #2) */}
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

      {/* Подтверждение действия — всегда перед созданием (ответ клиента #2) */}
      <ConfirmDialog open={confirm} title={'Подтвердите: ' + type + '?'} message={confirmMsg}
        confirmLabel={isAnnul ? 'Аннулировать' : isExchange ? (reqMode === 'request' ? 'Запросить' : 'Провести') : 'Создать'}
        confirmVariant={isAnnul ? 'danger' : 'primary'}
        onConfirm={() => { setConfirm(false); submit(); }} onCancel={() => setConfirm(false)} />
    </>
  );
}

/* ---------- full operation card ---------- */
function ReturnCard({ op, onBack, onChange }) {
  const toast = useToast();
  const meta = RETURN_TYPE[op.type] || RETURN_TYPE['Возврат билета'];
  const refund = calcRefund(op.fin);
  const isExchange = op.type === 'Обмен билета';
  const terminal = isTerminal(op.status);

  // Модалка подтверждения на аннуляцию и прочие критичные действия (ответ клиента #2)
  const [confirm, setConfirm] = useState(null);
  const ask = (title, message, onConfirm, confirmLabel = 'Подтвердить', confirmVariant = 'danger') => setConfirm({ title, message, onConfirm, confirmLabel, confirmVariant });
  const setStatus = (s) => onChange(op.no, { status: s }, `Статус изменён: ${s}`);
  const doAdvance = () => {
    const ns = nextStatus(op.status);
    if (ns === 'Завершено') {
      onChange(op.no, { status: 'Завершено', finOp: 'F-' + Math.floor(2050 + Math.random() * 40) },
        isExchange ? 'Обмен переоформлен · заказ обновлён' : 'Возврат исполнен · создана фин. операция «Возврат»');
      toast(isExchange ? 'Обмен переоформлен, заказ обновлён' : `Создана фин. операция «Возврат» на ${rUsd(refund)} · задолженность обновлена`, 'ok');
    } else {
      onChange(op.no, { status: ns }, `Статус: ${ns}`);
      toast('Статус: ' + ns, 'info');
    }
  };
  // Финальный/необратимый шаг требует подтверждения; промежуточные — сразу
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

      {/* header */}
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
        {/* general info */}
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

        {/* financial block */}
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

      {/* exchange comparison */}
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
                <Button variant="ghost" size="sm" icon="search" onClick={() => toast('Подбор нового варианта (поиск авиа)', 'info')}>Подобрать</Button>
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

      {/* documents */}
      <h3 className="section-title" style={{ fontSize: 20, margin: '26px 0 14px' }}>Документы операции</h3>
      <div className="card card-pad">
        {op.documents.length ? op.documents.map((d, i) => (
          <div className="ver-row" key={i}>
            <span className="ver-badge" style={{ background: 'var(--blue-soft)' }}><Icon name="docs" style={{ width: 16, height: 16 }} /></span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{d.kind} · v{d.v}</div></div>
            <Pill tone={DOC_STATUS2[d.status] || 'gray'}>{d.status}</Pill>
            <button className="icon-btn" onClick={() => toast('Скачивание…', 'info')} style={{ marginLeft: 8 }}><Icon name="download" /></button>
          </div>
        )) : <div style={{ color: 'var(--muted-2)', padding: '8px 0' }}>Документы ещё не приложены</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => toast('Загрузка файла', 'info')}>Загрузить</Button>
          {op.type === 'Оформление справки' && <Button size="sm" icon="docs" onClick={() => toast('Справка сформирована', 'ok')}>Сформировать справку</Button>}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted-2)' }}>Все документы автоматически связываются с операцией {op.no} и заказом № {op.order}.</div>
      </div>

      {/* history */}
      <h3 className="section-title" style={{ fontSize: 20, margin: '26px 0 14px' }}>История изменений</h3>
      <div className="card card-pad" style={{ maxWidth: 680 }}>
        <div className="timeline">
          {[...op.history].reverse().map((h, i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Input placeholder="Комментарий сотрудника…" style={{ flex: 1 }} /><Button icon="send" onClick={() => toast('Комментарий добавлен')}>Добавить</Button>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} title={confirm && confirm.title} message={confirm && confirm.message}
        confirmLabel={confirm && confirm.confirmLabel} confirmVariant={confirm && confirm.confirmVariant}
        onConfirm={() => { const c = confirm; setConfirm(null); c && c.onConfirm && c.onConfirm(); }}
        onCancel={() => setConfirm(null)} />
    </div>
  );
}

/* ====================================================================
   MODULE: list (registry / compact) + card + new
   ==================================================================== */
function ReturnsModule({ scopeOrder, onOpenOrder, compact, order }) {
  const toast = useToast();
  const [ops, setOps] = useState(RETURNS.filter((r) => !scopeOrder || r.order === scopeOrder));
  const [view, setView] = useState('list');
  const [activeNo, setActiveNo] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState('');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [sel, setSel] = useState([]);
  const { sort, onSort, apply } = useSort({ col: 'created', dir: 'desc' });

  const active = ops.find((o) => o.no === activeNo);
  const updateOp = (no, patch, histText) => setOps((cur) => cur.map((o) => o.no === no ? { ...o, ...patch, history: histText ? [...o.history, { t: 'сейчас', text: histText, who: 'Даниель' }] : o.history } : o));
  const createOp = (d) => {
    const no = 'R-' + Math.floor(7030 + Math.random() * 60);
    const parts = d.participants && d.participants.length ? d.participants : ['—'];
    const nf = d.newFlight;
    const np = { no, order: order ? order.no : (scopeOrder || 51162), client: order ? order.client : 'Клиент', type: d.type, service: d.svc, supplier: '—', initiator: 'Оператор', resp: 'Даниель', status: 'Создано', created: '15.06.2026', deadline: '18.06.2026', currency: 'USD', finOp: null, participants: parts,
      fin: { original: d.original, supplierPenalty: d.penalty, serviceFee: d.fee, extraHold: 0, refund: d.refund },
      exchange: d.type === 'Обмен билета' ? { oldP: { route: d.svc, date: '—', fare: d.voluntary ? 'Добровольный' : 'Вынужденный', price: d.original }, newP: { route: (nf && (nf.from || nf.to)) ? ((nf.from || '—') + ' → ' + (nf.to || '—')) : '—', date: nf && nf.date ? fmtDate(nf.date) : '—', fare: nf && nf.flightNo ? nf.flightNo : '—', price: d.original }, diff: 0 } : undefined,
      documents: (d.docs || []).map((n) => ({ name: n, kind: 'Основание', status: 'Загружен', v: 1 })),
      history: [{ t: 'сейчас', text: 'Запрос создан' + (parts[0] !== '—' ? ' · ' + parts.length + ' пасс.' : '') + (d.voluntary === false ? ' · вынужденный' : ''), who: 'Даниель' }] };
    setOps((cur) => [np, ...cur]); setNewOpen(false); setActiveNo(no); setView('card');
    toast(no + ' создан', 'ok', { title: 'Запрос оформлен', action: { label: 'Открыть «Возвраты и обмены»', route: 'returns' } });
  };

  if (view === 'card' && active) return (
    <>
      <ReturnCard op={active} onBack={() => setView('list')} onChange={updateOp} />
      <NewReturnModal open={newOpen} order={order} services={ORDER_SERVICES} onClose={() => setNewOpen(false)} onCreate={createOp} />
    </>
  );

  // ----- compact list (inside order card) -----
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
        <NewReturnModal open={newOpen} order={order} services={ORDER_SERVICES} onClose={() => setNewOpen(false)} onCreate={createOp} />
      </div>
    );
  }

  // ----- full registry -----
  let rows = ops.filter((o) => (!fType || o.type === fType) && (!fStatus || o.status === fStatus) &&
    (!q || `${o.no} ${o.order} ${o.client} ${o.service}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { no: (r) => r.no, order: (r) => r.order, refund: (r) => calcRefund(r.fin), created: (r) => r.created });

  const activeCount = ops.filter((o) => !isTerminal(o.status) && o.status !== 'Завершено').length;
  const STATS = [['Активные', activeCount], ['Возвраты', ops.filter((o) => o.type === 'Возврат билета').length], ['Обмены', ops.filter((o) => o.type === 'Обмен билета').length], ['Сумма к возврату', rUsd(ops.reduce((s, o) => s + (o.status !== 'Отклонено' && o.status !== 'Отменено' ? calcRefund(o.fin) : 0), 0))]];

  const toggleSel = (no) => setSel((s) => s.includes(no) ? s.filter((x) => x !== no) : [...s, no]);
  const bulkAdvance = () => { setOps((cur) => cur.map((o) => sel.includes(o.no) && !isTerminal(o.status) && o.status !== 'Завершено' ? { ...o, status: nextStatus(o.status) } : o)); toast(`Переведено операций: ${sel.length}`, 'ok'); setSel([]); };

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
      <NewReturnModal open={newOpen} order={order} services={ORDER_SERVICES} onClose={() => setNewOpen(false)} onCreate={createOp} />
    </div>
  );
}

function ReturnsPage({ onOpenOrder }) {
  return (<><Topbar title="Возвраты и обмены" /><div className="content"><ReturnsModule onOpenOrder={onOpenOrder} /></div></>);
}

Object.assign(window, { ReturnsModule, ReturnCard, ReturnsPage, NewReturnModal, ProcessFlow });
