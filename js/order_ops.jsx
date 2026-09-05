import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Drawer, EmptyState, Field, Input, Modal, ModalHeader, Pill, Select, useToast } from './ui';
import { servicesApi } from './api/resources';
import { resultsOf } from './api/client';

const SERVICE_TONE = {
  'Авиа': 'blue', 'ЖД': 'teal', 'Гостиница': 'amber', 'Трансфер': 'purple',
  'Автобус': 'green', 'Тур': 'pink', 'Страховка': 'teal', 'Виза': 'amber', 'Прочее': 'gray',
};
const EXTRA_STAGE_LABEL = {
  before_booking: 'До бронирования',
  after_booking: 'После бронирования',
  after_issue: 'После выписки',
};
const EXTRA_AVAILABILITY_LABEL = {
  provider: 'От поставщика',
  manual: 'Ручная',
  unavailable: 'Недоступна',
};
const EXTRA_STATUS_TONE = { proposed: 'blue', requested: 'amber', confirmed: 'green', issued: 'green', cancelled: 'gray', failed: 'red' };
const SERVICE_KIND_OPTIONS = [
  { value: 'avia', label: 'Авиа' }, { value: 'rail', label: 'ЖД' },
  { value: 'hotel', label: 'Гостиница' }, { value: 'transfer', label: 'Трансфер' },
  { value: 'bus', label: 'Автобус' }, { value: 'tour', label: 'Тур' },
  { value: 'insurance', label: 'Страховка' }, { value: 'visa', label: 'Виза' },
  { value: 'other', label: 'Прочее' },
];
const EXTRA_STAGE_OPTIONS = Object.entries(EXTRA_STAGE_LABEL).map(([value, label]) => ({ value, label }));

function userName(user) {
  return user.full_name || user.name || user.email || 'Пользователь';
}
function operatorsForKind(users = []) {
  return users.filter((user) => !user.status || user.status === 'active' || user.status === 'Активный');
}
function ensureResponsibles(services = []) {
  return Array.isArray(services) ? services : [];
}

function OrderResponsiblesTab({ services = [], users = [], onUpdated }) {
  const toast = useToast();
  const rows = ensureResponsibles(services);
  const operators = operatorsForKind(users);

  const reassign = async (service, user) => {
    const serviceId = service.serverId || service.id;
    if (!serviceId || !user.id) {
      toast('Для услуги или пользователя не найден backend ID', 'err');
      return;
    }
    try {
      const updated = await servicesApi.setResponsible(serviceId, user.id);
      onUpdated?.(updated);
      toast('Ответственный по услуге изменён', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось изменить ответственного', 'err');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 12 }}>
        <h3 className="card-title" style={{ fontSize: 18, margin: 0 }}>Ответственные по услугам</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Назначения загружены из услуг заказа и сохраняются непосредственно в backend.</div>
      </div>
      {!rows.length ? <EmptyState icon="users" title="В заказе пока нет услуг" sub="Ответственного можно назначить после добавления услуги." /> : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Вид услуг</th><th>Услуга</th><th>Ответственный</th><th style={{ width: 150 }}>Действие</th></tr></thead>
            <tbody>{rows.map((service) => {
              const current = service.responsible_name || operators.find((user) => String(user.id) === String(service.responsible)) && userName(operators.find((user) => String(user.id) === String(service.responsible))) || 'Не назначен';
              return (
                <tr key={service.serverId || service.id}>
                  <td><Pill tone={SERVICE_TONE[service.kind] || 'gray'}>{service.kind || 'Прочее'}</Pill></td>
                  <td className="t-strong">{service.title || 'Услуга'}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={current} size={26} />{current}</span></td>
                  <td>
                    <ActionMenu
                      trigger={<Button variant="secondary" size="sm" iconRight="chevDown" disabled={!operators.length}>Переназначить</Button>}
                      items={operators.map((user) => ({
                        icon: String(user.id) === String(service.responsible) ? 'check' : 'user',
                        label: userName(user),
                        onClick: () => reassign(service, user),
                      }))}
                    />
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DynamicExtrasPanel({ services = [] }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ service: '', catalog_item: '', name: '', stage: 'before_booking', quantity: 1, price: '', currency: '' });

  const load = async (signal) => {
    setLoading(true);
    try {
      const [catalogPayload, ...extraPayloads] = await Promise.all([
        servicesApi.extraCatalog({}, signal),
        ...services.map((service) => servicesApi.extras(service.serverId || service.id, signal)),
      ]);
      setCatalog(resultsOf(catalogPayload).filter((item) => item.is_active));
      setRows(extraPayloads.flatMap((items, index) => (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        serviceId: services[index]?.serverId || services[index]?.id,
        serviceTitle: services[index]?.title || services[index]?.kind || 'Услуга',
      }))));
    } catch (error) {
      if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить дополнительные услуги', 'err');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [services.map((service) => service.serverId || service.id).join('|')]);

  const openForm = () => {
    const first = services[0];
    setDraft({
      service: first ? String(first.serverId || first.id) : '',
      catalog_item: '',
      name: '',
      stage: 'before_booking',
      quantity: 1,
      price: '',
      currency: first?.currency || '',
    });
    setFormOpen(true);
  };
  const chooseCatalog = (id) => {
    const item = catalog.find((row) => String(row.id) === String(id));
    setDraft((current) => ({
      ...current,
      catalog_item: id,
      name: item?.name || current.name,
      stage: item?.stage || current.stage,
      price: item?.default_fee ?? current.price,
      currency: item?.currency || current.currency,
    }));
  };
  const createExtra = async () => {
    if (!draft.service || !draft.name.trim()) {
      toast('Выберите услугу и укажите название', 'err');
      return;
    }
    try {
      const created = await servicesApi.addExtra(draft.service, {
        catalog_item: draft.catalog_item || null,
        name: draft.name.trim(),
        stage: draft.stage,
        availability: 'manual',
        quantity: Math.max(1, Number(draft.quantity || 1)),
        price: draft.price === '' ? null : Number(draft.price),
        currency: draft.currency || '',
      });
      const service = services.find((item) => String(item.serverId || item.id) === String(draft.service));
      setRows((current) => [...current, { ...created, serviceId: draft.service, serviceTitle: service?.title || service?.kind || 'Услуга' }]);
      setFormOpen(false);
      toast('Дополнительная услуга сохранена в backend', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось добавить дополнительную услугу', 'err');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 className="card-title" style={{ fontSize: 18, margin: 0 }}>Дополнительные услуги</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Показаны только услуги, сохранённые в backend у услуг этого заказа.</div>
        </div>
        <Button size="sm" icon="plus" disabled={!services.length} onClick={openForm}>Добавить</Button>
      </div>

      {loading ? <div className="card card-pad" style={{ color: 'var(--muted)' }}>Загрузка дополнительных услуг…</div>
        : !rows.length ? <EmptyState icon="sparkles" title="Дополнительных услуг пока нет" sub="Добавьте ручной запрос или дождитесь данных поставщика." />
          : <div className="table-card">
            <table className="tbl">
              <thead><tr><th>Услуга заказа</th><th>Доп. услуга</th><th>Этап</th><th>Источник</th><th>Статус</th><th style={{ textAlign: 'right' }}>Стоимость</th></tr></thead>
              <tbody>{rows.map((item) => (
                <tr key={item.id}>
                  <td className="t-strong">{item.serviceTitle}</td>
                  <td>{item.name}</td>
                  <td>{EXTRA_STAGE_LABEL[item.stage] || item.stage}</td>
                  <td>{EXTRA_AVAILABILITY_LABEL[item.availability] || item.availability}</td>
                  <td><Pill tone={EXTRA_STATUS_TONE[item.status] || 'gray'}>{item.status}</Pill></td>
                  <td style={{ textAlign: 'right' }}>{item.price == null ? '—' : `${Number(item.price).toLocaleString('ru-RU')} ${item.currency || ''}`}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>}

      <Drawer open={formOpen} onClose={() => setFormOpen(false)} title="Добавить дополнительную услугу"
        footer={<><Button variant="secondary" onClick={() => setFormOpen(false)}>Отмена</Button><Button icon="check" onClick={createExtra}>Сохранить</Button></>}>
        <Field label="Услуга заказа" required>
          <Select options={services.map((service) => ({ value: String(service.serverId || service.id), label: service.title || service.kind }))} value={draft.service} onChange={(event) => setDraft((current) => ({ ...current, service: event.target.value, currency: services.find((item) => String(item.serverId || item.id) === event.target.value)?.currency || current.currency }))} />
        </Field>
        <Field label="Из справочника">
          <Select placeholder="Не выбрано" options={catalog.map((item) => ({ value: String(item.id), label: item.name }))} value={draft.catalog_item} onChange={(event) => chooseCatalog(event.target.value)} />
        </Field>
        <Field label="Название" required><Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Этап"><Select options={EXTRA_STAGE_OPTIONS} value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))} /></Field>
        <div className="grid-2">
          <Field label="Количество"><Input type="number" min="1" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} /></Field>
          <Field label="Цена"><Input type="number" min="0" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} /></Field>
        </div>
        <Field label="Валюта"><Input value={draft.currency} maxLength={3} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></Field>
      </Drawer>
    </div>
  );
}

function ExtrasCatalogModal({ open, onClose }) {
  const toast = useToast();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', kind: 'avia', stage: 'before_booking', default_fee: '', currency: '' });

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setLoading(true);
    servicesApi.extraCatalog({}, controller.signal)
      .then((payload) => setCatalog(resultsOf(payload)))
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить справочник', 'err'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);

  const createItem = async () => {
    if (!draft.name.trim()) {
      toast('Укажите название услуги', 'err');
      return;
    }
    try {
      const created = await servicesApi.createExtraCatalogItem({
        ...draft,
        code: `extra-${Date.now()}`,
        default_fee: draft.default_fee === '' ? null : Number(draft.default_fee),
        currency: draft.currency.toUpperCase(),
        is_active: true,
      });
      setCatalog((current) => [...current, created]);
      setFormOpen(false);
      setDraft({ name: '', kind: 'avia', stage: 'before_booking', default_fee: '', currency: '' });
      toast('Услуга добавлена в backend-справочник', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось добавить услугу', 'err');
    }
  };

  if (!open) return null;
  return (
    <Drawer open onClose={onClose} title="Справочник дополнительных услуг" sub="Настраиваемые позиции организации из backend." width="min(900px, 96vw)"
      footer={<><Button variant="secondary" icon="plus" onClick={() => setFormOpen((value) => !value)}>Добавить услугу</Button><Button onClick={onClose}>Закрыть</Button></>}>
      {formOpen && <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="grid-2">
          <Field label="Название" required><Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Вид услуги"><Select options={SERVICE_KIND_OPTIONS} value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))} /></Field>
          <Field label="Этап"><Select options={EXTRA_STAGE_OPTIONS} value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))} /></Field>
          <Field label="Сбор по умолчанию"><Input type="number" min="0" value={draft.default_fee} onChange={(event) => setDraft((current) => ({ ...current, default_fee: event.target.value }))} /></Field>
          <Field label="Валюта"><Input maxLength={3} value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Button variant="secondary" onClick={() => setFormOpen(false)}>Отмена</Button><Button icon="check" onClick={createItem}>Сохранить</Button></div>
      </div>}
      {loading ? <div style={{ color: 'var(--muted)' }}>Загрузка…</div> : !catalog.length ? <EmptyState icon="sparkles" title="Справочник пуст" /> : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Услуга</th><th>Вид</th><th>Этап</th><th>Сбор</th><th>Статус</th></tr></thead>
            <tbody>{catalog.map((item) => (
              <tr key={item.id}>
                <td className="t-strong">{item.name}</td>
                <td>{SERVICE_KIND_OPTIONS.find((option) => option.value === item.kind)?.label || item.kind}</td>
                <td>{EXTRA_STAGE_LABEL[item.stage] || item.stage}</td>
                <td>{item.default_fee == null ? '—' : `${Number(item.default_fee).toLocaleString('ru-RU')} ${item.currency || ''}`}</td>
                <td><Pill tone={item.is_active ? 'green' : 'gray'}>{item.is_active ? 'Активна' : 'Отключена'}</Pill></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Drawer>
  );
}








const OP_CONFIRM_ACTIONS = {
  issue:    { title: 'Выписка услуги', verb: 'Выписать', tone: 'primary', irreversible: true,
    desc: 'После подтверждения услуга будет выписана, стоимость спишется у поставщика.',
    ops: ['Отправка запроса поставщику', 'Выписка документа (билет/ваучер)', 'Списание стоимости у поставщика', 'Фиксация в заказе'],
    docs: ['Билет / маршрут-квитанция', 'Счёт'], notifies: ['Уведомление в чат заказа', 'Отправка маршрут-квитанции клиенту'],
    consequences: ['Повторное оформление возможно только по актуальной стоимости'] },
  exchange: { title: 'Обмен услуги', verb: 'Подтвердить обмен', tone: 'primary', irreversible: true,
    desc: 'Прежняя услуга будет заменена на новую. Возможна разница стоимости и штраф.',
    ops: ['Аннуляция прежней услуги у поставщика', 'Оформление новой услуги', 'Пересчёт стоимости и сборов'],
    docs: ['Новая маршрут-квитанция', 'Пересчёт счёта'], notifies: ['Уведомление в чат', 'Изменённое КП клиенту'],
    consequences: ['Предыдущий билет станет недействительным', 'После обмена возможно изменение аэропорта или времени'] },
  refund:   { title: 'Возврат услуги', verb: 'Оформить возврат', tone: 'danger', irreversible: true,
    desc: 'Услуга будет возвращена. Возможны удержания согласно правилам тарифа.',
    ops: ['Запрос на возврат поставщику', 'Расчёт удержаний', 'Формирование суммы к возврату'],
    docs: ['Заявление на возврат', 'Корректировочный счёт'], notifies: ['Уведомление в чат', 'Расчёт возврата клиенту'],
    consequences: ['Бронирование будет аннулировано', 'Место будет освобождено'] },
  cancel:   { title: 'Отмена бронирования', verb: 'Отменить бронь', tone: 'danger', irreversible: true,
    desc: 'Бронирование будет аннулировано. Действие может быть необратимым.',
    ops: ['Аннуляция брони у поставщика', 'Освобождение мест/номеров', 'Обновление статуса заказа'],
    docs: ['Подтверждение аннуляции'], notifies: ['Уведомление в чат'],
    consequences: ['Бронирование будет аннулировано', 'Повторное оформление — по актуальной стоимости'] },
  book:     { title: 'Бронирование услуги', verb: 'Забронировать', tone: 'primary', irreversible: false,
    desc: 'Будет отправлен запрос на бронирование поставщику и создан PNR / код брони.',
    ops: ['Отправка запроса поставщику', 'Создание PNR / кода брони', 'Установка тайм-лимита'],
    docs: ['Подтверждение брони'], notifies: ['Уведомление в чат'], consequences: [] },
};

const OP_CHECKS_BY_KIND = {
  'Авиа': ['Корректность данных пассажиров', 'Наличие и срок действия документов', 'Выбранный тариф и класс', 'Багаж и места', 'Тайм-лимит бронирования'],
  'ЖД': ['Данные пассажиров', 'Поезд, вагон и места', 'Класс обслуживания', 'Штрафы при возврате/обмене'],
  'Гостиница': ['Даты проживания и число ночей', 'Тип номера и состав гостей', 'Условия отмены и депозит', 'Городские налоги'],
  'Гостиницы': ['Даты проживания и число ночей', 'Тип номера и состав гостей', 'Условия отмены и депозит', 'Городские налоги'],
  'Трансфер': ['Маршрут и время подачи', 'Связанный рейс', 'Число пассажиров'],
  'Трансферы': ['Маршрут и время подачи', 'Связанный рейс', 'Число пассажиров'],
  'Автобус': ['Перевозчик и маршрут', 'Место и багаж', 'Время отправления'],
};
function OperationConfirmModal({ open, action, kind = 'Авиа', service, fin = {}, warnings = [], onConfirm, onClose, needComment }) {
  const [comment, setComment] = useState('');
  useEffect(() => { if (open) setComment(''); }, [open, action]);
  if (!open) return null;
  const cfg = OP_CONFIRM_ACTIONS[action] || OP_CONFIRM_ACTIONS.issue;
  const checks = OP_CHECKS_BY_KIND[kind] || OP_CHECKS_BY_KIND['Авиа'];
  const cur = fin.currency || '$';
  const fmt = (v) => (v == null ? null : Math.round(v).toLocaleString('ru-RU') + ' ' + cur);
  const finRows = [
    ['Стоимость услуги', fin.price], ['Сервисный сбор', fin.fee], ['Комиссия', fin.commission],
    ['Штраф', fin.penalty], [action === 'refund' ? 'Сумма к возврату' : 'Доплата', action === 'refund' ? fin.refund : fin.surcharge],
  ].filter((r) => r[1] != null);
  const total = fin.total != null ? fin.total : null;
  return (
    <Modal open onClose={onClose} size="md" ariaLabel={cfg.title}>
      <div className="operation-confirm-modal">
        <ModalHeader title={cfg.title} sub={(service || 'Услуга') + ' · ' + kind} onClose={onClose} />
        <div className="opc-scroll scroll">

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 15px', borderRadius: 12,
            background: cfg.tone === 'danger' ? '#fdf0ec' : 'var(--blue-soft)', border: '1px solid ' + (cfg.tone === 'danger' ? '#f2c4b7' : '#cfe0ff') }}>
            <Icon name={cfg.tone === 'danger' ? 'alertCircle' : 'checkCircle'} style={{ width: 20, height: 20, color: cfg.tone === 'danger' ? 'var(--red)' : 'var(--blue)', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.45 }}>{cfg.desc}</div>
          </div>

          <OpConfSection icon="orders" title="Будут выполнены операции">
            {cfg.ops.map((o, i) => <div key={i} className="opc-li"><Icon name="chevRight" style={{ width: 13, height: 13, color: 'var(--muted-2)' }} />{o}</div>)}
          </OpConfSection>

          <OpConfSection icon="check" title="Автоматическая проверка данных" tone="green">
            {checks.map((c, i) => <div key={i} className="opc-li"><Icon name="checkCircle" style={{ width: 15, height: 15, color: 'var(--green)' }} />{c}</div>)}
          </OpConfSection>

          {finRows.length > 0 && (
            <OpConfSection icon="finance" title="Финансовая информация">
              <div className="kv" style={{ marginTop: -4 }}>
                {finRows.map(([k, v], i) => <div className="kv-row" key={i} style={{ padding: '8px 0' }}><span className="k" style={{ fontSize: 13.5 }}>{k}</span><span className="v" style={{ fontSize: 14, color: k === 'Штраф' ? 'var(--red)' : k === 'Сумма к возврату' ? 'var(--green)' : 'var(--ink)' }}>{fmt(v)}</span></div>)}
              </div>
              {total != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 11, borderTop: '2px solid var(--line)' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>Итого операции</span>
                  <span style={{ fontWeight: 800, fontSize: 20, color: action === 'refund' ? 'var(--green)' : 'var(--ink)' }}>{fmt(total)}</span>
                </div>
              )}
            </OpConfSection>
          )}

          {warnings.length > 0 && (
            <OpConfSection icon="alertCircle" title="Важно — проверьте перед подтверждением" tone="amber">
              {warnings.map((w, i) => <div key={i} className="opc-li" style={{ color: 'var(--amber)', fontWeight: 600 }}><Icon name="alertCircle" style={{ width: 15, height: 15, color: 'var(--amber)' }} />{w}</div>)}
            </OpConfSection>
          )}

          {cfg.consequences.length > 0 && (
            <OpConfSection icon="alertCircle" title="Последствия операции" tone="red">
              {cfg.consequences.map((w, i) => <div key={i} className="opc-li" style={{ color: 'var(--red)', fontWeight: 600 }}><Icon name="chevRight" style={{ width: 14, height: 14, color: 'var(--red)' }} />{w}</div>)}
            </OpConfSection>
          )}

          <div className="opc-summary-grid">
            <OpConfSection icon="docs" title="Будут сформированы" tone="blue">
              {cfg.docs.map((d, i) => <div key={i} className="opc-li"><Icon name="docs" style={{ width: 14, height: 14, color: 'var(--blue)' }} />{d}</div>)}
            </OpConfSection>
            <OpConfSection icon="bell" title="Уведомления" tone="blue">
              {cfg.notifies.map((d, i) => <div key={i} className="opc-li"><Icon name="bell" style={{ width: 14, height: 14, color: 'var(--blue)' }} />{d}</div>)}
            </OpConfSection>
          </div>

          {needComment && (
            <div>
              <label className="label" style={{ marginBottom: 6, display: 'block' }}>Комментарий оператора</label>
              <textarea className="input" style={{ minHeight: 64, resize: 'vertical', width: '100%' }} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Причина / примечание к операции" />
            </div>
          )}
        </div>

        {cfg.irreversible && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 11, marginTop: 14,
            background: cfg.tone === 'danger' ? '#fdf0ec' : '#fff7ec', border: '1px solid ' + (cfg.tone === 'danger' ? '#f2c4b7' : '#f0d6a6') }}>
            <Icon name="lock" style={{ width: 16, height: 16, color: cfg.tone === 'danger' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: cfg.tone === 'danger' ? 'var(--red)' : 'var(--amber)' }}>Действие необратимо — отменить автоматически будет нельзя</span>
          </div>
        )}
        <div className="opc-action-bar">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant={cfg.tone === 'danger' ? 'danger' : 'primary'} icon="check" onClick={() => { onConfirm && onConfirm({ comment }); onClose && onClose(); }}>{cfg.verb}</Button>
        </div>
      </div>
    </Modal>
  );
}

const OPC_TONES = {
  amber: { bg: '#fff7ec', bd: '#f0d6a6', hd: 'var(--amber)' },
  red:   { bg: '#fdf0ec', bd: '#f2c4b7', hd: 'var(--red)' },
  green: { bg: '#eef9f1', bd: '#c3e9d0', hd: 'var(--green)' },
  blue:  { bg: 'var(--blue-soft)', bd: '#cfe0ff', hd: 'var(--blue)' },
  plain: { bg: 'var(--surface-2)', bd: 'var(--line)', hd: 'var(--muted)' },
};
function OpConfSection({ icon, title, tone, children }) {
  const s = OPC_TONES[tone] || OPC_TONES.plain;
  return (
    <div style={{ background: s.bg, border: '1px solid ' + s.bd, borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <Icon name={icon} style={{ width: 15, height: 15, color: s.hd }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: s.hd, textTransform: 'uppercase', letterSpacing: '.03em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

Object.assign(window, { OrderResponsiblesTab, DynamicExtrasPanel, ExtrasCatalogModal, operatorsForKind, ensureResponsibles, OperationConfirmModal, OP_CONFIRM_ACTIONS });



export { operatorsForKind, ensureResponsibles, OrderResponsiblesTab, DynamicExtrasPanel, ExtrasCatalogModal, OP_CONFIRM_ACTIONS, OP_CHECKS_BY_KIND, OperationConfirmModal, OPC_TONES, OpConfSection };
