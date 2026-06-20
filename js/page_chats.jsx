// ===== Чаты: много независимых чатов (клиент / операторы / поставщики / локальные / события) =====
// каждый чат привязан к заказу и (опционально) к услуге · вложения · упоминания · системные события
// внутри чата два под-канала композера: «Сообщение» и «Внутренний комментарий» (закрытый).

function chatNow() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function chatText(text) {
  if (!text) return null;
  return text.split(/(@[A-Za-zА-Яа-яЁё]+)/g).map((p, i) => p[0] === '@'
    ? <span key={i} className="msg-mention">{p}</span>
    : <React.Fragment key={i}>{p}</React.Fragment>);
}
function lastMessage(thread) {
  const all = thread.messages || [];
  const m = all[all.length - 1];
  if (!m) return '';
  if (m.from === 'system') return m.text;
  return (m.from === 'me' ? 'Вы: ' : '') + (m.attach ? '📎 ' + m.attach.name : m.text);
}
function threadUnread(t) { return typeof t.unread === 'number' ? t.unread : Object.values(t.unread || {}).reduce((s, n) => s + n, 0); }
function chatServiceById(id) { return (typeof ORDER_SERVICES !== 'undefined' ? ORDER_SERVICES : []).find((s) => s.id === id) || null; }
function chatOrderStatus(no) { const o = (typeof ORDERS !== 'undefined' ? ORDERS : []).find((x) => x.no === no); if (!o) return null; return o.status === 'Нет данных' ? 'Новое' : o.status; }
function chatTypeMeta(key) { return (CHAT_TYPES.find((t) => t.key === key)) || { key, label: key, icon: 'chat' }; }

// default thread for an order (used by the order card & global drawer entry points)
function getThreadForOrder(order) {
  return CHAT_THREADS.find((t) => t.order === order.no && t.type === 'client') ||
    CHAT_THREADS.find((t) => t.order === order.no) ||
    { id: 'o' + order.no, order: order.no, type: 'client', channel: 'MAX', name: order.client, client: order.client,
      online: '—', unread: 0, pinned: false, connectionStatus: 'Подключено', responsibleOperator: order.operator || 'Даниель',
      relatedServices: [], participants: [{ name: order.client, role: 'Клиент' }], messages: [], internal: [] };
}

/* small channel badge for list rows & header */
function ChannelBadge({ channel, sm }) {
  if (sm) {
    const tone = CHAT_CHANNEL_TONE[channel] || 'gray';
    return <span className={'pill pill-' + tone} style={{ height: 18, padding: '0 7px', fontSize: 10.5, flexShrink: 0 }}>{channel}</span>;
  }
  return <Pill tone={CHAT_CHANNEL_TONE[channel] || 'gray'}>{channel}</Pill>;
}

/* ---------- reusable conversation panel ---------- */
function ChatThread({ thread, embedded, onOpenOrder, onOpenService, initChannel }) {
  const toast = useToast();
  const [sub, setSub] = useState('message'); // composer sub-channel: 'message' | 'internal'
  const [msgs, setMsgs] = useState(thread.messages || []);
  const [intl, setIntl] = useState(thread.internal || []);
  const [draft, setDraft] = useState('');
  const [linked, setLinked] = useState(null); // service id attached to the message being composed
  const [pinned, setPinned] = useState(!!thread.pinned);
  const scrollRef = useRef(null);

  useEffect(() => { setMsgs(thread.messages || []); setIntl(thread.internal || []); setSub('message'); setLinked(null); setPinned(!!thread.pinned); }, [thread.id]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [sub, msgs, intl]);

  const feed = sub === 'internal' ? intl : msgs;
  const setFeed = sub === 'internal' ? setIntl : setMsgs;
  const send = () => {
    if (!draft.trim()) return;
    setFeed((c) => [...c, { from: 'me', author: 'Даниель', text: draft, time: chatNow(), read: false, service: linked }]);
    setDraft('');
  };
  const attach = () => { setFeed((c) => [...c, { from: 'me', author: 'Даниель', attach: { name: 'Документ.pdf', size: '128 КБ' }, time: chatNow(), read: false }]); toast('Файл прикреплён', 'ok'); };

  const status = chatOrderStatus(thread.order);
  const services = typeof ORDER_SERVICES !== 'undefined' ? ORDER_SERVICES : [];
  const tMeta = chatTypeMeta(thread.type);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* header */}
      {embedded ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <Avatar name={thread.name} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{thread.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{tMeta.label} · был в сети {thread.online}</div>
          </div>
          <ChannelBadge channel={thread.channel} />
        </div>
      ) : (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>№ {thread.order}</span>
            {status && <Pill tone={(typeof ORDER_STATUS !== 'undefined' && ORDER_STATUS[status]) || 'blue'}>{status}</Pill>}
            <ChannelBadge channel={thread.channel} />
            <Pill tone={thread.connectionStatus === 'Подключено' ? 'green' : 'red'}>{thread.connectionStatus}</Pill>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{thread.name} · отв. {thread.responsibleOperator} · {(thread.participants || []).length} уч.</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary btn-icon btn-sm" title="Создать задачу" onClick={() => toast('Создание задачи по чату', 'info')}><Icon name="clipboard" /></button>
            <button className={'btn btn-icon btn-sm ' + (pinned ? 'btn-primary' : 'btn-secondary')} title={pinned ? 'Открепить чат' : 'Закрепить чат'} onClick={() => { setPinned((p) => !p); toast(pinned ? 'Чат откреплён' : 'Чат закреплён', 'ok'); }}><Icon name="star" /></button>
            <ActionMenu trigger={<button className="btn btn-secondary btn-icon btn-sm"><Icon name="more" /></button>}
              items={[
                { icon: 'orders', label: 'Открыть карточку заказа', onClick: () => onOpenOrder && onOpenOrder(thread) },
                { icon: 'mail', label: 'Отправить email', onClick: () => toast('Черновик письма создан', 'info') },
                { icon: 'clock', label: 'История изменений', onClick: () => toast('История изменений чата', 'info') },
              ]} />
          </div>
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {sub === 'internal' && <div className="chan-note"><Icon name="lock" style={{ width: 14, height: 14 }} />Внутренний комментарий — виден только сотрудникам агентства</div>}
        {sub === 'message' && thread.type === 'supplier' && <div className="chan-note" style={{ color: 'var(--gray-text)', background: 'var(--gray-bg)' }}><Icon name="suppliers" style={{ width: 14, height: 14 }} />Канал с поставщиком · {thread.supplier || thread.name} · {thread.channel}</div>}
        {!feed.length && <EmptyState icon="chat" title="Сообщений пока нет" sub={sub === 'internal' ? 'Оставьте внутренний комментарий' : 'Начните переписку'} />}
        {feed.map((m, i) => {
          if (m.from === 'system') return (
            <div className="chat-sys" key={i}>
              <span><Icon name="bell" />{m.text} · {m.time}
                {m.action && <button className="link-chip" style={{ marginLeft: 10 }} onClick={() => onOpenService && onOpenService(m.action.service)}>{m.action.label}<Icon name="chevRight" /></button>}
              </span>
            </div>
          );
          const me = m.from === 'me';
          const svc = m.service ? chatServiceById(m.service) : null;
          return (
            <div className={'msg-row ' + (me ? 'me' : 'them')} key={i}>
              <div className={'msg ' + (me ? 'me' : 'them') + (sub === 'internal' ? ' internal' : '')}>
                {!me && m.author && thread.type !== 'client' && <div className="msg-author">{m.author}</div>}
                {svc && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-soft)', borderRadius: 8, padding: '3px 8px', marginBottom: 6 }}><Icon name={(SERVICE_KIND[svc.kind] || {}).icon || 'route'} style={{ width: 12, height: 12 }} />{svc.kind} · {svc.title}</div>}
                {m.attach
                  ? <div className="chat-attach" onClick={() => toast('Скачивание ' + m.attach.name, 'info')}><span className="ic"><Icon name="paperclip" /></span><div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.attach.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.attach.size}</div></div><Icon name="download" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} /></div>
                  : <span>{chatText(m.text)}</span>}
                <div className="msg-time">{m.time}{me && <Icon name="check" style={{ width: 14, height: 14, color: m.read ? '#2bb96a' : 'var(--muted)' }} />}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
        {linked && (() => { const s = chatServiceById(linked); return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 10px', marginBottom: 6 }}>
            <Icon name={(SERVICE_KIND[s.kind] || {}).icon || 'route'} style={{ width: 13, height: 13, color: 'var(--blue)' }} />{s.kind} · {s.title}
            <button className="icon-btn btn-sm" style={{ width: 20, height: 20 }} onClick={() => setLinked(null)}><Icon name="x" style={{ width: 13, height: 13 }} /></button>
          </div>
        ); })()}
        <div className="trip-toggle" style={{ display: 'inline-flex', marginBottom: 6 }}>
          <button className={sub === 'message' ? 'on' : ''} onClick={() => setSub('message')}>Сообщение</button>
          <button className={sub === 'internal' ? 'on' : ''} onClick={() => setSub('internal')}><Icon name="lock" style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4 }} />Внутренний комментарий</button>
        </div>
        <div className="search" style={{ width: '100%', minWidth: 0 }}>
          <button className="icon-btn" onClick={attach} title="Прикрепить"><Icon name="paperclip" /></button>
          <ActionMenu trigger={<button className="icon-btn" title="Привязать к услуге"><Icon name="route" /></button>}
            items={services.length ? services.map((s) => ({ icon: (SERVICE_KIND[s.kind] || {}).icon || 'route', label: s.kind + ' · ' + s.title, onClick: () => { setLinked(s.id); toast('Привязано к услуге: ' + s.title, 'ok'); } })) : [{ icon: 'route', label: 'Нет услуг в заказе', onClick: () => {} }]} />
          <ActionMenu trigger={<button className="icon-btn" title="Упомянуть"><span style={{ fontWeight: 700, fontSize: 16, color: 'var(--muted)' }}>@</span></button>}
            items={OPERATORS.map((o) => ({ icon: 'user', label: o, onClick: () => setDraft((d) => (d ? d + ' ' : '') + '@' + o.split(' ')[0] + ' ') }))} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={sub === 'internal' ? 'Внутренний комментарий…' : 'Сообщение…'} style={{ flex: 1 }} />
          <button className="icon-btn" style={{ color: 'var(--blue)' }} onClick={send}><Icon name="send" /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------- right info panel ---------- */
function ChatInfoPanel({ thread, onOpenOrder, onOpenService }) {
  const toast = useToast();
  const [allPax, setAllPax] = useState(false);
  const services = (thread.relatedServices || []).map(chatServiceById).filter(Boolean);
  const tMeta = chatTypeMeta(thread.type);
  const pax = thread.participants || [];
  const shownPax = allPax ? pax : pax.slice(0, 4);
  const quick = [
    { icon: 'clipboard', label: 'Задача', title: 'Создать задачу', onClick: () => toast('Создание задачи по чату', 'info') },
    { icon: 'mail', label: 'Email', title: 'Отправить email', onClick: () => toast('Черновик письма создан', 'info') },
    { icon: 'orders', label: 'Заказ', title: 'Открыть карточку заказа', onClick: () => onOpenOrder && onOpenOrder(thread) },
    { icon: 'clock', label: 'История', title: 'История изменений', onClick: () => toast('История изменений чата', 'info') },
  ];
  return (
    <div className="scroll" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 2 }}>
      {/* related services */}
      <div className="card" style={{ padding: '10px 12px' }}>
        <h3 className="card-title" style={{ fontSize: 13, marginBottom: 7 }}>Связано с услугой</h3>
        {services.length ? services.map((s) => {
          const k = SERVICE_KIND[s.kind] || SERVICE_KIND['Авиа'];
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="oc-svc-ic" style={{ background: k.color, width: 32, height: 32 }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{s.kind} · {s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.date} · <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill></div>
              </div>
            </div>
          );
        }) : <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Чат не привязан к услуге</div>}
        <Button variant="secondary" size="sm" className="btn-block" iconRight="chevRight" onClick={() => onOpenService && onOpenService(services[0] ? services[0].id : null)}>Открыть услугу</Button>
      </div>

      {/* chat info */}
      <div className="card" style={{ padding: '10px 12px' }}>
        <h3 className="card-title" style={{ fontSize: 13, marginBottom: 3 }}>Информация о чате</h3>
        <div className="kv">
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12.5 }}>Тип чата</span><span className="v" style={{ fontSize: 12.5 }}>{tMeta.label}</span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12.5 }}>Канал связи</span><span className="v"><ChannelBadge channel={thread.channel} sm /></span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12.5 }}>Подключение</span><span className="v" style={{ fontSize: 12.5, color: thread.connectionStatus === 'Подключено' ? 'var(--green)' : 'var(--red)' }}>{thread.connectionStatus}</span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12.5 }}>Создан</span><span className="v" style={{ fontSize: 12.5 }}>{thread.createdAt}</span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12.5 }}>Ответственный</span><span className="v" style={{ fontSize: 12.5 }}>{thread.responsibleOperator}</span></div>
        </div>
      </div>

      {/* participants */}
      <div className="card" style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <h3 className="card-title" style={{ fontSize: 13 }}>Участники</h3>
          {pax.length > 4 && <button className="link-chip" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => setAllPax((v) => !v)}>{allPax ? 'Свернуть' : 'Показать всех'}</button>}
        </div>
        {shownPax.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Avatar name={p.name} size={25} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--ink)' }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.role}</div></div>
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="card" style={{ padding: '10px 12px' }}>
        <h3 className="card-title" style={{ fontSize: 13, marginBottom: 7 }}>Быстрые действия</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {quick.map((q) => (
            <Button key={q.label} variant="secondary" size="sm" icon={q.icon} className="btn-block" title={q.title} style={{ justifyContent: 'flex-start', fontSize: 12, padding: '0 8px' }} onClick={q.onClick}>{q.label}</Button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- left navigation ---------- */
function ChatsNav({ threads, activeId, onSelect, search, setSearch, mode, setMode }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const matchesSearch = (t) => {
    const hay = `${t.name} ${t.order} ${t.client} ${t.channel} ${(t.relatedServices || []).map((id) => { const s = chatServiceById(id); return s ? s.kind + ' ' + s.title : ''; }).join(' ')} ${lastMessage(t)}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  };
  const searched = threads.filter(matchesSearch);
  const typeCount = (k) => searched.filter((t) => t.type === k).length;
  const filtered = (mode === 'byType' && typeFilter !== 'all') ? searched.filter((t) => t.type === typeFilter) : searched;
  // pinned first, then newest (by id desc)
  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.id - a.id);

  const TYPE_FILTERS = [{ key: 'all', label: 'Все чаты' }].concat(CHAT_TYPES.map((t) => ({ key: t.key, label: t.label })));

  const Row = (t) => {
    const tMeta = chatTypeMeta(t.type);
    const u = threadUnread(t);
    return (
      <div key={t.id} onClick={() => onSelect(t.id)}
        style={{ display: 'flex', gap: 9, padding: '7px 8px', borderRadius: 10, cursor: 'pointer', background: t.id === activeId ? 'var(--hover)' : 'transparent', marginBottom: 1 }}>
        {t.type === 'system'
          ? <span className="oc-svc-ic" style={{ background: 'var(--amber)', width: 33, height: 33, flexShrink: 0 }}><Icon name="bell" style={{ width: 15, height: 15 }} /></span>
          : <Avatar name={t.name} size={33} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
              {t.pinned && <Icon name="star" style={{ width: 12, height: 12, color: 'var(--amber)' }} />}{t.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>№{t.order}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 1 }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
              <ChannelBadge channel={t.channel} sm />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMessage(t)}</span>
            </span>
            {u > 0 && <span className="chan-tab-badge" style={{ marginLeft: 0, flexShrink: 0 }}>{u}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Поиск чатов…" style={{ flex: 1, minWidth: 0 }} />
          <div className="trip-toggle" style={{ display: 'flex', flexShrink: 0, padding: 3 }}>
            <button className={mode === 'byType' ? 'on' : ''} style={{ padding: '6px 9px', fontSize: 12 }} onClick={() => setMode('byType')}>Тип</button>
            <button className={mode === 'byService' ? 'on' : ''} style={{ padding: '6px 9px', fontSize: 12 }} onClick={() => setMode('byService')}>Услуга</button>
          </div>
        </div>
        {mode === 'byType' && (
          <div className="chat-filter-scroll" style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflowX: 'auto', marginTop: 7, paddingBottom: 2 }}>
            {TYPE_FILTERS.map((f) => {
              const n = f.key === 'all' ? searched.length : typeCount(f.key);
              return (
                <button key={f.key} className={'chip' + (typeFilter === f.key ? ' active' : '')} style={{ height: 26, fontSize: 12, padding: '0 10px', gap: 5, flexShrink: 0, background: typeFilter === f.key ? 'var(--blue-soft)' : 'var(--surface-2)', borderColor: typeFilter === f.key ? 'var(--blue)' : 'transparent', color: typeFilter === f.key ? 'var(--blue)' : 'var(--muted)' }} onClick={() => setTypeFilter(f.key)}>
                  {f.label}<span style={{ fontWeight: 700 }}>{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '5px 7px 7px' }}>
        {mode === 'byService'
          ? (() => {
            const groups = {};
            sorted.forEach((t) => { const sid = (t.relatedServices || [])[0] || '—'; (groups[sid] = groups[sid] || []).push(t); });
            const order = Object.keys(groups).sort((a, b) => (a === '—' ? 1 : 0) - (b === '—' ? 1 : 0));
            return order.length ? order.map((sid) => {
              const s = chatServiceById(sid);
              return (
                <div key={sid} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', padding: '8px 6px 4px' }}>{s ? s.kind + ' · ' + s.title : 'Без привязки к услуге'}</div>
                  {groups[sid].map(Row)}
                </div>
              );
            }) : <div style={{ padding: 24 }}><EmptyState icon="chat" title="Ничего не найдено" /></div>;
          })()
          : (sorted.length ? sorted.map(Row) : <div style={{ padding: 24 }}><EmptyState icon="chat" title="Ничего не найдено" /></div>)}
      </div>
    </div>
  );
}

/* ---------- standalone Чаты page ---------- */
function ChatsPage({ onOpenOrder }) {
  const toast = useToast();
  const [threads] = useState(CHAT_THREADS);
  const [activeId, setActiveId] = useState(CHAT_THREADS[0].id);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('byType');

  const active = threads.find((t) => t.id === activeId) || threads[0];
  const openOrderFromThread = (t) => { const o = ORDERS.find((x) => x.no === t.order) || { no: t.order, client: t.client || t.name, requestType: 'Индивидуальная', status: 'В работе', operator: t.responsibleOperator || 'Даниель', date: '15.06.25' }; onOpenOrder && onOpenOrder(o); };
  const openServiceFromThread = (sid) => { const o = ORDERS.find((x) => x.no === active.order) || { no: active.order, client: active.client || active.name, requestType: 'Индивидуальная', status: 'В работе', operator: active.responsibleOperator || 'Даниель', date: '15.06.25' }; onOpenOrder && onOpenOrder(o, 'services'); };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="content" style={{ flex: 1, minHeight: 0, padding: '20px 20px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '268px 1fr 252px', gap: 10, height: 'calc(100vh - 100px)' }}>
          <ChatsNav threads={threads} activeId={activeId} onSelect={setActiveId} search={search} setSearch={setSearch} mode={mode} setMode={setMode} />

          {/* conversation */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {active ? <ChatThread thread={active} onOpenOrder={openOrderFromThread} onOpenService={openServiceFromThread} /> : <EmptyState icon="chat" title="Выберите чат" />}
          </div>

          {/* info panel */}
          {active && <ChatInfoPanel thread={active} onOpenOrder={openOrderFromThread} onOpenService={openServiceFromThread} />}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatsPage, ChatThread, ChatInfoPanel, ChatsNav, getThreadForOrder, threadUnread, lastMessage });
