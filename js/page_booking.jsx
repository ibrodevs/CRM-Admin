// ===== BOOKING WIZARD: «Начать бронирование» (full-page 7-step flow) =====

function bwRub(s) { return (s.currency === 'USD' || s.currency === '$') ? s.sum * 90 : s.sum; }
function bwMoney(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }

/* shared stepper + top summary */
function BwStepper({ steps, step, onJump }) {
  return (
    <div className="bw-stepper">
      {steps.map((label, i) => (
        <div key={i} className={'bw-step' + (i === step ? ' active' : (i < step ? ' done' : ''))}
          onClick={() => i < step && onJump(i)}>
          <span className="bn">{i < step ? <Icon name="check" /> : i + 1}</span>
          <span className="bl">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* readiness checklist aside */
function BwReadiness({ items, title = 'Статус готовности' }) {
  return (
    <div className="bw-aside">
      <h4>{title}</h4>
      {items.map((it, i) => (
        <div key={i} className={'bw-check ' + it.tone}>
          <Icon name={it.tone === 'ok' ? 'checkCircle' : it.tone === 'wait' ? 'clock' : 'alertCircle'} />
          <span>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

/* one service row */
function BwSvc({ s, status, tone, right }) {
  const k = SERVICE_KIND[s.kind] || SERVICE_KIND['Авиа'];
  return (
    <div className="bw-svc">
      <span className="ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">{s.title}</div>
        <div className="s">{s.sub} · {s.supplier}</div>
      </div>
      {status && <Pill tone={tone || 'gray'}>{status}</Pill>}
      {right !== undefined ? right : <div style={{ fontWeight: 700, color: 'var(--ink)', minWidth: 96, textAlign: 'right' }}>{ocMoney(s.sum, s.currency)}</div>}
    </div>
  );
}

/* synthesize a КП-shaped proposal from the booking's services so the existing branded
   KPPreviewDoc (firm letterhead + price breakdown) can render it as a downloadable offer —
   this is the "convert supplier blank into our branded offer" step. */
function offerFromServices(order, services, total, fee, rec) {
  const rubOf = (n, s) => (s.currency === 'USD' || s.currency === '$') ? n * 90 : n;
  const items = services.map((s) => { const c = svcCalc(s); const feeRub = rubOf(c.fee || 0, s); return { id: s.id, kind: s.kind, title: s.title, sub: s.sub, cost: bwRub(s) - feeRub, fee: feeRub }; });
  if (rec) items.push({ id: 'extra', kind: 'Группа', title: 'Доп. услуги и страхование', sub: 'Рекомендованный пакет', cost: 61000, fee: 0 });
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return {
    id: 'ПРЕД-' + (order ? order.no : '0000'), client: order ? order.client : '—', order: order ? order.no : 0,
    created: `${p(now.getDate())}.${p(now.getMonth() + 1)}.${now.getFullYear()}`,
    validUntil: `${p(now.getDate())}.${p(now.getMonth() + 1)}.${now.getFullYear()}`,
    currency: '₽', approvedVariant: null,
    variants: [{ id: 'v1', name: rec ? 'Расширенный вариант' : 'Базовый вариант', items }],
  };
}

function BookingWizard({ order, services, draft, onClose, onComplete, onSaveDraft }) {
  const toast = useToast();
  const [step, setStep] = useState(draft ? draft.step : 0);
  const [method, setMethod] = useState(draft ? draft.method : 'ind');
  const [pay, setPay] = useState(draft ? draft.pay : 'invoice');
  const [histOpen, setHistOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [offerPreview, setOfferPreview] = useState(null); // { rec: bool } | null
  // progress is auto-saved as a draft on every change — the operator can switch to other
  // sections of the order or close the wizard at any point and resume exactly where they left off
  useEffect(() => { onSaveDraft && onSaveDraft({ step, method, pay }); }, [step, method, pay]);
  const saveDraftAndExit = () => { toast('Бронирование сохранено как черновик — можно продолжить в любой момент', 'ok'); onClose(); };

  const STEPS = ['Выбор варианта', 'Запуск', 'Получение ответов', 'Подтверждение', 'Формирование КП', 'Выписка и оплата', 'Завершение'];
  const total = services.reduce((a, s) => a + bwRub(s), 0);
  const fee = 1900;
  const route = (services.find((s) => s.kind === 'Авиа') || {}).title || (order && order.no ? 'Заказ № ' + order.no : 'Маршрут заказа');
  const kinds = [...new Set(services.map((s) => s.kind))];

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  // readiness items (vary per step)
  const readiness = [
    { tone: 'ok', text: 'Все услуги добавлены в заказ' },
    { tone: 'ok', text: 'Пассажиры и документы заполнены' },
    { tone: step >= 2 ? 'ok' : 'wait', text: 'Запрос отправлен поставщикам' },
    { tone: step >= 3 ? 'ok' : 'idle', text: 'Ответы получены и подтверждены' },
    { tone: step >= 5 ? 'ok' : 'idle', text: 'Документы выписаны' },
  ];

  // booking-status by step for each service (visual)
  const svcView = (s, i) => {
    if (step <= 1) return { status: 'Готово к запуску', tone: 'gray' };
    if (step === 2) return i === 0 ? { status: 'Подтверждено', tone: 'green' } : { status: 'Ожидание ответа', tone: 'amber' };
    if (step < 5) return { status: 'Подтверждено', tone: 'green' };
    return { status: step >= 6 ? 'Выписано' : 'К выписке', tone: step >= 6 ? 'green' : 'blue' };
  };

  /* ---- per-step main content ---- */
  const content = () => {
    switch (step) {
      case 0: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>Выберите способ бронирования</div>
          <div className="grid-2" style={{ marginBottom: 22 }}>
            <div className={'bw-method' + (method === 'ind' ? ' sel' : '')} onClick={() => setMethod('ind')}>
              <span className="mi"><Icon name="user" /></span>
              <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15.5 }}>Индивидуальное бронирование</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Автоматическая отправка запросов поставщикам по каждой услуге</div></div>
            </div>
            <div className={'bw-method' + (method === 'group' ? ' sel' : '')} onClick={() => setMethod('group')}>
              <span className="mi"><Icon name="users" /></span>
              <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15.5 }}>Групповой запрос</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Единый запрос на группу — ручное подтверждение поставщиком</div></div>
            </div>
          </div>
          <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Услуги к бронированию</div>
          {services.map((s, i) => <BwSvc key={s.id} s={s} />)}
        </div>
      );
      case 1: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 6 }}>Запуск бронирования</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>Запросы будут отправлены поставщикам одновременно. Тайм-лимиты начнут отсчёт после запуска.</div>
          {services.map((s, i) => { const v = svcView(s, i); return <BwSvc key={s.id} s={s} status={v.status} tone={v.tone} />; })}
        </div>
      );
      case 2: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ fontSize: 18 }}>Получение ответов от поставщиков</div>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" size="sm" icon="chat" onClick={() => setSupportOpen(true)}>Написать в поддержку</Button>
            <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История запросов</Button>
          </div>
          {services.map((s, i) => { const v = svcView(s, i); return (
            <BwSvc key={s.id} s={s} status={v.status} tone={v.tone}
              right={<div style={{ textAlign: 'right', minWidth: 120 }}>
                <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{ocMoney(s.sum, s.currency)}</div>
                <div style={{ fontSize: 12, color: v.tone === 'amber' ? 'var(--amber)' : 'var(--muted)' }}>{v.tone === 'amber' ? 'тайм-лимит 17:00' : 'ответ получен'}</div>
              </div>} />
          ); })}
        </div>
      );
      case 3: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 14 }}>Подтверждение услуг</div>
          {services.map((s) => <BwSvc key={s.id} s={s} status="Подтверждено" tone="green" />)}
        </div>
      );
      case 4: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 6 }}>Сформировать обновлённое КП</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 16 }}>Сравните варианты и отправьте клиенту на согласование перед выпиской.</div>
          <div className="grid-2">
            {[['Базовый вариант', total, false], ['Расширенный вариант', total + 61000, true]].map(([title, sum, rec]) => (
              <div key={title} className={'card card-pad' + (rec ? '' : '')} style={{ border: rec ? '1px solid var(--blue)' : null, boxShadow: rec ? '0 0 0 2px var(--blue-soft)' : null }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15.5 }}>{title}</div>
                  {rec && <Pill tone="blue">Рекомендуем</Pill>}
                </div>
                {services.map((s) => <div key={s.id} className="kv-row"><span className="k">{s.title}</span><span className="v">{ocMoney(s.sum, s.currency)}</span></div>)}
                {rec && <div className="kv-row"><span className="k">Доп. услуги и страхование</span><span className="v" style={{ color: 'var(--green)' }}>+ 61 000 ₽</span></div>}
                <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итого</span><span className="v" style={{ fontSize: 18 }}>{bwMoney(sum)}</span></div>
                <Button variant="secondary" size="sm" icon="eye" className="btn-block" style={{ marginTop: 12 }} onClick={() => setOfferPreview({ rec })}>Просмотр предложения</Button>
              </div>
            ))}
          </div>
        </div>
      );
      case 5: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 14 }}>Выписка и оплата</div>
          {services.map((s, i) => { const v = svcView(s, i); return (
            <BwSvc key={s.id} s={s} status={v.status} tone={v.tone}
              right={<Button size="sm" icon="ticket" variant="secondary" onClick={() => toast('Документ выписан: ' + s.title, 'ok')}>Выписать</Button>} />
          ); })}
          <div className="card card-pad" style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Способ оплаты</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[['invoice', 'Счёт клиенту'], ['card', 'Банковская карта'], ['balance', 'С баланса компании'], ['cash', 'Наличные']].map(([k, l]) => (
                <button key={k} className={'tab' + (pay === k ? ' active' : '')} onClick={() => setPay(k)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      );
      case 6: return (
        <div>
          <div className="card">
            <div className="bw-done-card">
              <div className="bw-done-ic"><Icon name="check" /></div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Заказ успешно завершён</h2>
              <div style={{ color: 'var(--muted)', fontSize: 14.5 }}>Все услуги забронированы, выписаны и подтверждены</div>
              <div className="grid-4" style={{ marginTop: 22, textAlign: 'left' }}>
                {[['Номер заказа', order && order.no ? '№ ' + order.no : '№ 51181'], ['Сумма заказа', bwMoney(total + fee)], ['Услуг', services.length], ['Способ', method === 'group' ? 'Групповой' : 'Индивидуальный']].map(([l, v]) => (
                  <div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 20 }}>{v}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Что дальше?</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="secondary" icon="download" onClick={() => toast('Документы скачаны', 'ok')}>Скачать документы</Button>
              <Button variant="secondary" icon="send" onClick={() => toast('Документы отправлены клиенту', 'ok')}>Отправить клиенту</Button>
              <Button variant="secondary" icon="finance" onClick={() => toast('Открыты финансы заказа', 'info')}>Открыть финансы</Button>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  /* ---- per-step aside ---- */
  const aside = () => {
    if (step === 2) return (
      <div className="bw-aside">
        <h4>Идёт получение ответов</h4>
        <div className="bw-prog" style={{ '--p': '72%' }}><span>72%</span></div>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Получено {Math.max(1, services.length - 1)} из {services.length} ответов</div>
        <BwReadiness title="Состояние" items={services.map((s, i) => ({ tone: svcView(s, i).tone === 'green' ? 'ok' : 'wait', text: s.kind + ' — ' + svcView(s, i).status }))} />
      </div>
    );
    if (step === 3 || step === 5) return (
      <div>
        <div className="bw-aside">
          <h4>{step === 3 ? 'Готовность к выписке' : 'Сводка по заказу'}</h4>
          {services.map((s) => <div key={s.id} className="kv-row"><span className="k">{s.kind}</span><span className="v">{ocMoney(s.sum, s.currency)}</span></div>)}
          <div className="kv-row"><span className="k">Сервисный сбор</span><span className="v">{bwMoney(fee)}</span></div>
          <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итого</span><span className="v" style={{ fontSize: 18 }}>{bwMoney(total + fee)}</span></div>
        </div>
        <BwReadiness items={readiness} title="Документы к выпуску" />
      </div>
    );
    if (step === 6) return (
      <div className="bw-aside">
        <h4>Информация о заказе</h4>
        <div className="kv">
          <div className="kv-row"><span className="k">Клиент</span><span className="v">{order ? order.client : '—'}</span></div>
          <div className="kv-row"><span className="k">Маршрут</span><span className="v">{route}</span></div>
          <div className="kv-row"><span className="k">Статус</span><span className="v"><Pill tone="green">Завершён</Pill></span></div>
          <div className="kv-row"><span className="k">Оплата</span><span className="v"><Pill tone="green">Оплачено</Pill></span></div>
          <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k">Итого</span><span className="v" style={{ fontSize: 17 }}>{bwMoney(total + fee)}</span></div>
        </div>
      </div>
    );
    return <BwReadiness items={readiness} />;
  };

  /* ---- footer ---- */
  const footer = () => {
    if (step === 0) return <><Button variant="secondary" onClick={onClose}>Отмена</Button><div style={{ flex: 1 }} /><Button iconRight="arrowRight" onClick={next}>Продолжить</Button></>;
    if (step === 1) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button icon="zap" onClick={() => { toast('Бронирование запущено', 'ok'); next(); }}>Запустить бронирование</Button></>;
    if (step === 2) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button icon="check" onClick={next}>Все ответы получены</Button></>;
    if (step === 3) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button variant="secondary" icon="template" onClick={next}>Сформировать КП</Button><Button iconRight="arrowRight" onClick={() => setStep(5)}>К выписке и оплате</Button></>;
    if (step === 4) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button variant="secondary" onClick={() => setStep(5)}>Создать без согласования</Button><Button icon="send" onClick={() => { toast('КП отправлено на согласование', 'ok'); setStep(5); }}>Отправить на согласование</Button></>;
    if (step === 5) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button icon="check" onClick={() => { toast('Документы выписаны, оплата принята', 'ok'); next(); }}>Выписать и принять оплату</Button></>;
    return <><div style={{ flex: 1 }} /><Button icon="check" onClick={() => { onComplete && onComplete(); onClose(); }}>Готово</Button></>;
  };

  return (
    <div className="fade-in">
      <BackRow label="К услугам заказа" onBack={saveDraftAndExit} />

      {/* top summary */}
      <div className="bw-top">
        <div className="bw-route"><Icon name="route" />{route}</div>
        <div style={{ flex: 1 }} />
        <div className="bw-svc-chips">
          {kinds.map((k) => (
            <span className="bw-svc-chip" key={k}><span className="dot" /><Icon name={(SERVICE_KIND[k] || {}).icon || 'plane'} />{k}</span>
          ))}
        </div>
        <Button variant="secondary" size="sm" icon="clipboard" onClick={saveDraftAndExit}>Сохранить как черновик</Button>
      </div>

      <BwStepper steps={STEPS} step={step} onJump={setStep} />

      <div className="bw-grid">
        <div>{content()}</div>
        <div>{aside()}</div>
      </div>

      <div className="bw-footer">{footer()}</div>

      {/* request history drawer */}
      <Drawer open={histOpen} onClose={() => setHistOpen(false)} title="История запросов">
        <div className="timeline">
          {[
            ['14:02', 'Запрос отправлен — Air Astana (API)', 'Авиабилеты'],
            ['14:03', 'Запрос отправлен — Booking B2B', 'Гостиница'],
            ['14:05', 'Подтверждение получено — Air Astana', 'Авиабилеты'],
            ['14:18', 'Уточнение тарифа — Booking B2B', 'Гостиница'],
            ['14:31', 'Запрос отправлен — Karimov Transfer', 'Трансфер'],
          ].map(([t, txt, tag], i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div><div className="tl-time">{t} · {tag}</div><div className="tl-text">{txt}</div></div></div>
          ))}
        </div>
      </Drawer>

      {/* support / supplier chat — "Написать в поддержку" */}
      <Drawer open={supportOpen} onClose={() => setSupportOpen(false)} title="Поддержка">
        <div style={{ height: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '-28px -32px' }}>
          {order && <ChatThread thread={getThreadForOrder(order)} embedded initChannel="supplier" />}
        </div>
      </Drawer>

      {/* branded offer preview — converts the supplier blanks into our letterhead document */}
      <Modal open={!!offerPreview} onClose={() => setOfferPreview(null)}>
        {offerPreview && (() => {
          const offer = offerFromServices(order, services, total, fee, offerPreview.rec);
          return (
            <div style={{ padding: '24px 26px' }}>
              <ModalHeader title="Предложение для клиента" sub={offer.id} onClose={() => setOfferPreview(null)} />
              <div style={{ background: 'var(--surface-2)', padding: 20, borderRadius: 14 }}>
                <KPPreviewDoc proposal={offer} />
              </div>
              <div className="modal-actions">
                <Button variant="secondary" icon="download" onClick={() => toast('PDF скачан', 'ok')}>Скачать PDF</Button>
                <Button icon="send" onClick={() => { toast('Предложение отправлено клиенту', 'ok'); setOfferPreview(null); }}>Отправить клиенту</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

Object.assign(window, { BookingWizard, offerFromServices });
