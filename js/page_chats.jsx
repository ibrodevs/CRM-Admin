// ===== Chats (Чаты) =====

function ChatsPage() {
  const toast = useToast();
  const [chats, setChats] = useState(CHATS);
  const [activeId, setActiveId] = useState(2);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [recipient, setRecipient] = useState('Клиент');
  const scrollRef = useRef(null);

  const active = chats.find((c) => c.id === activeId);
  const kindFilter = (c) => filter === 'all' ? true : filter === 'suppliers' ? c.kind === 'Поставщики' : filter === 'agents' ? c.kind === 'Агенты' : c.kind === 'Клиент';
  const list = chats.filter((c) => kindFilter(c) && c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeId, active && active.messages.length]);

  const send = () => {
    if (!draft.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setChats((cs) => cs.map((c) => c.id === activeId
      ? { ...c, messages: [...c.messages, { from: 'me', text: draft, time, read: false }], last: 'Вы: ' + draft, time }
      : c));
    setDraft('');
  };

  const counts = {
    all: chats.length,
    suppliers: chats.filter((c) => c.kind === 'Поставщики').length,
    agents: chats.filter((c) => c.kind === 'Агенты').length,
    clients: chats.filter((c) => c.kind === 'Клиент').length,
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Topbar title="Чаты" />
      <div className="content" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '370px 1fr', gap: 22, height: 'calc(100vh - 150px)' }}>
          {/* list panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 18 }}>
              <SearchBox value={search} onChange={setSearch} placeholder="Найти" style={{ width: '100%', minWidth: 0 }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 14 }}>
                {[['all', 'Все чаты', counts.all], ['suppliers', 'Поставщики', counts.suppliers], ['agents', 'Агенты', counts.agents], ['clients', 'Клиенты', 14]].map(([k, l, c]) => (
                  <button key={k} className={'tab btn-sm' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)} style={{ height: 36 }}>
                    {l}<span className="tab-count">{c}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
              {list.map((c) => (
                <div key={c.id} onClick={() => setActiveId(c.id)}
                  style={{ display: 'flex', gap: 13, padding: '12px 12px', borderRadius: 13, cursor: 'pointer', background: c.id === activeId ? 'var(--hover)' : 'transparent', marginBottom: 2 }}>
                  <Avatar name={c.name} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.name}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last}</span>
                      {c.unread > 0 && <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: '#2bb96a', color: '#fff', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14 }}>
              <Button variant="primary" icon="plus" className="btn-block" onClick={() => toast('Новое сообщение', 'info')}>Написать сообщение</Button>
            </div>
          </div>

          {/* conversation panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {active ? <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px', borderBottom: '1px solid var(--line)' }}>
                <Avatar name={active.name} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{active.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Был в сети {active.online}</div>
                </div>
                <span className="pill pill-green" style={{ height: 36, paddingRight: 6 }}>{active.org}<span className="go-dot" style={{ width: 24, height: 24, borderColor: 'transparent' }}><Icon name="chevRight" /></span></span>
                <button className="icon-btn"><Icon name="search" /></button>
                <button className="icon-btn"><Icon name="more" /></button>
              </div>
              <div ref={scrollRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
                  <span className="pill" style={{ background: '#dfe6f5', color: '#5a6b8c' }}>Сегодня</span>
                </div>
                {active.messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '62%', padding: '11px 15px', borderRadius: 16, fontSize: 14.5, lineHeight: 1.45,
                      background: m.from === 'me' ? '#d5f0c8' : '#eef0f4', color: 'var(--ink)',
                      borderBottomRightRadius: m.from === 'me' ? 5 : 16, borderBottomLeftRadius: m.from === 'me' ? 16 : 5 }}>
                      {m.text}
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'right', marginTop: 4, display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {m.time}{m.from === 'me' && <Icon name="check" style={{ width: 14, height: 14, color: m.read ? '#2bb96a' : 'var(--muted)' }} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  {['Клиент', 'Поставщик (авиа)', 'Поставщик (отель)', 'Администратор'].map((r) => (
                    <button key={r} className={'tab btn-sm' + (recipient === r ? ' active' : '')} onClick={() => setRecipient(r)} style={{ height: 36 }}>{r}</button>
                  ))}
                </div>
                <div className="search" style={{ width: '100%', minWidth: 0 }}>
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Сообщение" style={{ flex: 1 }} />
                  <button className="icon-btn"><Icon name="paperclip" /></button>
                  <button className="icon-btn" style={{ color: 'var(--blue)' }} onClick={send}><Icon name="send" /></button>
                </div>
              </div>
            </> : <EmptyState icon="chat" title="Выберите чат" />}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatsPage });
