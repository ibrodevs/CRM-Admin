import { UnifiedBindPicker } from '../../clients/index.js';
import { enrichChatThread, chatUnread, mergeChatMessages } from '../model/chat-registry.js';
import { useDraftState } from '../../../shared/drafts/Drafts.jsx';
import { ServicePreview } from '../../../shared/ui/ServicePreview.jsx';
import { serviceSummary } from '../../../shared/lib/service-presentation.js';
import { SectionInfo } from '../../../shared/ui/SectionInfo.jsx';
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { ActionMenu } from '../../../shared/ui/ActionMenu.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { EmployeePickerDrawer } from '../../../shared/ui/EmployeePickerDrawer.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { DateField } from '../../../shared/ui/DateFields.jsx';
import { formatDateTime } from '../../../shared/lib/datetime.js';
import { CHAT_CHANNEL_TONE, CHAT_THREADS, CHAT_TYPES, CURRENT_USER, OPERATORS, ORDERS, ORDER_SERVICES, ORDER_STATUS, SERVICE_KIND, SERVICE_STATUS } from '../../../legacy/data/index.jsx';
import { communicationsApi } from '../api/communicationsApi.js';
import { documentsApi } from '../../documents/api.js';
import { ordersApi } from '../../orders/api.js';
import { workspaceActionsApi } from '../../workspace/api.js';
import { userListApi } from '../../users/api.js';
import { isUuid, orderRef, toUiMessage, toUiThread } from '../model/chats.mapper.js';
import { currencySymbol } from '../../../shared/lib/money.js';





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
  if (!m) return thread.last || thread.last_message?.body || (thread.last_message?.type === 'file' ? 'Вложение' : 'Сообщений пока нет');
  if (m.from === 'system') return m.text;
  return (m.from === 'me' ? 'Вы: ' : '') + (m.attach ? '📎 ' + m.attach.name : m.text);
}
function threadUnread(t) { return chatUnread(t); }
function chatServiceById(id, services = []) {
  const source = services.length ? services : (typeof ORDER_SERVICES !== 'undefined' ? ORDER_SERVICES : []);
  return source.find((s) => String(s.id) === String(id)) || null;
}
function chatMoney(n, cur) {
  if (n == null) return '—';
  return Math.round(n).toLocaleString('ru-RU') + ' ' + currencySymbol(cur);
}



function ChatServiceCard({ svc, me, onOpen }) {
  const k = (typeof SERVICE_KIND !== 'undefined' && SERVICE_KIND[svc.kind]) || { icon: 'route', color: 'var(--blue)' };
  const stTone = (typeof SERVICE_STATUS !== 'undefined' && SERVICE_STATUS[svc.status]) || 'gray';
  const paxLabel = svc.kind === 'Гостиница' ? 'Гостей' : 'Пассажиров';
  const rows = [
    svc.pax != null && [paxLabel, svc.pax],
  ].filter(Boolean);
  return (
    <div className="chat-svc-card" onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : 'default' }}>
      <div className="csc-head">
        <span className="csc-ic" style={{ background: k.color }}><Icon name={k.icon} style={{ width: 15, height: 15 }} /></span>
        <span className="csc-kind">{svc.kind}</span>
        {svc.status && <Pill tone={stTone}>{svc.status}</Pill>}
        <span className="csc-sum">{chatMoney(svc.sum, svc.currency)}</span>
      </div>
      <ServicePreview service={svc} />

      {rows.length > 0 && (
        <div className="csc-rows">
          {rows.map(([label, val], i) => (
            <div className="csc-row" key={i}><span className="csc-k">{label}</span><span className="csc-v">{val}</span></div>
          ))}
        </div>
      )}
      {onOpen && <div className="csc-open">Открыть карточку услуги<Icon name="chevRight" style={{ width: 14, height: 14 }} /></div>}
    </div>
  );
}
// Статус ищем в заказах, которые пришли в страницу с backend: демо-массив ORDERS
// в проде очищен, из-за чего статус в шапке чата всегда был пустым.
function chatOrderStatus(no, orders = []) {
  const source = orders.length ? orders : (typeof ORDERS !== 'undefined' ? ORDERS : []);
  const o = source.find((x) => String(x.no) === String(no));
  if (!o) return null;
  return o.status === 'Нет данных' ? 'Новое' : o.status;
}
function chatTypeMeta(key) { return (CHAT_TYPES.find((t) => t.key === key)) || { key, label: key, icon: 'chat' }; }


// Треды заказа берём из переданных (загруженных с backend); демо-массив остаётся
// только запасным вариантом для демо-режима. Ответственный — оператор заказа,
// без подстановки конкретного имени.
function getThreadForOrder(order, threads = []) {
  const source = threads.length ? threads : CHAT_THREADS;
  const sameOrder = (t) => String(t.order) === String(order.no) || String(t.orderId || '') === String(order.id || '');
  return source.find((t) => sameOrder(t) && t.type === 'client') ||
    source.find(sameOrder) ||
    { id: 'o' + order.no, order: order.no, orderId: order.id || null, type: 'client', channel: order.channel || '—', name: order.client, client: order.client,
      online: '—', unread: 0, pinned: false, connectionStatus: 'Подключено', responsibleOperator: order.operator || 'Не назначен',
      relatedServices: [], participants: [{ name: order.client, role: 'Клиент' }], messages: [], internal: [] };
}




function makeAdminThread(order) {
  return {
    id: 'admin-' + order.no, order: order.no, type: 'operator', isAdmin: true, channel: '—',
    name: 'Админ · ' + CURRENT_USER.name, client: order.client, online: 'сейчас',
    createdAt: order.date, responsibleOperator: order.operator || 'Не назначен', connectionStatus: 'Подключено',
    pinned: false, unread: 0, relatedServices: [],
    participants: [{ name: CURRENT_USER.name, role: 'Админ' }],
    messages: [], internal: [],
  };
}
function recipientLabel(t) {
  if (t.isAdmin) return 'Админ · ' + t.name.replace('Админ · ', '');
  return chatTypeMeta(t.type).label + ' · ' + t.name;
}

function chatRecipients(orderNo, extraThreads) {
  const mine = (extraThreads || []).filter((t) => String(t.order) === String(orderNo));
  if (!mine.length) mine.push(...CHAT_THREADS.filter((t) => String(t.order) === String(orderNo)));
  if (!mine.some((t) => t.isAdmin)) mine.push({ ...makeAdminThread({ no: orderNo, client: mine[0] && mine[0].client, date: mine[0] && mine[0].createdAt }), virtual: true });
  return mine;
}


function ChannelBadge({ channel, sm }) {
  if (sm) {
    const tone = CHAT_CHANNEL_TONE[channel] || 'gray';
    return <span className={'pill pill-' + tone} style={{ height: 18, padding: '0 7px', fontSize: 11, flexShrink: 0 }}>{channel}</span>;
  }
  return <Pill tone={CHAT_CHANNEL_TONE[channel] || 'gray'}>{channel}</Pill>;
}

const TASK_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' },
  { value: 'urgent', label: 'Срочный' },
];

function formatIsoDate(val) {
  if (!val) return null;
  if (val instanceof Date && !Number.isNaN(val.getTime())) return val.toISOString();
  const text = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text;
  const ru = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}T00:00:00Z`;
  return null;
}

function formatHistoryAction(action) {
  if (!action) return 'Событие';
  const ACTION_MAP = {
    create: 'Создание чата',
    created: 'Создание чата',
    update: 'Обновление данных чата',
    updated: 'Обновление данных чата',
    pin: 'Чат закреплен',
    pinned: 'Чат закреплен',
    unpin: 'Чат откреплен',
    unpinned: 'Чат откреплен',
    read: 'Прочтение сообщений',
    archive: 'Чат архивирован',
    archived: 'Чат архивирован',
    participant_added: 'Добавлен участник',
    participant_removed: 'Участник удален',
  };
  return ACTION_MAP[action] || action;
}

function getHistoryIcon(type, action) {
  if (type === 'system_message') return 'bell';
  if (typeof action === 'string') {
    if (action.includes('pin')) return 'star';
    if (action.includes('create')) return 'plus';
    if (action.includes('participant')) return 'users';
    if (action.includes('read')) return 'check';
  }
  return 'clock';
}

function ChatTaskDrawer({ open, onClose, thread, orders = [], users = [] }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(null);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [loadedUsers, setLoadedUsers] = useState([]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueAt, setDueAt] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !thread) return;
    const defaultTitle = `Ответить в чате: ${thread.name || 'Клиент'}`;
    const defaultDesc = `Чат ${thread.name || ''}${thread.order && thread.order !== '—' ? `, заказ № ${orderRef(thread.order)}` : ''}`.trim();
    setTitle(defaultTitle);
    setDescription(defaultDesc);
    setPriority('normal');
    setDueAt('');
    setAssignee(null);
    setAssigneeOpen(false);
    setOrderPickerOpen(false);

    let initialOrderId = '';
    if (thread.orderId) {
      initialOrderId = String(thread.orderId);
    } else if (thread.order && orders.length) {
      const match = orders.find((o) => String(o.no) === String(thread.order) || String(o.id) === String(thread.order));
      if (match?.id) initialOrderId = String(match.id);
    }
    setSelectedOrderId(initialOrderId);
  }, [open, thread?.id]);

  // Список сотрудников workspace бывает пуст (не загрузился или нет прав на
  // настройки) — тогда подгружаем его сами, иначе назначить ответственного не из кого.
  useEffect(() => {
    if (!open || users.length || loadedUsers.length) return undefined;
    const controller = new AbortController();
    userListApi.users({}, controller.signal)
      .then((payload) => setLoadedUsers(payload?.results || (Array.isArray(payload) ? payload : [])))
      .catch(() => {});
    return () => controller.abort();
  }, [open, users.length]);

  if (!open || !thread) return null;

  const employees = (users.length ? users : loadedUsers)
    .filter((user) => !['suspended', 'archived', 'Заблокированный'].includes(user.status));
  const assigneeName = assignee ? assignee.name : 'Не назначен';

  const orderOptions = [...orders];
  if (thread.orderId && !orderOptions.some((order) => String(order.id) === String(thread.orderId))) {
    orderOptions.unshift({ id: thread.orderId, no: orderRef(thread.order || thread.orderId), client: thread.client || '' });
  }
  const selectedOrder = orderOptions.find((order) => String(order.id) === String(selectedOrderId));

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!title.trim()) return toast('Укажите название задачи', 'err');
    if (!selectedOrderId) return toast('Выберите заказ для привязки задачи', 'err');

    setSubmitting(true);
    try {
      await ordersApi.createTask(selectedOrderId, {
        title: title.trim(),
        description: description.trim(),
        priority,
        due_at: dueAt ? formatIsoDate(dueAt) : null,
        assignee: assignee?.id || null,
      });
      toast('Задача создана в заказе', 'ok');
      onClose();
    } catch (err) {
      toast(err.message || 'Ошибка создания задачи', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Создать задачу по чату"
      sub={thread.name ? `Чат: ${thread.name}` : undefined}
      width="min(500px, 96vw)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Отмена</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !title.trim() || !selectedOrderId}>
            {submitting ? 'Создание...' : 'Создать задачу'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Связанный заказ" required hint={orderOptions.length ? undefined : 'Список заказов пуст'}>
          <button type="button" className="input chat-task-order-field" onClick={() => setOrderPickerOpen(true)} disabled={submitting} aria-label="Выбрать заказ для задачи">
            <Icon name="orders" /><span>{selectedOrder ? `№ ${selectedOrder.no}${selectedOrder.client ? ` · ${selectedOrder.client}` : ''}` : 'Выберите заказ'}</span><Icon name="chevRight" />
          </button>
          <UnifiedBindPicker open={orderPickerOpen} title="Выбрать заказ для задачи" modes={['order']} orderOptions={orderOptions} onClose={() => setOrderPickerOpen(false)} onPick={({ order }) => { if (order?.id) setSelectedOrderId(String(order.id)); setOrderPickerOpen(false); }} />
        </Field>

        <Field label="Название задачи" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Ответить клиенту по рейсу"
            autoFocus
          />
        </Field>

        <Field label="Описание">
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Подробности задачи..."
            style={{ width: '100%', resize: 'vertical', minHeight: 70 }}
          />
        </Field>

        <Field label="Ответственный">
          <button type="button" className="input" onClick={() => setAssigneeOpen(true)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
            <Avatar name={assigneeName} size={28} />
            <span style={{ flex: 1, color: assignee ? 'var(--ink)' : 'var(--muted)' }}>{assigneeName}</span>
            <Icon name="chevRight" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
          </button>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Приоритет">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={TASK_PRIORITY_OPTIONS}
            />
          </Field>

          <DateField
            label="Срок выполнения"
            value={dueAt}
            onChange={setDueAt}
            placeholder="Выберите дату"
          />
        </div>
      </form>
      <EmployeePickerDrawer open={assigneeOpen} currentId={assignee?.id} options={employees}
        title="Ответственный за задачу"
        onClose={() => setAssigneeOpen(false)}
        onPick={(employee) => { setAssignee(employee); setAssigneeOpen(false); }} />
    </Drawer>
  );
}

function ChatHistoryDrawer({ open, onClose, thread }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);

  const loadHistory = async () => {
    if (!thread?.id || thread?.virtual) {
      setHistoryItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await communicationsApi.history(thread.id);
      setHistoryItems(res.results || []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить историю');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && thread?.id) {
      loadHistory();
    } else {
      setHistoryItems([]);
      setError(null);
    }
  }, [open, thread?.id]);

  if (!open || !thread) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="История изменений чата"
      sub={thread.name ? `Чат: ${thread.name}` : undefined}
      width="min(520px, 96vw)"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card" style={{ padding: '12px 14px', background: 'var(--surface-2)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>Сведения о чате</div>
          <div className="kv" style={{ fontSize: 12 }}>
            <div className="kv-row" style={{ padding: '4px 0' }}>
              <span className="k" style={{ color: 'var(--muted)' }}>Чат</span>
              <span className="v" style={{ fontWeight: 600 }}>{thread.name}</span>
            </div>
            {thread.order && (
              <div className="kv-row" style={{ padding: '4px 0' }}>
                <span className="k" style={{ color: 'var(--muted)' }}>Заказ</span>
                <span className="v">№ {orderRef(thread.order)}</span>
              </div>
            )}
            <div className="kv-row" style={{ padding: '4px 0' }}>
              <span className="k" style={{ color: 'var(--muted)' }}>Канал связи</span>
              <span className="v">{thread.channel || '—'}</span>
            </div>
            {thread.responsibleOperator && (
              <div className="kv-row" style={{ padding: '4px 0' }}>
                <span className="k" style={{ color: 'var(--muted)' }}>Ответственный</span>
                <span className="v">{thread.responsibleOperator}</span>
              </div>
            )}
            {thread.createdAt && (
              <div className="kv-row" style={{ padding: '4px 0' }}>
                <span className="k" style={{ color: 'var(--muted)' }}>Создан</span>
                <span className="v">{thread.createdAt}</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: 'var(--muted)' }}>
            <Icon name="loader" style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
            <span>Загрузка истории...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</div>
            <Button variant="secondary" size="sm" onClick={loadHistory}>Повторить попытку</Button>
          </div>
        ) : historyItems.length === 0 ? (
          <EmptyState
            icon="clock"
            title="Нет записей в истории"
            sub="События и изменения этого чата будут отображаться здесь"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {historyItems.map((item, idx) => {
              const icon = getHistoryIcon(item.type, item.action);
              const label = formatHistoryAction(item.action);
              const timeStr = item.occurred_at ? formatDateTime(item.occurred_at) : '';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--blue)',
                      border: '1px solid var(--line)',
                      marginTop: 2,
                    }}
                  >
                    <Icon name={icon} style={{ width: 14, height: 14 }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{label}</span>
                      {timeStr && <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{timeStr}</span>}
                    </div>
                    {item.reason && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {item.reason}
                      </div>
                    )}
                    {item.actor && (
                      <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 3 }}>
                        Инициатор: {item.actor}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Drawer>
  );
}


function chatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;
}

function ChatThread({ thread, currentUserId, embedded, onOpenOrder, onOpenService, initChannel, recipients, onSwitchThread, onChooseRecipient, onThreadResolved, orders = [], services = [], users = [], onOpenTask, onOpenHistory }) {
  const toast = useToast();
  const [sub, setSub] = useState('message');
  const [msgs, setMsgs] = useState(thread.messages || []);
  const [intl, setIntl] = useState(thread.internal || []);
  const [draft, setDraft] = useDraftState(`chat/${thread.id}`, `${sub}-draft`, '');
  const [pendingFile, setPendingFile] = useState(null);
  const [linked, setLinked] = useState(null);
  const [pinned, setPinned] = useState(!!thread.pinned);
  const [sending, setSending] = useState(false);
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(!thread.virtual);
  const [messageError, setMessageError] = useState('');
  const [resolvingThread, setResolvingThread] = useState(Boolean(thread.virtual && isUuid(thread.orderId)));
  const [messageRetry, setMessageRetry] = useState(0);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const oldestMessageRef = useRef(null);
  const [selfTaskOpen, setSelfTaskOpen] = useState(false);
  const [selfHistoryOpen, setSelfHistoryOpen] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const serverThreadRef = useRef(null);
  const resolvedServerRef = useRef(null);
  const [resolvedThreadId, setResolvedThreadId] = useState(!thread.virtual && isUuid(thread.id) ? thread.id : null);
  const stickToBottomRef = useRef(true);

  const handleOpenTask = onOpenTask || (() => setSelfTaskOpen(true));
  const handleOpenHistory = onOpenHistory || (() => setSelfHistoryOpen(true));

  useEffect(() => { setMsgs(thread.messages || []); setIntl(thread.internal || []); setSub('message'); setLinked(null); setPendingFile(null); serverThreadRef.current = null; setPinned(!!thread.pinned); }, [thread.id]);
  useEffect(() => {
    if (!thread.virtual || !isUuid(thread.orderId)) return undefined;
    const controller = new AbortController();
    setResolvingThread(true);
    communicationsApi.threads({ order: thread.orderId, type: thread.type === 'operator' ? 'internal' : thread.type }, controller.signal).then((payload) => {
      if (controller.signal.aborted) return;
      const candidates = payload.results || (Array.isArray(payload) ? payload : []);
      if (candidates.length === 1 || (thread.type === 'client' && candidates.length > 0)) { serverThreadRef.current = candidates[0].id; setResolvedThreadId(candidates[0].id); resolvedServerRef.current = toUiThread(candidates[0]); onThreadResolved?.({ ...thread, ...resolvedServerRef.current, virtual: false }); }
    }).catch((error) => { if (!controller.signal.aborted) setMessageError(error.message || 'Не удалось открыть переписку'); }).finally(() => { if (!controller.signal.aborted) setResolvingThread(false); });
    return () => controller.abort();
  }, [thread.id, thread.virtual, thread.orderId]);
  useEffect(() => {
    if (!resolvedThreadId) { setLoadingMessages(false); return undefined; }
    const controller = new AbortController();
    let pending = false, readId = null, first = true;
    const refresh = async () => {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const payload = await communicationsApi.messages(resolvedThreadId, {}, controller.signal);
        if (controller.signal.aborted) return;
        const loaded = (payload.results || []).map((message) => toUiMessage(message, currentUserId));
        setMsgs((current) => mergeChatMessages(current, loaded.filter((message) => !message.internal)));
        setIntl((current) => mergeChatMessages(current, loaded.filter((message) => message.internal)));
        if (first) { setHasOlderMessages(Boolean(payload.has_more)); oldestMessageRef.current = loaded[0]?.id; first = false; }
        setMessageError('');
        const lastId = loaded.at(-1)?.id;
        if (lastId && lastId !== readId) { await communicationsApi.read(resolvedThreadId, { message: lastId }); readId = lastId; }
      } catch (error) { if (!controller.signal.aborted) setMessageError(error.message || 'Не удалось загрузить сообщения'); }
      finally { pending = false; if (!controller.signal.aborted) setLoadingMessages(false); }
    };
    setLoadingMessages(true);
    refresh();
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [resolvedThreadId, currentUserId, messageRetry]);
  const loadOlder = async () => {
    if (loadingOlder || !oldestMessageRef.current) return;
    setLoadingOlder(true);
    stickToBottomRef.current = false;
    const previousHeight = scrollRef.current?.scrollHeight || 0;
    const previousTop = scrollRef.current?.scrollTop || 0;
    try {
      const payload = await communicationsApi.messages(resolvedThreadId, { before: oldestMessageRef.current });
      const loaded = (payload.results || []).map((message) => toUiMessage(message, currentUserId));
      setMsgs((current) => mergeChatMessages(current, loaded.filter((message) => !message.internal)));
      setIntl((current) => mergeChatMessages(current, loaded.filter((message) => message.internal)));
      window.requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = previousTop + scrollRef.current.scrollHeight - previousHeight; });
      oldestMessageRef.current = loaded[0]?.id;
      setHasOlderMessages(Boolean(payload.has_more));
    } catch (error) { toast(error.message || 'Не удалось загрузить историю', 'err'); }
    finally { setLoadingOlder(false); }
  };
  useEffect(() => { if (scrollRef.current && stickToBottomRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [sub, msgs, intl]);

  const feed = sub === 'internal' ? intl : msgs;
  const setFeed = sub === 'internal' ? setIntl : setMsgs;
  // Заглушка чата (тред ещё не создан на сервере) при первой отправке получает
  // настоящий тред заказа — иначе сообщение уходило бы в несуществующий id.
  const ensureServerThreadId = async () => {
    if (!thread.virtual && isUuid(thread.id)) return thread.id;
    if (serverThreadRef.current) return serverThreadRef.current;
    if (!isUuid(thread.orderId)) throw new Error('Чат не связан с заказом: откройте его из карточки заказа или раздела «Чаты»');
    const type = ['client', 'supplier', 'internal'].includes(thread.type) ? thread.type : 'internal';
    const existing = await communicationsApi.threads({ order: thread.orderId, type });
    const candidates = existing?.results || (Array.isArray(existing) ? existing : []);
    if (type === 'supplier' && candidates.length > 1) throw new Error('Выберите конкретную переписку поставщика');
    const found = candidates[0];
    const hasOrderNo = thread.order && thread.order !== '—' && !isUuid(thread.order);
    const server = found || await communicationsApi.createThread({ type, order: thread.orderId, title: hasOrderNo ? `Заказ № ${thread.order}` : '' });
    serverThreadRef.current = server.id;
    resolvedServerRef.current = toUiThread(server);
    setResolvedThreadId(server.id);
    return server.id;
  };
  // Файл хранится документом. К заказу и услуге привязываем, только если чат
  // с ними связан: раньше без заказа выбранный файл молча отбрасывался.
  const uploadChatFile = async (file) => {
    const meta = { kind: 'other', title: file.name.slice(0, 255), source: 'upload' };
    if (isUuid(thread.orderId)) {
      meta.order = thread.orderId;
      if (isUuid(linked)) meta.service = linked;
    }
    const document = await documentsApi.upload(file, meta);
    const versions = await documentsApi.versions(document.id);
    const version = (Array.isArray(versions) ? versions : versions?.results || [])[0];
    if (!version) throw new Error('Файл загружен, но версия документа не создана');
    return version.id;
  };
  const send = async () => {
    const text = draft.trim();
    if (sending || resolvingThread || (!text && !pendingFile)) return;
    setSending(true);
    stickToBottomRef.current = true;
    try {
      const threadId = await ensureServerThreadId();
      const internal = sub === 'internal';
      const body = pendingFile
        ? { body: text || pendingFile.name, type: 'file', attachment: await uploadChatFile(pendingFile), internal_note: internal }
        : { body: text, type: 'text', internal_note: internal };
      if (linked) body.service_card = linked;
      const message = await communicationsApi.send(threadId, body);
      setFeed((current) => [...current, { ...toUiMessage(message, currentUserId), from: 'me', service: linked }]);
      setDraft('');
      setPendingFile(null);
      if (thread.virtual && resolvedServerRef.current) onThreadResolved?.({ ...thread, ...resolvedServerRef.current, virtual: false });
    } catch (error) { toast(error.message || 'Не удалось отправить сообщение', 'err'); }
    finally { setSending(false); }
  };
  const attach = () => fileRef.current?.click();
  const pickAttachment = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) setPendingFile(file);
  };
  const togglePin = async () => {
    const next = !pinned;
    try {
      const result = await communicationsApi.pin(await ensureServerThreadId(), next);
      setPinned(result.pinned);
      if (thread.virtual && resolvedServerRef.current) onThreadResolved?.({ ...thread, ...resolvedServerRef.current, virtual: false });
      toast(result.pinned ? 'Чат закреплён' : 'Чат откреплён', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const queueEmail = async () => {
    try {
      await workspaceActionsApi.execute('chat.email.prepare', {
        resourceType: 'ChatThread', resourceId: thread.id,
        payload: { thread_id: thread.id, order_id: thread.orderId },
      });
      toast('Черновик письма создан на сервере', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };

  const status = chatOrderStatus(thread.order, orders);
  // Кого можно упомянуть: участники этого чата и ответственный оператор заказа.
  const mentionNames = [...new Set([
    ...(thread.participants || []).map((person) => person.name),
    thread.responsibleOperator,
  ].filter((name) => name && name !== 'Не назначен'))];
  // В чате доступны только реальные услуги связанного заказа.
  const orderServices = services;
  const linkedService = linked ? chatServiceById(linked, orderServices) : null;
  const tMeta = chatTypeMeta(thread.type);


  const [recipientPanelOpen, setRecipientPanelOpen] = useState(false);
  const recipientPicker = recipients && onSwitchThread && <button type="button" className="chip chat-recipient-trigger" onClick={() => onChooseRecipient ? onChooseRecipient() : setRecipientPanelOpen(true)} title="Выбрать переписку в боковом окне"><Icon name="users" />{tMeta.label} · {thread.name}<Icon name="chevRight" /></button>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {embedded ? (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={thread.name} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{thread.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{thread.route || tMeta.label}{thread.online && thread.online !== '—' ? ` · ${thread.online}` : ''}</div>
            </div>
            <ChannelBadge channel={thread.channel} />
          </div>
          <div className="chat-recipient-actions">
            {recipientPicker}
            <button type="button" className="icon-btn" title="Создать задачу" onClick={handleOpenTask}><Icon name="clipboard" /></button>
            <button type="button" className="icon-btn" title={pinned ? 'Открепить чат' : 'Закрепить чат'} aria-pressed={pinned} onClick={togglePin}><Icon name="star" /></button>
            <ActionMenu trigger={<button type="button" className="icon-btn" aria-label="Действия с чатом"><Icon name="more" /></button>}
              items={[
                { icon: 'mail', label: 'Отправить email', onClick: queueEmail },
                { icon: 'clock', label: 'История изменений', onClick: handleOpenHistory },
              ]} />
          </div>
        </div>
      ) : (
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>№ {orderRef(thread.order)}</span>
            {status && <Pill tone={(typeof ORDER_STATUS !== 'undefined' && ORDER_STATUS[status]) || 'blue'}>{status}</Pill>}
            <ChannelBadge channel={thread.channel} />
            <Pill tone={thread.connectionStatus === 'Подключено' ? 'green' : 'red'}>{thread.connectionStatus}</Pill>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{thread.name} · отв. {thread.responsibleOperator} · {(thread.participants || []).length} уч.</span>
            <div style={{ flex: 1 }} />
            {recipientPicker}
            <button className="btn btn-secondary btn-icon btn-sm" title="Создать задачу" onClick={handleOpenTask}><Icon name="clipboard" /></button>
            <button className={'btn btn-icon btn-sm ' + (pinned ? 'btn-primary' : 'btn-secondary')} title={pinned ? 'Открепить чат' : 'Закрепить чат'} onClick={togglePin}><Icon name="star" /></button>
            <ActionMenu trigger={<button className="btn btn-secondary btn-icon btn-sm"><Icon name="more" /></button>}
              items={[
                { icon: 'orders', label: 'Открыть карточку заказа', onClick: () => onOpenOrder && onOpenOrder(thread) },
                { icon: 'mail', label: 'Отправить email', onClick: queueEmail },
                { icon: 'clock', label: 'История изменений', onClick: handleOpenHistory },
              ]} />
          </div>
        </div>
      )}


      <div ref={scrollRef} onScroll={(event) => { const node = event.currentTarget; stickToBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {sub === 'internal' && <div className="chan-note"><Icon name="lock" style={{ width: 14, height: 14 }} />Внутренний комментарий — виден только сотрудникам агентства</div>}
        {sub === 'message' && thread.type === 'supplier' && <div className="chan-note" style={{ color: 'var(--gray-text)', background: 'var(--gray-bg)' }}><Icon name="suppliers" style={{ width: 14, height: 14 }} />Канал с поставщиком · {thread.supplier || thread.name} · {thread.channel}</div>}
        {loadingMessages && !feed.length && <p className="chat-load-state" role="status">Загружаем сообщения…</p>}
        {messageError && <div className="chat-load-error" role="alert"><span>{messageError}</span><Button variant="secondary" size="sm" onClick={() => setMessageRetry((value) => value + 1)}>Повторить</Button></div>}
        {hasOlderMessages && <Button variant="ghost" size="sm" disabled={loadingOlder} onClick={loadOlder}>{loadingOlder ? 'Загружаем…' : 'Загрузить предыдущие сообщения'}</Button>}
        {!loadingMessages && !messageError && !feed.length && <EmptyState icon="chat" title="Сообщений пока нет" sub={sub === 'internal' ? 'Оставьте внутренний комментарий' : 'Начните переписку'} />}
        {feed.map((m, i) => {
          if (m.from === 'system') return (
            <div className="chat-sys" key={i}>
              <span><Icon name="bell" />{m.text} · {m.time}
                {m.action && <button className="link-chip" style={{ marginLeft: 10 }} onClick={() => onOpenService && onOpenService(m.action.service)}>{m.action.label}<Icon name="chevRight" /></button>}
              </span>
            </div>
          );
          const me = m.from === 'me';
          const svc = m.service ? chatServiceById(m.service, orderServices) : null;
          return (
            <div className={'msg-row ' + (me ? 'me' : 'them')} key={i}>
              <div className={'msg ' + (me ? 'me' : 'them') + (sub === 'internal' ? ' internal' : '')}>
                {!me && m.author && thread.type !== 'client' && <div className="msg-author">{m.author}</div>}
                {svc && <ChatServiceCard svc={svc} me={me} onOpen={() => onOpenService && onOpenService(svc.id)} />}
                {m.attach
                  ? <>
                    <div className="chat-attach" onClick={() => m.attach.documentId && window.location.assign(documentsApi.downloadUrl(m.attach.documentId))}><span className="ic"><Icon name="paperclip" /></span><div><div style={{ fontWeight: 600, fontSize: 13 }}>{m.attach.name}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.attach.size}</div></div><Icon name="download" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} /></div>
                    {m.text && m.text !== m.attach.name && <span>{chatText(m.text)}</span>}
                  </>
                  : <span>{chatText(m.text)}</span>}
                <div className="msg-time" title={me ? m.deliveryHint : undefined}>{m.time}{me && (m.deliveryState === 'failed'
                  ? <Icon name="alertCircle" style={{ width: 14, height: 14, color: "#e0483d" }} />
                  : <Icon name="check" style={{ width: 14, height: 14, color: m.read ? '#2bb96a' : m.deliveryState === 'queued' ? 'var(--muted-2)' : 'var(--muted)' }} />)}</div>
                {me && m.deliveryState === 'failed' && <div className="msg-time" style={{ color: '#e0483d' }}>{m.deliveryHint}</div>}
              </div>
            </div>
          );
        })}
      </div>


      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
        {linkedService && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--ink)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999, padding: '5px 10px', marginBottom: 6 }}>
            <Icon name={(SERVICE_KIND[linkedService.kind] || {}).icon || 'route'} style={{ width: 14, height: 14, color: 'var(--blue)' }} />{linkedService.kind} · {linkedService.title}
            <button className="icon-btn btn-sm" style={{ width: 20, height: 20 }} onClick={() => setLinked(null)}><Icon name="x" style={{ width: 14, height: 14 }} /></button>
          </div>
        )}
        {pendingFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '6px 10px', marginBottom: 6 }}>
            <Icon name="paperclip" style={{ width: 14, height: 14, color: 'var(--blue)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
            <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{chatFileSize(pendingFile.size)}</span>
            <button type="button" className="icon-btn btn-sm" style={{ width: 20, height: 20 }} title="Убрать файл" disabled={sending || resolvingThread} onClick={() => setPendingFile(null)}><Icon name="x" style={{ width: 14, height: 14 }} /></button>
          </div>
        )}
        <div className="trip-toggle" style={{ display: 'inline-flex', marginBottom: 6 }}>
          <button className={sub === 'message' ? 'on' : ''} onClick={() => setSub('message')}>Сообщение</button>
          <button className={sub === 'internal' ? 'on' : ''} onClick={() => setSub('internal')}><Icon name="lock" style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 4 }} />Внутренний комментарий</button>
        </div>
        <div className="search" style={{ width: '100%', minWidth: 0 }}>
          <input ref={fileRef} type="file" hidden onChange={pickAttachment} />
          <button className="icon-btn" onClick={attach} disabled={sending || resolvingThread} title="Прикрепить файл"><Icon name="paperclip" /></button>
          <button type="button" className="icon-btn" title="Привязать к услуге" onClick={() => setServicePickerOpen(true)}><Icon name="route" /></button>
          <ActionMenu trigger={<button className="icon-btn" title="Упомянуть"><span style={{ fontWeight: 700, fontSize: 16, color: 'var(--muted)' }}>@</span></button>}
            items={(mentionNames.length ? mentionNames : OPERATORS).map((o) => ({ icon: 'user', label: o, onClick: () => setDraft((d) => (d ? d + ' ' : '') + '@' + o.split(' ')[0] + ' ') }))} />
          <input value={draft} disabled={sending || resolvingThread} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={resolvingThread ? 'Открываем переписку…' : pendingFile ? 'Подпись к файлу (необязательно)…' : sub === 'internal' ? 'Внутренний комментарий…' : 'Сообщение…'} style={{ flex: 1 }} />
          <button className="icon-btn" style={{ color: 'var(--blue)' }} onClick={send} disabled={sending || resolvingThread || (!draft.trim() && !pendingFile)} title="Отправить"><Icon name="send" /></button>
        </div>
      </div>
      <Drawer open={servicePickerOpen} onClose={() => setServicePickerOpen(false)} title="Выбрать услугу для сообщения" width="min(620px,96vw)">
        <div className="chat-service-picker">{orderServices.map((service) => <button type="button" key={service.id} className="chat-service-option" onClick={() => { setLinked(service.id); setServicePickerOpen(false); }}><ServicePreview service={service} /><span>Выбрать услугу<Icon name="chevRight" /></span></button>)}</div>
        {!orderServices.length && <EmptyState icon="route" title="В заказе пока нет услуг" />}
      </Drawer>
      <Drawer open={recipientPanelOpen} onClose={() => setRecipientPanelOpen(false)} title="Выбрать переписку" width="min(520px,96vw)">
        <div className="chat-conversation-picker">{(recipients || []).map((recipient) => <button type="button" className="chat-conversation-option" key={recipient.id} onClick={() => { onSwitchThread?.(recipient); setRecipientPanelOpen(false); }}><strong>{recipient.name}</strong><span>{[chatTypeMeta(recipient.type).label, recipient.channel, recipient.route].filter(Boolean).join(' · ')}</span></button>)}</div>
      </Drawer>
      {!onOpenTask && <ChatTaskDrawer open={selfTaskOpen} onClose={() => setSelfTaskOpen(false)} thread={thread} orders={orders} users={users} />}
      {!onOpenHistory && <ChatHistoryDrawer open={selfHistoryOpen} onClose={() => setSelfHistoryOpen(false)} thread={thread} />}
    </div>
  );
}


function ChatInfoPanel({ thread, orders = [], onOpenOrder, onOpenService, orderServices = [], users = [], onOpenTask, onOpenHistory }) {
  const toast = useToast();
  const [allPax, setAllPax] = useState(false);
  const [selfTaskOpen, setSelfTaskOpen] = useState(false);
  const [selfHistoryOpen, setSelfHistoryOpen] = useState(false);

  const handleOpenTask = onOpenTask || (() => setSelfTaskOpen(true));
  const handleOpenHistory = onOpenHistory || (() => setSelfHistoryOpen(true));

  const services = (thread.relatedServices || []).map((id) => chatServiceById(id, orderServices)).filter(Boolean);
  const tMeta = chatTypeMeta(thread.type);
  const pax = thread.participants || [];
  const shownPax = allPax ? pax : pax.slice(0, 4);

  const prepareEmail = async () => {
    try {
      await workspaceActionsApi.execute('chat.email.prepare', {
        resourceType: 'ChatThread', resourceId: thread.id,
        payload: { thread_id: thread.id, order_id: thread.orderId },
      });
      toast('Черновик письма создан на сервере', 'ok');
    } catch (error) { toast(error.message, 'err'); }
  };
  const quick = [
    { icon: 'clipboard', label: 'Задача', title: 'Создать задачу', onClick: handleOpenTask },
    { icon: 'mail', label: 'Email', title: 'Отправить email', onClick: prepareEmail },
    { icon: 'orders', label: 'Заказ', title: 'Открыть карточку заказа', onClick: () => onOpenOrder && onOpenOrder(thread) },
    { icon: 'clock', label: 'История', title: 'История изменений', onClick: handleOpenHistory },
  ];
  return (
    <div className="scroll" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 2 }}>

      <div className="card" style={{ padding: '10px 12px' }}>
        <h3 className="card-title" style={{ fontSize: 13, marginBottom: 7 }}>Связано с услугой</h3>
        {services.length ? services.map((s) => {
          const k = SERVICE_KIND[s.kind] || SERVICE_KIND['Авиа'];
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="oc-svc-ic" style={{ background: k.color, width: 32, height: 32 }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}><ServicePreview service={s} /></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}><Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill></div>
              </div>
            </div>
          );
        }) : <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>Чат не привязан к услуге</div>}
        <Button variant="secondary" size="sm" className="btn-block" iconRight="chevRight" onClick={() => onOpenService && onOpenService(services[0] ? services[0].id : null)}>Открыть услугу</Button>
      </div>


      <div className="card" style={{ padding: '10px 12px' }}>
        <h3 className="card-title" style={{ fontSize: 13, marginBottom: 3 }}>Информация о чате</h3>
        <div className="kv">
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12 }}>Тип чата</span><span className="v" style={{ fontSize: 12 }}>{tMeta.label}</span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12 }}>Канал связи</span><span className="v"><ChannelBadge channel={thread.channel} sm /></span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12 }}>Подключение</span><span className="v" style={{ fontSize: 12, color: thread.connectionStatus === 'Подключено' ? 'var(--green)' : 'var(--red)' }}>{thread.connectionStatus}</span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12 }}>Создан</span><span className="v" style={{ fontSize: 12 }}>{thread.createdAt}</span></div>
          <div className="kv-row" style={{ padding: '7px 0' }}><span className="k" style={{ fontSize: 12 }}>Ответственный</span><span className="v" style={{ fontSize: 12 }}>{thread.responsibleOperator}</span></div>
        </div>
      </div>


      <div className="card" style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <h3 className="card-title" style={{ fontSize: 13 }}>Участники</h3>
          {pax.length > 4 && <button className="link-chip" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => setAllPax((v) => !v)}>{allPax ? 'Свернуть' : 'Показать всех'}</button>}
        </div>
        {shownPax.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Avatar name={p.name} size={25} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)' }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.role}</div></div>
          </div>
        ))}
      </div>


      <div className="card" style={{ padding: '10px 12px' }}>
        <h3 className="card-title" style={{ fontSize: 13, marginBottom: 7 }}>Быстрые действия</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {quick.map((q) => (
            <Button key={q.label} variant="secondary" size="sm" icon={q.icon} className="btn-block" title={q.title} style={{ justifyContent: 'flex-start', fontSize: 12, padding: '0 8px' }} onClick={q.onClick}>{q.label}</Button>
          ))}
        </div>
      </div>
      {!onOpenTask && <ChatTaskDrawer open={selfTaskOpen} onClose={() => setSelfTaskOpen(false)} thread={thread} orders={orders} users={users} />}
      {!onOpenHistory && <ChatHistoryDrawer open={selfHistoryOpen} onClose={() => setSelfHistoryOpen(false)} thread={thread} />}
    </div>
  );
}


const knownOrder = (value) => value && value !== '—';

function ChatsNav({ threads, activeId, onSelect, search, setSearch, mode, setMode, orderServices = [], onArchive, archivingId }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [folder, setFolder] = useState('active');
  const [visibleCount, setVisibleCount] = useState(20);
  const moreRef = useRef(null);
  useEffect(() => { setVisibleCount(20); }, [search, mode, typeFilter, folder]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unreadTotal = threads.reduce((sum, thread) => sum + threadUnread(thread), 0);
  const unreadChats = threads.filter((thread) => threadUnread(thread) > 0).length;
  const matchesSearch = (t) => {
    const hay = `${t.name} ${t.order} ${t.client} ${t.route || ''} ${t.tripDates || ''} ${t.contact || ''} ${(t.participants || []).map((person) => person.name).join(' ')} ${t.channel} ${(t.relatedServices || []).map((id) => { const s = chatServiceById(id, orderServices); return s ? s.kind + ' ' + s.title : ''; }).join(' ')} ${lastMessage(t)}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  };
  const searched = threads.filter((thread) => folder === 'all' || Boolean(thread.is_archived) === (folder === 'archive')).filter(matchesSearch).filter((thread) => !unreadOnly || threadUnread(thread) > 0);
  const typeCount = (k) => searched.filter((t) => t.type === k).length;
  const filtered = (mode === 'byType' && typeFilter !== 'all') ? searched.filter((t) => t.type === typeFilter) : searched;

  const sorted = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (new Date(b.time || b.created_at).getTime() || 0) - (new Date(a.time || a.created_at).getTime() || 0));

  const visible = sorted.slice(0, visibleCount);
  useEffect(() => {
    if (!moreRef.current || visibleCount >= sorted.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 20, sorted.length)); }, { rootMargin: '180px' });
    observer.observe(moreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, sorted.length, folder, search, mode, typeFilter]);

  const TYPE_FILTERS = [{ key: 'all', label: 'Все чаты' }].concat(CHAT_TYPES.map((t) => ({ key: t.key, label: t.label })));

  const Row = (t) => {
    const u = threadUnread(t);
    return (
      <div key={t.id} role="button" tabIndex={0} onClick={() => onSelect(t.id)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(t.id); } }} className={'chat-row chat-registry-row' + (t.id === activeId ? ' active' : '')} aria-label={`${t.name}, ${t.order || 'без заказа'}`}>
        <Avatar name={t.name} size={36} />
        <div className="chat-registry-row-main">
          <div className="chat-registry-row-heading"><strong title={t.name}>{t.pinned && <Icon name="star" />}{t.name}</strong>{knownOrder(t.order) && <span>№ {orderRef(t.order)}</span>}</div>
          <div className="chat-registry-itinerary" title={[t.route, t.tripDates].filter(Boolean).join(' · ')}><span>{t.route || 'Маршрут не указан'}</span><span>{t.tripDates || 'Даты поездки не указаны'}</span></div>
          <div className="chat-registry-row-preview"><ChannelBadge channel={t.channel} sm /><span title={lastMessage(t)}>{lastMessage(t)}</span>{t.time && <time>{formatDateTime(t.time)}</time>}</div>
        </div>
        <div className="chat-registry-row-actions" onClick={(event) => event.stopPropagation()}>
          {u > 0 && <span className="chat-registry-unread" aria-label={`Новых сообщений: ${u}`}>{u > 99 ? '99+' : u}</span>}
          {onArchive && <button type="button" className="chat-registry-archive" disabled={archivingId === t.id} aria-label={t.is_archived ? 'Вернуть чат из архива' : 'Архивировать чат'} title={t.is_archived ? 'Вернуть из архива' : 'В архив'} onClick={() => onArchive(t, !t.is_archived)}><Icon name={t.is_archived ? 'chevLeft' : 'inbox'} /></button>}
        </div>
      </div>
    );
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
        <div className="chat-registry-summary"><Select aria-label="Папка чатов" value={folder} onChange={(event) => setFolder(event.target.value)} options={[{ value: 'active', label: `Активные · ${threads.filter((thread) => !thread.is_archived).length}` }, { value: 'archive', label: `Архив · ${threads.filter((thread) => thread.is_archived).length}` }, { value: 'all', label: `Все чаты · ${threads.length}` }]} /><span>Чатов: <b>{threads.length}</b></span><span>Новых сообщений: <b>{unreadTotal}</b></span><button type="button" className={'chip' + (unreadOnly ? ' active' : ' ghost')} aria-pressed={unreadOnly} onClick={() => setUnreadOnly((value) => !value)}>Непрочитанные · {unreadChats}</button></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Поиск чатов…" style={{ flex: 1, minWidth: 0 }} />
          <div className="trip-toggle" style={{ display: 'flex', flexShrink: 0, padding: 3 }}>
            <button className={mode === 'byType' ? 'on' : ''} style={{ padding: '6px 9px', fontSize: 12 }} onClick={() => setMode('byType')}>Тип</button>
            <button className={mode === 'byService' ? 'on' : ''} style={{ padding: '6px 9px', fontSize: 12 }} onClick={() => setMode('byService')}>Услуга</button>
          </div>
        </div>
        {mode === 'byType' && (
          <div style={{ marginTop: 7 }}>
            <ActionMenu trigger={
              <button className="chip ghost" style={{ height: 30, fontSize: 12, width: '100%', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {TYPE_FILTERS.find((f) => f.key === typeFilter).label}
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{typeFilter === 'all' ? searched.length : typeCount(typeFilter)}</span>
                </span>
                <Icon name="chevDown" />
              </button>
            } items={TYPE_FILTERS.map((f) => ({
              icon: typeFilter === f.key ? 'check' : null,
              label: f.label + ' · ' + (f.key === 'all' ? searched.length : typeCount(f.key)) + ' · новых сообщений: ' + searched.filter((thread) => f.key === 'all' || thread.type === f.key).reduce((sum, thread) => sum + threadUnread(thread), 0),
              onClick: () => setTypeFilter(f.key),
            }))} />
          </div>
        )}
      </div>
      <div className="chat-registry-list">
        {mode === 'byService'
          ? (() => {
            const groups = {};
            visible.forEach((t) => { const sid = (t.relatedServices || [])[0] || '—'; (groups[sid] = groups[sid] || []).push(t); });
            const order = Object.keys(groups).sort((a, b) => (a === '—' ? 1 : 0) - (b === '—' ? 1 : 0));
            return order.length ? order.map((sid) => {
              const s = chatServiceById(sid, orderServices);
              return (
                <div key={sid} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', padding: '8px 6px 4px' }}>{s ? s.kind + ' · ' + serviceSummary(s).title : 'Без привязки к услуге'} · Чатов: {groups[sid].length} · Новых сообщений: {groups[sid].reduce((sum, thread) => sum + threadUnread(thread), 0)}</div>
                  {groups[sid].map(Row)}
                </div>
              );
            }) : <div style={{ padding: 24 }}><EmptyState icon="chat" title="Ничего не найдено" /></div>;
          })()
          : (sorted.length ? visible.map(Row) : <div style={{ padding: 24 }}><EmptyState icon="chat" title="Ничего не найдено" /></div>)}
        {visibleCount < sorted.length && <div ref={moreRef} className="chat-registry-more"><Button variant="secondary" onClick={() => setVisibleCount((count) => count + 20)}>Показать ещё · {sorted.length - visible.length}</Button></div>}
        {sorted.length > 0 && <p className="chat-registry-loaded">Показано {visible.length} из {sorted.length}</p>}
      </div>
    </div>
  );
}


function ChatsPage({ initialThreads = [], onOpenChat, users = [], orders = [], orderServices = [], clients = [] }) {
  const [liveThreads, setLiveThreads] = useState(initialThreads);
  const [archivingId, setArchivingId] = useState(null);
  const toast = useToast();
  const archiveVersion = useRef(0);
  const archive = async (thread, archived) => {
    if (archivingId) return;
    setArchivingId(thread.id);
    archiveVersion.current += 1;
    try {
      const result = await communicationsApi.archive(thread.id, archived);
      archiveVersion.current += 1;
      setLiveThreads((current) => current.map((row) => String(row.id) === String(thread.id) ? { ...row, is_archived: result.is_archived } : row));
      toast(archived ? 'Чат перенесён в архив' : 'Чат возвращён из архива', 'ok');
    } catch (error) { toast(error.message || 'Не удалось изменить архив чата', 'err'); }
    finally { setArchivingId(null); }
  };
  const [refreshError, setRefreshError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || controller.signal.aborted) return;
      refreshing = true;
      const version = archiveVersion.current;
      try {
        const payload = await communicationsApi.allThreads({}, controller.signal);
        if (!controller.signal.aborted && version === archiveVersion.current) { setLiveThreads((payload.results || payload).map(toUiThread)); setRefreshError(''); }
      } catch (error) { if (!controller.signal.aborted) setRefreshError('Не удалось обновить чаты. Показаны последние загруженные данные.'); }
      finally { refreshing = false; }
    };
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const threads = liveThreads.map((thread) => enrichChatThread(thread, { orders, services: orderServices, users, clients }));
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('byType');
  const select = (id) => {
    const thread = threads.find((item) => String(item.id) === String(id));
    if (!thread) return;
    setActiveId(thread.id);
    onOpenChat?.(thread);
  };
  return <div className="fade-in">
    <div className="content">
      <SectionInfo section="chats" />
      {refreshError && <p role="status">{refreshError}</p>}
      <div className="section-workspace chats-workspace chats-registry">
        <ChatsNav onArchive={archive} archivingId={archivingId} orderServices={orderServices} threads={threads} activeId={activeId} onSelect={select} search={search} setSearch={setSearch} mode={mode} setMode={setMode} />
      </div>
    </div>
  </div>;
}

Object.assign(window, { ChatsPage, ChatThread, ChatInfoPanel, ChatsNav, ChatTaskDrawer, ChatHistoryDrawer, getThreadForOrder, threadUnread, lastMessage, chatRecipients, recipientLabel });



export { chatNow, chatText, lastMessage, threadUnread, chatServiceById, chatMoney, ChatServiceCard, chatOrderStatus, chatTypeMeta, getThreadForOrder, makeAdminThread, recipientLabel, chatRecipients, ChannelBadge, ChatThread, ChatInfoPanel, ChatsNav, ChatsPage, ChatTaskDrawer, ChatHistoryDrawer };
