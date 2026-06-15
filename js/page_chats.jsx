// ===== Чаты: 3-стороннее общение (клиент / поставщик / внутренние) =====
// вложения · упоминания · история · системные события · связь с заказом

function chatNow() { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function chatText(text) {
  if (!text) return null;
  return text.split(/(@[A-Za-zА-Яа-яЁё]+)/g).map((p, i) => p[0] === '@'
    ? <span key={i} className="msg-mention">{p}</span>
    : <React.Fragment key={i}>{p}</React.Fragment>);
}
function lastMessage(thread) {
  const all = [].concat(thread.channels.client, thread.channels.supplier, thread.channels.internal);
  const m = all[all.length - 1];
  if (!m) return '';
  return (m.from === 'me' ? 'Вы: ' : '') + (m.attach ? '📎 ' + m.attach.name : m.text);
}
function getThreadForOrder(order) {
  return CHAT_THREADS.find((t) => t.order === order.no) ||
    { id: 'o' + order.no, order: order.no, name: order.client, client: order.client, supplier: '—', online: '—', unread: { client: 0, supplier: 0, internal: 0 }, channels: { client: [], supplier: [], internal: [] } };
}

/* ---------- reusable conversation panel ---------- */
function ChatThread({ thread, embedded, onOpenOrder }) {
  const toast = useToast();
  const [channel, setChannel] = useState('client');
  const [chans, setChans] = useState(thread.channels);
  const [unread, setUnread] = useState(thread.unread || {});
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  // reset when switching to a different thread
  useEffect(() => { setChans(thread.channels); setUnread(thread.unread || {}); setChannel('client'); }, [thread.id]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [channel, chans]);

  const msgs = chans[channel] || [];
  const pushMsg = (m) => setChans((c) => ({ ...c, [channel]: [...c[channel], m] }));
  const send = () => { if (!draft.trim()) return; pushMsg({ from: 'me', author: 'Даниель', text: draft, time: chatNow(), read: false }); setDraft(''); };
  const attach = () => { pushMsg({ from: 'me', author: 'Даниель', attach: { name: 'Документ.pdf', size: '128 КБ' }, time: chatNow(), read: false }); toast('Файл прикреплён', 'ok'); };
  const openChannel = (k) => { setChannel(k); setUnread((u) => ({ ...u, [k]: 0 })); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
        <Avatar name={thread.name} size={embedded ? 38 : 46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{thread.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{thread.client} · был в сети {thread.online}</div>
        </div>
        {!embedded && (
          <span className="link-chip" onClick={() => onOpenOrder && onOpenOrder(thread)}><Icon name="orders" />Заказ № {thread.order}</span>
        )}
        <button className="icon-btn"><Icon name="search" /></button>
      </div>

      {/* channel tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px 0' }}>
        {CHAT_CHANNELS.map((c) => (
          <button key={c.key} className={'tab btn-sm' + (channel === c.key ? ' active' : '')} style={{ height: 36 }} onClick={() => openChannel(c.key)}>
            <Icon name={c.icon} />{c.label}{unread[c.key] > 0 && <span className="chan-tab-badge">{unread[c.key]}</span>}
          </button>
        ))}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        {channel === 'internal' && <div className="chan-note"><Icon name="lock" style={{ width: 14, height: 14 }} />Видно только сотрудникам агентства</div>}
        {channel === 'supplier' && <div className="chan-note" style={{ color: 'var(--gray-text)', background: 'var(--gray-bg)' }}><Icon name="suppliers" style={{ width: 14, height: 14 }} />Канал с поставщиком · {thread.supplier}</div>}
        {!msgs.length && <EmptyState icon="chat" title="Сообщений пока нет" sub="Начните переписку в этом канале" />}
        {msgs.map((m, i) => {
          if (m.from === 'system') return <div className="chat-sys" key={i}><span><Icon name="bell" />{m.text} · {m.time}</span></div>;
          const me = m.from === 'me';
          return (
            <div className={'msg-row ' + (me ? 'me' : 'them')} key={i}>
              <div className={'msg ' + (me ? 'me' : 'them') + (channel === 'internal' ? ' internal' : '')}>
                {!me && m.author && channel !== 'client' && <div className="msg-author">{m.author}</div>}
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
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--line)' }}>
        <div className="search" style={{ width: '100%', minWidth: 0 }}>
          <button className="icon-btn" onClick={attach} title="Прикрепить"><Icon name="paperclip" /></button>
          <ActionMenu trigger={<button className="icon-btn" title="Упомянуть"><span style={{ fontWeight: 700, fontSize: 16, color: 'var(--muted)' }}>@</span></button>}
            items={OPERATORS.map((o) => ({ icon: 'user', label: o, onClick: () => setDraft((d) => (d ? d + ' ' : '') + '@' + o.split(' ')[0] + ' ') }))} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={channel === 'internal' ? 'Внутренний комментарий…' : 'Сообщение…'} style={{ flex: 1 }} />
          <button className="icon-btn" style={{ color: 'var(--blue)' }} onClick={send}><Icon name="send" /></button>
        </div>
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
  const [onlyUnread, setOnlyUnread] = useState(false);

  const totalUnread = (t) => Object.values(t.unread || {}).reduce((s, n) => s + n, 0);
  const list = threads.filter((t) => (`${t.name} ${t.order} ${t.client}`.toLowerCase().includes(search.toLowerCase())) && (!onlyUnread || totalUnread(t) > 0));
  const active = threads.find((t) => t.id === activeId) || threads[0];
  const openOrderFromThread = (t) => { const o = ORDERS.find((x) => x.no === t.order) || { no: t.order, client: t.name, requestType: 'Индивидуальная', status: 'В работе', operator: 'Даниель', date: '15.06.25' }; onOpenOrder && onOpenOrder(o); };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Чаты" />
      <div className="content" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 22, height: 'calc(100vh - 150px)' }}>
          {/* list */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 16 }}>
              <SearchBox value={search} onChange={setSearch} placeholder="Найти заказ или контакт" style={{ width: '100%', minWidth: 0 }} />
              <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                <button className={'tab btn-sm' + (!onlyUnread ? ' active' : '')} style={{ height: 34 }} onClick={() => setOnlyUnread(false)}>Все</button>
                <button className={'tab btn-sm' + (onlyUnread ? ' active' : '')} style={{ height: 34 }} onClick={() => setOnlyUnread(true)}>Непрочитанные</button>
              </div>
            </div>
            <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
              {list.map((t) => (
                <div key={t.id} onClick={() => setActiveId(t.id)}
                  style={{ display: 'flex', gap: 13, padding: 12, borderRadius: 13, cursor: 'pointer', background: t.id === activeId ? 'var(--hover)' : 'transparent', marginBottom: 2 }}>
                  <Avatar name={t.name} size={46} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>№ {t.order}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 13.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastMessage(t)}</span>
                      {totalUnread(t) > 0 && <span className="chan-tab-badge" style={{ marginLeft: 0 }}>{totalUnread(t)}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {!list.length && <div style={{ padding: 24 }}><EmptyState icon="chat" title="Ничего не найдено" /></div>}
            </div>
            <div style={{ padding: 14 }}>
              <Button variant="primary" icon="plus" className="btn-block" onClick={() => toast('Новый чат', 'info')}>Написать сообщение</Button>
            </div>
          </div>

          {/* conversation */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {active ? <ChatThread thread={active} onOpenOrder={openOrderFromThread} /> : <EmptyState icon="chat" title="Выберите чат" />}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatsPage, ChatThread, getThreadForOrder });
