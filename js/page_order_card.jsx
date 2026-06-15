// ===== Order Card: the operator's main workspace =====

function ocMoney(n, c = 'USD') { return n.toLocaleString('ru-RU') + ' ' + (c === 'USD' ? '$' : c); }

/* Reusable async wrapper: loading / error / empty / content */
function AsyncBlock({ state = 'ok', onRetry, skeletonRows = 4, empty, children }) {
  if (state === 'loading') {
    return (
      <div className="card card-pad fade-in">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 18, width: (90 - i * 12) + '%', marginBottom: 14 }} />
        ))}
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="card err-block fade-in">
        <div className="ic"><Icon name="alertCircle" style={{ width: 30, height: 30 }} /></div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>Не удалось загрузить данные</div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>Проверьте соединение и повторите попытку.</div>
        </div>
        <Button variant="secondary" icon="loader" onClick={onRetry}>Повторить</Button>
      </div>
    );
  }
  if (state === 'empty') return empty || <EmptyState />;
  return children;
}

/* Editable status pill in the header */
function StatusControl({ status, onChange }) {
  const opts = Object.keys(ORDER_STATUS);
  return (
    <ActionMenu trigger={
      <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Pill tone={ORDER_STATUS[status]}>{status}</Pill><Icon name="chevDown" style={{ width: 15, height: 15, color: 'var(--muted-2)' }} />
      </button>
    } items={opts.map((s) => ({ icon: status === s ? 'check' : null, label: s, onClick: () => onChange(s) }))} />
  );
}

/* ---- right info panel ---- */
function OrderAside({ services, onOpenFinance, onOpenTasks }) {
  const total = services.reduce((s, x) => s + x.sum, 0);
  const paid = 1660;
  const debt = Math.max(0, total - paid);
  const urgent = ORDER_TASKS.filter((t) => t.urgent);
  return (
    <div className="oc-aside">
      <div className="card card-pad">
        <h3 className="card-title" style={{ fontSize: 17, marginBottom: 8 }}>Финансовая сводка</h3>
        <div className="oc-kpi"><span className="l">Общая стоимость</span><span className="v">{ocMoney(total)}</span></div>
        <div className="oc-kpi"><span className="l">Оплачено</span><span className="v green">{ocMoney(paid)}</span></div>
        <div className="oc-kpi"><span className="l">Задолженность</span><span className={'v' + (debt ? ' red' : '')}>{ocMoney(debt)}</span></div>
        <div className="oc-kpi"><span className="l">Участников</span><span className="v">{ORDER_PARTICIPANTS.length}</span></div>
        <div className="oc-kpi"><span className="l">Активных задач</span><span className="v">{ORDER_TASKS.length}</span></div>
        <Button variant="secondary" size="sm" className="btn-block" icon="finance" style={{ marginTop: 14 }} onClick={onOpenFinance}>Открыть финансы</Button>
      </div>

      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 className="card-title" style={{ fontSize: 17 }}>Ближайшие дедлайны</h3>
          {urgent.length > 0 && <span className="pill pill-red">{urgent.length}</span>}
        </div>
        {ORDER_TASKS.map((t, i) => (
          <div className="oc-task" key={i} onClick={onOpenTasks} style={{ cursor: 'pointer' }}>
            <span className={'dot' + (t.urgent ? ' urgent' : '')} />
            <div><div className="tt">{t.text}</div><div className={'td' + (t.urgent ? ' urgent' : '')}>{t.due}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================
   TAB CONTENTS
   ==================================================================== */
function TabOverview({ order }) {
  const toast = useToast();
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Основная информация</h3>
          <button className="icon-btn green" onClick={() => toast('Редактирование', 'info')}><Icon name="edit" /></button>
        </div>
        <div className="kv-stack">
          {[['Организация', order.client], ['ИНН/ПИН', '07070707070707'], ['Юридический адрес', 'Бишкек, ул. Токтогула 125/1'], ['Тип организации', 'Туроператор'], ['Телефон', '+996 (777) 777-777'], ['E-mail', 'grandlimited@mail.ru']].map(([k, v], i) => (
            <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Параметры заказа</h3>
          <button className="icon-btn green"><Icon name="edit" /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
          <div className="kv-stack">
            {[['Тип заявки', order.requestType], ['Оператор', order.operator], ['Дата создания', order.date], ['Валюта', 'USD'], ['Тип комиссии', 'Процентная (%)']].map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
          <div className="kv-stack">
            {[['Комиссия', '5%'], ['Синхронизация', '1С ✓'], ['Метод округления', 'До 1 USD'], ['Ставка НДС', '12%'], ['Тип расчёта', 'НДС включён']].map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabClients({ order }) {
  const toast = useToast();
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Avatar name={order.client} size={48} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Заказчик · Компания</div></div>
          <Pill tone="green">Активный</Pill>
        </div>
        <div className="kv">
          <div className="kv-row"><span className="k">Контактное лицо</span><span className="v">Нуралиев Данияр</span></div>
          <div className="kv-row"><span className="k">Телефон</span><span className="v">+996 700 123 456</span></div>
          <div className="kv-row"><span className="k">E-mail</span><span className="v">d.nuraliev@mail.ru</span></div>
          <div className="kv-row"><span className="k">Заказов всего</span><span className="v">12</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button variant="secondary" size="sm" icon="chat" onClick={() => toast('Открываю чат с клиентом', 'info')}>Написать</Button>
          <Button variant="secondary" size="sm" icon="user" onClick={() => toast('Карточка клиента', 'info')}>Карточка</Button>
        </div>
      </div>
      <div className="card card-pad">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Реквизиты компании</h3>
        <div className="kv">
          <div className="kv-row"><span className="k">Юр. лицо</span><span className="v">{order.client}</span></div>
          <div className="kv-row"><span className="k">ИНН</span><span className="v">07070707070707</span></div>
          <div className="kv-row"><span className="k">Банк</span><span className="v">Демир Банк</span></div>
          <div className="kv-row"><span className="k">Счёт</span><span className="v">1240020000123456</span></div>
          <div className="kv-row"><span className="k">Договор</span><span className="v">№ 2024-118 от 09.09.24</span></div>
        </div>
      </div>
    </div>
  );
}

function TabParticipants({ onPassport, onAdd }) {
  const list = ORDER_PARTICIPANTS;
  if (!list.length) return <EmptyState icon="users" title="Участников пока нет" sub="Добавьте пассажиров поездки" />;
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Button icon="plus" onClick={onAdd}>Добавить участника</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Участник</th><th>Тип</th><th>Документ</th><th>Дата рожд.</th><th>Телефон</th><th></th></tr></thead>
          <tbody>
            {list.map((p, i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onPassport(p.name)}>
                <td className="t-strong">{p.name} {p.lead && <span className="pill pill-blue" style={{ marginLeft: 6 }}>Лид</span>}</td>
                <td>{p.role}</td><td>{p.doc}</td><td>{p.dob}</td><td>{p.phone}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                    items={[{ icon: 'idcard', label: 'Документы', onClick: () => onPassport(p.name) }, { icon: 'edit', label: 'Изменить' }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabRoute({ services }) {
  const steps = [
    { t: '24.06 · 04:15', text: 'Вылет FRU → IST · KC 131', ic: 'plane' },
    { t: '24.06 · 08:40', text: 'Прилёт в Стамбул (IST)', ic: 'plane' },
    { t: '24.06 · 09:30', text: 'Трансфер IST → Hilton Istanbul', ic: 'car' },
    { t: '24.06 – 01.07', text: 'Проживание · Hilton Istanbul 4★', ic: 'building' },
    { t: '01.07 · 14:05', text: 'Вылет IST → FRU · KC 132', ic: 'plane' },
    { t: '01.07 · 23:30', text: 'Прилёт в Бишкек (FRU)', ic: 'plane' },
  ];
  return (
    <div className="card card-pad fade-in" style={{ maxWidth: 640 }}>
      <h3 className="card-title" style={{ marginBottom: 18 }}>Маршрут поездки</h3>
      <div className="timeline">
        {steps.map((s, i) => (
          <div className="tl-item" key={i}>
            <span className="tl-dot" /><span className="tl-line" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name={s.ic} style={{ width: 18, height: 18, color: 'var(--blue)' }} />
              <div><div className="tl-time">{s.t}</div><div className="tl-text">{s.text}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ADD_TYPES = ['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус', 'Группа'];

function TabServices({ services, onOpenAvia, onAddType, onOpenOther }) {
  if (!services.length) {
    return <EmptyState icon="inbox" title="Услуги ещё не добавлены"
      sub="Добавьте первую услугу, чтобы начать формировать заказ" />;
  }
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{services.length} услуги · итого {ocMoney(services.reduce((s, x) => s + x.sum, 0))}</span>
        <div style={{ flex: 1 }} />
        <ActionMenu trigger={<Button icon="plus">Добавить услугу</Button>}
          items={ADD_TYPES.map((t) => ({ icon: SERVICE_KIND[t].icon, label: t, onClick: () => onAddType(t) }))} />
      </div>
      {services.map((s) => {
        const k = SERVICE_KIND[s.kind];
        return (
          <div className="oc-svc" key={s.id} onClick={() => s.kind === 'Авиа' ? onOpenAvia(s) : onOpenOther(s)}>
            <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="oc-svc-t">{s.title}</div>
              <div className="oc-svc-s">{s.sub}</div>
            </div>
            <div style={{ textAlign: 'right', marginRight: 8 }}>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.date}</div>
              <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
            </div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', width: 90, textAlign: 'right' }}>{ocMoney(s.sum, s.currency)}</div>
            <Icon name="chevRight" style={{ width: 20, height: 20, color: 'var(--faint)' }} />
          </div>
        );
      })}
    </div>
  );
}

function TabOffers({ onCreate }) {
  const toast = useToast();
  const list = ORDER_KP;
  if (!list.length) {
    return <EmptyState icon="template" title="Коммерческих предложений нет"
      sub="Соберите варианты из услуг заказа и отправьте клиенту" />;
  }
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>{list.length} варианта</span>
        <Button icon="plus" onClick={onCreate}>Создать КП</Button>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {list.map((kp) => (
          <div className="card card-pad" key={kp.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{kp.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{kp.id} · {kp.services} услуги</div>
              </div>
              <Pill tone={KP_STATUS[kp.status]}>{kp.status}</Pill>
            </div>
            <div className="kv-row" style={{ borderBottom: 'none' }}><span className="k">Сумма</span><span className="v" style={{ fontSize: 18 }}>{ocMoney(kp.total)}</span></div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Отправлено: {kp.sent}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" size="sm" icon="eye" onClick={() => toast('Предпросмотр ' + kp.id, 'info')}>Просмотр</Button>
              <Button variant="secondary" size="sm" icon="send" onClick={() => toast('КП отправлено клиенту', 'ok')}>Отправить</Button>
              <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                items={[{ icon: 'copy', label: 'Дублировать' }, { icon: 'download', label: 'Скачать PDF' }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabDocuments({ onPassport }) {
  const toast = useToast();
  const perClient = ['Паспорт', 'Виза', 'Банковское подтверждение', 'Справка с работы', 'Мед. страховка', 'Согласие на выезд'];
  const general = ['Договор', 'Счёт на оплату', 'Ваучер', 'Акт', 'Маршрут-квитанция'];
  return (
    <div className="fade-in">
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Документы участника: Нуралиев Данияр</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {perClient.map((d) => (
            <button key={d} className="doc-chip" onClick={() => onPassport('Нуралиев Данияр')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="idcard" />{d}</span><Icon name="chevRight" /></button>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Документы по заказу</div>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => toast('Загрузка документа', 'info')}>Загрузить</Button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {general.map((d) => (
            <button key={d} className="doc-chip" style={{ width: 'auto' }} onClick={() => toast('Открываю: ' + d, 'info')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="docs" />{d}</span><Icon name="download" /></button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabFinance({ services, onAddFee }) {
  const toast = useToast();
  const total = services.reduce((s, x) => s + x.sum, 0);
  const fees = [
    { service: 'Авиа', type: 'Процент', value: '5%', tax: '80 $', comment: 'Сервисный сбор' },
    { service: 'Отель', type: 'Фиксированная', value: '25 $', tax: '0 $', comment: 'Сбор бронирования' },
  ];
  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 22 }}>
        {[['Стоимость услуг', ocMoney(total), ''], ['Сборы агентства', '105 $', ''], ['Оплачено', ocMoney(1660), 'green'], ['Задолженность', ocMoney(Math.max(0, total - 1660)), 'red']].map(([l, v, tone]) => (
          <div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value" style={tone === 'red' ? { color: 'var(--red)' } : tone === 'green' ? { color: 'var(--green)' } : null}>{v}</div></div>
        ))}
      </div>

      {/* 1C sync — demonstrates the error state pattern */}
      <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon name="alertCircle" style={{ width: 22, height: 22, color: 'var(--amber)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Синхронизация с 1С приостановлена</div>
          <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>Последняя успешная: 14.06 · 12:30</div>
        </div>
        <Button variant="secondary" size="sm" icon="loader" onClick={() => toast('Повторная синхронизация…', 'info')}>Повторить</Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 14px' }}>
        <h3 className="section-title" style={{ fontSize: 20 }}>Сборы и налоги</h3>
        <Button icon="plus" onClick={onAddFee}>Добавить сбор</Button>
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Услуга</th><th>Тип сбора</th><th>Значение</th><th>Налог</th><th>Комментарий</th><th></th></tr></thead>
          <tbody>{fees.map((r, i) => (
            <tr key={i}><td className="t-strong">{r.service}</td><td>{r.type}</td><td>{r.value}</td><td>{r.tax}</td><td className="t-muted">{r.comment}</td>
              <td><div className="row-actions"><button className="icon-btn green"><Icon name="edit" /></button><button className="icon-btn"><Icon name="trash" /></button></div></td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function TabChat() {
  const toast = useToast();
  const [kind, setKind] = useState('client');
  const data = {
    client: [{ from: 'them', text: 'Добрый день! Когда будет готово КП по Стамбулу?', time: '14:02' }, { from: 'me', text: 'Здравствуйте! Отправим сегодня до 16:00.', time: '14:05' }],
    supplier: [{ from: 'me', text: 'Прошу подтвердить бронь KC 131/132 на 2 пасс.', time: '12:40' }, { from: 'them', text: 'Подтверждаем, PNR KC8H2L. Тайм-лимит сегодня 18:00.', time: '12:51' }],
    internal: [{ from: 'them', text: '@Даниель клиент просит места рядом — учти при выписке.', time: '13:10' }],
  };
  const TYPES = [['client', 'Клиент'], ['supplier', 'Поставщик'], ['internal', 'Внутренний']];
  return (
    <div className="card fade-in" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', height: 520 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <div className="trip-toggle" style={{ display: 'inline-flex' }}>
          {TYPES.map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
        </div>
      </div>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data[kind].map((m, i) => (
          <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
            <div style={{ background: m.from === 'me' ? 'var(--blue)' : 'var(--surface-2)', color: m.from === 'me' ? '#fff' : 'var(--ink)', padding: '10px 14px', borderRadius: 14, fontSize: 14.5 }}>{m.text}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4, textAlign: m.from === 'me' ? 'right' : 'left' }}>{m.time}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary btn-icon"><Icon name="paperclip" /></button>
        <Input placeholder="Сообщение…" style={{ flex: 1 }} />
        <Button icon="send" onClick={() => toast('Сообщение отправлено')}>Отправить</Button>
      </div>
    </div>
  );
}

function TabHistory() {
  const items = [
    { t: '14.06.2026 · 15:34', text: 'КП-1042 отправлено клиенту', who: 'Даниель' },
    { t: '14.06.2026 · 15:12', text: 'Авиабилет выписан · PNR KC8H2L', who: 'Даниель' },
    { t: '14.06.2026 · 14:40', text: 'Добавлена услуга: Hilton Istanbul', who: 'Даниель' },
    { t: '14.06.2026 · 14:05', text: 'Назначен оператор (Даниель)', who: 'Система' },
    { t: '14.06.2026 · 14:00', text: 'Заказ создан', who: 'Система' },
  ];
  return (
    <div className="card card-pad fade-in" style={{ maxWidth: 560 }}>
      <div className="timeline">
        {items.map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </div>
  );
}

/* ====================================================================
   ORDER CARD ROOT
   ==================================================================== */
function OrderCard({ order, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(order.status === 'Нет данных' ? 'Новое' : order.status);
  const [services, setServices] = useState(ORDER_SERVICES);
  const initStage = () => {
    if (order.status === 'Оплачено') return 4;
    if (order.status === 'Отменено') return 0;
    const ops = FIN_OPS.filter((o) => o.order === order.no);
    if (ops.length && ops.every((o) => o.status === 'Оплачено' || o.status === 'Закрыто')) return 4;
    if (ops.length) return 2;
    return 1;
  };
  const [stageIdx, setStageIdx] = useState(initStage());

  // service sub-flow (avia + other service modules)
  const [svcView, setSvcView] = useState(null); // null | 'avia-search' | 'avia-results' | 'avia-card' | 'svc-add' | 'svc-card'
  const [activeAvia, setActiveAvia] = useState(null);
  const [addRoute, setAddRoute] = useState(null);   // routeKey for the non-avia add-flow
  const [activeSvc, setActiveSvc] = useState(null); // non-avia service being viewed
  const [otherSvc, setOtherSvc] = useState(null);
  const [aviaParams, setAviaParams] = useState({ trip: 'rt', from: 'FRU', to: 'IST', depDate: null, retDate: null, pax: { adt: 2, chd: 0, inf: 0 }, cabin: 'Эконом', baggage: false, flex: false, direct: false, airline: '' });

  // modals
  const [passport, setPassport] = useState(null);
  const [paxOpen, setPaxOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);

  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, [order.no]);

  const TABS = [
    { key: 'overview', label: 'Общая информация' },
    { key: 'clients', label: 'Клиенты' },
    { key: 'participants', label: 'Участники', count: ORDER_PARTICIPANTS.length },
    { key: 'route', label: 'Маршрут' },
    { key: 'services', label: 'Услуги', count: services.length },
    { key: 'offers', label: 'Ком. предложения', count: PROPOSALS.filter((p) => p.order === order.no).length },
    { key: 'documents', label: 'Документы' },
    { key: 'finance', label: 'Финансы' },
    { key: 'aftersale', label: 'Постпродажа', count: RETURNS.filter((r) => r.order === order.no).length || null },
    { key: 'chat', label: 'Чат' },
    { key: 'history', label: 'История' },
  ];

  const goAddType = (type) => {
    if (type === 'Авиа') { setSvcView('avia-search'); return; }
    const rk = routeKeyForKind(type);
    if (rk) { setAddRoute(rk); setSvcView('svc-add'); return; }
    toast('Тип «' + type + '» недоступен', 'info');
  };
  const addAviaService = (offer) => {
    const id = 'S' + (services.length + 1);
    const sv = { id, kind: 'Авиа', title: `${offer.out.from} → ${offer.out.to}${offer.back ? ' → ' + offer.back.to : ''}`,
      sub: `${AIRLINES[offer.airline].name} · ${offer.out.flightNo} · ${aviaParams.pax.adt + aviaParams.pax.chd} пасс.`,
      status: 'Предложение', sum: offer.fare + offer.fee, currency: 'USD', date: offer.out.date, supplier: offer.supplier, offer };
    setServices((cur) => [...cur, sv]);
    setSvcView(null);
    toast('Авиауслуга добавлена в заказ', 'ok');
  };
  const addSvcOffer = (offer, kind) => {
    const id = 'S' + (services.length + 1);
    const sv = { id, kind, title: offer.title, sub: offer.sub, status: 'Предложение', sum: offer.cost + offer.fee, currency: 'USD',
      date: (offer.info && offer.info[0] && offer.info[0].v) || '—', supplier: offer.supplier, svcOffer: offer };
    setServices((cur) => [...cur, sv]);
    setSvcView(null);
    toast(kind + ': услуга добавлена в заказ', 'ok');
  };

  // --- inside the Services tab, a service sub-flow can take over the main column ---
  const renderServicesArea = () => {
    if (svcView === 'avia-search') return <div><BackRow label="К услугам заказа" onBack={() => setSvcView(null)} /><FlightSearch params={aviaParams} setParams={setAviaParams} onSearch={() => setSvcView('avia-results')} /></div>;
    if (svcView === 'avia-results') return <div><BackRow label="Изменить поиск" onBack={() => setSvcView('avia-search')} /><FlightResults params={aviaParams} onBackToSearch={() => setSvcView('avia-search')} onSelect={addAviaService} /></div>;
    if (svcView === 'avia-card') return <FlightCard svc={activeAvia} offer={activeAvia ? activeAvia.offer : null} onBack={() => setSvcView(null)} />;
    if (svcView === 'svc-add') return <ServiceAddFlow routeKey={addRoute} onAdd={addSvcOffer} onCancel={() => setSvcView(null)} />;
    if (svcView === 'svc-card') return <SvcCard item={activeSvc} kind={activeSvc.kind} onBack={() => setSvcView(null)} />;
    return <TabServices services={services}
      onAddType={goAddType}
      onOpenAvia={(s) => { const match = AIR_SERVICES.find((a) => a.no === s.avia) || { no: s.avia || s.id, airline: (s.offer ? s.offer.airline : 'KC'), status: s.status, supplier: s.supplier, pax: 2, sum: s.sum, currency: s.currency, route: s.title, pnr: '—', ticket: '—', dep: s.date }; setActiveAvia(s.offer ? { ...match, offer: s.offer } : match); setSvcView('avia-card'); }}
      onOpenOther={(s) => { if (s.svcOffer) { setActiveSvc({ ...s.svcOffer, kind: s.kind, status: s.status }); setSvcView('svc-card'); } else { setOtherSvc(s); } }} />;
  };

  const tabContent = () => {
    if (loading) return <AsyncBlock state="loading" skeletonRows={5} />;
    switch (tab) {
      case 'overview': return <TabOverview order={order} />;
      case 'clients': return <TabClients order={order} />;
      case 'participants': return <TabParticipants onPassport={setPassport} onAdd={() => setPaxOpen(true)} />;
      case 'route': return <TabRoute services={services} />;
      case 'services': return renderServicesArea();
      case 'offers': return <KPModule order={order} services={services} participants={ORDER_PARTICIPANTS}
        onApprove={() => { setStageIdx((i) => Math.max(i, 2)); toast('Созданы финансовые записи и задачи по выпуску документов', 'ok'); }} />;
      case 'documents': return <DocCenter scopeOrder={order.no} />;
      case 'finance': return <FinanceRegistry scopeOrder={order.no} />;
      case 'aftersale': return <ReturnsModule scopeOrder={order.no} order={order} compact />;
      case 'chat': return <div className="card" style={{ height: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}><ChatThread thread={getThreadForOrder(order)} embedded /></div>;
      case 'history': return <TabHistory />;
      default: return null;
    }
  };

  return (
    <div className="fade-in">
      <Topbar title="Карточка заказа">
        <div className="topbar-spacer" />
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>К реестру</Button>
      </Topbar>

      <div className="content" style={{ paddingTop: 8 }}>
        {/* header */}
        <div className="oc-head">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div className="oc-id">
              <h2>Заказ № {order.no}</h2>
              <StatusControl status={status} onChange={(s) => { setStatus(s); toast('Статус: ' + s, 'ok'); }} />
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={order.operator} size={36} />
              <div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Ответственный</div><div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{order.operator}</div></div>
            </div>
          </div>

          <div className="oc-facts">
            <div className="oc-fact"><div className="l">Клиент / Компания</div><div className="v"><Icon name="building" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />{order.client}</div></div>
            <div className="oc-fact"><div className="l">Тип заявки</div><div className="v">{order.requestType}</div></div>
            <div className="oc-fact"><div className="l">Даты поездки</div><div className="v"><Icon name="calendar" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />24.06 – 01.07.2026</div></div>
            <div className="oc-fact"><div className="l">Создан</div><div className="v">{order.date}</div></div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <OrderStageBar index={stageIdx} />
          </div>

          <div className="oc-actions">
            <Button icon="plus" onClick={() => { setTab('services'); setSvcView('avia-search'); }}>Добавить услугу</Button>
            <Button variant="secondary" icon="template" onClick={() => setTab('offers')}>Создать КП</Button>
            <Button variant="secondary" icon="send" onClick={() => toast('Заказ отправлен клиенту', 'ok')}>Отправить клиенту</Button>
            <Button variant="secondary" icon="finance" onClick={() => setTab('finance')}>Открыть финансы</Button>
          </div>
        </div>

        {/* body: tabs + main + aside */}
        <div className="oc-grid">
          <div className="oc-main">
            <div className="oc-tabs">
              {TABS.map((t) => (
                <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => { setTab(t.key); if (t.key !== 'services') setSvcView(null); }}>
                  {t.label}{t.count != null && <span className="tab-count">{t.count}</span>}
                </button>
              ))}
            </div>
            {tabContent()}
          </div>
          <OrderAside services={services} onOpenFinance={() => setTab('finance')} onOpenTasks={() => toast('Список задач по заказу', 'info')} />
        </div>
      </div>

      {/* drawers / modals reused from order_extras */}
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)} />}
      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {passport && <PassportModal passenger={passport} onClose={() => setPassport(null)} />}

      {/* other-service quick drawer */}
      <Drawer open={!!otherSvc} onClose={() => setOtherSvc(null)} title={otherSvc ? otherSvc.title : ''}
        footer={otherSvc && <div style={{ display: 'flex', gap: 10 }}><Button variant="secondary" style={{ flex: 1 }} onClick={() => setOtherSvc(null)}>Закрыть</Button><Button style={{ flex: 1 }} icon="edit">Редактировать</Button></div>}>
        {otherSvc && (
          <div className="kv">
            <div className="kv-row"><span className="k">Тип услуги</span><span className="v">{otherSvc.kind}</span></div>
            <div className="kv-row"><span className="k">Описание</span><span className="v">{otherSvc.sub}</span></div>
            <div className="kv-row"><span className="k">Поставщик</span><span className="v">{otherSvc.supplier}</span></div>
            <div className="kv-row"><span className="k">Даты</span><span className="v">{otherSvc.date}</span></div>
            <div className="kv-row"><span className="k">Статус</span><span className="v"><Pill tone={SERVICE_STATUS[otherSvc.status]}>{otherSvc.status}</Pill></span></div>
            <div className="kv-row"><span className="k">Стоимость</span><span className="v">{ocMoney(otherSvc.sum, otherSvc.currency)}</span></div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function BackRow({ label, onBack }) {
  return <div style={{ marginBottom: 14 }}><Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>{label}</Button></div>;
}

Object.assign(window, { OrderCard, AsyncBlock });
