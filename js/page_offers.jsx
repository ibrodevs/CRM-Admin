// ===== Commercial Proposals (КП): constructor, preview, approval, registry =====

function kpM(n, c = 'USD') { const sym = (CURRENCIES.find((x) => x.code === c) || {}).sym || c; return Math.round(n).toLocaleString('ru-RU') + ' ' + sym; }
function varCost(v) { return v.items.reduce((s, i) => s + (+i.cost || 0), 0); }
function varFee(v) { return v.items.reduce((s, i) => s + (+i.fee || 0), 0); }
function varTotal(v) { return varCost(v) + varFee(v); }
function kpNow() { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`; }

/* ----- helpers for the "Поезд + Проживание" (train) КП type ----- */
function trainTotal(train) { return (train.trips || []).reduce((s, t) => s + (+t.cost || 0), 0); }
function accRowTotal(r) { return +r.cost || 0; }
function accVarTotal(v) { return (v.rows || []).reduce((s, r) => s + accRowTotal(r), 0); }
// normalized variant list, regardless of КП type, for summaries/approval UI
function pVariants(p) {
  if (p.docType === 'train') return p.accommodation.variants.map((v) => ({ id: v.id, name: v.name, total: accVarTotal(v) }));
  return p.variants.map((v) => ({ id: v.id, name: v.name, total: varTotal(v) }));
}
function proposalSummary(p) {
  const vs = pVariants(p);
  if (p.approvedVariant) { const v = vs.find((x) => x.id === p.approvedVariant); return v ? kpM(v.total, p.currency) : '—'; }
  const totals = vs.map((v) => v.total);
  const lo = Math.min(...totals), hi = Math.max(...totals);
  return lo === hi ? kpM(lo, p.currency) : `${kpM(lo, p.currency)} – ${kpM(hi, p.currency)}`;
}

/* ----- export the rendered client document to a PDF file -----
   Rendered off-screen from a detached clone so wide tables (which scroll
   horizontally on screen) are captured in full, and the live UI never flashes. */
async function exportKpToPdf(node, filename, onDone) {
  if (!node || !window.html2canvas || !window.jspdf) { onDone && onDone(false); return; }
  const host = document.createElement('div');
  host.style.position = 'fixed'; host.style.left = '-99999px'; host.style.top = '0'; host.style.zIndex = '-1';
  const clone = node.cloneNode(true);
  host.appendChild(clone);
  document.body.appendChild(host);
  clone.querySelectorAll('.kp2-doc').forEach((d) => { d.style.maxWidth = 'none'; });
  clone.querySelectorAll('.kp2-table-wrap').forEach((w) => { w.style.overflow = 'visible'; w.style.flex = '0 0 auto'; });
  const targetWidth = clone.scrollWidth;
  try {
    const canvas = await window.html2canvas(clone, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true, windowWidth: targetWidth, width: targetWidth });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height], compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
    onDone && onDone(true);
  } catch (e) {
    onDone && onDone(false);
  } finally {
    document.body.removeChild(host);
  }
}

/* editable status pill */
function KPStatusControl({ status, onChange }) {
  return (
    <ActionMenu trigger={
      <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Pill tone={KP_STATUS[status]}>{status}</Pill><Icon name="chevDown" style={{ width: 15, height: 15, color: 'var(--muted-2)' }} />
      </button>}
      items={KP_STATUS_FLOW.map((s) => ({ icon: status === s ? 'check' : null, label: s, onClick: () => onChange(s) }))} />
  );
}

/* ---------- client-facing document ---------- */
function KPPreviewDoc({ proposal, participants }) {
  const p = proposal;
  const vids = p.approvedVariant ? [p.approvedVariant] : p.variants.map((v) => v.id);
  const pax = participants || ORDER_PARTICIPANTS;
  return (
    <div className="kp2-doc">
      <div className="kp2-header">
        <div className="kp2-brand"><BrandMark size={30} color="#e8674f" /><div><div className="kp2-brand-name">Пассажирский</div><div className="kp2-brand-name">сервисный</div><div className="kp2-brand-name">центр</div></div></div>
        <div className="kp2-badge"><div className="kp2-badge-l">Заказчик: <b>{p.client}</b></div><div className="kp2-badge-s">№ {p.id} от {p.created} · действует до {p.validUntil}</div></div>
      </div>

      <div className="kp2-section">
        <div className="kp2-tabs">
          <KPTab tone="gray" emoji="🧳"><div className="kp2-tab-title">Заказ № {p.order}</div></KPTab>
          <KPTab tone="amber" emoji=""><div className="kp2-tab-amber-row"><div className="kp2-tab-num">{pax.length}</div><div className="kp2-tab-cap">{plural(pax.length, ['участник', 'участника', 'участников'])}</div></div></KPTab>
          <KPTab tone="coral" emoji=""><div className="kp2-tab-cap kp2-tab-cap-light">валюта предложения</div><div className="kp2-tab-strong">{p.currency}</div></KPTab>
        </div>
      </div>

      {p.variants.filter((v) => vids.includes(v.id)).map((v) => {
        const groups = {};
        v.items.forEach((it) => { (groups[it.kind] = groups[it.kind] || []).push(it); });
        return (
          <div className="kp2-section" key={v.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>{v.name}</span>
              {p.approvedVariant === v.id && <Pill tone="green">Выбран клиентом</Pill>}
            </div>
            {Object.entries(groups).map(([kind, items]) => {
              const k = SERVICE_KIND[kind] || SERVICE_KIND['Авиа'];
              const subtotal = items.reduce((s, it) => s + it.cost + it.fee, 0);
              return (
                <div className="kp2-row" key={kind}>
                  <div className="kp2-side">
                    <div className="kp2-side-label"><Icon name={k.icon} style={{ width: 15, height: 15, marginRight: 6, verticalAlign: 'middle' }} />{kind}</div>
                    <div className="kp2-side-total"><div className="kp2-side-total-l">Итого</div><div className="kp2-side-total-v">{kpM(subtotal, p.currency)}</div></div>
                  </div>
                  <div className="kp2-table-wrap">
                    <table className="kp2-table">
                      <thead><tr><th>Услуга</th><th>Описание</th><th>Стоимость</th><th>Сервисный сбор</th><th>Итого</th></tr></thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.title}</td><td className="kp2-td-wide">{it.sub}</td>
                            <td>{kpM(it.cost, p.currency)}</td><td>{kpM(it.fee, p.currency)}</td><td>{kpM(it.cost + it.fee, p.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            <div className="kp2-note" style={{ fontStyle: 'normal', textAlign: 'right', fontSize: 16, fontWeight: 700, color: 'var(--ink)', background: 'var(--surface-2)' }}>Итого по варианту «{v.name}»: {kpM(varTotal(v), p.currency)}</div>
          </div>
        );
      })}

      <div className="kp2-note">
        Участники поездки: {pax.map((pt) => pt.name).join(', ')}.<br />
        Стоимость указана с учётом сервисных сборов агентства. Предложение носит предварительный характер и может быть скорректировано в зависимости от наличия мест и тарифов на момент бронирования.
      </div>
    </div>
  );
}

/* ---------- client-facing document: "Поезд + Проживание" ---------- */
function KPTab({ tone, emoji, children }) {
  return <div className={'kp2-tab kp2-tab-' + tone}><span className="kp2-tab-emoji">{emoji}</span><div className="kp2-tab-body">{children}</div></div>;
}
function TrainTableView({ trips, currency }) {
  return (
    <table className="kp2-table">
      <thead><tr><th>Перевозчик</th><th>Номер</th><th>Маршрут</th><th>Дата</th><th>Отправление</th><th>Дата</th><th>Прибытие</th><th>Цена</th><th>АСБ</th><th>СА</th><th>Кол-во</th><th>Стоимость</th><th>Примечание</th><th>Класс</th><th>Дополнительно</th></tr></thead>
      <tbody>
        {trips.map((t) => (
          <tr key={t.id}>
            <td>{t.carrier}</td><td>{t.number}</td><td className="kp2-td-wide">{t.route}</td>
            <td>{t.dateDep}</td><td>{t.timeDep}</td><td>{t.dateArr}</td><td>{t.timeArr}</td>
            <td>{(+t.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td>{(+t.asb).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td>{(+t.sa).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td>{t.qty}</td>
            <td>{(+t.cost).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td className="kp2-td-wide">{t.note}</td><td>{t.cls}</td><td>{t.extra}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function AccTableView({ rows }) {
  return (
    <table className="kp2-table">
      <thead><tr><th>Гостиница</th><th>Номер</th><th>Адрес</th><th>Дата</th><th>Заезд</th><th>Дата</th><th>Выезд</th><th>Цена</th><th>АСБ</th><th>СА</th><th>Кол-во</th><th>Стоимость</th><th>Примечание</th><th>Питание</th><th>Точка</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.hotel}</td><td>{r.room}</td><td className="kp2-td-wide">{r.address}</td>
            <td>{r.dateIn}</td><td>{r.timeIn}</td><td>{r.dateOut}</td><td>{r.timeOut}</td>
            <td>{(+r.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td>{(+r.asb).toLocaleString('ru-RU')}</td><td>{(+r.sa).toLocaleString('ru-RU')}</td><td>{r.qty}</td>
            <td>{(+r.cost).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td className="kp2-td-wide">{r.note}</td><td>{r.meal}</td><td>{r.point}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function KPTrainPreviewDoc({ proposal }) {
  const p = proposal;
  const { train, accommodation: acc } = p;
  return (
    <div className="kp2-doc">
      <div className="kp2-header">
        <div className="kp2-brand"><BrandMark size={30} color="#e8674f" /><div><div className="kp2-brand-name">Пассажирский</div><div className="kp2-brand-name">сервисный</div><div className="kp2-brand-name">центр</div></div></div>
        <div className="kp2-badge"><div className="kp2-badge-l">Заказчик: <b>{p.client}</b></div><div className="kp2-badge-s">№ {p.id} от {p.created}</div></div>
      </div>

      <div className="kp2-section">
        <div className="kp2-tabs">
          <KPTab tone="gray" emoji="🚆"><div className="kp2-tab-title">Поезд</div></KPTab>
          <KPTab tone="amber" emoji=""><div className="kp2-tab-amber-row"><div className="kp2-tab-num">{train.passengers}</div><div className="kp2-tab-cap">пассажиров</div></div></KPTab>
          <KPTab tone="coral" emoji=""><div className="kp2-tab-cap kp2-tab-cap-light">направление</div><div className="kp2-tab-strong">{train.direction}</div></KPTab>
        </div>
        <div className="kp2-row">
          <div className="kp2-side">
            <div className="kp2-side-label">В обе стороны</div>
            <div className="kp2-side-total"><div className="kp2-side-total-l">Итого</div><div className="kp2-side-total-v">{kpM(trainTotal(train), p.currency)}</div></div>
          </div>
          <div className="kp2-table-wrap"><TrainTableView trips={train.trips} currency={p.currency} /></div>
        </div>
        {train.note && <div className="kp2-note">* {train.note}</div>}
      </div>

      <div className="kp2-section">
        <div className="kp2-tabs">
          <KPTab tone="gray" emoji="🔑"><div className="kp2-tab-title">Проживание</div></KPTab>
          <KPTab tone="amber" emoji=""><div className="kp2-tab-amber-row"><div className="kp2-tab-num">{acc.guests}</div><div className="kp2-tab-cap">гостей</div></div></KPTab>
          <KPTab tone="coral" emoji=""><div className="kp2-tab-cap kp2-tab-cap-light">локация</div><div className="kp2-tab-strong">{acc.location.split('\n').map((l, i) => <div key={i}>{l}</div>)}</div></KPTab>
        </div>
        {acc.variants.map((v) => (
          <div className="kp2-row" key={v.id}>
            <div className="kp2-side">
              <div className="kp2-side-label">{v.name}</div>
              {p.approvedVariant === v.id && <Pill tone="green">Выбран клиентом</Pill>}
              <div className="kp2-side-total"><div className="kp2-side-total-l">Итого</div><div className="kp2-side-total-v">{kpM(accVarTotal(v), p.currency)}</div></div>
            </div>
            <div className="kp2-table-wrap"><AccTableView rows={v.rows} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- fix-variant modal (approval) ---------- */
function FixVariantModal({ open, proposal, onClose, onFix }) {
  const vs = proposal ? pVariants(proposal) : [];
  const [pick, setPick] = useState(vs[0] ? vs[0].id : null);
  useEffect(() => { if (proposal) setPick(pVariants(proposal)[0].id); }, [proposal]);
  if (!open || !proposal) return null;
  const isTrain = proposal.docType === 'train';
  return (
    <Drawer open={open} onClose={onClose} title="Зафиксировать выбранный вариант" sub="Клиент согласовал предложение" width="min(480px, 94vw)"
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
        <Button style={{ flex: 1 }} icon="check" onClick={() => onFix(pick)}>Зафиксировать</Button>
      </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vs.map((v) => {
            const rowsCount = isTrain ? proposal.accommodation.variants.find((x) => x.id === v.id).rows.length : proposal.variants.find((x) => x.id === v.id).items.length;
            return (
              <label key={v.id} className="off-card" style={{ display: 'flex', gridTemplateColumns: 'none', padding: '14px 16px', cursor: 'pointer', borderColor: pick === v.id ? 'var(--blue)' : 'var(--line)' }} onClick={() => setPick(v.id)}>
                <Radio on={pick === v.id} onChange={() => setPick(v.id)} />
                <div style={{ flex: 1, marginLeft: 12 }}><div style={{ fontWeight: 600 }}>{v.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{rowsCount} {isTrain ? plural(rowsCount, ['номер', 'номера', 'номеров']) : 'услуг'}</div></div>
                <div style={{ fontWeight: 700 }}>{kpM(v.total, proposal.currency)}</div>
              </label>
            );
          })}
        </div>
    </Drawer>
  );
}

const KP_ADD_TYPES = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Группа'];

// ----- KP templates (§4.6): reusable item-sets, not bound to an order -----
const KP_TEMPLATES = [
  { id: 'TPL-01', name: 'Стамбул · пакет «Стандарт»', desc: 'Перелёт + отель 4★ + индивидуальный трансфер', items: [
    { kind: 'Авиа', title: 'Turkish Airlines · FRU–IST–FRU', sub: 'Прямой · эконом', cost: 470, fee: 22 },
    { kind: 'Гостиница', title: 'Hilton Istanbul 4★', sub: '7 ночей · BB', cost: 980, fee: 25 },
    { kind: 'Трансфер', title: 'Индивидуальный трансфер', sub: 'Минивэн · встреча с табличкой', cost: 60, fee: 0 },
  ] },
  { id: 'TPL-02', name: 'Бизнес-поездка', desc: 'Перелёт бизнес-класса + отель в центре', items: [
    { kind: 'Авиа', title: 'Бизнес-класс · по запросу', sub: 'Гибкий тариф', cost: 1400, fee: 60 },
    { kind: 'Гостиница', title: 'Отель 5★ · центр', sub: '3 ночи · BB', cost: 720, fee: 30 },
  ] },
  { id: 'TPL-03', name: 'ЖД + отель по СНГ', desc: 'Железная дорога и проживание', items: [
    { kind: 'ЖД', title: 'ЖД билеты · купе', sub: 'Туда-обратно', cost: 180, fee: 10 },
    { kind: 'Гостиница', title: 'Отель 3★', sub: '4 ночи · BB', cost: 260, fee: 14 },
  ] },
];

/* ====================================================================
   KP MODULE — lives inside the order card (КП tab)
   ==================================================================== */
function KPModule({ order, services, participants, onApprove }) {
  const toast = useToast();
  const seeded = PROPOSALS.filter((p) => p.order === order.no);
  const [proposals, setProposals] = useState(seeded);
  const [view, setView] = useState('list'); // list | edit | preview | templates
  const [activeId, setActiveId] = useState(null);
  const [activeVar, setActiveVar] = useState(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(null); // КП, выбранное для отправки клиенту
  const [templates, setTemplates] = useState(KP_TEMPLATES);
  const [pdfBusy, setPdfBusy] = useState(false);
  const docRef = useRef(null);

  const active = proposals.find((p) => p.id === activeId);
  const uid = (pre) => pre + Math.random().toString(36).slice(2, 7);
  const patch = (id, fn) => setProposals((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));
  const withHist = (p, text) => ({ ...p, history: [...p.history, { t: kpNow(), text, who: 'Даниель' }] });

  const createProposal = () => {
    const items = (services.length ? services : ORDER_SERVICES).map((s) => ({ id: uid('i'), kind: s.kind, title: s.title, sub: s.sub, cost: Math.round(s.sum * 0.95), fee: Math.round(s.sum * 0.05) }));
    const np = { id: 'КП-' + (1052 + proposals.length), order: order.no, client: order.client, status: 'Черновик', currency: 'USD', validUntil: '25.06.2026', created: '15.06.2026', approvedVariant: null,
      variants: [{ id: uid('v'), name: 'Вариант A', items }], history: [{ t: kpNow(), text: 'КП создано из заказа № ' + order.no, who: 'Даниель' }] };
    setProposals((ps) => [np, ...ps]); setActiveId(np.id); setActiveVar(np.variants[0].id); setView('edit');
    toast('Черновик КП создан', 'ok');
  };
  const openEdit = (p) => { setActiveId(p.id); setActiveVar(p.docType === 'train' ? null : p.variants[0].id); setView('edit'); };
  const openPreview = (p) => { setActiveId(p.id); setView('preview'); };

  // ----- templates (§4.6) -----
  const createFromTemplate = (tpl) => {
    const items = tpl.items.map((s) => ({ id: uid('i'), kind: s.kind, title: s.title, sub: s.sub, cost: s.cost, fee: s.fee }));
    const np = { id: 'КП-' + (1052 + proposals.length), order: order.no, client: order.client, status: 'Черновик', currency: 'USD', validUntil: '25.06.2026', created: '15.06.2026', approvedVariant: null,
      variants: [{ id: uid('v'), name: tpl.name, items }], history: [{ t: kpNow(), text: 'КП создано из шаблона «' + tpl.name + '»', who: 'Даниель' }] };
    setProposals((ps) => [np, ...ps]); setActiveId(np.id); setActiveVar(np.variants[0].id); setView('edit');
    toast('КП создано из шаблона', 'ok');
  };
  const saveAsTemplate = () => {
    const v = active.variants.find((x) => x.id === activeVar) || active.variants[0];
    const tpl = { id: 'TPL-' + String(templates.length + 1).padStart(2, '0'), name: v.name + ' · ' + active.id, desc: v.items.length + ' услуг(и) · ' + kpM(varTotal(v), active.currency),
      items: v.items.map((it) => ({ kind: it.kind, title: it.title, sub: it.sub, cost: it.cost, fee: it.fee })) };
    setTemplates((t) => [tpl, ...t]); toast('Вариант сохранён как шаблон', 'ok');
  };
  const delTemplate = (id) => setTemplates((t) => t.filter((x) => x.id !== id));

  // variant ops
  const addVariant = (dup) => {
    const nvId = uid('v'); const base = dup ? active.variants.find((v) => v.id === activeVar) : null;
    const nv = { id: nvId, name: 'Вариант ' + String.fromCharCode(65 + active.variants.length), items: base ? base.items.map((it) => ({ ...it, id: uid('i') })) : [] };
    patch(active.id, (p) => withHist({ ...p, variants: [...p.variants, nv] }, dup ? 'Дублирован вариант' : 'Добавлен новый вариант'));
    setActiveVar(nvId);
  };
  const delVariant = (vid) => {
    if (active.variants.length <= 1) { toast('Должен остаться хотя бы один вариант', 'err'); return; }
    const next = active.variants.find((v) => v.id !== vid);
    patch(active.id, (p) => ({ ...p, variants: p.variants.filter((v) => v.id !== vid) }));
    if (activeVar === vid) setActiveVar(next.id);
  };
  const renameVariant = (vid, name) => patch(active.id, (p) => ({ ...p, variants: p.variants.map((v) => (v.id === vid ? { ...v, name } : v)) }));

  // item ops on active variant
  const setItems = (fn) => patch(active.id, (p) => ({ ...p, variants: p.variants.map((v) => (v.id === activeVar ? { ...v, items: fn(v.items) } : v)) }));
  const updItem = (id, f, val) => setItems((items) => items.map((it) => (it.id === id ? { ...it, [f]: val } : it)));
  const delItem = (id) => setItems((items) => items.filter((it) => it.id !== id));
  const moveItem = (idx, dir) => setItems((items) => { const a = [...items]; const j = idx + dir; if (j < 0 || j >= a.length) return a; [a[idx], a[j]] = [a[j], a[idx]]; return a; });
  const addItem = (kind) => setItems((items) => [...items, { id: uid('i'), kind, title: 'Новая услуга', sub: '', cost: 0, fee: 0 }]);

  const setStatus = (s) => patch(active.id, (p) => withHist({ ...p, status: s }, 'Статус изменён: ' + s));
  const setField = (f, val) => patch(active.id, (p) => ({ ...p, [f]: val }));
  const sendToClient = () => setSendTarget(active);
  const doSendProposal = (p, channel) => {
    patch(p.id, (x) => withHist({ ...x, status: 'Отправлено клиенту', sentChannel: channel }, 'Отправлено клиенту · канал «' + channel + '»'));
    setSendTarget(null); toast(p.id + ' отправлено по каналу «' + channel + '»', 'ok', { title: 'КП отправлено клиенту', action: { label: 'Открыть «Ком. предложения»', route: 'offers' } });
  };
  const sendPanel = sendTarget && <ProposalSendPanel proposal={sendTarget} participants={participants} onSend={(ch) => doSendProposal(sendTarget, ch)} onClose={() => setSendTarget(null)} />;
  const fixVariant = (vid) => {
    const vname = (pVariants(active).find((v) => v.id === vid) || {}).name;
    patch(active.id, (p) => withHist({ ...p, status: 'Согласовано', approvedVariant: vid }, 'Зафиксирован вариант: ' + vname));
    setFixOpen(false); toast('Вариант зафиксирован — услуги готовы к бронированию', 'ok');
    onApprove && onApprove(vid);
  };

  /* ----- TEMPLATES (§4.6) ----- */
  if (view === 'templates') {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('list')}>Все КП</Button>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>Шаблоны КП</span>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>· {templates.length} шаблон(ов)</span>
        </div>
        {templates.length === 0
          ? <EmptyState icon="template" title="Шаблонов пока нет" sub="Откройте КП и сохраните вариант как шаблон" />
          : (
            <div className="grid-2" style={{ alignItems: 'start' }}>
              {templates.map((t) => (
                <div className="card card-pad" key={t.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{t.name}</div>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[{ icon: 'trash', label: 'Удалить шаблон', danger: true, onClick: () => delTemplate(t.id) }]} />
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 13.5, marginBottom: 12 }}>{t.desc}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {t.items.map((it, i) => {
                      const k = SERVICE_KIND[it.kind] || SERVICE_KIND['Авиа'];
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span className="airline-logo sm" style={{ background: k.color, width: 26, height: 26, borderRadius: 7 }}><Icon name={k.icon} style={{ width: 14, height: 14 }} /></span>
                          <span style={{ fontSize: 13.5, color: 'var(--body)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{kpM(it.cost + it.fee)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button icon="plus" className="btn-block" onClick={() => createFromTemplate(t)}>Создать КП по шаблону</Button>
                </div>
              ))}
            </div>
          )}
      </div>
    );
  }

  /* ----- LIST ----- */
  if (view === 'list') {
    if (!proposals.length) {
      return (
        <div className="fade-in">
          <EmptyState icon="template" title="Коммерческих предложений ещё нет" sub="Соберите варианты из услуг заказа, по шаблону — и отправьте клиенту" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
            <Button icon="plus" onClick={createProposal}>Создать КП из заказа</Button>
            <Button variant="secondary" icon="template" onClick={() => setView('templates')}>Из шаблона</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>{proposals.length} {plural(proposals.length, ['предложение', 'предложения', 'предложений'])} по заказу</span>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" icon="template" onClick={() => setView('templates')}>Шаблоны</Button>
          <ActionMenu trigger={<Button icon="plus">Создать КП</Button>}
            items={[
              { icon: 'orders', label: 'Пустое из услуг заказа', onClick: createProposal },
              { sep: true },
              ...templates.map((t) => ({ icon: 'template', label: 'Из шаблона: ' + t.name, onClick: () => createFromTemplate(t) })),
            ]} />
        </div>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {proposals.map((p) => (
            <div className="card card-pad" key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{p.id}</div><div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{p.docType === 'train' && <><Pill tone="teal">Поезд + Проживание</Pill>{' '}</>}{pVariants(p).length} вариант(ов) · до {p.validUntil}</div></div>
                <Pill tone={KP_STATUS[p.status]}>{p.status}</Pill>
              </div>
              <div className="kv-row" style={{ borderBottom: 'none', padding: '6px 0' }}><span className="k">Сумма</span><span className="v" style={{ fontSize: 17 }}>{proposalSummary(p)}</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" icon="edit" onClick={() => openEdit(p)}>Открыть</Button>
                <Button variant="secondary" size="sm" icon="eye" onClick={() => openPreview(p)}>Предпросмотр</Button>
                <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                  items={[{ icon: 'clock', label: 'История', onClick: () => { setActiveId(p.id); setHistOpen(true); } }, { icon: 'send', label: 'Отправить клиенту', onClick: () => { setActiveId(p.id); setSendTarget(p); } }, { sep: true }, { icon: 'inbox', label: 'Архивировать', onClick: () => { setProposals((ps) => ps.map((x) => x.id === p.id ? { ...x, status: 'Архивировано' } : x)); } }]} />
              </div>
            </div>
          ))}
        </div>
        <KPHistoryDrawer open={histOpen} proposal={active} onClose={() => setHistOpen(false)} />
        {sendPanel}
      </div>
    );
  }

  /* ----- PREVIEW ----- */
  if (view === 'preview' && active) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('list')}>Назад</Button>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" icon="download" disabled={pdfBusy} onClick={() => {
            setPdfBusy(true);
            exportKpToPdf(docRef.current, active.id + '.pdf', (ok) => { setPdfBusy(false); toast(ok ? 'PDF сохранён' : 'Не удалось сформировать PDF', ok ? 'ok' : 'err'); });
          }}>{pdfBusy ? 'Формируем…' : 'Скачать PDF'}</Button>
          <Button icon="send" onClick={() => setSendTarget(active)}>Отправить клиенту</Button>
        </div>
        <div ref={docRef}>{active.docType === 'train' ? <KPTrainPreviewDoc proposal={active} /> : <KPPreviewDoc proposal={active} participants={participants} />}</div>
        {sendPanel}
      </div>
    );
  }

  /* ----- train-type mutators (trips / accommodation variants) ----- */
  const updTrip = (tripId, f, val) => patch(active.id, (p) => ({ ...p, train: { ...p.train, trips: p.train.trips.map((t) => (t.id === tripId ? { ...t, [f]: val } : t)) } }));
  const addTrip = () => patch(active.id, (p) => ({ ...p, train: { ...p.train, trips: [...p.train.trips, { id: uid('t'), carrier: 'Поезд', number: '', route: '', dateDep: '', timeDep: '', dateArr: '', timeArr: '', price: 0, asb: 0, sa: 0, qty: 1, cost: 0, note: '', cls: '', extra: '' }] } }));
  const delTrip = (tripId) => patch(active.id, (p) => ({ ...p, train: { ...p.train, trips: p.train.trips.filter((t) => t.id !== tripId) } }));
  const setTrainField = (f, val) => patch(active.id, (p) => ({ ...p, train: { ...p.train, [f]: val } }));

  const updAccRow = (varId, rowId, f, val) => patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, variants: p.accommodation.variants.map((v) => (v.id !== varId ? v : { ...v, rows: v.rows.map((r) => (r.id === rowId ? { ...r, [f]: val } : r)) })) } }));
  const addAccRow = (varId) => patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, variants: p.accommodation.variants.map((v) => (v.id !== varId ? v : { ...v, rows: [...v.rows, { id: uid('r'), hotel: '', room: '', address: '', dateIn: '', timeIn: '', dateOut: '', timeOut: '', price: 0, asb: 0, sa: 0, qty: 1, cost: 0, note: '', meal: '', point: '' }] })) } }));
  const delAccRow = (varId, rowId) => patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, variants: p.accommodation.variants.map((v) => (v.id !== varId ? v : { ...v, rows: v.rows.filter((r) => r.id !== rowId) })) } }));
  const addAccVariant = () => patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, variants: [...p.accommodation.variants, { id: uid('av'), name: 'Вариант ' + (p.accommodation.variants.length + 1), rows: [] }] } }));
  const delAccVariant = (varId) => { if (active.accommodation.variants.length <= 1) { toast('Должен остаться хотя бы один вариант проживания', 'err'); return; } patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, variants: p.accommodation.variants.filter((v) => v.id !== varId) } })); };
  const renameAccVariant = (varId, name) => patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, variants: p.accommodation.variants.map((v) => (v.id === varId ? { ...v, name } : v)) } }));
  const setAccField = (f, val) => patch(active.id, (p) => ({ ...p, accommodation: { ...p.accommodation, [f]: val } }));

  /* ----- EDIT (constructor) ----- */
  if (view === 'edit' && active) {
    const isTrain = active.docType === 'train';
    const v = !isTrain ? (active.variants.find((x) => x.id === activeVar) || active.variants[0]) : null;
    const canFix = active.status === 'Отправлено клиенту' || active.status === 'На согласовании';
    const approved = active.status === 'Согласовано';
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon="chevLeft" onClick={() => setView('list')}>Все КП</Button>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{active.id}</span>
          <KPStatusControl status={active.status} onChange={setStatus} />
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История</Button>
          {!isTrain && <Button variant="secondary" size="sm" icon="template" onClick={saveAsTemplate}>В шаблон</Button>}
          <Button variant="secondary" size="sm" icon="eye" onClick={() => setView('preview')}>Предпросмотр</Button>
          {!approved && !canFix && <Button size="sm" icon="send" onClick={sendToClient}>Отправить клиенту</Button>}
          {canFix && <Button size="sm" icon="check" onClick={() => setFixOpen(true)}>Зафиксировать вариант</Button>}
        </div>

        {approved && (
          <div className="kp-bulk">
            <Icon name="checkCircle" style={{ width: 24, height: 24, color: 'var(--green)' }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>Вариант согласован клиентом</div><div style={{ fontSize: 13.5, color: 'var(--green)' }}>Запустите дальнейшее оформление по выбранным услугам</div></div>
            <Button size="sm" icon="plane" onClick={() => toast('Запущено бронирование авиа', 'ok')}>Забронировать авиа</Button>
            <Button variant="secondary" size="sm" icon="docs" onClick={() => toast('Документы формируются', 'ok')}>Сформировать документы</Button>
            <Button variant="secondary" size="sm" icon="finance" onClick={() => toast('Открыто финансовое оформление', 'info')}>Открыть финансы</Button>
          </div>
        )}

        {isTrain ? (
          <div className="kp2-doc kp2-doc-edit">
            <div className="kp2-section">
              <div className="kp2-tabs">
                <KPTab tone="gray" emoji="🚆"><div className="kp2-tab-title">Поезд</div></KPTab>
                <KPTab tone="amber" emoji=""><div className="kp2-tab-amber-row"><input className="kp2-tab-num kp2-tab-input" type="number" value={active.train.passengers} onChange={(e) => setTrainField('passengers', +e.target.value)} /><div className="kp2-tab-cap">пассажиров</div></div></KPTab>
                <KPTab tone="coral" emoji=""><div className="kp2-tab-cap kp2-tab-cap-light">направление</div><input className="kp2-tab-strong kp2-tab-input kp2-tab-input-light" value={active.train.direction} onChange={(e) => setTrainField('direction', e.target.value)} /></KPTab>
              </div>
              <div className="kp2-row">
                <div className="kp2-side">
                  <div className="kp2-side-label">В обе стороны</div>
                  <div className="kp2-side-total"><div className="kp2-side-total-l">Итого</div><div className="kp2-side-total-v">{kpM(trainTotal(active.train), active.currency)}</div></div>
                </div>
                <div className="kp2-table-wrap">
                  <table className="kp2-table kp2-table-edit">
                    <thead><tr><th>Перевозчик</th><th>Номер</th><th>Маршрут</th><th>Дата</th><th>Отправление</th><th>Дата</th><th>Прибытие</th><th>Цена</th><th>АСБ</th><th>СА</th><th>Кол-во</th><th>Стоимость</th><th>Примечание</th><th>Класс</th><th>Дополнительно</th><th style={{ width: 30 }}></th></tr></thead>
                    <tbody>
                      {active.train.trips.map((t) => (
                        <tr key={t.id}>
                          <td><input className="kp2-cell" value={t.carrier} onChange={(e) => updTrip(t.id, 'carrier', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.number} onChange={(e) => updTrip(t.id, 'number', e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-wide" value={t.route} onChange={(e) => updTrip(t.id, 'route', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.dateDep} onChange={(e) => updTrip(t.id, 'dateDep', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.timeDep} onChange={(e) => updTrip(t.id, 'timeDep', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.dateArr} onChange={(e) => updTrip(t.id, 'dateArr', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.timeArr} onChange={(e) => updTrip(t.id, 'timeArr', e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-num" type="number" value={t.price} onChange={(e) => updTrip(t.id, 'price', +e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-num" type="number" value={t.asb} onChange={(e) => updTrip(t.id, 'asb', +e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-num" type="number" value={t.sa} onChange={(e) => updTrip(t.id, 'sa', +e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-num" type="number" value={t.qty} onChange={(e) => updTrip(t.id, 'qty', +e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-num" type="number" value={t.cost} onChange={(e) => updTrip(t.id, 'cost', +e.target.value)} /></td>
                          <td><input className="kp2-cell kp2-cell-wide" value={t.note} onChange={(e) => updTrip(t.id, 'note', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.cls} onChange={(e) => updTrip(t.id, 'cls', e.target.value)} /></td>
                          <td><input className="kp2-cell" value={t.extra} onChange={(e) => updTrip(t.id, 'extra', e.target.value)} /></td>
                          <td><button className="icon-btn" onClick={() => delTrip(t.id)}><Icon name="trash" style={{ width: 15, height: 15 }} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="btn btn-ghost btn-sm kp2-add-row" onClick={addTrip}><Icon name="plus" style={{ width: 15, height: 15 }} />Рейс</button>
                </div>
              </div>
              <div style={{ marginTop: 12 }}><Field label="Примечание к стоимости"><Input value={active.train.note} onChange={(e) => setTrainField('note', e.target.value)} /></Field></div>
            </div>

            <div className="kp2-section">
              <div className="kp2-tabs">
                <KPTab tone="gray" emoji="🔑"><div className="kp2-tab-title">Проживание</div></KPTab>
                <KPTab tone="amber" emoji=""><div className="kp2-tab-amber-row"><input className="kp2-tab-num kp2-tab-input" type="number" value={active.accommodation.guests} onChange={(e) => setAccField('guests', +e.target.value)} /><div className="kp2-tab-cap">гостей</div></div></KPTab>
                <KPTab tone="coral" emoji=""><div className="kp2-tab-cap kp2-tab-cap-light">локация</div><textarea className="kp2-tab-strong kp2-tab-input kp2-tab-input-light kp2-tab-textarea" value={active.accommodation.location} onChange={(e) => setAccField('location', e.target.value)} /></KPTab>
              </div>
              {active.accommodation.variants.map((av) => (
                <div className="kp2-row" key={av.id}>
                  <div className="kp2-side">
                    <input className="kp2-side-label kp2-side-label-input" value={av.name} onChange={(e) => renameAccVariant(av.id, e.target.value)} />
                    {active.approvedVariant === av.id && <Pill tone="green">Выбран клиентом</Pill>}
                    <div className="kp2-side-total"><div className="kp2-side-total-l">Итого</div><div className="kp2-side-total-v">{kpM(accVarTotal(av), active.currency)}</div></div>
                    {active.accommodation.variants.length > 1 && <button className="btn btn-ghost btn-sm" onClick={() => delAccVariant(av.id)}><Icon name="trash" style={{ width: 14, height: 14 }} />Удалить</button>}
                  </div>
                  <div className="kp2-table-wrap">
                    <table className="kp2-table kp2-table-edit">
                      <thead><tr><th>Гостиница</th><th>Номер</th><th>Адрес</th><th>Дата</th><th>Заезд</th><th>Дата</th><th>Выезд</th><th>Цена</th><th>АСБ</th><th>СА</th><th>Кол-во</th><th>Стоимость</th><th>Примечание</th><th>Питание</th><th>Точка</th><th style={{ width: 30 }}></th></tr></thead>
                      <tbody>
                        {av.rows.map((r) => (
                          <tr key={r.id}>
                            <td><input className="kp2-cell" value={r.hotel} onChange={(e) => updAccRow(av.id, r.id, 'hotel', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.room} onChange={(e) => updAccRow(av.id, r.id, 'room', e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-wide" value={r.address} onChange={(e) => updAccRow(av.id, r.id, 'address', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.dateIn} onChange={(e) => updAccRow(av.id, r.id, 'dateIn', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.timeIn} onChange={(e) => updAccRow(av.id, r.id, 'timeIn', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.dateOut} onChange={(e) => updAccRow(av.id, r.id, 'dateOut', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.timeOut} onChange={(e) => updAccRow(av.id, r.id, 'timeOut', e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-num" type="number" value={r.price} onChange={(e) => updAccRow(av.id, r.id, 'price', +e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-num" type="number" value={r.asb} onChange={(e) => updAccRow(av.id, r.id, 'asb', +e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-num" type="number" value={r.sa} onChange={(e) => updAccRow(av.id, r.id, 'sa', +e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-num" type="number" value={r.qty} onChange={(e) => updAccRow(av.id, r.id, 'qty', +e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-num" type="number" value={r.cost} onChange={(e) => updAccRow(av.id, r.id, 'cost', +e.target.value)} /></td>
                            <td><input className="kp2-cell kp2-cell-wide" value={r.note} onChange={(e) => updAccRow(av.id, r.id, 'note', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.meal} onChange={(e) => updAccRow(av.id, r.id, 'meal', e.target.value)} /></td>
                            <td><input className="kp2-cell" value={r.point} onChange={(e) => updAccRow(av.id, r.id, 'point', e.target.value)} /></td>
                            <td><button className="icon-btn" onClick={() => delAccRow(av.id, r.id)}><Icon name="trash" style={{ width: 15, height: 15 }} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="btn btn-ghost btn-sm kp2-add-row" onClick={() => addAccRow(av.id)}><Icon name="plus" style={{ width: 15, height: 15 }} />Номер</button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon="plus" onClick={addAccVariant} style={{ marginTop: 6 }}>Вариант проживания</Button>
            </div>

            <div className="card card-pad" style={{ marginTop: 18 }}>
              <Field label="Валюта"><Select options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))} value={active.currency} onChange={(e) => setField('currency', e.target.value)} /></Field>
              <div style={{ height: 14 }} />
              <Field label="Срок действия предложения"><Input value={active.validUntil} onChange={(e) => setField('validUntil', e.target.value)} leadIcon="calendar" /></Field>
            </div>
          </div>
        ) : (
          <>
            <div className="kp-var-tabs">
              {active.variants.map((vr) => (
                <button key={vr.id} className={'tab' + (vr.id === activeVar ? ' active' : '')} onClick={() => setActiveVar(vr.id)}>
                  {vr.name}{active.approvedVariant === vr.id && ' ✓'}<span className="tab-count">{kpM(varTotal(vr), active.currency)}</span>
                </button>
              ))}
              <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="plus" /></button>}
                items={[{ icon: 'plus', label: 'Новый вариант', onClick: () => addVariant(false) }, { icon: 'copy', label: 'Дублировать текущий', onClick: () => addVariant(true) }]} />
            </div>

            <div className="kp-edit">
              <div className="kp-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <input className="cell-input" style={{ maxWidth: 320, fontWeight: 600 }} value={v.name} onChange={(e) => renameVariant(v.id, e.target.value)} />
                  <div style={{ flex: 1 }} />
                  <ActionMenu trigger={<Button variant="secondary" size="sm" icon="plus">Услуга</Button>}
                    items={KP_ADD_TYPES.map((t) => ({ icon: SERVICE_KIND[t].icon, label: t, onClick: () => addItem(t) }))} />
                  {active.variants.length > 1 && <Button variant="ghost" size="sm" icon="trash" onClick={() => delVariant(v.id)}>Удалить вариант</Button>}
                </div>

                <div className="table-card">
                  <table className="tbl">
                    <thead><tr><th style={{ width: 36 }}></th><th>Тип</th><th>Услуга</th><th style={{ width: 110, textAlign: 'right' }}>Стоимость</th><th style={{ width: 110, textAlign: 'right' }}>Сервис. сбор</th><th style={{ width: 100, textAlign: 'right' }}>Итого</th><th style={{ width: 40 }}></th></tr></thead>
                    <tbody>
                      {v.items.length === 0 ? (
                        <tr><td colSpan={7}><EmptyState icon="inbox" title="В варианте нет услуг" sub="Добавьте услугу через кнопку «Услуга»" /></td></tr>
                      ) : v.items.map((it, idx) => {
                        const k = SERVICE_KIND[it.kind] || SERVICE_KIND['Авиа'];
                        return (
                          <tr key={it.id}>
                            <td><div className="row-handle"><button disabled={idx === 0} onClick={() => moveItem(idx, -1)}><Icon name="chevUp" style={{ width: 16, height: 16 }} /></button><button disabled={idx === v.items.length - 1} onClick={() => moveItem(idx, 1)}><Icon name="chevDown" style={{ width: 16, height: 16 }} /></button></div></td>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span className="airline-logo sm" style={{ background: k.color, width: 28, height: 28, borderRadius: 8 }}><Icon name={k.icon} style={{ width: 15, height: 15 }} /></span><Pill tone={k.tone}>{it.kind}</Pill></span></td>
                            <td><input className="cell-input" value={it.title} onChange={(e) => updItem(it.id, 'title', e.target.value)} style={{ marginBottom: 5 }} /><input className="cell-input" value={it.sub} placeholder="Описание" onChange={(e) => updItem(it.id, 'sub', e.target.value)} style={{ fontSize: 12.5, color: 'var(--muted)' }} /></td>
                            <td><input className="cell-input cell-num" type="number" value={it.cost} onChange={(e) => updItem(it.id, 'cost', +e.target.value)} /></td>
                            <td><input className="cell-input cell-num" type="number" value={it.fee} onChange={(e) => updItem(it.id, 'fee', +e.target.value)} /></td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>{kpM(it.cost + it.fee, active.currency)}</td>
                            <td><button className="icon-btn" onClick={() => delItem(it.id)}><Icon name="trash" /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="kp-aside">
                <div className="card card-pad">
                  <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Итог варианта</h3>
                  <div className="oc-kpi"><span className="l">Стоимость услуг</span><span className="v">{kpM(varCost(v), active.currency)}</span></div>
                  <div className="oc-kpi"><span className="l">Сервисные сборы</span><span className="v">{kpM(varFee(v), active.currency)}</span></div>
                  <div className="oc-kpi"><span className="l" style={{ fontWeight: 700, color: 'var(--ink)' }}>Итого</span><span className="v" style={{ fontSize: 18 }}>{kpM(varTotal(v), active.currency)}</span></div>
                </div>
                <div className="card card-pad">
                  <Field label="Валюта"><Select options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))} value={active.currency} onChange={(e) => setField('currency', e.target.value)} /></Field>
                  <div style={{ height: 14 }} />
                  <Field label="Срок действия предложения"><Input value={active.validUntil} onChange={(e) => setField('validUntil', e.target.value)} leadIcon="calendar" /></Field>
                </div>
                <div className="card card-pad">
                  <h3 className="card-title" style={{ fontSize: 16, marginBottom: 10 }}>Участники</h3>
                  {(participants || ORDER_PARTICIPANTS).map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}><Avatar name={p.name} size={30} /><div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.role}</div></div></div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <FixVariantModal open={fixOpen} proposal={active} onClose={() => setFixOpen(false)} onFix={fixVariant} />
        <KPHistoryDrawer open={histOpen} proposal={active} onClose={() => setHistOpen(false)} />
        {sendPanel}
      </div>
    );
  }
  return null;
}

function KPHistoryDrawer({ open, proposal, onClose }) {
  return (
    <Drawer open={open && !!proposal} onClose={onClose} title={proposal ? 'История · ' + proposal.id : 'История'}>
      {proposal && (
        <div className="timeline">
          {[...proposal.history].reverse().map((h, i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

/* ---------- Новое КП (форма создания, привязка к заказу) ---------- */
const KP_DOC_TYPES = [{ value: 'generic', label: 'Обычное (услуги: авиа, гостиница, трансфер…)' }, { value: 'train', label: 'Поезд + Проживание' }];

function KPCreateModal({ open, onClose, onCreated, onOpenOrder }) {
  const toast = useToast();
  const [orderNo, setOrderNo] = useState('');
  const [docType, setDocType] = useState('generic');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [valid, setValid] = useState('25.06.2026');
  const [base, setBase] = useState('empty'); // empty | services | tpl:<id>
  const [errs, setErrs] = useState({});
  useEffect(() => { if (open) { setOrderNo(''); setDocType('generic'); setName(''); setCurrency('USD'); setValid('25.06.2026'); setBase('empty'); setErrs({}); } }, [open]);
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);
  // unique orders for the picker
  const seen = {};
  const orderOpts = ORDERS.filter((o) => (seen[o.no] ? false : (seen[o.no] = true))).map((o) => ({ value: String(o.no), label: `№ ${o.no} · ${o.client}` }));
  const baseOpts = [{ value: 'empty', label: 'Пустой вариант' }, { value: 'services', label: 'Из услуг заказа' },
    ...KP_TEMPLATES.map((t) => ({ value: 'tpl:' + t.id, label: 'Шаблон: ' + t.name }))];

  const buildTrain = (order) => {
    const np = { id: 'КП-' + (1100 + PROPOSALS.length), order: order.no, client: order.client, status: 'Черновик', currency, validUntil: valid, created: '15.06.2026', approvedVariant: null, docType: 'train',
      train: { passengers: 1, direction: '', note: '', trips: [] },
      accommodation: { guests: 1, location: '', variants: [{ id: uid('av'), name: 'Вариант 1', rows: [] }] },
      history: [{ t: kpNow(), text: 'КП «Поезд + Проживание» создано для заказа № ' + order.no, who: 'Даниель' }] };
    PROPOSALS.unshift(np);
    return np;
  };
  const build = () => {
    const order = ORDERS.find((o) => String(o.no) === String(orderNo));
    if (docType === 'train') return { np: buildTrain(order), order };
    let items = [], vname = name || 'Вариант A';
    if (base === 'services') items = (ORDER_SERVICES || []).map((s) => ({ id: uid('i'), kind: s.kind, title: s.title, sub: s.sub, cost: Math.round((s.sum || 0) * 0.95), fee: Math.round((s.sum || 0) * 0.05) }));
    else if (base.indexOf('tpl:') === 0) { const t = KP_TEMPLATES.find((x) => x.id === base.slice(4)); if (t) { items = t.items.map((s) => ({ id: uid('i'), ...s })); if (!name) vname = t.name; } }
    const np = { id: 'КП-' + (1100 + PROPOSALS.length), order: order.no, client: order.client, status: 'Черновик', currency, validUntil: valid, created: '15.06.2026', approvedVariant: null,
      variants: [{ id: uid('v'), name: vname, items }], history: [{ t: kpNow(), text: 'КП создано для заказа № ' + order.no, who: 'Даниель' }] };
    PROPOSALS.unshift(np); // visible in the order-card КП tab too
    return { np, order };
  };
  const submit = (openAfter) => {
    if (!orderNo) { setErrs({ order: 'Выберите заказ' }); return; }
    const { np, order } = build();
    onCreated && onCreated(np); toast('Черновик КП ' + np.id + ' создан', 'ok'); onClose();
    if (openAfter) onOpenOrder && onOpenOrder(order);
  };
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Новое коммерческое предложение"
      sub="КП привязывается к заказу — далее редактируется в конструкторе"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button variant="secondary" icon="check" onClick={() => submit(false)}>Создать черновик</Button>
        <Button iconRight="arrowRight" onClick={() => submit(true)}>Создать и открыть заказ</Button>
      </>}>
      <div className="form-grid">
        <Field label="Заказ" required error={errs.order} ><Select options={orderOpts} placeholder="Выберите заказ" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} error={errs.order} /></Field>
        <Field label="Тип КП"><Select options={KP_DOC_TYPES} value={docType} onChange={(e) => setDocType(e.target.value)} /></Field>
        {docType !== 'train' && <Field label="Название варианта"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Вариант A · Прямые рейсы" /></Field>}
        <Field label="Валюта"><Select options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))} value={currency} onChange={(e) => setCurrency(e.target.value)} /></Field>
        <Field label="Действует до"><Input value={valid} onChange={(e) => setValid(e.target.value)} leadIcon="calendar" /></Field>
        {docType !== 'train' && <Field label="Наполнение варианта"><Select options={baseOpts} value={base} onChange={(e) => setBase(e.target.value)} /></Field>}
      </div>
    </Drawer>
  );
}

/* ---------- Отправка КП клиенту по закреплённому каналу (как у карточки услуги) ----------
   КП — контейнер карточек: показываем варианты и услуги, отправляем по каналу заказа. */
function ProposalSendPanel({ proposal, participants = [], onSend, onClose }) {
  const defChannel = orderClientChannel(proposal.order);
  const [channel, setChannel] = useState(defChannel);
  const meta = sendChannelMeta(channel);
  const cur = proposal.currency || 'USD';
  const variants = proposal.variants || [];
  const multi = variants.length > 1;
  return (
    <StackPanel title={'Отправка КП ' + proposal.id + ' клиенту'} width="min(1020px,96vw)" onClose={onClose}
      footer={<>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" style={{ width: 14, height: 14 }} />Внутренние расчёты клиенту не отправляются
        </div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="send" onClick={() => onSend(channel)}>Отправить по каналу «{channel}»</Button>
      </>}>
      {/* канал, закреплённый за заказом */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Канал связи, закреплённый за заказом № {proposal.order}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Pill tone={meta.tone}><Icon name={meta.icon} style={{ width: 13, height: 13, verticalAlign: -2 }} /> {channel}</Pill>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>· {meta.adapt}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(SEND_CHANNELS).map((c) => (
              <button key={c} type="button" className={'seg-btn' + (channel === c ? ' active' : '')} style={{ padding: '7px 11px', fontSize: 13 }} onClick={() => setChannel(c)}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
        {multi ? 'Клиент получит альтернативные варианты и сможет выбрать один.' : 'Клиент получит комплект услуг одной поездки.'} Срок действия — до {proposal.validUntil}.
      </div>

      {proposal.docType === 'train'
        ? <div className="card card-pad">Документ «Поезд + Проживание» · заказ № {proposal.order}</div>
        : variants.map((vr) => (
          <div className="card card-pad" key={vr.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <h3 className="card-title" style={{ fontSize: 15, margin: 0 }}>{vr.name}</h3>
              <Pill tone="blue">{(vr.items || []).length} карточек услуг</Pill>
              <div style={{ flex: 1 }} />
              <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{kpM(varTotal(vr), cur)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(vr.items || []).map((it) => {
                const k = SERVICE_KIND[it.kind] || SERVICE_KIND['Авиа'];
                return (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className="airline-logo sm" style={{ background: k.color, width: 26, height: 26, borderRadius: 7 }}><Icon name={k.icon} style={{ width: 14, height: 14 }} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>{it.title}{it.sub ? <span style={{ color: 'var(--muted)', fontSize: 12.5 }}> · {it.sub}</span> : ''}</span>
                    <span style={{ fontWeight: 600 }}>{kpM(it.cost + it.fee, cur)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </StackPanel>
  );
}

/* ====================================================================
   STANDALONE REGISTRY (route 'offers')
   ==================================================================== */
function OffersRegistry({ onOpenOrder, intent, onConsume }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [preview, setPreview] = useState(null);
  const [proposals, setProposals] = useState(() => PROPOSALS.slice()); // copy: КПCreateModal also unshifts into PROPOSALS for the order card
  const [createOpen, setCreateOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const kpNow2 = () => (typeof kpNow === 'function' ? kpNow() : new Date().toLocaleString('ru-RU'));
  const doSendProposal = (p, channel) => {
    setProposals((ps) => ps.map((x) => x.id === p.id ? { ...x, status: 'Отправлено клиенту', sentChannel: channel, history: [...(x.history || []), { t: kpNow2(), text: 'Отправлено клиенту · канал «' + channel + '»', who: 'Даниель' }] } : x));
    setSendTarget(null); toast(p.id + ' отправлено по каналу «' + channel + '»', 'ok', { title: 'КП отправлено клиенту', action: { label: 'Открыть «Ком. предложения»', route: 'offers' } });
  };
  const previewDocRef = useRef(null);
  const { sort, onSort, apply } = useSort({ col: 'created', dir: 'desc' });

  useEffect(() => { if (intent && intent.type === 'create') { setCreateOpen(true); onConsume && onConsume(); } }, [intent]);

  let rows = proposals.filter((p) => {
    if (fStatus && p.status !== fStatus) return false;
    if (q && !(`${p.id} ${p.client} ${p.order}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = apply(rows, { id: (r) => r.id, order: (r) => r.order, created: (r) => r.created, total: (r) => Math.max(...pVariants(r).map((v) => v.total)) });

  const counts = (st) => proposals.filter((p) => !st || p.status === st).length;
  const STATS = [['Всего', counts()], ['Отправлено', counts('Отправлено клиенту')], ['На согласовании', counts('На согласовании')], ['Согласовано', counts('Согласовано')]];

  return (
    <div className="fade-in">
      <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--blue-soft)' }}>
        <Icon name="template" style={{ width: 20, height: 20, color: 'var(--blue)', flex: '0 0 20px', marginTop: 2 }} />
        <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
          <b>Коммерческое предложение — контейнер из карточек услуг.</b> Объединяйте несколько услуг одной поездки или альтернативные варианты в один документ.
          Отдельную <b>карточку услуги</b> можно отправить клиенту напрямую из заказа — без сборки КП (карточка → «Отправить клиенту»).
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № КП, клиент, заказ…" style={{ width: 300 }} />
        <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={KP_STATUS_FLOW} />
        <div style={{ flex: 1 }} />
        <Button icon="plus" onClick={() => setCreateOpen(true)}>Создать КП</Button>
      </div>
      <div className="table-card">
        {rows.length ? (
          <table className="tbl">
            <thead><tr>
              <Th label="№ КП" col="id" sort={sort} onSort={onSort} />
              <Th label="Заказ" col="order" sort={sort} onSort={onSort} />
              <th>Клиент</th><th>Вариантов</th>
              <Th label="Сумма" col="total" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
              <th>Действует до</th><th>Статус</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setPreview(p)}>
                  <td className="t-strong">{p.id}</td>
                  <td><span style={{ color: 'var(--blue)', fontWeight: 600 }}>№ {p.order}</span></td>
                  <td>{p.client}</td>
                  <td>{pVariants(p).length}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{proposalSummary(p)}</td>
                  <td>{p.validUntil}</td>
                  <td><Pill tone={KP_STATUS[p.status]}>{p.status}</Pill></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[{ icon: 'eye', label: 'Предпросмотр', onClick: () => setPreview(p) }, { icon: 'send', label: 'Отправить клиенту', onClick: () => setSendTarget(p) }, { icon: 'orders', label: 'Перейти в заказ', onClick: () => { const o = (ORDERS.find((x) => x.no === p.order)) || { no: p.order, client: p.client, requestType: 'Индивидуальная', status: 'В работе', operator: 'Даниель', date: '15.06.25' }; onOpenOrder(o); } }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="template" title="Предложений не найдено" sub="Измените поиск или фильтры" />}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} className={preview && preview.docType === 'train' ? 'kp2-modal-wide' : ''}>
        <div style={{ padding: 0, maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid var(--line)', zIndex: 2 }}>
            {preview && <span style={{ flex: 1, fontWeight: 700, alignSelf: 'center', paddingLeft: 8 }}>{preview.id} · заказ № {preview.order}</span>}
            <Button variant="secondary" size="sm" icon="download" disabled={pdfBusy} onClick={() => {
              setPdfBusy(true);
              exportKpToPdf(previewDocRef.current, preview.id + '.pdf', (ok) => { setPdfBusy(false); toast(ok ? 'PDF сохранён' : 'Не удалось сформировать PDF', ok ? 'ok' : 'err'); });
            }}>{pdfBusy ? 'Формируем…' : 'Скачать PDF'}</Button>
            <Button variant="secondary" size="sm" icon="orders" onClick={() => { const o = (ORDERS.find((x) => x.no === preview.order)) || { no: preview.order, client: preview.client, requestType: 'Индивидуальная', status: 'В работе', operator: 'Даниель', date: '15.06.25' }; setPreview(null); onOpenOrder(o); }}>Перейти в заказ</Button>
            <button className="modal-close" onClick={() => setPreview(null)} style={{ marginLeft: 8 }}><Icon name="x" /></button>
          </div>
          <div ref={previewDocRef} style={{ padding: 24, background: 'var(--surface-2)' }}>{preview && (preview.docType === 'train' ? <KPTrainPreviewDoc proposal={preview} /> : <KPPreviewDoc proposal={preview} />)}</div>
        </div>
      </Modal>

      <KPCreateModal open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={(np) => setProposals((ps) => [np, ...ps])} onOpenOrder={onOpenOrder} />
      {sendTarget && <ProposalSendPanel proposal={sendTarget} onSend={(ch) => doSendProposal(sendTarget, ch)} onClose={() => setSendTarget(null)} />}
    </div>
  );
}

function OffersPage({ onOpenOrder, intent, onConsume }) {
  return (
    <>
      <Topbar title="Коммерческие предложения" />
      <div className="content"><OffersRegistry onOpenOrder={onOpenOrder} intent={intent} onConsume={onConsume} /></div>
    </>
  );
}

Object.assign(window, { KPModule, KPPreviewDoc, KPCreateModal, ProposalSendPanel, OffersRegistry, OffersPage, FixVariantModal, KPHistoryDrawer });
