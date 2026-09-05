import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { Button, Drawer, EmptyState, Pill, useToast } from './ui';
import { SERVICE_KIND } from './data';
import { OperationConfirmModal } from './order_ops';
import { BackRow } from './components/back-row';
import { ocMoney, svcCalc } from './features/orders/finance';
import { KPPreviewDoc } from './page_offers';
import { ChatThread, getThreadForOrder } from './page_chats';
import { bookingApi, documentsApi, ordersApi, proposalsApi } from './api/resources';
import { resultsOf } from './api/client';



function bwRub(s) { return Number(s?.sum || 0); }
function bwMoney(n, currency = 'RUB') {
  const symbol = { RUB: '₽', USD: '$', EUR: '€', KGS: 'сом' }[currency] || currency;
  return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + symbol;
}


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

const BOOKABLE_SERVICE_STATUSES = new Set(['Предложено', 'Предложение', 'На согласовании', 'Согласование', 'proposed', 'approval']);

function isServiceBookable(service) {
  return BOOKABLE_SERVICE_STATUSES.has(service?.status);
}




function offerFromServices(order, services) {
  const items = services.map((s) => { const c = svcCalc(s); return { id: s.id, kind: s.kind, title: s.title, sub: s.sub, cost: Number(c.tariff || 0), fee: Number(c.fee || 0) }; });
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return {
    id: 'ПРЕД-' + (order ? order.no : '0000'), client: order ? order.client : '—', order: order ? order.no : 0,
    created: `${p(now.getDate())}.${p(now.getMonth() + 1)}.${now.getFullYear()}`,
    validUntil: `${p(now.getDate())}.${p(now.getMonth() + 1)}.${now.getFullYear()}`,
    currency: services[0]?.currency || order?.currency || order?.base_currency || 'RUB', approvedVariant: null,
    variants: [{ id: 'v1', name: 'Основной вариант', items }],
  };
}

function BookingWizard({ order, services, draft, onClose, onComplete, onSaveDraft }) {
  const toast = useToast();


  const isGroupOrder = !!(order && (order.requestType === 'Групповая' || order.requestType === 'Корпоративная'));
  const [step, setStep] = useState(draft ? draft.step : 0);
  const [method, setMethod] = useState(isGroupOrder ? (draft ? draft.method : 'ind') : 'ind');
  const [pay, setPay] = useState(draft ? draft.pay : 'invoice');
  const [histOpen, setHistOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [offerPreview, setOfferPreview] = useState(null);
  const [contactSvc, setContactSvc] = useState(null);
  const [opConfirm, setOpConfirm] = useState(null);
  const [workflow, setWorkflow] = useState(draft?.workflow || null);
  const [workflowState, setWorkflowState] = useState(draft?.workflowState || null);
  const [issueRequested, setIssueRequested] = useState(false);
  const [history, setHistory] = useState([]);
  const [serverProposal, setServerProposal] = useState(draft?.serverProposal || null);
  const [busy, setBusy] = useState(false);
  const bookingServices = services.filter(isServiceBookable);
  const skippedServices = services.filter((service) => !isServiceBookable(service));

  useEffect(() => { onSaveDraft && onSaveDraft({ step, method, pay, workflow, workflowState, serverProposal }); }, [step, method, pay, workflow, workflowState, serverProposal]);
  const saveDraftAndExit = () => { onClose(); };



  const STEPS = ['Выбор вариантов', 'Получение ответов', 'Подтверждение', 'Выписка и оплата', 'Завершение'];
  const currency = bookingServices[0]?.currency || order?.currency || order?.base_currency || 'RUB';
  const sameCurrency = bookingServices.every((service) => (service.currency || currency) === currency);
  const total = sameCurrency ? bookingServices.reduce((a, s) => a + bwRub(s), 0) : 0;
  const fee = sameCurrency ? bookingServices.reduce((sum, service) => sum + Number(svcCalc(service).fee || 0), 0) : 0;
  const route = (bookingServices.find((s) => s.kind === 'Авиа') || services.find((s) => s.kind === 'Авиа') || {}).title || (order && order.no ? 'Заказ № ' + order.no : 'Маршрут заказа');
  const kinds = [...new Set(bookingServices.map((s) => s.kind))];

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const startBooking = async () => {
    if (!bookingServices.length) {
      toast('Нет услуг в статусе «Предложено» или «На согласовании» для бронирования', 'info');
      return;
    }
    setBusy(true);
    try {
      const created = await bookingApi.create({ order: order.id, services: bookingServices.map((service) => service.serverId || service.id) });
      await bookingApi.preflight(created.id);
      const started = await bookingApi.start(created.id, true);
      setWorkflow(created.id);
      setWorkflowState(started.workflow || created);
      toast('Бронирование запущено — запросы отправлены поставщикам', 'ok');
      next();
    } catch (error) { toast(error.message, 'err'); }
    finally { setBusy(false); }
  };
  const refreshWorkflow = async () => {
    if (!workflow) return;
    try {
      const current = await bookingApi.status(workflow);
      setWorkflowState(current);
      const pending = current.items?.some((item) => ['pending', 'booking'].includes(item.status));
      if (pending) return toast('Ответы поставщиков ещё обрабатываются', 'info');
      if (current.items?.some((item) => ['booked', 'issued'].includes(item.status))) next();
      else toast('Ни одна услуга не забронирована. Проверьте ошибки поставщиков.', 'err');
    } catch (error) { toast(error.message, 'err'); }
  };
  const issueWorkflow = async () => {
    if (!workflow) return toast('Сначала запустите бронирование', 'err');
    setBusy(true);
    try {
      await bookingApi.issue(workflow, {});
      toast('Выписка поставлена в очередь', 'ok');
      setIssueRequested(true);
    } catch (error) { toast(error.message, 'err'); }
    finally { setBusy(false); }
  };
  const orderDocuments = async () => resultsOf(await documentsApi.list({ order: order.id }));
  const downloadDocuments = async () => {
    try {
      const docs = await orderDocuments();
      if (!docs.length) return toast('Для заказа пока нет сформированных документов', 'info');
      docs.forEach((doc, index) => setTimeout(() => window.open(documentsApi.downloadUrl(doc.id), index ? 150 * index : 0), index ? 150 * index : 0));
      toast(`Открыто документов: ${docs.length}`, 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const sendDocuments = async () => {
    try {
      const docs = await orderDocuments();
      if (!docs.length) return toast('Для заказа пока нет сформированных документов', 'info');
      await Promise.all(docs.map((doc) => documentsApi.send(doc.id, 'email')));
      toast(`Отправлено документов: ${docs.length}`, 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const supplierAction = async (action, service) => {
    try {
      await ordersApi.createTask(order.id, {
        title: action.endsWith('callback') ? `Связаться с поставщиком: ${service.supplier || service.title}` : `Ускорить ответ поставщика: ${service.supplier || service.title}`,
        description: `Услуга: ${service.title}. Workflow бронирования: ${workflow || 'не создан'}`,
        priority: action.endsWith('callback') ? 'normal' : 'high',
      });
      toast(action.endsWith('callback') ? 'Задача на звонок поставщику создана' : 'Срочная задача по ответу поставщика создана', 'ok');
      if (action.endsWith('expedite')) setContactSvc(null);
    } catch (error) { toast(error.message, 'err'); }
  };

  const itemForService = (service) => workflowState?.items?.find((item) => String(item.service) === String(service.serverId || service.id));
  const itemView = (service) => {
    const item = itemForService(service);
    const map = {
      pending: ['Ожидает запуска', 'gray'], booking: ['Бронирование', 'blue'], booked: ['Забронировано', 'green'],
      issuing: ['Выписка', 'blue'], issued: ['Выписано', 'green'], failed: ['Ошибка', 'red'],
      unknown: ['Результат неизвестен', 'amber'], compensated: ['Отменено', 'gray'], skipped: ['Пропущено', 'gray'],
    };
    const [status, tone] = map[item?.status] || ['Ожидает данных backend', 'gray'];
    return { item, status, tone };
  };
  const refreshIssue = async () => {
    if (!workflow) return;
    try {
      const current = await bookingApi.status(workflow);
      setWorkflowState(current);
      const pending = current.items?.some((item) => ['booking', 'issuing', 'pending'].includes(item.status));
      const allIssued = current.items?.length > 0 && current.items.every((item) => ['issued', 'skipped'].includes(item.status));
      if (allIssued) next();
      else if (pending) toast('Операции у поставщиков ещё выполняются', 'info');
      else toast('Выписка завершилась не по всем услугам. Проверьте статусы.', 'warn');
    } catch (error) { toast(error.message, 'err'); }
  };
  const inquireItem = async (item) => {
    try { await bookingApi.inquiry(workflow, item.id); toast('Проверка результата поставлена в очередь', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
  };

  useEffect(() => {
    if (!histOpen || !order?.id) return undefined;
    const controller = new AbortController();
    ordersApi.history(order.id, {}, controller.signal).then((payload) => setHistory(resultsOf(payload))).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); });
    return () => controller.abort();
  }, [histOpen, order?.id]);
  const sendProposal = async () => {
    setBusy(true);
    try {
      let proposal = serverProposal;
      if (!proposal) {
        proposal = await proposalsApi.create({
          order: order.id, type: 'booking', purpose: 'Подтверждение вариантов перед выпиской',
          currency: bookingServices[0]?.currency || order?.currency || order?.base_currency || 'RUB',
          variants: [{ name: 'Основной вариант', items: bookingServices.map((service) => ({
            service: service.serverId || service.id, title: service.title, description: service.sub || '',
            quantity: 1, price_amount: service.sum || 0, price_currency: service.currency || order?.currency || order?.base_currency || 'RUB',
          })) }],
        });
        proposal = await proposalsApi.prepare(proposal.id, proposal.version);
      }
      proposal = await proposalsApi.send(proposal.id, proposal.version);
      setServerProposal(proposal);
      toast(`КП ${proposal.number} отправлено клиенту`, 'ok');
    } catch (error) { toast(error.message, 'err'); }
    finally { setBusy(false); }
  };


  const readiness = [
    { tone: bookingServices.length ? 'ok' : 'wait', text: `Услуг к обработке: ${bookingServices.length}` },
    { tone: workflow ? 'ok' : 'wait', text: workflow ? 'Workflow создан в backend' : 'Workflow ещё не создан' },
    { tone: workflowState?.items?.some((item) => item.status === 'booked') ? 'ok' : 'wait', text: 'Есть подтверждённые бронирования' },
    { tone: workflowState?.items?.length && workflowState.items.every((item) => ['issued', 'skipped'].includes(item.status)) ? 'ok' : 'wait', text: 'Выписка завершена' },
  ];


  const svcView = (service) => step === 0 ? { status: 'Готово к бронированию', tone: 'gray' } : itemView(service);


  const content = () => {
    switch (step) {
      case 0: return (
        <div>
          {isGroupOrder && (
            <>
              <div className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>Выберите способ бронирования</div>
              <div className="grid-2" style={{ marginBottom: 22 }}>
                <div className={'bw-method' + (method === 'ind' ? ' sel' : '')} onClick={() => setMethod('ind')}>
                  <span className="mi"><Icon name="user" /></span>
                  <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>Индивидуальное бронирование</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Автоматическая отправка запросов поставщикам по каждой услуге</div></div>
                </div>
                <div className={'bw-method' + (method === 'group' ? ' sel' : '')} onClick={() => setMethod('group')}>
                  <span className="mi"><Icon name="users" /></span>
                  <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>Групповой запрос</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Единый запрос на группу — ручное подтверждение поставщиком</div></div>
                </div>
              </div>
            </>
          )}
          <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Услуги к бронированию</div>
          {bookingServices.length ? bookingServices.map((s, i) => <BwSvc key={s.id} s={s} />) : (
            <EmptyState icon="checkCircle" title="Нечего бронировать" sub="Все услуги уже забронированы, выписаны или отменены. Добавьте новую услугу или откройте постпродажу по оформленным билетам." />
          )}
          {skippedServices.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {skippedServices.map((s) => <BwSvc key={'skip-' + s.id} s={s} status={s.status || 'Недоступно'} tone="gray" />)}
            </div>
          )}

          <div className="card card-pad bw-kp-note" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span className="bw-kp-ic"><Icon name="template" /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Ознакомительное КП</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Стоимость предварительная и не зафиксирована — итоговые суммы зафиксируются на этапе «Подтверждение» по тайм-лимиту.</div>
            </div>
            <Button variant="secondary" icon="eye" onClick={() => setOfferPreview({ rec: false, draft: true })}>Сформировать КП</Button>
          </div>
        </div>
      );
      case 1: return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <div className="section-title" style={{ fontSize: 18 }}>Получение ответов от поставщиков</div>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" size="sm" icon="chat" onClick={() => setSupportOpen(true)}>Написать в поддержку</Button>
            <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История запросов</Button>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>Тайм-лимиты идут по каждой услуге. Продлите лимит или свяжитесь с поставщиком, чтобы ускорить ответ.</div>
          {bookingServices.map((s) => { const v = svcView(s); const wait = ['gray', 'blue', 'amber'].includes(v.tone); return (
            <BwSvc key={s.id} s={s} status={v.status} tone={v.tone}
              right={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {wait ? (
                  <div className="bw-tl">
                    <span className="bw-tl-time"><Icon name="clock" />{v.status}</span>
                    {v.item?.status === 'unknown' && <button className="bw-tl-btn" onClick={() => inquireItem(v.item)}><Icon name="loader" />Проверить</button>}
                    <button className="bw-tl-btn alt" onClick={() => setContactSvc(s)}><Icon name="chat" />Создать задачу</button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{ocMoney(s.sum, s.currency)}</div>
                    <div style={{ fontSize: 12, color: 'var(--green)' }}>{v.item?.locator ? `PNR ${v.item.locator}` : 'ответ получен'}</div>
                  </div>
                )}
              </div>} />
          ); })}
        </div>
      );
      case 2: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 6 }}>Подтверждение услуг</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Стоимость зафиксирована по тайм-лимиту. КП формируется с фиксированными суммами для согласования с клиентом.</div>
          {bookingServices.map((s) => { const v = svcView(s); return <BwSvc key={s.id} s={s} status={v.status} tone={v.tone} />; })}
          <div className="section-title" style={{ fontSize: 16, margin: '22px 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
            КП с фиксированными суммами <Pill tone="green">Цена зафиксирована</Pill>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Сравните варианты и отправьте клиенту на согласование перед выпиской.</div>
          <div className="grid-2">
            {[['Основной вариант', total]].map(([title, sum]) => (
              <div key={title} className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>{title}</div>
                </div>
                {bookingServices.map((s) => <div key={s.id} className="kv-row"><span className="k">{s.title}</span><span className="v">{ocMoney(s.sum, s.currency)}</span></div>)}
                <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итого</span><span className="v" style={{ fontSize: 18 }}>{sameCurrency ? bwMoney(sum, currency) : 'несколько валют'}</span></div>
                <Button variant="secondary" size="sm" icon="eye" className="btn-block" style={{ marginTop: 12 }} onClick={() => setOfferPreview({})}>Просмотр предложения</Button>
              </div>
            ))}
          </div>
        </div>
      );
      case 3: return (
        <div>
          <div className="section-title" style={{ fontSize: 18, marginBottom: 14 }}>Выписка и оплата</div>
          {bookingServices.map((s) => { const v = svcView(s); return (
            <BwSvc key={s.id} s={s} status={v.status} tone={v.tone}
              right={v.item?.status === 'unknown'
                ? <Button size="sm" icon="loader" variant="secondary" disabled={busy} onClick={() => inquireItem(v.item)}>Проверить результат</Button>
                : undefined} />
          ); })}
          <div className="card card-pad" style={{ marginTop: 8, color: 'var(--muted)', fontSize: 13 }}>Оплата регистрируется отдельно в финансовом модуле и не считается принятой до подтверждения платежа в backend.</div>
        </div>
      );
      case 4: return (
        <div>
          <div className="card">
            <div className="bw-done-card">
              <div className="bw-done-ic"><Icon name="check" /></div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Заказ успешно завершён</h2>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>Все услуги забронированы, выписаны и подтверждены</div>
              <div className="grid-4" style={{ marginTop: 22, textAlign: 'left' }}>
                {[['Номер заказа', order && order.no ? '№ ' + order.no : '—'], ['Сумма заказа', sameCurrency ? bwMoney(total, currency) : 'несколько валют'], ['Услуг', bookingServices.length], ['Способ', method === 'group' ? 'Групповой' : 'Индивидуальный']].map(([l, v]) => (
                  <div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value" style={{ fontSize: 20 }}>{v}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="card card-pad" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>Что дальше?</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="secondary" icon="download" onClick={downloadDocuments}>Скачать документы</Button>
              <Button variant="secondary" icon="send" onClick={sendDocuments}>Отправить клиенту</Button>
              <Button variant="secondary" icon="finance" onClick={() => window.__toastNav && window.__toastNav('finance')}>Открыть финансы</Button>
            </div>
          </div>
        </div>
      );
      default: return null;
    }
  };


  const aside = () => {
    if (step === 1) return (
      <div className="bw-aside">
        <h4>Идёт получение ответов</h4>
        {(() => { const done = workflowState?.items?.filter((item) => !['pending', 'booking'].includes(item.status)).length || 0; const count = workflowState?.items?.length || bookingServices.length; const percent = count ? Math.round((done / count) * 100) : 0; return <><div className="bw-prog" style={{ '--p': percent + '%' }}><span>{percent}%</span></div><div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Получено {done} из {count} ответов</div></>; })()}
        <BwReadiness title="Состояние" items={bookingServices.map((s) => ({ tone: svcView(s).tone === 'green' ? 'ok' : 'wait', text: s.kind + ' — ' + svcView(s).status }))} />
      </div>
    );
    if (step === 2 || step === 3) return (
      <div>
        <div className="bw-aside">
          <h4>{step === 2 ? 'Готовность к выписке' : 'Сводка по заказу'}</h4>
          {bookingServices.map((s) => <div key={s.id} className="kv-row"><span className="k">{s.kind}</span><span className="v">{ocMoney(s.sum, s.currency)}</span></div>)}
          <div className="kv-row"><span className="k">Сервисный сбор в составе услуг</span><span className="v">{sameCurrency ? bwMoney(fee, currency) : 'несколько валют'}</span></div>
          <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итого</span><span className="v" style={{ fontSize: 18 }}>{sameCurrency ? bwMoney(total, currency) : 'несколько валют'}</span></div>
        </div>
        <BwReadiness items={readiness} title="Документы к выпуску" />
      </div>
    );
    if (step === 4) return (
      <div className="bw-aside">
        <h4>Информация о заказе</h4>
        <div className="kv">
          <div className="kv-row"><span className="k">Клиент</span><span className="v">{order ? order.client : '—'}</span></div>
          <div className="kv-row"><span className="k">Маршрут</span><span className="v">{route}</span></div>
          <div className="kv-row"><span className="k">Статус</span><span className="v"><Pill tone="green">Завершён</Pill></span></div>
          <div className="kv-row"><span className="k">Оплата</span><span className="v"><Pill tone="gray">См. финансы</Pill></span></div>
          <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k">Итого</span><span className="v" style={{ fontSize: 17 }}>{sameCurrency ? bwMoney(total, currency) : 'несколько валют'}</span></div>
        </div>
      </div>
    );
    return <BwReadiness items={readiness} />;
  };


  const footer = () => {
    if (step === 0) return <><Button variant="secondary" onClick={onClose}>Отмена</Button><div style={{ flex: 1 }} /><Button icon="zap" disabled={busy || !bookingServices.length} onClick={() => setOpConfirm({ action: 'book', onConfirm: startBooking })}>Забронировать</Button></>;
    if (step === 1) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button icon="check" onClick={refreshWorkflow}>Проверить ответы</Button></>;
    if (step === 2) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} /><Button variant="secondary" icon="send" disabled={busy} onClick={sendProposal}>Отправить КП клиенту</Button><Button iconRight="arrowRight" onClick={next}>К выписке и оплате</Button></>;
    if (step === 3) return <><Button variant="secondary" icon="chevLeft" onClick={back}>Назад</Button><div style={{ flex: 1 }} />{issueRequested ? <Button icon="loader" disabled={busy} onClick={refreshIssue}>Проверить выпуск</Button> : <Button icon="check" disabled={busy} onClick={() => setOpConfirm({ action: 'issue', onConfirm: issueWorkflow })}>Запустить выписку</Button>}</>;
    return <><div style={{ flex: 1 }} /><Button icon="check" onClick={() => { onComplete && onComplete(); onClose(); }}>Готово</Button></>;
  };

  return (
    <div className="fade-in">
      <BackRow label="К услугам заказа" onBack={saveDraftAndExit} />


      <div className="bw-top">
        <div className="bw-route"><Icon name="route" />{route}</div>
        <div style={{ flex: 1 }} />
        <div className="bw-svc-chips">
          {kinds.map((k) => (
            <span className="bw-svc-chip" key={k}><span className="dot" /><Icon name={(SERVICE_KIND[k] || {}).icon || 'plane'} />{k}</span>
          ))}
        </div>
        <Button variant="secondary" size="sm" icon="x" onClick={saveDraftAndExit}>Закрыть</Button>
      </div>

      <BwStepper steps={STEPS} step={step} onJump={setStep} />

      <div className="bw-grid">
        <div>{content()}</div>
        <div>{aside()}</div>
      </div>

      <div className="bw-footer">{footer()}</div>


      <Drawer open={histOpen} onClose={() => setHistOpen(false)} title="История запросов">
        {history.length ? <div className="timeline">
          {history.map((item) => (
            <div className="tl-item" key={item.id}><span className="tl-dot" /><span className="tl-line" />
              <div><div className="tl-time">{new Date(item.changed_at).toLocaleString('ru-RU')} · {item.changed_by_name || 'Система'}</div><div className="tl-text">{item.reason || `${item.from_status || '—'} → ${item.to_status || '—'}`}</div></div></div>
          ))}
        </div> : <EmptyState icon="clock" title="История пока пуста" sub="Здесь появятся сохранённые изменения статуса заказа." />}
      </Drawer>


      <Drawer open={supportOpen} onClose={() => setSupportOpen(false)} title="Поддержка">
        <div style={{ height: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '-28px -32px' }}>
          {order && <ChatThread thread={getThreadForOrder(order)} embedded initChannel="supplier" />}
        </div>
      </Drawer>


      <Drawer open={!!contactSvc} onClose={() => setContactSvc(null)} title={contactSvc ? 'Поставщик · ' + contactSvc.supplier : 'Поставщик'}>
        {contactSvc && (
          <div style={{ margin: '-4px 0 14px' }}>
            <div className="bw-svc" style={{ marginBottom: 12 }}>
              <span className="ic" style={{ background: (SERVICE_KIND[contactSvc.kind] || SERVICE_KIND['Авиа']).color }}><Icon name={(SERVICE_KIND[contactSvc.kind] || {}).icon || 'plane'} /></span>
              <div style={{ flex: 1, minWidth: 0 }}><div className="t">{contactSvc.title}</div><div className="s">{contactSvc.sub} · {contactSvc.supplier}</div></div>
              <Pill tone="amber">Ожидание ответа</Pill>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <Button variant="secondary" icon="phone" onClick={() => supplierAction('supplier.callback', contactSvc)}>Задача на звонок</Button>
              <Button icon="send" onClick={() => supplierAction('supplier.expedite', contactSvc)}>Срочная задача</Button>
            </div>
            <div style={{ height: 460, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 -32px -28px' }}>
              {order && <ChatThread thread={getThreadForOrder(order)} embedded initChannel="supplier" />}
            </div>
          </div>
        )}
      </Drawer>


      {offerPreview && (() => {
        const offer = offerFromServices(order, bookingServices);
        return (
          <Drawer open onClose={() => setOfferPreview(null)} width="min(760px,96vw)"
            title={offerPreview.draft ? 'Ознакомительное КП' : 'Предложение для клиента'} sub={offer.id}
            footer={<>
              <Button variant="secondary" icon="download" disabled={!serverProposal} onClick={() => serverProposal && window.open(proposalsApi.pdfUrl(serverProposal.id, serverProposal.version), '_blank')}>Скачать PDF</Button>
              <Button icon="send" disabled={busy} onClick={async () => { await sendProposal(); setOfferPreview(null); }}>Отправить клиенту</Button>
            </>}>
            <div className={'bw-kp-banner ' + (offerPreview.draft ? 'draft' : 'fixed')}>
              <Icon name={offerPreview.draft ? 'alertCircle' : 'checkCircle'} />
              {offerPreview.draft
                ? 'Стоимость предварительная и не зафиксирована — может измениться после ответов поставщиков.'
                : 'Стоимость зафиксирована по тайм-лимиту.'}
            </div>
            <div style={{ background: 'var(--surface-2)', padding: 20, borderRadius: 14, marginTop: 16 }}>
              <KPPreviewDoc proposal={offer} compact />
            </div>
          </Drawer>
        );
      })()}
      {opConfirm && <OperationConfirmModal open action={opConfirm.action} kind={(kinds && kinds[0]) || 'Авиа'}
        service={'Заказ' + (order && order.no ? ' № ' + order.no : '')}
        fin={{ currency, price: Math.max(0, total - fee), fee, total }}
        warnings={opConfirm.action === 'issue' ? ['После выписки повторное оформление возможно только по актуальной стоимости'] : []}
        onConfirm={opConfirm.onConfirm} onClose={() => setOpConfirm(null)} needComment={opConfirm.action === 'issue'} />}
    </div>
  );
}

Object.assign(window, { BookingWizard, offerFromServices });



export { bwRub, bwMoney, BwStepper, BwReadiness, BwSvc, offerFromServices, BookingWizard };
