// ===== Commercial Proposals (КП): constructor, preview, approval, registry =====

function kpM(n, c = 'USD') { return Math.round(n).toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }
function varCost(v) { return v.items.reduce((s, i) => s + (+i.cost || 0), 0); }
function varFee(v) { return v.items.reduce((s, i) => s + (+i.fee || 0), 0); }
function varTotal(v) { return varCost(v) + varFee(v); }
function kpNow() { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`; }
function proposalSummary(p) {
  if (p.approvedVariant) { const v = p.variants.find((x) => x.id === p.approvedVariant); return v ? kpM(varTotal(v), p.currency) : '—'; }
  const totals = p.variants.map(varTotal);
  const lo = Math.min(...totals), hi = Math.max(...totals);
  return lo === hi ? kpM(lo, p.currency) : `${kpM(lo, p.currency)} – ${kpM(hi, p.currency)}`;
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
  return (
    <div className="kp-doc">
      <div className="kp-band">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <BrandMark size={30} color="#fff" /><span style={{ fontWeight: 800, fontSize: 18 }}>ПСЦ — Travel Hub</span>
          </div>
          <h2>Коммерческое предложение</h2>
          <div style={{ opacity: .85, marginTop: 6, fontSize: 14 }}>№ {p.id} от {p.created}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13.5, opacity: .9 }}>
          <div>Действительно до</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{p.validUntil}</div>
          <div style={{ marginTop: 10 }}>Валюта: {p.currency}</div>
        </div>
      </div>
      <div className="kp-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap' }}>
          <div><div className="kp-sec-h" style={{ marginTop: 0 }}>Клиент</div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{p.client}</div><div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 3 }}>Заказ № {p.order}</div></div>
          <div><div className="kp-sec-h" style={{ marginTop: 0 }}>Участники поездки</div>
            {(participants || ORDER_PARTICIPANTS).map((pt, i) => <div key={i} style={{ fontSize: 14, color: 'var(--ink)' }}>{pt.name} <span style={{ color: 'var(--muted)' }}>· {pt.role}</span></div>)}
          </div>
        </div>

        <div className="kp-sec-h">{vids.length > 1 ? 'Варианты на выбор' : 'Состав предложения'}</div>
        {p.variants.filter((v) => vids.includes(v.id)).map((v) => (
          <div className="kp-vbox" key={v.id}>
            <div className={'kp-vhead' + (p.approvedVariant === v.id ? ' pick' : '')}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{v.name}</span>
              {p.approvedVariant === v.id && <Pill tone="green">Выбран клиентом</Pill>}
            </div>
            {v.items.map((it) => {
              const k = SERVICE_KIND[it.kind] || SERVICE_KIND['Авиа'];
              return (
                <div className="kp-li" key={it.id}>
                  <span className="kp-li-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 600, color: 'var(--ink)' }}>{it.title}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{it.sub}</div></div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{kpM(it.cost + it.fee, p.currency)}</div>
                </div>
              );
            })}
            <div className="kp-vtot"><span>Итого по варианту</span><span style={{ fontSize: 17 }}>{kpM(varTotal(v), p.currency)}</span></div>
          </div>
        ))}

        <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--line)', color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
          Стоимость указана с учётом сервисных сборов агентства. Предложение носит предварительный характер и может быть скорректировано в зависимости от наличия мест и тарифов на момент бронирования.
        </div>
      </div>
    </div>
  );
}

/* ---------- fix-variant modal (approval) ---------- */
function FixVariantModal({ open, proposal, onClose, onFix }) {
  const [pick, setPick] = useState(proposal ? proposal.variants[0].id : null);
  useEffect(() => { if (proposal) setPick(proposal.variants[0].id); }, [proposal]);
  if (!open || !proposal) return null;
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div style={{ padding: '24px 26px' }}>
        <ModalHeader title="Зафиксировать выбранный вариант" sub="Клиент согласовал предложение" onClose={onClose} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '10px 0 20px' }}>
          {proposal.variants.map((v) => (
            <label key={v.id} className="off-card" style={{ display: 'flex', gridTemplateColumns: 'none', padding: '14px 16px', cursor: 'pointer', borderColor: pick === v.id ? 'var(--blue)' : 'var(--line)' }} onClick={() => setPick(v.id)}>
              <Radio on={pick === v.id} onChange={() => setPick(v.id)} />
              <div style={{ flex: 1, marginLeft: 12 }}><div style={{ fontWeight: 600 }}>{v.name}</div><div style={{ fontSize: 13, color: 'var(--muted)' }}>{v.items.length} услуг</div></div>
              <div style={{ fontWeight: 700 }}>{kpM(varTotal(v), proposal.currency)}</div>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
          <Button style={{ flex: 1 }} icon="check" onClick={() => onFix(pick)}>Зафиксировать</Button>
        </div>
      </div>
    </Modal>
  );
}

const KP_ADD_TYPES = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Группа'];

/* ====================================================================
   KP MODULE — lives inside the order card (КП tab)
   ==================================================================== */
function KPModule({ order, services, participants, onApprove }) {
  const toast = useToast();
  const seeded = PROPOSALS.filter((p) => p.order === order.no);
  const [proposals, setProposals] = useState(seeded);
  const [view, setView] = useState('list'); // list | edit | preview
  const [activeId, setActiveId] = useState(null);
  const [activeVar, setActiveVar] = useState(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);

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
  const openEdit = (p) => { setActiveId(p.id); setActiveVar(p.variants[0].id); setView('edit'); };
  const openPreview = (p) => { setActiveId(p.id); setView('preview'); };

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
  const sendToClient = () => { patch(active.id, (p) => withHist({ ...p, status: 'Отправлено клиенту' }, 'Отправлено клиенту')); toast('КП отправлено клиенту', 'ok'); };
  const fixVariant = (vid) => {
    const vname = (active.variants.find((v) => v.id === vid) || {}).name;
    patch(active.id, (p) => withHist({ ...p, status: 'Согласовано', approvedVariant: vid }, 'Зафиксирован вариант: ' + vname));
    setFixOpen(false); toast('Вариант зафиксирован — услуги готовы к бронированию', 'ok');
    onApprove && onApprove(active.variants.find((v) => v.id === vid));
  };

  /* ----- LIST ----- */
  if (view === 'list') {
    if (!proposals.length) {
      return (
        <div className="fade-in">
          <EmptyState icon="template" title="Коммерческих предложений ещё нет" sub="Соберите варианты из услуг заказа и отправьте клиенту" />
          <div style={{ textAlign: 'center', marginTop: 16 }}><Button icon="plus" onClick={createProposal}>Создать КП из заказа</Button></div>
        </div>
      );
    }
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>{proposals.length} предложение(й) по заказу</span>
          <div style={{ flex: 1 }} /><Button icon="plus" onClick={createProposal}>Создать КП</Button>
        </div>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {proposals.map((p) => (
            <div className="card card-pad" key={p.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{p.id}</div><div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{p.variants.length} вариант(ов) · до {p.validUntil}</div></div>
                <Pill tone={KP_STATUS[p.status]}>{p.status}</Pill>
              </div>
              <div className="kv-row" style={{ borderBottom: 'none', padding: '6px 0' }}><span className="k">Сумма</span><span className="v" style={{ fontSize: 17 }}>{proposalSummary(p)}</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Button variant="secondary" size="sm" icon="edit" onClick={() => openEdit(p)}>Открыть</Button>
                <Button variant="secondary" size="sm" icon="eye" onClick={() => openPreview(p)}>Предпросмотр</Button>
                <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                  items={[{ icon: 'clock', label: 'История', onClick: () => { setActiveId(p.id); setHistOpen(true); } }, { icon: 'send', label: 'Отправить клиенту', onClick: () => { setActiveId(p.id); setProposals((ps) => ps.map((x) => x.id === p.id ? withHist({ ...x, status: 'Отправлено клиенту' }, 'Отправлено клиенту') : x)); toast('Отправлено клиенту', 'ok'); } }, { sep: true }, { icon: 'inbox', label: 'Архивировать', onClick: () => { setProposals((ps) => ps.map((x) => x.id === p.id ? { ...x, status: 'Архивировано' } : x)); } }]} />
              </div>
            </div>
          ))}
        </div>
        <KPHistoryDrawer open={histOpen} proposal={active} onClose={() => setHistOpen(false)} />
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
          <Button variant="secondary" icon="download" onClick={() => toast('PDF сформирован', 'ok')}>Скачать PDF</Button>
          <Button icon="send" onClick={() => { sendToClient(); setView('list'); }}>Отправить клиенту</Button>
        </div>
        <KPPreviewDoc proposal={active} participants={participants} />
      </div>
    );
  }

  /* ----- EDIT (constructor) ----- */
  if (view === 'edit' && active) {
    const v = active.variants.find((x) => x.id === activeVar) || active.variants[0];
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

        <FixVariantModal open={fixOpen} proposal={active} onClose={() => setFixOpen(false)} onFix={fixVariant} />
        <KPHistoryDrawer open={histOpen} proposal={active} onClose={() => setHistOpen(false)} />
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

/* ====================================================================
   STANDALONE REGISTRY (route 'offers')
   ==================================================================== */
function OffersRegistry({ onOpenOrder }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [preview, setPreview] = useState(null);
  const { sort, onSort, apply } = useSort({ col: 'created', dir: 'desc' });

  let rows = PROPOSALS.filter((p) => {
    if (fStatus && p.status !== fStatus) return false;
    if (q && !(`${p.id} ${p.client} ${p.order}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = apply(rows, { id: (r) => r.id, order: (r) => r.order, created: (r) => r.created, total: (r) => Math.max(...r.variants.map(varTotal)) });

  const counts = (st) => PROPOSALS.filter((p) => !st || p.status === st).length;
  const STATS = [['Всего', counts()], ['Отправлено', counts('Отправлено клиенту')], ['На согласовании', counts('На согласовании')], ['Согласовано', counts('Согласовано')]];

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBox value={q} onChange={setQ} placeholder="Поиск: № КП, клиент, заказ…" style={{ width: 300 }} />
        <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={KP_STATUS_FLOW} />
        <div style={{ flex: 1 }} />
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
                  <td>{p.variants.length}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{proposalSummary(p)}</td>
                  <td>{p.validUntil}</td>
                  <td><Pill tone={KP_STATUS[p.status]}>{p.status}</Pill></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[{ icon: 'eye', label: 'Предпросмотр', onClick: () => setPreview(p) }, { icon: 'orders', label: 'Перейти в заказ', onClick: () => { const o = (ORDERS.find((x) => x.no === p.order)) || { no: p.order, client: p.client, requestType: 'Индивидуальная', status: 'В работе', operator: 'Даниель', date: '15.06.25' }; onOpenOrder(o); } }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="template" title="Предложений не найдено" sub="Измените поиск или фильтры" />}
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} className="">
        <div style={{ padding: 0, maxHeight: '88vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', position: 'sticky', top: 0, background: '#fff', borderBottom: '1px solid var(--line)', zIndex: 2 }}>
            {preview && <span style={{ flex: 1, fontWeight: 700, alignSelf: 'center', paddingLeft: 8 }}>{preview.id} · заказ № {preview.order}</span>}
            <Button variant="secondary" size="sm" icon="orders" onClick={() => { const o = (ORDERS.find((x) => x.no === preview.order)) || { no: preview.order, client: preview.client, requestType: 'Индивидуальная', status: 'В работе', operator: 'Даниель', date: '15.06.25' }; setPreview(null); onOpenOrder(o); }}>Перейти в заказ</Button>
            <button className="modal-close" onClick={() => setPreview(null)} style={{ marginLeft: 8 }}><Icon name="x" /></button>
          </div>
          <div style={{ padding: 24, background: 'var(--surface-2)' }}>{preview && <KPPreviewDoc proposal={preview} />}</div>
        </div>
      </Modal>
    </div>
  );
}

function OffersPage({ onOpenOrder }) {
  return (
    <>
      <Topbar title="Коммерческие предложения" />
      <div className="content"><OffersRegistry onOpenOrder={onOpenOrder} /></div>
    </>
  );
}

Object.assign(window, { KPModule, KPPreviewDoc, OffersRegistry, OffersPage, FixVariantModal, KPHistoryDrawer });
