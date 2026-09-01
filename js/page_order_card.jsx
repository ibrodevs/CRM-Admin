import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, ConfirmDialog, DateField, DateRangeField, Drawer, EmptyState, Field, Input, Pill, Radio, SearchBox, Select, Th, fmtDate, plural, useSort, useToast } from './ui';
import { AIRLINES, AIRPORTS, AVIA_BOOKING_CLASSES, FLIGHT_OFFERS, KP_STATUS, OPERATORS, ORDER_STATUS, ORDER_TASKS, PAX_DOC_KIND, SERVICE_KIND, SERVICE_STATUS } from './data';
import { cardStatus } from './data/access-control';
import { CASE_SVC_STATUS, CASE_TRIGGERS, ORDER_CHANGE_CASES, caseNow, caseProgress, createChangeCase, getChangeCase, normKind, smartAlternatives } from './data/service-cards';
import { UnifiedDocumentDrawer, UnifiedPersonDrawer } from './forms_unified';
import { Topbar } from './layout';
import { AirlineLogo, AirportField, PAX_DEFAULT_OPTIONS, PaxClassPicker, durMin, loadLiveFlightOffers, money, paxTotal } from './page_flights';
import { ExtrasTabs, FareSelectPanel, RUB_PER_USD, fareCabinLabel, fareTiersForClass } from './page_avia_picker';
import { BookingWizard } from './page_booking';
import { FeeDrawer, PassengerDrawer, PassportModal } from './order_extras';
import { DynamicExtrasPanel, OrderResponsiblesTab } from './order_ops';
import { CityPickPanel, StackPanel } from './components/shared-panels';
import { KPModule } from './page_offers';
import { DocCenter, FinanceRegistry } from './page_fulfillment';
import { ReturnsModule } from './page_returns';
import { AeroAddFlow, ManualAltForm, RailAddFlow, ServiceAddFlow, ServiceCardHistoryDrawer, ServiceCardSendPanel } from './page_services';
import { HotelPicker } from './page_hotel_picker';
import {
  financeRowsTotal, financeSnapshot, normalizeCurrency, ocCurrency, ocMoney,
  opDebt, opPayable, orderFinanceCurrency, svcCalc,
} from './features/orders/finance';
import { communicationsApi, crmApi, documentsApi, ordersApi, proposalsApi, serviceCardsApi, servicesApi, usersApi, workspaceActionsApi } from './api/resources';
import { toLegacyDocument, toLegacyOrderService, toLegacyParticipant } from './api/legacy-adapters';
import { resultsOf } from './api/client';
import { formatIsoDateTime, orderDateOnly, participantPayloadFromUi, routePayloadFromUi } from './api/order-card';
import { toUiOrder } from './api/adapters';
import { technicalStopCount, technicalStopLabel, technicalStopsOf } from './features/avia/technical-stops';
import { TechnicalStopsDetails } from './features/avia/technical-stops.jsx';

const ORDER_STATUS_CODE = {
  'Новое': 'new',
  'В работе': 'in_progress',
  'Ожидает подтверж.': 'awaiting_confirmation',
  'Ожидание оплаты': 'awaiting_payment',
  'Оплачено': 'paid',
  'Требует проверки': 'needs_review',
  'На паузе': 'on_hold',
  'Отменено': 'cancelled',
  'Нет данных': 'data_missing',
};

const ORDER_STATUS_LABEL = Object.fromEntries(Object.entries(ORDER_STATUS_CODE).map(([label, code]) => [code, label]));

const PERSON_CITIZENSHIP = {
  'Кыргызстан': 'KG',
  'Казахстан': 'KZ',
  'Россия': 'RU',
  'Узбекистан': 'UZ',
  'Таджикистан': 'TJ',
  'Туркменистан': 'TM',
  'Азербайджан': 'AZ',
  'Турция': 'TR',
  'Германия': 'DE',
  'Китай': 'CN',
  'ОАЭ': 'AE',
};

const PERSON_DOC_KIND = {
  'Загранпаспорт': 'foreign_passport',
  'Общегражданский паспорт': 'national_passport',
  'ID-карта': 'id_card',
  'Свидетельство о рождении': 'birth_certificate',
  'Вид на жительство': 'other',
  'Виза': 'visa',
};

function citizenshipCode(value) {
  if (!value) return '';
  const text = String(value);
  return PERSON_CITIZENSHIP[text] || (text.length === 2 ? text.toUpperCase() : '');
}

function personPayloadFromUnified(person = {}, client = {}) {
  return {
    surname: person.lastName || client.lastName || String(client.name || '').split(/\s+/)[0] || '',
    given_name: person.firstName || client.firstName || String(client.name || '').split(/\s+/)[1] || '',
    middle_name: person.middleName || client.middleName || String(client.name || '').split(/\s+/).slice(2).join(' ') || '',
    birth_date: orderDateOnly(person.dob || client.dob),
    gender: person.gender === 'Мужской' ? 'male' : person.gender === 'Женский' ? 'female' : '',
    citizenship: citizenshipCode(person.citizenship || client.citizenship),
    phone: person.phone || client.phone || '',
    email: person.email || client.email || '',
    city: person.city || client.city || '',
    notes: person.comment || client.comment || '',
  };
}

function personDocumentPayloadFromUnified(doc = {}) {
  return {
    type: PERSON_DOC_KIND[doc.docType] || 'other',
    number: doc.docNo || doc.number || '',
    expires_at: orderDateOnly(doc.docExpiry || doc.expires_at),
    issuing_country: citizenshipCode(doc.citizenship),
    nationality: citizenshipCode(doc.citizenship),
  };
}



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


function StatusControl({ status, onChange }) {
  const opts = Object.keys(ORDER_STATUS);
  return (
    <ActionMenu trigger={
      <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Pill tone={ORDER_STATUS[status]}>{status}</Pill><Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </button>
    } items={opts.map((s) => ({ icon: status === s ? 'check' : null, label: s, onClick: () => onChange(s) }))} />
  );
}


function OrderAside({ order, status, onStatusChange, services, participants, tasks = ORDER_TASKS, history = [], documents = [],
  requestType, aviaParams, onOpenTab, onOpenServices, onOpenTasks }) {
  const openTasks = tasks.filter((t) => !t.done);
  const fin = financeSnapshot(order.no, services);
  const trip = tripFromServices(services, aviaParams);


  const segServices = services.filter((s) => ['Авиа', 'ЖД', 'Трансфер'].includes(s.kind));
  const segCount = Math.max(1, segServices.length || (aviaParams.trip === 'rt' ? 2 : 1));
  const fromAp = AIRPORTS.find((a) => a.code === aviaParams.from);
  const toAp = AIRPORTS.find((a) => a.code === aviaParams.to);
  const cityCount = new Set([fromAp ? fromAp.city : aviaParams.from, toAp ? toAp.city : aviaParams.to].filter(Boolean)).size || 1;
  const countryCount = new Set([fromAp, toAp].map((a) => a && a.country).filter(Boolean)).size || 1;

  const okPax = participants.filter((p) => p.docStatus === 'ok').length;
  const checkPax = participants.length - okPax;

  const confirmedSvc = services.filter((s) => s.status === 'Подтверждено' || s.status === 'Выписано').length;
  const awaitingSvc = services.filter((s) => s.status === 'Забронировано' || s.status === 'Согласование' || s.status === 'Предложение').length;
  const actionSvc = services.filter((s) => s.status === 'Поиск' || s.status === 'Возврат' || s.status === 'Отменено').length;

  return (
    <div className="oc-aside">
      <div className="card oc-aside-card">
        <ActionMenu trigger={
          <button className="oc-aside-row">
            <span className="ic"><Icon name="checkCircle" /></span>
            <div className="body"><div className="lbl">Статус заказа</div><div className="val">{status}</div></div>
            <Icon name="chevRight" className="chev" />
          </button>
        } items={Object.keys(ORDER_STATUS).map((s) => ({ icon: status === s ? 'check' : null, label: s, onClick: () => onStatusChange(s) }))} />

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('route')}>
          <span className="ic"><Icon name="route" /></span>
          <div className="body">
            <div className="lbl">Маршрут</div>
            <div className="val">{aviaParams.trip === 'mc' ? 'Мульти-стоп' : trip.from + ' → ' + trip.to}</div>
            <div className="sub">{countryCount} {plural(countryCount, ['страна', 'страны', 'стран'])} · {cityCount} {plural(cityCount, ['город', 'города', 'городов'])} · {segCount} {plural(segCount, ['сегмент', 'сегмента', 'сегментов'])}</div>
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('participants')}>
          <span className="ic"><Icon name="users" /></span>
          <div className="body">
            <div className="lbl">Пассажиры</div>
            <div className="val">{participants.length} {plural(participants.length, ['человек', 'человека', 'человек'])}</div>
            <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--green)' }} />{okPax} готовы</div>
            {checkPax > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--amber)' }} />{checkPax} требуют проверки</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={onOpenServices}>
          <span className="ic"><Icon name="briefcase" /></span>
          <div className="body">
            <div className="lbl">Услуги</div>
            <div className="val">{services.length} {plural(services.length, ['услуга', 'услуги', 'услуг'])}</div>
            {confirmedSvc > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--green)' }} />{confirmedSvc} подтверждено</div>}
            {awaitingSvc > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--amber)' }} />{awaitingSvc} ожидает ответа</div>}
            {actionSvc > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--red)' }} />{actionSvc} требует действия</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('documents')}>
          <span className="ic"><Icon name="docs" /></span>
          <div className="body">
            <div className="lbl">Документы</div>
            <div className="val">{documents.length} {plural(documents.length, ['файл', 'файла', 'файлов'])}</div>
            {checkPax > 0
              ? <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--amber)' }} />{checkPax} {plural(checkPax, ['пассажир', 'пассажира', 'пассажиров'])} без документа</div>
              : <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--green)' }} />Все на месте</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('finance')}>
          <span className="ic"><Icon name="finance" /></span>
          <div className="body">
            <div className="lbl">Финансы</div>
            <div className="val">{ocMoney(fin.total)}</div>
            <div className="sub">Оплачено: {ocMoney(fin.paid)}</div>
            <div className="sub">К оплате: {ocMoney(Math.max(0, fin.total - fin.paid))}</div>
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={onOpenTasks}>
          <span className="ic"><Icon name="checkCircle" /></span>
          <div className="body">
            <div className="lbl">Задачи</div>
            <div className="val">{tasks.length} {plural(tasks.length, ['задача', 'задачи', 'задач'])}</div>
            {openTasks.length > 0 && <div className="oc-aside-stat"><span className="dot" style={{ background: 'var(--green)' }} />{openTasks.length} {plural(openTasks.length, ['активная', 'активные', 'активных'])}</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>

        <div className="oc-aside-sep" />
        <button className="oc-aside-row" onClick={() => onOpenTab('history')}>
          <span className="ic"><Icon name="clock" /></span>
          <div className="body">
            <div className="lbl">История</div>
            <div className="val">{history.length} {plural(history.length, ['событие', 'события', 'событий'])}</div>
            {history.length > 0 && <div className="sub">Последнее: {history[history.length - 1].t}</div>}
          </div>
          <Icon name="chevRight" className="chev" />
        </button>
      </div>

      <div className="oc-hint">
        <span className="ic"><Icon name="sparkles" /></span>
        <div>
          <div className="t">Подсказка</div>
          <div className="d">Вся основная информация и документы по каждой услуге доступны прямо в карточке заказа.</div>
        </div>
      </div>
    </div>
  );
}


function ReassignOperatorDrawer({ open, current, options = OPERATORS, onClose, onPick }) {
  return (
    <Drawer open={open} onClose={onClose} title="Ответственный оператор"
      footer={<Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>Закрыть</Button>}>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Выберите сотрудника, ответственного за работу над заказом.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((choice) => {
          const op = typeof choice === 'string' ? { id: null, name: choice } : { id: choice.id, name: choice.full_name || choice.name || choice.email };
          const sel = op.name === current;
          return (
            <button key={op.id || op.name} type="button" className={'oce-client' + (sel ? ' sel' : '')} style={{ cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid ' + (sel ? 'var(--blue)' : 'var(--line)'), background: sel ? 'var(--blue-soft)' : '#fff', borderRadius: 12, padding: '10px 12px' }}
              onClick={() => onPick(op)}>
              <Avatar name={op.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{op.name}</div><div className="mt">Оператор</div></div>
              {sel ? <Pill tone="blue">Текущий</Pill> : <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />}
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}


function tripFromServices(services, aviaParams) {
  const avia = services.find((s) => s.kind === 'Авиа');
  if (avia) {
    const m = avia.title.match(/^(.+?)\s*→\s*(.+?)(?:\s*→.+)?$/);
    return { from: m ? m[1] : aviaParams.from, to: m ? m[2] : aviaParams.to, dates: avia.date };
  }
  const dep = aviaParams.depDate ? fmtDate(aviaParams.depDate) : '24.06';
  const ret = aviaParams.trip === 'rt' ? ' – ' + (aviaParams.retDate ? fmtDate(aviaParams.retDate) : '01.07') : '';
  return { from: aviaParams.from, to: aviaParams.to, dates: dep + ret };
}





function KvEditDrawer({ open, onClose, title, rows, onSave }) {
  const toast = useToast();
  const [vals, setVals] = useState(() => rows.map((r) => r[1]));
  useEffect(() => { if (open) setVals(rows.map((r) => r[1])); }, [open]);
  const submit = () => { onSave(rows.map((r, i) => [r[0], vals[i]])); toast('Изменения сохранены', 'ok'); onClose(); };
  return (
    <Drawer open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" onClick={submit}>Сохранить</Button></>}>
      <div className="form-grid">
        {rows.map((r, i) => (
          <Field key={r[0]} label={r[0]}>
            <Input value={vals[i]} onChange={(e) => setVals((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
          </Field>
        ))}
      </div>
    </Drawer>
  );
}

function visibleValue(value) {
  return value && value !== '—' ? value : 'Не указано';
}

function TabOverview({ order, company }) {
  const main = [
    ['Организация', company?.name || order.client],
    ['ИНН/ПИН', visibleValue(company?.inn)],
    ['Юридический адрес', visibleValue(company?.addr)],
    ['Тип организации', visibleValue(company?.type)],
    ['Телефон', visibleValue(company?.phone)],
    ['E-mail', visibleValue(company?.email)],
  ];
  const params = [
    ['Тип заявки', order.requestType],
    ['Оператор', order.operator],
    ['Дата создания', order.date],
    ['Валюта', order.currency || order.base_currency || 'RUB'],
    ['Назначение', visibleValue(order.purpose)],
    ['Начало поездки', visibleValue(order.planned_start)],
    ['Окончание поездки', visibleValue(order.planned_end)],
    ['Источник', visibleValue(order.source)],
    ['Канал связи', visibleValue(order.preferred_channel)],
  ];
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Основная информация</h3>
        </div>
        <div className="kv-stack">
          {main.map(([k, v], i) => (
            <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 className="card-title">Параметры заказа</h3>
        </div>
        <div className="oc-2col">
          <div className="kv-stack">
            {params.slice(0, 5).map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
          <div className="kv-stack">
            {params.slice(5).map(([k, v], i) => (
              <div key={i}><div className="label2">{k}</div><div className="val2">{v}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabClients({ order, company, client, onOpenChat }) {
  const [cardOpen, setCardOpen] = useState(false);
  const clientRows = [
    ['Контактное лицо', visibleValue(client?.name)],
    ['Телефон', visibleValue(client?.phone)],
    ['E-mail', visibleValue(client?.email)],
    ['Юр. лицо', company?.name || order.client],
    ['ИНН', visibleValue(company?.inn)],
  ];
  return (
    <div className="grid-2 fade-in" style={{ alignItems: 'start' }}>
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Avatar name={order.client} size={48} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13 }}>Заказчик · Компания</div></div>
          <Pill tone="green">Активный</Pill>
        </div>
        <div className="kv">
          <div className="kv-row"><span className="k">Контактное лицо</span><span className="v">{visibleValue(client?.name)}</span></div>
          <div className="kv-row"><span className="k">Телефон</span><span className="v">{visibleValue(client?.phone)}</span></div>
          <div className="kv-row"><span className="k">E-mail</span><span className="v">{visibleValue(client?.email)}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button variant="secondary" size="sm" icon="chat" onClick={onOpenChat}>Написать</Button>
          <Button variant="secondary" size="sm" icon="user" onClick={() => setCardOpen(true)}>Карточка</Button>
        </div>
        <Drawer open={cardOpen} onClose={() => setCardOpen(false)} title="Карточка клиента"
          footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setCardOpen(false)}>Закрыть</Button>}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar name={order.client} size={48} />
            <div><div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{order.client}</div><div style={{ color: 'var(--muted)', fontSize: 13 }}>Заказчик · Компания</div></div>
          </div>
          <div className="kv">
            {clientRows.map(([k, v], i) => (<div className="kv-row" key={i}><span className="k">{k}</span><span className="v">{v}</span></div>))}
          </div>
        </Drawer>
      </div>
      <div className="card card-pad">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Реквизиты компании</h3>
        <div className="kv">
          <div className="kv-row"><span className="k">Юр. лицо</span><span className="v">{company?.name || order.client}</span></div>
          <div className="kv-row"><span className="k">ИНН</span><span className="v">{visibleValue(company?.inn)}</span></div>
          <div className="kv-row"><span className="k">Банк</span><span className="v">{visibleValue(company?.bank)}</span></div>
          <div className="kv-row"><span className="k">Счёт</span><span className="v">{visibleValue(company?.account)}</span></div>
          <div className="kv-row"><span className="k">Договор</span><span className="v">{visibleValue(company?.contract)}</span></div>
        </div>
      </div>
    </div>
  );
}

function DocCell({ p }) {
  const k = PAX_DOC_KIND[p.docType];
  if (!k || !p.docNo) return <span>{p.doc || '—'}</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span className="oc-svc-ic" style={{ background: k.color, width: 30, height: 30, borderRadius: 9, flex: '0 0 30px' }}>
        <Icon name={k.icon} style={{ width: 16, height: 16 }} />
      </span>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.docType}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>№ {p.docNo}</div>
        {p.docExpiry && <div style={{ fontSize: 12, color: 'var(--muted)' }}>до {p.docExpiry}</div>}
      </div>
    </div>
  );
}


function PaxGroupCard({ index, name, members, onPassport, onEdit, onAddDoc, onRemove }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const isChild = (p) => /реб[её]н|child|инфант|infant/i.test(p.role || '');
  const err = members.filter(({ p }) => p.docStatus === 'check').length;
  const status = members.length && members.every(({ p }) => isChild(p))
    ? { label: 'Дети', tone: 'blue' }
    : err ? { label: err + (err === 1 ? ' требует проверки' : ' требуют проверки'), tone: 'amber' }
          : { label: 'Документы готовы', tone: 'green' };
  const LIMIT = 6;
  const shown = open ? (showAll ? members : members.slice(0, LIMIT)) : [];
  return (
    <div className="pax-group">
      <div className="pax-group-head">
        <button type="button" className="pxg-toggle" onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? 'chevDown' : 'chevRight'} />
          <span className="pxg-name">{index != null ? `Группа ${index}. ${name}` : name}</span>
          <span className="pxg-cnt">{members.length}</span>
        </button>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
      {shown.map(({ p, i }) => (
        <div key={i} className="pax-group-row" onClick={() => onEdit && onEdit(p)}>
          <span className="pxg-num">{i + 1}</span>
          <Avatar name={p.name} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{p.name} {p.lead && <span className="pill pill-blue" style={{ marginLeft: 4, height: 20, padding: '0 8px', fontSize: 12 }}>Лид</span>}</div>
            <div className="mt">{p.role} · {p.doc}</div>
          </div>
          <Pill tone={p.docStatus === 'check' ? 'amber' : 'green'}>{p.docStatus === 'check' ? 'Требует проверки' : 'Без ошибок'}</Pill>
          <span onClick={(e) => e.stopPropagation()}>
            <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
              items={[
                { icon: 'idcard', label: 'Документы', onClick: () => onPassport(p.name) },
                { icon: 'docs', label: 'Добавить документ', onClick: () => onAddDoc && onAddDoc(p) },
                { icon: 'edit', label: 'Изменить данные', onClick: () => onEdit && onEdit(p) },
                ...(onRemove ? [{ sep: true }, { icon: 'trash', label: 'Удалить из заказа', danger: true, onClick: () => onRemove(p) }] : []),
              ]} />
          </span>
        </div>
      ))}
      {open && members.length > LIMIT && (
        <button type="button" className="pxg-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Свернуть' : `+ ещё ${members.length - LIMIT} ${members.length - LIMIT === 1 ? 'пассажир' : 'пассажиров'}`}
        </button>
      )}
    </div>
  );
}

function TabParticipants({ list, isGroup, groups, fresh, onPassport, onAdd, onEdit, onAddDoc, onRemove }) {
  if (!list.length) return (
    <div className="fade-in">
      <EmptyState icon="users" title="Участников пока нет" sub="Добавьте пассажиров поездки и их документы здесь" />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -12 }}><Button icon="plus" onClick={onAdd}>Добавить участника</Button></div>
    </div>
  );
  const errCount = list.filter((p) => p.docStatus === 'check').length;
  return (
    <div className="fade-in">
      {fresh && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '4px solid var(--blue)' }}>
          <Icon name="users" style={{ width: 20, height: 20, color: 'var(--blue)' }} />
          <div style={{ flex: 1, fontSize: 13, color: 'var(--body)' }}>
            <b style={{ color: 'var(--ink)' }}>Новый заказ.</b> Добавьте участников и их документы здесь — это нужно для выписки билетов и проверки виз.
          </div>
        </div>
      )}
      {isGroup && (
        <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="oc-svc-ic" style={{ background: 'var(--blue)' }}><Icon name="users" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{list.length} пассажиров · Групповая поездка</div>
            <div style={{ fontSize: 13, color: errCount ? 'var(--amber)' : 'var(--green)', marginTop: 2 }}>
              Поимённый список: {list.length - errCount} без ошибок{errCount ? `, ${errCount} требуют проверки` : ''}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 14 }}>
        <Button icon="plus" onClick={onAdd}>Добавить участника</Button>
      </div>
      {(() => {

        const secs = (isGroup && groups && groups.length) ? (() => {
          const used = new Set();
          const out = groups.map((g, gi) => {
            const members = (g.members || []).filter((i) => i < list.length && !used.has(i)).map((i) => { used.add(i); return { p: list[i], i }; });
            return { id: g.id, index: gi + 1, name: g.name, members };
          }).filter((s) => s.members.length);
          const rest = list.map((p, i) => ({ p, i })).filter(({ i }) => !used.has(i));
          if (rest.length) out.push({ id: '__rest', index: null, name: 'Без подгруппы', members: rest });
          return out;
        })() : null;
        const cardSections = secs || [{ id: '__standard', index: null, name: 'Пассажиры заказа', members: list.map((p, i) => ({ p, i })) }];
        return <div className="pax-groups">{cardSections.map((s) => <PaxGroupCard key={s.id} index={s.index} name={s.name} members={s.members} onPassport={onPassport} onEdit={onEdit} onAddDoc={onAddDoc} onRemove={onRemove} />)}</div>;
      })()}
    </div>
  );
}

function TabRoute({ services = [], route }) {
  const points = route?.points || [];
  const validServices = (services || []).filter((s) => s.title || s.kind);
  const steps = [];

  if (validServices.length) {
    validServices.forEach((s) => {
      const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
      steps.push({
        t: s.date || (s.starts_at ? new Date(s.starts_at).toLocaleString('ru-RU') : 'Дата уточняется'),
        text: `${s.kind}: ${s.title}${s.supplier ? ` · ${s.supplier}` : ''}`,
        ic: k.icon || 'plane',
        status: s.status,
      });
    });
  } else if (points.length >= 2) {
    points.forEach((p, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === points.length - 1;
      const ap = AIRPORTS.find((a) => a.code === p.location_code);
      const name = ap ? `${ap.city} (${ap.code})` : (p.location_name || p.location_code);
      steps.push({
        t: p.local_datetime ? new Date(p.local_datetime).toLocaleString('ru-RU') : (isStart ? 'Отправление' : isEnd ? 'Прибытие' : `Точка ${idx + 1}`),
        text: isStart ? `Начало маршрута: ${name}` : isEnd ? `Конечный пункт: ${name}` : `Пересадка / остановка: ${name}`,
        ic: 'plane',
      });
    });
  }

  if (!steps.length) {
    return (
      <div className="card card-pad fade-in" style={{ maxWidth: 640 }}>
        <EmptyState icon="route" title="Маршрут пока не сформирован" sub="Добавьте услуги в заказ (авиабилеты, проживание, трансферы) или укажите маршрут в параметрах заказа." />
      </div>
    );
  }

  return (
    <div className="card card-pad fade-in" style={{ maxWidth: 640 }}>
      <h3 className="card-title" style={{ marginBottom: 18 }}>Маршрут поездки</h3>
      <div className="timeline">
        {steps.map((s, i) => (
          <div className="tl-item" key={i}>
            <span className="tl-dot" /><span className="tl-line" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name={s.ic} style={{ width: 18, height: 18, color: 'var(--blue)' }} />
              <div>
                <div className="tl-time">{s.t}</div>
                <div className="tl-text">{s.text} {s.status && <span className="pill pill-gray" style={{ marginLeft: 6, fontSize: 11 }}>{s.status}</span>}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}







const SVC_FILTER_CHIPS = [
  { kind: null, label: 'Все услуги' },
  { kind: 'Авиа', label: 'Авиабилеты' },
  { kind: 'Гостиница', label: 'Отели' },
  { kind: 'Трансфер', label: 'Трансферы' },
  { kind: 'Страховка', label: 'Страховка' },
  { kind: 'Виза', label: 'Виза' },
  { kind: 'ЖД', label: 'ЖД билеты' },
  { kind: 'Автобус', label: 'Автобус' },
];

function ServiceListRow({ s, paxCount, isGroup, onOpen, orderNo, participants = [], selected, onSel }) {
  const toast = useToast();
  const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const cat = (SVC_FILTER_CHIPS.find((c) => c.kind === s.kind) || {}).label || s.kind;
  const pax = isGroup ? paxCount : (s.pax || paxCount);
  const [sendOpen, setSendOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const initCard = (s.status === 'Выписано' || s.status === 'Подтверждено') ? 'issued' : (s.cardStatus || 'created');
  const [cardSt, setCardSt] = useState(initCard);
  const cst = cardStatus(cardSt);

  const cardItem = s.svcOffer ? {
    ...s.svcOffer,
    title: s.title,
    sub: s.sub,
    kind: s.kind,
    status: s.status,
    date: s.date,
    order: orderNo,
    calc: s.calc,
    currency: s.currency || s.svcOffer.currency || 'RUB',
  } : { ...s, order: orderNo };
  const onSent = (ch) => {
    setCardSt('sent');
    toast('Карточка услуги отправлена клиенту по каналу «' + ch + '»', 'ok');
    setTimeout(() => setCardSt('delivered'), 1000);
    setTimeout(() => setCardSt('viewed'), 2200);
  };
  return (
    <div className={'oc-svc-row' + (selected ? ' sel' : '')}>
      {onSel && <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', paddingRight: 4 }}><Checkbox on={!!selected} onChange={onSel} /></span>}
      <span className="ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
      <div className="body" onClick={() => onOpen(s)}>
        <div className="cat">{cat}</div>
        <div className="ttl">{s.title}</div>
        <div className="sub">{s.date}{s.supplier ? ' · ' + s.supplier : ''}</div>
      </div>
      <div className="mcol"><span className="l">Пассажиры</span><span className="v">{pax} {s.kind === 'Гостиница' ? 'номеров' : 'человек'}</span></div>
      <div className="mcol"><span className="l">Стоимость</span><span className="v">{ocMoney(svcCalc(s).total, s.currency)}</span></div>
      <div className="mcol"><span className="l">Статус</span><Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill></div>
      <div className="mcol"><span className="l">Карточка</span><Pill tone={cst.tone}>{cst.label}</Pill></div>
      <Button variant="secondary" size="sm" icon="send" onClick={() => setSendOpen(true)}>Клиенту</Button>
      <Button variant="secondary" size="sm" onClick={() => onOpen(s)}>Детали</Button>
      <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
        items={[{ icon: 'eye', label: 'Открыть', onClick: () => onOpen(s) }, { icon: 'send', label: 'Отправить клиенту', onClick: () => setSendOpen(true) }, { icon: 'clock', label: 'История карточки', onClick: () => setHistOpen(true) }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
      {sendOpen && <ServiceCardSendPanel item={cardItem} kind={s.kind} participants={participants} orderNo={orderNo} currency={s.currency} serviceId={s.id} onSent={onSent} onClose={() => setSendOpen(false)} />}
      {histOpen && <ServiceCardHistoryDrawer orderNo={orderNo} serviceId={s.id} title={s.title} onClose={() => setHistOpen(false)} />}
    </div>
  );
}


function serviceTotals(services) {
  const currency = normalizeCurrency((services || []).find((service) => service?.currency)?.currency || 'RUB');
  return {
    currency,
    total: services.reduce((sum, service) => (
      normalizeCurrency(service.currency, currency) === currency
        ? sum + svcCalc(service).total
        : sum
    ), 0),
    confirmedSvc: services.filter((s) => s.status === 'Подтверждено' || s.status === 'Выписано').length,
    awaitingSvc: services.filter((s) => s.status === 'Забронировано' || s.status === 'Согласование' || s.status === 'Предложение').length,
    actionSvc: services.filter((s) => s.status === 'Поиск' || s.status === 'Возврат' || s.status === 'Отменено').length,
  };
}





function ServicesFooterBar({ services, bookingDraft, onStartBooking }) {
  const { total, currency } = serviceTotals(services);
  return (
    <div className="oc-svc-footer">
      <div className="grp"><span className="l">Итого по заказу</span><span className="v">{ocMoney(total, currency)} <Icon name="alertCircle" style={{ width: 14, height: 14, color: 'var(--muted-2)', verticalAlign: -2 }} /></span></div>
      <div style={{ flex: 1 }} />
      <Button iconRight="arrowRight" onClick={onStartBooking}>{bookingDraft ? 'Продолжить бронирование' : 'Перейти к бронированию'}</Button>
    </div>
  );
}








// ——— Единая лента услуг заказа —————————————————————————————————————
// Карточка заказа собрана в один поток: услуга + её пассажиры + документы +
// действия лежат в одном блоке, разделы-подробности открываются из компактной
// панели заказа. Тарифные/статусные данные берутся из тех же полей услуги, что и в
// прежних вкладках, поэтому поведение действий не меняется.

function svcTint(color, alpha = 0.12) {
  const m = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!m) return 'var(--blue-soft)';
  const n = parseInt(m[1], 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
}

function svcExactMoney(amount, currency = 'RUB') {
  const value = Number(amount);
  return (Number.isFinite(value) ? value : 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + ocCurrency(currency);
}

function serviceDetailBlock(s) {
  if (!s || !s.details) return null;
  return s.details[s.kind] || Object.values(s.details)[0] || null;
}

function serviceHeadline(s) {
  const d = serviceDetailBlock(s) || {};
  const raw = String(d.route || s.title || '');
  const parts = raw.split('→').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return [s.title || d.name || s.kind || '—'];
}

function airlineCodeOf(s) {
  const d = serviceDetailBlock(s) || {};
  if (s.offer && s.offer.airline) return s.offer.airline;
  const name = d.airline || s.supplier || '';
  const code = Object.keys(AIRLINES).find((c) => name && (AIRLINES[c].name === name || name.indexOf(AIRLINES[c].name) === 0));
  return code || null;
}

function serviceSupplierLine(s) {
  const d = serviceDetailBlock(s) || {};
  if (s.kind === 'Авиа' || s.kind === 'ЖД') {
    const carrier = d.airline || d.carrier || s.supplier || '';
    const flight = d.flightNo || d.trainNo || '';
    return [carrier, flight].filter(Boolean).join(', ');
  }
  return [d.name || s.supplier, s.sub].filter(Boolean).join(' · ');
}

function serviceFacts(s) {
  const d = serviceDetailBlock(s) || {};
  const out = [];
  if (s.kind === 'Авиа' || s.kind === 'ЖД') {
    out.push({ icon: 'calendar', text: d.depDate || s.date });
    if (d.depTime && d.arrTime) out.push({ icon: s.kind === 'ЖД' ? 'train' : 'plane', text: d.depTime + ' – ' + d.arrTime });
    out.push({ icon: 'ticket', text: d.cabin });
  } else if (s.kind === 'Гостиница') {
    out.push({ icon: 'calendar', text: d.checkIn && d.checkOut ? d.checkIn + ' – ' + d.checkOut : s.date });
    if (d.nights) out.push({ icon: 'bed', text: d.nights + ' ' + plural(Number(d.nights), ['ночь', 'ночи', 'ночей']) });
    out.push({ icon: 'coffee', text: d.board });
  } else if (s.kind === 'Трансфер') {
    out.push({ icon: 'calendar', text: d.date || s.date });
    out.push({ icon: 'clock', text: d.time });
  } else {
    out.push({ icon: 'calendar', text: s.date });
    out.push({ icon: 'briefcase', text: s.supplier });
  }
  return out.filter((f) => f.text);
}

function serviceParticipants(s, participants = []) {
  const ids = (s.participantIds || []).map(String);
  if (ids.length) {
    const byId = participants.filter((p) => ids.includes(String(p.serverId || p.id)));
    if (byId.length) return byId;
  }
  const names = (s.passengers || []).map((p) => (typeof p === 'string' ? p : p && p.name)).filter(Boolean);
  if (names.length) {
    const byName = participants.filter((p) => names.includes(p.name));
    if (byName.length) return byName;
    return names.map((name) => ({ name }));
  }
  return participants;
}

function serviceDocuments(s, documents = []) {
  const id = String(s.serverId || s.id || '');
  return documents.filter((d) => id && String(d.service) === id);
}

function ticketForParticipant(docs, participant) {
  const personId = participant && participant.person ? String(participant.person) : null;
  if (!personId) return null;
  return docs.find((d) => d.kind === 'ticket' && String(d.person) === personId) || null;
}

function participantKey(participant) {
  return String(participant && (participant.serverId || participant.id || participant.person || participant.name) || '');
}

function serviceMatchesParticipant(service, participant, participants = []) {
  if (!participant) return true;
  const target = participantKey(participant);
  return serviceParticipants(service, participants).some((item) => participantKey(item) === target || item.name === participant.name);
}

function LiveServiceCardHistoryDrawer({ orderId, serviceId, title, onClose }) {
  const [state, setState] = useState({ loading: true, cards: [], error: '' });
  useEffect(() => {
    const controller = new AbortController();
    serviceCardsApi.list({ order: orderId, service: serviceId }, controller.signal)
      .then((payload) => setState({ loading: false, cards: resultsOf(payload), error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ loading: false, cards: [], error: error.message || 'Не удалось загрузить историю' });
      });
    return () => controller.abort();
  }, [orderId, serviceId]);
  return (
    <Drawer open onClose={onClose} title="История отправки услуги" sub={title}
      footer={<Button variant="secondary" onClick={onClose}>Закрыть</Button>}>
      {state.loading ? <AsyncBlock state="loading" skeletonRows={4} /> : state.error ? (
        <EmptyState icon="alertCircle" title="История недоступна" sub={state.error} />
      ) : state.cards.length === 0 ? (
        <EmptyState icon="clock" title="Карточка ещё не отправлялась" sub="После реальной отправки здесь появятся версия, каналы доставки и ответ клиента." />
      ) : state.cards.map((card) => (
        <div className="card card-pad" key={card.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ fontSize: 14 }}>Версия {card.card_version}</b>
            <Pill tone={['chosen', 'viewed', 'delivered'].includes(card.status) ? 'green' : card.status === 'declined' ? 'red' : 'blue'}>{card.status}</Pill>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{card.created_at ? new Date(card.created_at).toLocaleString('ru-RU') : ''}</span>
          </div>
          {(card.deliveries || []).map((delivery) => (
            <div className="kv-row" key={delivery.id}><span className="k">{delivery.channel}</span><span className="v">{delivery.state}{delivery.recipient ? ' · ' + delivery.recipient : ''}</span></div>
          ))}
          {(card.responses || []).map((response) => (
            <div className="kv-row" key={response.id}><span className="k">Ответ клиента</span><span className="v">{response.action}{response.comment ? ' · ' + response.comment : ''}</span></div>
          ))}
        </div>
      ))}
    </Drawer>
  );
}


function ServiceBlock({ s, participants, documents, orderNo, open, onToggle, onCancel, onExchange, onOpenChat,
  onOpenPassenger, onAddPassengerDoc, onUploadDocument, onOpenDocument, onDeleteService, selectable, selected, onSelect,
  focusedParticipant, orderId, onSendServiceCard }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const kind = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: '#2566ff' };
  const pax = serviceParticipants(s, participants);
  const docs = serviceDocuments(s, documents);
  const facts = serviceFacts(s);
  const head = serviceHeadline(s);
  const supplierLine = serviceSupplierLine(s);
  const airline = s.kind === 'Авиа' ? airlineCodeOf(s) : null;
  const total = svcCalc(s).total;
  const focusedTicket = focusedParticipant ? ticketForParticipant(docs, focusedParticipant) : null;
  const cardCurrency = s.currency || s.svcOffer?.currency || 'RUB';
  const cardItem = s.svcOffer
    ? { ...s.svcOffer, title: s.title, sub: s.sub, kind: s.kind, status: s.status, date: s.date, order: orderNo, calc: s.calc, currency: cardCurrency }
    : { ...s, order: orderNo, currency: cardCurrency };

  const pickFile = () => fileRef.current && fileRef.current.click();
  const takeFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try { await onUploadDocument(s, file); } finally { setUploading(false); }
  };

  return (
    <div className={'osrv' + (open ? ' open' : '')}>
      <div className="osrv-head" role="button" tabIndex={0} onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}>
        {selectable && (
          <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Checkbox on={!!selected} onChange={onSelect} />
          </span>
        )}
        <span className="osrv-ic" style={{ background: svcTint(kind.color), color: kind.color }}><Icon name={kind.icon} /></span>
        <span className="osrv-kind">{s.kind}</span>
        <Pill tone={SERVICE_STATUS[s.status] || 'gray'}>{s.status}</Pill>
        <span className="osrv-count"><Icon name="users" />{pax.length}</span>
        <span className="osrv-count"><Icon name="docs" />{docs.length}</span>
        <span style={{ flex: 1 }} />
        <span className="osrv-sum">{svcExactMoney(total, s.currency)}</span>
        <span onClick={(event) => event.stopPropagation()} className="osrv-head-actions">
          <button type="button" className="btn btn-ghost btn-icon btn-sm" title={open ? 'Свернуть услугу' : 'Показать детали услуги'} onClick={onToggle}><Icon name={open ? 'chevUp' : 'eye'} /></button>
          <ActionMenu trigger={<button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={'Действия: ' + s.title}><Icon name="more" /></button>}
            items={[
              { icon: 'eye', label: open ? 'Свернуть детали' : 'Показать детали', onClick: onToggle },
              { icon: 'send', label: 'Отправить клиенту', onClick: () => setSendOpen(true) },
              { icon: 'clock', label: 'История услуги', onClick: () => setHistOpen(true) },
              { icon: 'docs', label: 'Добавить файл', onClick: pickFile },
              { icon: 'chat', label: 'Обсудить в чате', onClick: onOpenChat },
              { sep: true },
              { icon: 'swap', label: 'Запросить обмен', onClick: () => onExchange(s) },
              { icon: 'refund', label: 'Отменить услугу', danger: true, onClick: () => onCancel(s) },
              { icon: 'trash', label: 'Удалить услугу', danger: true, onClick: () => onDeleteService(s) },
            ]} />
        </span>
        <Icon name={open ? 'chevUp' : 'chevDown'} className="osrv-chev" />
      </div>

      <div className="osrv-body">
        <button type="button" className="osrv-title" onClick={onToggle}>
          {head.map((part, i) => (
            <React.Fragment key={part + i}>
              {i > 0 && <Icon name="arrowRight" />}
              <span>{part}</span>
            </React.Fragment>
          ))}
        </button>

        {supplierLine && (
          <div className="osrv-line">
            {airline ? <AirlineLogo code={airline} size="sm" /> : (
              <span className="osrv-dot" style={{ background: svcTint(kind.color), color: kind.color }}><Icon name={kind.icon} /></span>
            )}
            <span>{supplierLine}</span>
          </div>
        )}

        {facts.length > 0 && (
          <div className="osrv-facts">
            {facts.map((f, i) => (
              <span className="osrv-fact" key={f.icon + i}><Icon name={f.icon} />{f.text}</span>
            ))}
          </div>
        )}

        {focusedParticipant && (
          <div className="osrv-focus-pax">
            <Avatar name={focusedParticipant.name} size={28} />
            <span className="nm">{focusedParticipant.name}</span>
            <span className="dc">{focusedParticipant.docNo || focusedParticipant.doc || 'Документ не указан'}</span>
            {focusedTicket
              ? <button type="button" className="osrv-tick" onClick={() => onOpenDocument(focusedTicket)}><Icon name="ticket" />{focusedTicket.document_number || focusedTicket.title || 'Открыть билет'}</button>
              : <span className="osrv-no-ticket"><Icon name="alertCircle" />Билет не выписан</span>}
            <ActionMenu trigger={<button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={'Действия пассажира: ' + focusedParticipant.name}><Icon name="more" /></button>}
              items={[
                { icon: 'idcard', label: 'Карточка пассажира', onClick: () => onOpenPassenger(focusedParticipant) },
                { icon: 'docs', label: 'Добавить документ', onClick: () => onAddPassengerDoc(focusedParticipant) },
                ...(focusedTicket ? [{ icon: 'download', label: 'Открыть билет', onClick: () => onOpenDocument(focusedTicket) }] : []),
              ]} />
          </div>
        )}

        {open && (
          <>
            <div className="osrv-sec">
              <div className="osrv-sec-t">Пассажиры ({pax.length})</div>
              {pax.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '6px 0' }}>Пассажиры к услуге не привязаны</div>}
              {pax.map((p, i) => {
                const ticket = ticketForParticipant(docs, p);
                return (
                  <div className="osrv-pax" key={(p.serverId || p.id || p.name) + '-' + i}>
                    <Avatar name={p.name} size={34} />
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <div className="nm">{p.name}{p.lead && <span className="pill pill-blue" style={{ marginLeft: 6, height: 20, padding: '0 8px', fontSize: 12 }}>Лид</span>}</div>
                    </div>
                    <span className="dc">{p.docType ? p.docType + ': ' : 'Документ: '}{p.docNo || p.doc || '—'}</span>
                    {ticket
                      ? <button type="button" className="osrv-tick" onClick={() => onOpenDocument(ticket)}><Icon name="ticket" />Билет {ticket.document_number || ticket.title}</button>
                      : <span style={{ fontSize: 13, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>Билет не выписан</span>}
                    <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                      items={[
                        { icon: 'idcard', label: 'Документы пассажира', onClick: () => onOpenPassenger(p) },
                        { icon: 'docs', label: 'Добавить документ', onClick: () => onAddPassengerDoc(p) },
                        ...(ticket ? [{ icon: 'download', label: 'Открыть билет', onClick: () => onOpenDocument(ticket) }] : []),
                      ]} />
                  </div>
                );
              })}
            </div>

            <div className="osrv-sec">
              <div className="osrv-sec-t">Документы ({docs.length})</div>
              <div className="osrv-docs">
                {docs.map((d) => {
                  const legacy = toLegacyDocument(d);
                  return (
                    <button type="button" className="osrv-doc" key={d.id} onClick={() => onOpenDocument(d)}>
                      <span className="ic"><Icon name="docs" /></span>
                      <span>
                        <span className="nm" style={{ display: 'block' }}>{legacy.name}</span>
                        <span className="mt" style={{ display: 'block' }}>{legacy.type}{legacy.date ? ' · ' + legacy.date : ''}</span>
                      </span>
                    </button>
                  );
                })}
                <button type="button" className="osrv-adddoc" onClick={pickFile} disabled={uploading}>
                  <Icon name={uploading ? 'loader' : 'plus'} />{uploading ? 'Загрузка…' : 'Добавить файл'}
                </button>
                <input ref={fileRef} type="file" hidden onChange={takeFile} />
              </div>
            </div>

            <div className="osrv-actions">
              <Button variant="secondary" icon="refund" onClick={() => onCancel(s)}>Отменить</Button>
              <Button icon="swap" onClick={() => onExchange(s)}>Запросить обмен</Button>
              <span className="sep" />
              <span style={{ flex: 1 }} />
              <button className="btn btn-ghost btn-icon" title="История карточки услуги" onClick={() => setHistOpen(true)}><Icon name="clock" /></button>
              <button className="btn btn-ghost btn-icon" title="Отправить карточку клиенту" onClick={() => setSendOpen(true)}><Icon name="send" /></button>
              <button className="btn btn-ghost btn-icon" title="Обсудить в чате" onClick={onOpenChat}><Icon name="chat" /></button>
              <ActionMenu trigger={<button className="btn btn-ghost btn-icon"><Icon name="more" /></button>}
                items={[
                  { icon: 'eye', label: open ? 'Свернуть детали' : 'Показать детали', onClick: onToggle },
                  { icon: 'docs', label: 'Добавить файл', onClick: pickFile },
                  { sep: true },
                  { icon: 'trash', label: 'Удалить услугу', danger: true, onClick: () => onDeleteService(s) },
                ]} />
            </div>
          </>
        )}
      </div>

      {sendOpen && <ServiceCardSendPanel item={cardItem} kind={s.kind} participants={pax} orderNo={orderNo}
        currency={s.currency} serviceId={s.id} onSent={async (channels, draft) => {
          await onSendServiceCard(s, channels, draft);
          toast('Карточка услуги отправлена клиенту по каналу «' + channels + '»', 'ok');
          return { persisted: true };
        }} onClose={() => setSendOpen(false)} />}
      {histOpen && <LiveServiceCardHistoryDrawer orderId={orderId} serviceId={s.serverId || s.id} title={s.title} onClose={() => setHistOpen(false)} />}
    </div>
  );
}


function OrderServicesBoard({ services, participants, documents, orderNo, expanded, onToggle, onAdd, selMode, sel, onSel, renderExtra, ...handlers }) {
  const [query, setQuery] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [kind, setKind] = useState('');
  const focusedParticipant = participants.find((participant) => participantKey(participant) === participantId) || null;
  const needle = query.trim().toLocaleLowerCase('ru');
  const visibleServices = services.filter((service) => {
    if (kind && service.kind !== kind) return false;
    if (!serviceMatchesParticipant(service, focusedParticipant, participants)) return false;
    if (!needle) return true;
    const docs = serviceDocuments(service, documents);
    const pax = serviceParticipants(service, participants);
    const haystack = [
      service.kind, service.title, service.sub, service.supplier, service.status, service.date,
      ...pax.flatMap((person) => [person.name, person.docNo, person.doc]),
      ...docs.flatMap((document) => [document.title, document.document_number, document.pnr]),
    ].filter(Boolean).join(' ').toLocaleLowerCase('ru');
    return haystack.includes(needle);
  });
  const serviceKinds = [...new Set(services.map((service) => service.kind).filter(Boolean))];
  const resetFilters = () => { setQuery(''); setParticipantId(''); setKind(''); };
  return (
    <div className="fade-in">
      <div className="osrv-boardhead">
        <div>
          <h3>Услуги в заказе</h3>
          <div className="sub">Найдите пассажира, билет, PNR или услугу без длинной прокрутки</div>
        </div>
        <Button icon="plus" onClick={onAdd}>Добавить услугу</Button>
      </div>

      <div className="osrv-toolbar" aria-label="Поиск и фильтры услуг">
        <SearchBox value={query} onChange={setQuery} placeholder="Пассажир, билет, PNR, маршрут…" />
        <Select aria-label="Пассажир" value={participantId} onChange={(event) => setParticipantId(event.target.value)}
          options={[{ value: '', label: `Все пассажиры · ${participants.length}` }, ...participants.map((participant) => ({ value: participantKey(participant), label: participant.name }))]} />
        <Select aria-label="Тип услуги" value={kind} onChange={(event) => setKind(event.target.value)}
          options={[{ value: '', label: `Все услуги · ${services.length}` }, ...serviceKinds.map((value) => ({ value, label: value }))]} />
        {(query || participantId || kind) && <button type="button" className="osrv-reset" onClick={resetFilters}><Icon name="x" />Сбросить</button>}
        <span className="osrv-found">Показано {visibleServices.length} из {services.length}</span>
      </div>

      {focusedParticipant && (
        <div className="osrv-focus-summary">
          <Avatar name={focusedParticipant.name} size={34} />
          <span><b>{focusedParticipant.name}</b><small>{visibleServices.length} {plural(visibleServices.length, ['услуга', 'услуги', 'услуг'])} · билет открывается прямо из строки услуги</small></span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handlers.onOpenPassenger(focusedParticipant)}>Карточка пассажира</button>
        </div>
      )}

      {services.length === 0 ? (
        <EmptyState icon="briefcase" title="Услуги не добавлены" sub="Добавьте авиабилеты, отели, трансферы и другие услуги в заказ" />
      ) : visibleServices.length === 0 ? (
        <EmptyState icon="search" title="Ничего не найдено" sub="Измените пассажира, тип услуги или поисковый запрос" action={<Button variant="secondary" onClick={resetFilters}>Сбросить фильтры</Button>} />
      ) : visibleServices.map((s) => (
        <div key={s.id}>
          <ServiceBlock s={s} participants={participants} documents={documents} orderNo={orderNo}
            open={expanded.has(s.id)} onToggle={() => onToggle(s.id)}
            selectable={selMode} selected={sel.has(s.id)} onSelect={() => onSel(s.id)}
            focusedParticipant={focusedParticipant}
            {...handlers} />
          {renderExtra && renderExtra(s)}
        </div>
      ))}

      <button type="button" className="osrv-add" onClick={onAdd}><Icon name="plus" />Добавить ещё услугу в заказ</button>
    </div>
  );
}


function OrderChangeCase({ orderNo, orderId, services, participants }) {
  const toast = useToast();
  const [cs, setCs] = useState(() => getChangeCase(orderNo));
  const [trigger, setTrigger] = useState(CASE_TRIGGERS[0]);
  const [letterOpen, setLetterOpen] = useState(false);
  const [openLog, setOpenLog] = useState(null);
  const [showHist, setShowHist] = useState(false);
  const [picker, setPicker] = useState(null);

  const flight = (services || []).find((s) => normKind(s.kind) === 'Авиа');
  const triggerTitle = flight ? (flight.title || flight.main) : 'Рейс заказа';
  const commit = (next) => { ORDER_CHANGE_CASES[orderNo] = next; setCs({ ...next }); };
  const logSvc = (base, i, text, patch) => {
    const t = caseNow();
    const svcs = base.services.map((s, idx) => idx === i ? { ...s, ...patch, log: [...s.log, { t, text }] } : s);
    return { ...base, services: svcs, history: [...base.history, { t, text: svcs[i].kind + ' · ' + text }] };
  };

  const openCase = async () => {
    const c = createChangeCase(orderNo, trigger, triggerTitle, 'Авиа');
    try {
      await workspaceActionsApi.execute('order.change_case.create', { resourceType: 'order', resourceId: String(orderId || orderNo), payload: c });
      setCs({ ...c }); toast('Кейс изменения создан и закреплён за заказом', 'ok');
    } catch (error) { delete ORDER_CHANGE_CASES[orderNo]; toast(error.message || 'Не удалось создать кейс изменения', 'err'); }
  };
  const checkDates = async (i) => {
    try {
      await workspaceActionsApi.execute('order.change_case.date_check.request', { resourceType: 'order', resourceId: String(orderId || orderNo), payload: { service: cs.services[i], trigger } });
      commit(logSvc(cs, i, 'Создана ручная задача сверки новых дат', { status: 'checking' }));
      toast('Задача сверки дат создана', 'ok');
    } catch (error) { toast(error.message || 'Не удалось создать задачу сверки', 'err'); }
  };
  const sendRequest = async (i) => {
    try {
      await workspaceActionsApi.execute('order.change_case.supplier_request', { resourceType: 'order', resourceId: String(orderId || orderNo), payload: { service: cs.services[i], trigger } });
      commit(logSvc(cs, i, 'Создан ручной запрос поставщику', { status: 'requested' }));
      toast('Запрос поставщику сохранён как backend-задача', 'ok');
    } catch (error) { toast(error.message || 'Не удалось создать запрос поставщику', 'err'); }
  };
  const setSvcStatus = (i, status, text) => commit(logSvc(cs, i, text, { status }));



  const openPicker = (i) => {
    const cur = getChangeCase(orderNo);
    const existing = cur.services[i].alts || [];
    setPicker({ i, opts: existing.slice(), sel: new Set(existing.map((a) => a.id)) });
    setOpenLog(null);
  };

  const pickerAuto = () => setPicker((p) => {
    if (!p) return p;
    const cur = getChangeCase(orderNo);
    const auto = smartAlternatives({ title: cur.services[p.i].title }, cur.services[p.i].kind);
    const opts = p.opts.slice(); const sel = new Set(p.sel);
    auto.forEach((a) => { if (!opts.some((o) => o.id === a.id)) opts.push(a); sel.add(a.id); });
    return { ...p, opts, sel };
  });
  const pickerToggle = (id) => setPicker((p) => { const sel = new Set(p.sel); sel.has(id) ? sel.delete(id) : sel.add(id); return { ...p, sel }; });
  const pickerAddManual = (v) => setPicker((p) => {
    const alt = { id: 'man-' + Math.random().toString(36).slice(2, 7), manual: true, ...v };
    const sel = new Set(p.sel); sel.add(alt.id);
    return { ...p, opts: [...p.opts, alt], sel };
  });
  const pickerRemoveManual = (id) => setPicker((p) => { const sel = new Set(p.sel); sel.delete(id); return { ...p, opts: p.opts.filter((o) => o.id !== id), sel }; });
  const confirmPicker = async () => {
    const p = picker; if (!p) return;
    const chosen = p.opts.filter((o) => p.sel.has(o.id));
    if (!chosen.length) { toast('Выберите вариант из авто-подбора или добавьте свой вручную', 'warn'); return; }
    const cur = getChangeCase(orderNo);
    const manual = chosen.some((c) => c.manual);
    const head = chosen.length > 1 ? 'Подобрано альтернатив: ' + chosen.length : 'Подобрана альтернатива: ' + chosen[0].title;
    try {
      await workspaceActionsApi.execute('order.change_case.alternative.fix', { resourceType: 'order', resourceId: String(orderId || orderNo), payload: { service: cur.services[p.i], alternatives: chosen } });
      commit(logSvc(cur, p.i, head + (manual ? ' · ручная выборка оператором' : ''), { status: 'resolved', alts: chosen }));
      setPicker(null);
      toast('Альтернатива зафиксирована в кейсе' + (manual ? ' (включая ручной выбор)' : ''), 'ok');
    } catch (error) { toast(error.message || 'Не удалось зафиксировать альтернативу', 'err'); }
  };
  const onLetterSent = (channels) => {
    const cur = getChangeCase(orderNo); if (!cur) return;
    const v = cur.letters.length + 1; const t = caseNow();
    commit({ ...cur, letters: [...cur.letters, { v, sentAt: t, channels }], history: [...cur.history, { t, text: 'Письмо клиенту отправлено (v' + v + ') · ' + channels }] });
  };


  if (!cs) {
    return (
      <div className="card card-pad" style={{ border: '1px dashed var(--amber)', background: 'var(--surface-2)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="alertCircle" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Изменение по рейсу?</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Зарегистрируйте кейс — система зафиксирует затронутую цепочку и проведёт по каждой услуге сверку/запрос.</div>
          </div>
          <Select options={CASE_TRIGGERS} value={trigger} onChange={(e) => setTrigger(e.target.value)} style={{ width: 'auto', minWidth: 190 }} />
          <Button icon="refund" onClick={openCase}>Зарегистрировать изменение</Button>
        </div>
      </div>
    );
  }

  const prog = caseProgress(cs);
  const triggerItem = flight || { title: cs.triggerTitle, main: cs.triggerTitle, kind: 'Авиа', currency: 'USD', id: 'trig' };
  return (
    <div className="card card-pad" style={{ border: '1px solid var(--amber)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <Icon name="refund" style={{ width: 18, height: 18, color: 'var(--amber)' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Кейс изменения {cs.id}</span>
        <Pill tone="amber">{cs.trigger}</Pill>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, color: prog.pending ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
          {prog.pending ? 'В работе: ' + prog.done + '/' + prog.total + ' услуг обработано' : 'Все услуги обработаны (' + prog.total + ')'}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{cs.triggerTitle} · создан {cs.created} · закреплён за заказом № {orderNo}</div>


      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cs.services.map((s, i) => {
          const st = CASE_SVC_STATUS[s.status] || CASE_SVC_STATUS.idle;
          const logOpen = openLog === i;
          return (
            <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '11px 13px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="oc-svc-ic" style={{ background: (SERVICE_KIND[s.kind] || {}).color || 'var(--blue)', width: 34, height: 34 }}><Icon name={(SERVICE_KIND[s.kind] || {}).icon || 'briefcase'} /></span>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{s.kind}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.title}</div>
                </div>
                <Pill tone={s.channel === 'api' ? 'blue' : 'gray'}><Icon name={s.channel === 'api' ? 'api' : 'contacts'} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {s.channel === 'api' ? 'API' : 'Локальный'}</Pill>
                <Pill tone={st.tone}>{st.label}</Pill>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
                {s.channel === 'api' && (s.status === 'idle' || s.status === 'checking') && <Button size="sm" variant="secondary" icon="zap" disabled={s.status === 'checking'} onClick={() => checkDates(i)}>{s.status === 'checking' ? 'Сверка…' : 'Сверить новые даты'}</Button>}
                {s.channel === 'api' && s.status === 'need_alt' && <Button size="sm" icon="refund" onClick={() => openPicker(i)}>Подобрать альтернативу</Button>}
                {s.channel === 'local' && s.status === 'idle' && <Button size="sm" variant="secondary" icon="send" onClick={() => sendRequest(i)}>Отправить запрос перевозчику</Button>}
                {s.channel === 'local' && s.status === 'requested' && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Запрос отправлен, ожидаем ответ поставщика…</span>}
                {s.channel === 'local' && s.status === 'awaiting' && <><Button size="sm" variant="secondary" icon="check" onClick={() => setSvcStatus(i, 'confirmed', 'Поставщик подтвердил новые условия')}>Подтверждено</Button><Button size="sm" variant="secondary" icon="x" onClick={() => setSvcStatus(i, 'declined', 'Поставщик отклонил — нужна альтернатива')}>Отклонено</Button></>}
                {s.channel === 'local' && s.status === 'declined' && <Button size="sm" icon="refund" onClick={() => openPicker(i)}>Подобрать альтернативу</Button>}
                {s.status === 'resolved' && picker?.i !== i && <Button size="sm" variant="secondary" icon="edit" onClick={() => openPicker(i)}>Скорректировать подбор</Button>}
                {st.done && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="checkCircle" style={{ width: 14, height: 14 }} />Готово</span>}
                <div style={{ flex: 1 }} />
                <button type="button" onClick={() => setOpenLog(logOpen ? null : i)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Лог услуги<Icon name={logOpen ? 'chevUp' : 'chevDown'} style={{ width: 13, height: 13 }} /></button>
              </div>
              {s.alts && s.alts.length > 0 && picker?.i !== i && (
                <div style={{ marginTop: 8, display: 'grid', gap: 5 }}>
                  {s.alts.map((a) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '6px 9px', borderRadius: 8, background: 'var(--blue-soft)' }}>
                      <Icon name="checkCircle" style={{ width: 13, height: 13, color: 'var(--blue)' }} />
                      <span style={{ color: 'var(--ink)' }}>{a.title}</span>
                      {a.manual && <Pill tone="gray">вручную</Pill>}
                      <span style={{ flex: 1 }} />
                      <span style={{ color: 'var(--muted)' }}>{a.meta}</span>
                    </div>
                  ))}
                </div>
              )}

              {picker?.i === i && (
                <div style={{ marginTop: 10, border: '1px solid var(--line)', borderRadius: 10, padding: 12, background: 'var(--surface-2)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>Подбор альтернативы · {s.kind}</span>
                    <div style={{ flex: 1 }} />
                    <Button size="sm" variant="secondary" icon="zap" onClick={pickerAuto}>{picker.opts.some((o) => !o.manual) ? 'Обновить авто-подбор' : 'Подобрать автоматически'}</Button>
                  </div>
                  {picker.opts.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Нажмите «Подобрать автоматически» — система предложит близкие варианты; либо добавьте конкретный вариант вручную ниже.</div>}
                  {picker.opts.map((o) => {
                    const on = picker.sel.has(o.id);
                    return (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8, border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), background: on ? 'var(--blue-soft)' : '#fff' }}>
                        <Checkbox on={on} onChange={() => pickerToggle(o.id)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{o.title}{o.manual && <span style={{ marginLeft: 6 }}><Pill tone="gray">вручную</Pill></span>}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{o.meta}</div>
                        </div>
                        {o.delta && o.delta !== '=' && <span style={{ fontSize: 12, fontWeight: 600, color: /^[−-]/.test(o.delta) ? 'var(--green)' : 'var(--amber)' }}>{o.delta}</span>}
                        {o.manual && <button type="button" onClick={() => pickerRemoveManual(o.id)} title="Удалить" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 4 }}><Icon name="x" style={{ width: 14, height: 14 }} /></button>}
                      </div>
                    );
                  })}
                  <ManualAltForm compact onAdd={pickerAddManual} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>Выбрано: {picker.sel.size}</span>
                    <div style={{ flex: 1 }} />
                    <Button size="sm" variant="secondary" onClick={() => setPicker(null)}>Отмена</Button>
                    <Button size="sm" icon="check" disabled={picker.sel.size === 0} onClick={confirmPicker}>Зафиксировать выбор</Button>
                  </div>
                </div>
              )}
              {logOpen && (
                <div style={{ marginTop: 8, borderTop: '1px dashed var(--line)', paddingTop: 8, display: 'grid', gap: 4 }}>
                  {s.log.map((l, li) => <div key={li} style={{ fontSize: 12, color: 'var(--muted)' }}><span style={{ color: 'var(--muted-2)' }}>{l.t}</span> — {l.text}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>


      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <Button variant="secondary" icon="send" onClick={() => setLetterOpen(true)}>{cs.letters.length ? 'Открыть письмо · корректировать' : 'Письмо клиенту'}</Button>
        {cs.letters.length > 0 && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Отправлено версий: {cs.letters.length} · последняя {cs.letters[cs.letters.length - 1].sentAt} ({cs.letters[cs.letters.length - 1].channels})</span>}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setShowHist((v) => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>История кейса<Icon name={showHist ? 'chevUp' : 'chevDown'} style={{ width: 14, height: 14 }} /></button>
      </div>
      {showHist && (
        <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10, display: 'grid', gap: 5, maxHeight: 200, overflowY: 'auto' }}>
          {cs.history.slice().reverse().map((h, i) => <div key={i} style={{ fontSize: 12.5, color: 'var(--body)' }}><span style={{ color: 'var(--muted-2)', marginRight: 6 }}>{h.t}</span>{h.text}</div>)}
        </div>
      )}

      {letterOpen && <ServiceCardSendPanel item={triggerItem} kind="Авиа" participants={participants} orderNo={orderNo} currency={triggerItem.currency || 'USD'} serviceId={triggerItem.id} onSent={onLetterSent} onClose={() => setLetterOpen(false)} />}
    </div>
  );
}

function TabServices({ orderNo, services, participants, requestType, onOpenAvia, onOpenOther, onOpenPicker, onAssembleKP, onExportToChat }) {
  const [filter, setFilter] = useState(null);
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const isGroup = requestType === 'Групповая';
  const counts = {};
  services.forEach((s) => { counts[s.kind] = (counts[s.kind] || 0) + 1; });
  const shown = filter ? services.filter((s) => s.kind === filter) : services;
  const openItem = (s) => (s.kind === 'Авиа' ? onOpenAvia(s) : onOpenOther(s));
  const toggleSel = (id) => setSel((cur) => { const n = new Set(cur); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const assemble = () => { const chosen = services.filter((s) => sel.has(s.id)); onAssembleKP && onAssembleKP(chosen); setSelMode(false); setSel(new Set()); };

  const exportChat = () => { const chosen = services.filter((s) => sel.has(s.id)); onExportToChat && onExportToChat(chosen); setSelMode(false); setSel(new Set()); };

  return (
    <div className="fade-in">

      <OrderChangeCase orderNo={orderNo} services={services} participants={participants} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h3 className="card-title" style={{ fontSize: 18 }}>Добавленные услуги</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!selMode && <Button variant="secondary" icon="check" onClick={() => setSelMode(true)}>Выбрать услуги</Button>}
          {selMode && <Button variant="secondary" onClick={() => { setSelMode(false); setSel(new Set()); }}>Отмена</Button>}
          {selMode && <Button variant="secondary" icon="chat" disabled={sel.size === 0} onClick={exportChat}>Выгрузить в чат ({sel.size})</Button>}
          {selMode && <Button icon="template" disabled={sel.size === 0} onClick={assemble}>Собрать КП ({sel.size})</Button>}
          <Button icon="plus" onClick={onOpenPicker}>Добавить услугу</Button>
        </div>
      </div>
      {selMode && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="check" style={{ width: 16, height: 16 }} />Отметьте услуги — их можно свободно выгрузить в чат клиенту или объединить в коммерческое предложение.</div>}

      <div className="oc-svc-filters" style={{ marginBottom: 16 }}>
        {SVC_FILTER_CHIPS.filter((c) => !c.kind || counts[c.kind]).map((c) => (
          <button key={c.label} className={'oc-svc-chip' + (filter === c.kind ? ' active' : '')} onClick={() => setFilter(c.kind)}>
            {c.kind && <Icon name={(SERVICE_KIND[c.kind] || {}).icon || 'briefcase'} style={{ width: 14, height: 14 }} />}
            {c.label}
            <span className="cnt">{c.kind ? (counts[c.kind] || 0) : services.length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon="briefcase" title="Услуги не добавлены" sub="Добавьте авиабилеты, отели, трансферы и другие услуги в заказ" />
      ) : (
        <div className="card" style={{ padding: '4px 18px' }}>
          {shown.map((s) => (
            <ServiceListRow key={s.id} s={s} paxCount={participants.length} isGroup={isGroup} onOpen={openItem} orderNo={orderNo} participants={participants} selected={sel.has(s.id)} onSel={selMode ? () => toggleSel(s.id) : null} />
          ))}
        </div>
      )}
    </div>
  );
}








const ADD_SVC_CATS = [
  { kind: 'Авиа', label: 'Авиабилеты', icon: 'plane' },
  { kind: 'ЖД', label: 'ЖД билеты', icon: 'train', routeKey: 'rail' },
  { kind: 'Гостиница', label: 'Отели', icon: 'building', routeKey: 'hotels' },
  { kind: 'Трансфер', label: 'Трансферы', icon: 'car', routeKey: 'transfers' },
  { kind: 'Автобус', label: 'Автобус', icon: 'bus', routeKey: 'buses' },
  { kind: 'Аэроэкспресс', label: 'Аэроэкспресс', icon: 'zap', img: 'assets/Aeroexpress_logo.svg.png', routeKey: 'aero' },
  { kind: 'Бизнес-зал', label: 'Бизнес-залы', icon: 'lounge', routeKey: 'lounge' },
  { kind: 'Страховка', label: 'Страховка', icon: 'shield' },
  { kind: 'Доп. услуга', label: 'Доп. услуга', icon: 'briefcase' },
];

function fmtDur(mins) { return Math.floor(mins / 60) + 'ч ' + (mins % 60) + 'м'; }



function RadioFlightRow({ opt, selected, onSelect }) {
  const leg = opt.leg;
  return (
    <div className={'svcf-row sel-row' + (selected ? ' sel' : '')} onClick={onSelect}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="tm">{leg.dep}<div className="ap">{leg.from}</div></div>
      <div className="mid">
        <span className="d">{leg.dur}</span>
        <span className="ln" />
        <span className={'st ' + (leg.stops || technicalStopCount(leg) ? 'via' : 'direct')}>
          {leg.stops ? leg.stopText : technicalStopCount(leg) ? `Без пересадок · ${technicalStopLabel(technicalStopCount(leg))}` : 'Прямой'}
        </span>
      </div>
      <div className="tm">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="pr"><div className="v">{money(opt.price, 'USD')}</div><div className="c">{AIRLINES[opt.airline]?.name || opt.airline}</div></div>
      <Radio on={selected} onChange={onSelect} />
    </div>
  );
}








function aviaPriceBounds(offers = FLIGHT_OFFERS) { const t = offers.map((o) => o.fare + o.fee); return t.length ? { min: Math.floor(Math.min(...t)), max: Math.ceil(Math.max(...t)) } : { min: 0, max: 0 }; }
function AviaFilters({ flt, setFlt, bounds, offers = FLIGHT_OFFERS }) {
  const airlines = [...new Set(offers.map((o) => o.airline))];
  const suppliers = [...new Set(offers.map((o) => o.supplier))];
  const tg = (key, val) => setFlt((f) => ({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] }));
  const selCount = flt.stops.length + flt.air.length + flt.sup.length + (flt.bagOnly ? 1 : 0) + (flt.refundOnly ? 1 : 0) + (flt.flightNo && flt.flightNo.trim() ? 1 : 0) + ((flt.priceMax != null && flt.priceMax < bounds.max) ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={() => setFlt({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, priceMax: bounds.max, flightNo: '' })}>Очистить</button>
      </div>
      <SearchBox value={flt.flightNo || ''} onChange={(v) => setFlt((f) => ({ ...f, flightNo: v }))}
        placeholder="Номер рейса" style={{ minWidth: 0, width: '100%', height: 42, margin: '4px 0 6px' }} />
      <div className="hp-filter-block">
        <div className="hp-filter-title">Цена</div>
        <div className="hp-price-range">
          <span className="hp-pr-from">от {money(bounds.min, 'USD')}</span>
          <span className="hp-pr-to">{money(flt.priceMax == null ? bounds.max : flt.priceMax, 'USD')}</span>
        </div>
        <input type="range" className="hp-slider" min={bounds.min} max={bounds.max} step="1"
          value={flt.priceMax == null ? bounds.max : flt.priceMax}
          onChange={(e) => setFlt((f) => ({ ...f, priceMax: +e.target.value }))} />
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Пересадки</div>
        {[['0', 'Без пересадок'], ['1', '1 пересадка'], ['2plus', '2+ пересадки']].map(([v, l]) => (
          <label key={v} className="hp-check-row"><Checkbox on={flt.stops.includes(v)} onChange={() => tg('stops', v)} /><span className="hp-check-label">{l}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Авиакомпании</div>
        {airlines.map((a) => (
          <label key={a} className="hp-check-row"><Checkbox on={flt.air.includes(a)} onChange={() => tg('air', a)} /><span className="hp-check-label">{AIRLINES[a]?.name || a}</span><span className="hp-check-cnt">{offers.filter((o) => o.airline === a).length}</span></label>
        ))}
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Багаж и тариф</div>
        <label className="hp-check-row"><Checkbox on={flt.bagOnly} onChange={() => setFlt((f) => ({ ...f, bagOnly: !f.bagOnly }))} /><span className="hp-check-label">Только с багажом</span></label>
        <label className="hp-check-row"><Checkbox on={flt.refundOnly} onChange={() => setFlt((f) => ({ ...f, refundOnly: !f.refundOnly }))} /><span className="hp-check-label">Только возвратные</span></label>
      </div>
      <div className="hp-filter-block">
        <div className="hp-filter-title">Поставщики</div>
        {suppliers.map((s) => (
          <label key={s} className="hp-check-row"><Checkbox on={flt.sup.includes(s)} onChange={() => tg('sup', s)} /><span className="hp-check-label">{s}</span></label>
        ))}
      </div>
    </aside>
  );
}



function AviaCardRow({ opt, sel, onSelect }) {
  const leg = opt.leg;
  return (
    <div className={'ap-flight' + (sel ? ' sel' : '')} onClick={() => onSelect(opt)}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="ap-fl-time">{leg.dep}<div className="ap">{leg.from}</div></div>
      <div className="ap-fl-mid">
        <div className="d">{leg.dur}</div>
        <div className="line" />
        <div className={'st ' + (leg.stops || technicalStopCount(leg) ? 'via' : 'direct')}>
          {leg.stops ? leg.stopText.split('·')[0].trim() : technicalStopCount(leg) ? `Без пересадок · ${technicalStopLabel(technicalStopCount(leg))}` : 'Прямой'}
        </div>
      </div>
      <div className="ap-fl-time">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="ap-fl-pr"><div className="v">{money(opt.price, 'USD')}</div><div className="c">{AIRLINES[opt.airline]?.name || opt.airline}</div></div>
      <Radio on={sel} onChange={() => onSelect(opt)} />
    </div>
  );
}







function legSegments(leg) {
  if (leg.segs && leg.segs.length) return leg.segs;
  return [{ ...leg }];
}
function legFlightNos(leg) { return legSegments(leg).map((s) => s.flightNo).filter(Boolean).join(' · '); }

function connectionLabel(count) {
  if (count === 1) return '1 пересадка';
  if (count >= 2 && count <= 4) return `${count} пересадки`;
  return `${count} пересадок`;
}

function legRouteSummary(leg) {
  const connections = Math.max(0, legSegments(leg).length - 1);
  const technicalStops = technicalStopCount(leg);
  if (!connections && !technicalStops) return 'прямой';
  const parts = [];
  parts.push(connections ? connectionLabel(connections) : 'без пересадок');
  if (technicalStops) parts.push(technicalStopLabel(technicalStops));
  return parts.join(' · ');
}



function LegTimeline({ opt, title }) {
  const leg = opt.leg;
  const segs = legSegments(leg);
  const lays = leg.layovers || [];
  const air = AIRLINES[opt.airline] || { name: opt.airline };
  return (
    <div className="leg-tl">
      {title && <div className="leg-tl-head"><AirlineLogo code={opt.airline} size="sm" /><span>{title}</span><span className="leg-tl-total">{leg.dur} · {legRouteSummary(leg)}</span></div>}
      {segs.map((s, i) => (
        <React.Fragment key={`${s.flightNo || 'segment'}-${s.dep || i}`}>
          <div className="leg-seg">
            <div className="leg-seg-time"><div className="t">{s.dep}</div><div className="ap">{s.from}</div></div>
            <div className="leg-seg-mid">
              <div className="d">{s.dur}</div>
              <div className="line" />
              <div className="fn">{air.name} · рейс {s.flightNo}</div>
            </div>
            <div className="leg-seg-time"><div className="t">{s.arr}</div><div className="ap">{s.to}</div></div>
          </div>
          <TechnicalStopsDetails stops={technicalStopsOf(s)} />
          {i < segs.length - 1 && (
            <div className="leg-layover"><Icon name="clock" style={{ width: 14, height: 14 }} />Пересадка {(lays[i] && lays[i].dur) || ''} в {(lays[i] && lays[i].at) || s.to}</div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}



function FlightScaleBar({ leg }) {
  const segs = legSegments(leg);
  const lays = leg.layovers || [];
  const hasNonDirectRouting = segs.length > 1 || technicalStopCount(leg) > 0;
  return (
    <div className="fsb">
      <div className="fsb-track">
        {segs.map((s, i) => (
          <React.Fragment key={i}>
            <div className="fsb-seg"><span className="fsb-flno">{s.flightNo} · {s.dur}</span></div>
            {i < segs.length - 1 && (
              <div className="fsb-stop">
                <span className="fsb-lay">Пересадка {(lays[i] && lays[i].dur) || ''}</span>
                <span className="fsb-dot" />
                <span className="fsb-via">{(lays[i] && lays[i].at) || s.to}</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className={'fsb-bot ' + (hasNonDirectRouting ? 'via' : 'direct')}>{leg.dur} · {legRouteSummary(leg)}</div>
    </div>
  );
}



function SupplierTag({ name }) {
  return <div className="svc-supplier"><Icon name="api" style={{ width: 12, height: 12 }} />{name}</div>;
}

function AviaResultRow({ opt, onView, embedded }) {
  const leg = opt.leg;
  return (
    <div className={'ap-flight avia-result' + (embedded ? ' embedded' : '')} onClick={!embedded && onView ? onView : undefined}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="ap-fl-time">{leg.dep}<div className="ap">{leg.from}</div></div>
      <FlightScaleBar leg={leg} />
      <div className="ap-fl-time">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="ap-fl-pr">
        <div className="v">{money(opt.price, 'USD')}</div>
        <div className="c">{AIRLINES[opt.airline]?.name || opt.airline}</div>
        {opt.supplier && <SupplierTag name={opt.supplier} />}
      </div>
      {!embedded && <Button size="sm" variant="secondary" iconRight="chevRight" onClick={(e) => { e.stopPropagation(); onView(); }}>Тарифы</Button>}
    </div>
  );
}



function AviaPaxPanel({ params, setParams, participants = [], groups, onClose }) {
  const p = params;
  const pax = p.pax;
  const set = (patch) => setParams({ ...p, ...patch });
  const total = paxTotal(pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');

  const sections = (() => {
    if (groups && groups.length && participants.length) {
      const used = new Set();
      const secs = groups.map((g) => {
        const m = (g.members || []).filter((i) => i < participants.length && !used.has(i));
        m.forEach((i) => used.add(i));
        return { id: g.id, name: g.name, desc: g.desc, members: m };
      }).filter((s) => s.members.length);
      const rest = participants.map((_, i) => i).filter((i) => !used.has(i));
      if (rest.length) secs.push({ id: '__rest', name: 'Без подгруппы', members: rest });
      return secs;
    }
    return null;
  })();

  return (
    <StackPanel title="Пассажиры и класс" width="min(620px,95vw)" onClose={onClose}
      footer={<Button style={{ width: '100%' }} icon="check" onClick={onClose}>Готово · {total} {plural(total)}</Button>}>

      <PaxClassPicker pax={pax} setPax={(v) => set({ pax: v })} cabin={p.cabin} setCabin={(v) => set({ cabin: v })}
        options={p} setOptions={(patch) => set(patch)} />

      {sections && (
        <>
          <div className="avia-pax-subh" style={{ marginTop: 18 }}>Состав по подгруппам</div>
          {sections.map((sec) => (
            <div className="avia-subgroup" key={sec.id}>
              <div className="avia-subgroup-h">
                <span className="nm">{sec.name}</span><span className="cnt">{sec.members.length}</span>
                {sec.desc && <span className="ds">{sec.desc}</span>}
              </div>
              <div className="avia-subgroup-people">
                {sec.members.map((i) => (
                  <span key={i} className="avia-chip">{participants[i].name}{participants[i].role ? ' · ' + participants[i].role : ''}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </StackPanel>
  );
}




function FlightFarePanel({ route, paxCount, cabin, pax = [], onClose, onAdd, onPerPax }) {


  const [clsCode, setClsCode] = useState('Y');
  const [infoFare, setInfoFare] = useState(null);

  const [extras, setExtras] = useState({ seats: {}, baggage: {}, meal: {}, insurance: {}, special: {}, comfort: {} });
  const [extrasOpen, setExtrasOpen] = useState(false);
  const extrasCount = Object.values(extras.seats).filter(Boolean).length
    + Object.values(extras.baggage).filter((v) => v && v !== 'none').length
    + Object.values(extras.meal).filter((v) => v && v !== 'standard' && v !== 'none').length
    + Object.values(extras.insurance).filter((v) => v && v !== 'none').length
    + Object.keys(extras.comfort).filter((kk) => extras.comfort[kk]).length
    + Object.keys(extras.special).filter((kk) => extras.special[kk]).length;
  const extrasPax = pax && pax.length ? pax : [{ name: 'Пассажир 1', role: 'Взрослый' }];
  const tiers = fareTiersForClass(clsCode);
  const [fareId, setFareId] = useState((tiers.find((f) => f.recommended) || tiers[0]).id);
  const tier = tiers.find((f) => f.id === fareId) || (tiers.find((f) => f.recommended) || tiers[0]);
  const changeClass = (code) => {
    setClsCode(code);
    const t = fareTiersForClass(code);
    setFareId((t.find((f) => f.recommended) || t[0]).id);
  };
  const fareUsd = Math.round(tier.delta / RUB_PER_USD);
  const seats = Math.max(1, paxCount);
  const grand = (route.total + fareUsd) * seats;
  const legs = route.legs;
  const routeTitle = legs[0].leg.from + legs.map((l) => ' → ' + l.leg.to).join('');
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');
  const add = () => onAdd({ ...route, cls: clsCode, cabin: fareCabinLabel(clsCode), fareName: tier.name, fareDeltaUsd: fareUsd });
  return (
    <>
    <StackPanel title="Класс и тариф по рейсу" width="min(940px,95vw)" onClose={onClose}
      footer={<>
        <div className="ft-total" style={{ marginRight: 'auto' }}>Итого · {seats} {plural(seats)}<b style={{ fontSize: 18 }}>{money(grand, 'USD')}</b></div>
        {onPerPax && <Button variant="secondary" icon="users" onClick={() => onPerPax(route)}>Тарифы по пассажирам</Button>}
        <Button icon="check" onClick={add}>Добавить в заказ</Button>
      </>}>
      <div className="card card-pad" style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AirlineLogo code={legs[0].airline} size="sm" />
          <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{routeTitle}</div>
          <span className="pill pill-gray" style={{ marginLeft: 'auto' }}>{fareCabinLabel(clsCode)} · класс {clsCode}</span>
        </div>
        {legs.map((l, i) => <LegTimeline key={i} opt={l} title={legs.length > 1 ? (i === 0 ? 'Маршрут туда' : i === 1 ? 'Обратно' : 'Сегмент ' + (i + 1)) : null} />)}
      </div>


      <div className="ap-sc-title">1. Выберите класс бронирования</div>
      <div className="fare-class-grid">
        {AVIA_BOOKING_CLASSES.map((c) => (
          <div key={c.code} className={'fare-class-tile' + (clsCode === c.code ? ' sel' : '')} onClick={() => changeClass(c.code)}>
            {clsCode === c.code && <Icon name="check" className="ic-sel" />}
            <div className="code">{c.code}</div>
            <div className="cab">{c.cabin}</div>
            <div className="left">Осталось мест: {c.seatsLeft}</div>
          </div>
        ))}
      </div>


      <div className="ap-sc-title">2. Выберите тариф в классе {clsCode} ({fareCabinLabel(clsCode)}) — ознакомьтесь перед бронированием</div>
      <div className="fare-grid">
        {tiers.map((f) => {
          const u = Math.round(f.delta / RUB_PER_USD);
          const sel = tier.id === f.id;
          return (
            <div key={f.id} className={'fare-card' + (sel ? ' sel' : '')} onClick={() => setFareId(f.id)}>
              {f.recommended && <span className="fc-badge">Рекомендуем</span>}
              <div className="fc-name">{f.name}
                <button type="button" className="fc-info" title="О тарифе" onClick={(e) => { e.stopPropagation(); setInfoFare(f); }}><Icon name="alertCircle" style={{ width: 16, height: 16 }} /></button>
              </div>
              <div className="fc-price">{u ? '+ ' + money(u, 'USD') : 'без доплаты'}<small>{u ? ' / пассажир' : ''}</small></div>
              {f.features.map((ft, k) => (
                <div key={k} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>
              ))}
              {f.rules && (
                <div className="fare-rules">
                  <div className="fare-rules-h">Правила тарифа</div>
                  {f.rules.map((r, k) => (<div key={k} className="fare-rule"><span className="rk">{r.k}</span><span className={'rv ' + (r.tone || '')}>{r.v}</span></div>))}
                </div>
              )}
              {f.desc && (
                <button type="button" className="fare-info-btn" onClick={(e) => { e.stopPropagation(); setInfoFare(f); }}>
                  <Icon name="alertCircle" style={{ width: 14, height: 14 }} />О тарифе
                </button>
              )}
              <Button variant="secondary" size="sm" className="fare-pick-btn" icon={sel ? 'check' : undefined}
                onClick={(e) => { e.stopPropagation(); setFareId(f.id); }}>{sel ? 'Выбран' : 'Выбрать тариф'}</Button>
            </div>
          );
        })}
      </div>


      <div className="ap-sc-title" style={{ marginTop: 18 }}>3. Доп. услуги и места</div>
      <div className="ap-list-row ap-sum-row" style={{ cursor: 'pointer' }} onClick={() => setExtrasOpen(true)}>
        <span className="ic"><Icon name="briefcase" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t">Багаж, выбор места, питание, страховка</div>
          <div className="s">{extrasCount ? 'Выбрано доп. услуг: ' + extrasCount : 'Доп. услуги авиакомпании — по желанию'}</div>
        </div>
        <span className="pr">{extrasCount ? extrasCount + ' шт.' : 'Добавить'}</span>
        <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)', flex: '0 0 18px' }} />
      </div>
    </StackPanel>
    {infoFare && <FareInfoPanel fare={infoFare} onClose={() => setInfoFare(null)} onSelect={() => { setFareId(infoFare.id); setInfoFare(null); }} />}
    {extrasOpen && (
      <StackPanel title="Дополнительные услуги" width="min(1040px,96vw)" onClose={() => setExtrasOpen(false)}
        footer={<>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setExtrasOpen(false)}>Отмена</Button>
          <Button icon="check" style={{ flex: 2 }} onClick={() => setExtrasOpen(false)}>Применить{extrasCount ? ' · выбрано ' + extrasCount : ''}</Button>
        </>}>
        <ExtrasTabs pax={extrasPax} state={extras} set={setExtras} embedded />
      </StackPanel>
    )}
    </>
  );
}


function FareInfoPanel({ fare, onClose, onSelect }) {
  const u = Math.round((fare.delta || 0) / RUB_PER_USD);
  return (
    <StackPanel title={'Тариф · ' + fare.name} width="min(540px,92vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Закрыть</Button>
        <Button style={{ flex: 1 }} icon="check" onClick={onSelect}>Выбрать этот тариф</Button>
      </>}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>{u ? '+ ' + money(u, 'USD') : 'без доплаты'}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)' }}>{u ? ' / пассажир' : ''}</span></div>
      {fare.desc && <p style={{ color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 8px' }}>{fare.desc}</p>}
      <div className="ap-sc-title" style={{ marginTop: 14 }}>Что включено</div>
      {fare.features.map((ft, k) => (<div key={k} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>))}
      {fare.rules && <>
        <div className="ap-sc-title" style={{ marginTop: 16 }}>Правила тарифа</div>
        <div className="kv">{fare.rules.map((r, k) => (<div className="kv-row" key={k}><span className="k">{r.k}</span><span className={'v fare-rule-v ' + (r.tone || '')}>{r.v}</span></div>))}</div>
      </>}
    </StackPanel>
  );
}




function aviaDepMin(t) { const m = (t || '').match(/(\d{1,2}):(\d{2})/); return m ? (+m[1]) * 60 + (+m[2]) : 0; }
function AviaListTable({ rows }) {
  const { sort, onSort, apply } = useSort({ col: 'price', dir: 'asc' });
  const sorted = apply(rows, { dep: (r) => aviaDepMin(r.leg.dep), arr: (r) => aviaDepMin(r.leg.arr), dur: (r) => durMin(r.leg.dur), stops: (r) => r.leg.stops || 0, price: (r) => r.price });
  return (
    <div className="table-card avia-list" style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead><tr>
          <Th label="Вылет" col="dep" sort={sort} onSort={onSort} />
          <Th label="Прилёт" col="arr" sort={sort} onSort={onSort} />
          <th>Перевозчик</th>
          <th>Рейс</th>
          <Th label="В пути" col="dur" sort={sort} onSort={onSort} />
          <Th label="Пересадки" col="stops" sort={sort} onSort={onSort} />
          <th>Поставщик</th>
          <Th label="Стоимость" col="price" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} />
          <th></th>
        </tr></thead>
        <tbody>
          {sorted.map((r) => {
            const leg = r.leg; const air = AIRLINES[r.airline] || { name: r.airline };
            return (
              <tr key={r.id} style={{ cursor: 'pointer' }} onClick={r.view}>
                <td><span style={{ fontWeight: 700 }}>{leg.dep}</span> <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>{leg.from}</span></td>
                <td><span style={{ fontWeight: 700 }}>{leg.arr}</span> <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>{leg.to}</span>{r.roundtrip && <span style={{ color: 'var(--blue)', fontSize: 12 }}> · +обр</span>}</td>
                <td><span style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}><AirlineLogo code={r.airline} size="sm" />{air.name}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.flightNo || '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{leg.dur}</td>
                <td>{leg.stops
                  ? connectionLabel(leg.stops)
                  : technicalStopCount(leg)
                    ? <span style={{ color: 'var(--amber)' }}>Без пересадок · {technicalStopLabel(technicalStopCount(leg))}</span>
                    : <span style={{ color: 'var(--green)' }}>Прямой</span>}</td>
                <td style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'nowrap' }}>{r.supplier}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{money(r.price, 'USD')}</td>
                <td onClick={(e) => e.stopPropagation()}><Button size="sm" variant="secondary" iconRight="chevRight" onClick={r.view}>Тарифы</Button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AviaSearchPanel({ params, setParams, paxCount, participants = [], isGroup, onAdd, onAddPerPax }) {
  const toast = useToast();
  const p = params;
  const set = (patch) => setParams({ ...p, ...patch });
  const swap = () => set({ from: p.to, to: p.from });
  const [liveOffers, setLiveOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const runSearch = async () => {
    const requestedSeats = participants.length || paxTotal(p.pax);
    if (!p.from || !p.to || (p.trip !== 'mc' && !p.depDate)) {
      toast('Укажите маршрут и дату поездки', 'warn');
      return;
    }
    if (requestedSeats < 1) {
      toast('Добавьте пассажира в заказ или укажите количество пассажиров', 'warn');
      return;
    }
    setLoading(true);
    setLiveOffers([]);
    try {
      const found = await loadLiveFlightOffers(p);
      setLiveOffers(found);
      const nextBounds = aviaPriceBounds(found);
      setFlt((current) => ({ ...current, air: [], sup: [], priceMax: nextBounds.max }));
      toast(`Получено вариантов: ${found.length}`, 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось выполнить поиск перелётов', 'err');
    } finally {
      setLoading(false);
    }
  };
  const aviaBounds = aviaPriceBounds(liveOffers);
  const [flt, setFlt] = useState({ stops: [], air: [], sup: [], bagOnly: false, refundOnly: false, priceMax: aviaBounds.max, flightNo: '' });
  const [visible, setVisible] = useState(6);
  const [view, setView] = useState('cards');
  const [paxPanel, setPaxPanel] = useState(false);
  const [fareRoute, setFareRoute] = useState(null);
  const groups = null;
  const seats = participants.length || paxTotal(p.pax);
  const plural = (n) => n === 1 ? 'пассажир' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'пассажира' : 'пассажиров');


  const TRIPS = [['ow', 'В одну сторону'], ['rt', 'Туда-обратно'], ['mc', 'Сложный маршрут']];

  const flightNoMatch = (o, q) => { const n = q.replace(/\s+/g, '').toLowerCase(); return [o.out, o.back].some((l) => l && l.flightNo && l.flightNo.replace(/\s+/g, '').toLowerCase().includes(n)); };
  let pool = liveOffers.filter((o) => {
    const st = o.out.stops >= 2 ? '2plus' : String(o.out.stops || 0);
    if (flt.flightNo && flt.flightNo.trim() && !flightNoMatch(o, flt.flightNo)) return false;
    if (flt.stops.length && !flt.stops.includes(st)) return false;
    if (flt.air.length && !flt.air.includes(o.airline)) return false;
    if (flt.sup.length && !flt.sup.includes(o.supplier)) return false;
    if (flt.bagOnly && o.baggage === 'Без багажа') return false;
    if (flt.refundOnly && !o.refundable) return false;
    if (flt.priceMax != null && (o.fare + o.fee) > flt.priceMax) return false;
    return true;
  });
  pool = [...pool].sort((a, b) => (a.fare + a.fee) - (b.fare + b.fee));

  const outOpts = pool.map((o) => ({ key: o.id + '-o', backendOfferId: o._backendOfferId, airline: o.airline, leg: o.out, supplier: o.supplier, price: Math.round((o.fare + o.fee) * 0.6) }));
  const rtCombos = pool.filter((o) => o.back).map((o) => ({
    id: o.id,
    out: { key: o.id + '-o', airline: o.airline, leg: o.out, supplier: o.supplier, price: Math.round((o.fare + o.fee) * 0.6) },
    back: { key: o.id + '-b', airline: o.airline, leg: o.back, supplier: o.supplier, price: Math.round((o.fare + o.fee) * 0.4) },
  })).sort((a, b) => (a.out.price + a.back.price) - (b.out.price + b.back.price));
  const resultTrip = p.trip === 'rt' && pool.length > 0 && rtCombos.length === 0 ? 'ow' : p.trip;


  const MC_MAX = 6;
  const segs = (p.segments && p.segments.length >= 2) ? p.segments : [
    { from: p.from, to: p.to, date: p.depDate },
    { from: p.to, to: '', date: null },
  ];
  const setSegs = (next) => set({ segments: next });
  const updateSeg = (i, patch) => setSegs(segs.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addSeg = () => { if (segs.length < MC_MAX) setSegs([...segs, { from: segs[segs.length - 1].to || '', to: '', date: null }]); };
  const removeSeg = (i) => { if (segs.length > 2) setSegs(segs.filter((_, idx) => idx !== i)); };

  const mcLegs = outOpts.length ? segs.map((_, i) => outOpts[i % outOpts.length]) : [];
  const mcTotal = mcLegs.reduce((s, o) => s + o.price, 0);

  const openFare = (route) => setFareRoute(route);


  const listRows = resultTrip === 'rt'
    ? rtCombos.map((c) => ({ id: c.id, airline: c.out.airline, leg: c.out.leg, flightNo: c.out.leg.flightNo, supplier: c.out.supplier, price: c.out.price + c.back.price, roundtrip: true, view: () => openFare({ legs: [c.out, c.back], total: c.out.price + c.back.price }) }))
    : resultTrip === 'mc'
      ? (mcLegs.length ? [{ id: 'mc', airline: mcLegs[0].airline, leg: mcLegs[0].leg, flightNo: mcLegs[0].leg.flightNo, supplier: mcLegs[0].supplier, price: mcTotal, view: () => openFare({ legs: mcLegs, total: mcTotal }) }] : [])
      : outOpts.map((o) => ({ id: o.key, airline: o.airline, leg: o.leg, flightNo: o.leg.flightNo, supplier: o.supplier, price: o.price, view: () => openFare({ legs: [o], total: o.price }) }));

  const paxLabel = `${seats} ${plural(seats)} · ${p.cabin}`;
  const paxFieldNode = (
    <div className="av-field avia-pax-field" onClick={() => setPaxPanel(true)}>
      <span className="label">Пассажиры и класс</span>
      <div className="input" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name="users" style={{ width: 18, height: 18, color: 'var(--muted-2)', flexShrink: 0 }} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{paxLabel}</span>
        <Icon name="chevDown" style={{ width: 16, height: 16, color: 'var(--muted-2)' }} />
      </div>
    </div>
  );
  const foundCount = resultTrip === 'rt' ? rtCombos.length : resultTrip === 'mc' ? (mcLegs.length ? 1 : 0) : outOpts.length;

  return (
    <div>

      <div className="trip-toggle" style={{ marginBottom: 14 }}>
        {TRIPS.map(([k, l]) => (
          <button key={k} className={p.trip === k ? 'on' : ''} onClick={() => set({ trip: k })}>{l}</button>
        ))}
      </div>

      {p.trip === 'mc' ? (

        <div className="avia-mc-mask">
          <div className="avia-mc-head">
            <span className="l" style={{ flex: '1 1 0' }}>Откуда</span>
            <span style={{ flex: '0 0 40px' }} />
            <span className="l" style={{ flex: '1 1 0' }}>Куда</span>
            <span className="l" style={{ flex: '0 0 168px' }}>Дата вылета</span>
            <span style={{ flex: '0 0 34px' }} />
          </div>
          {segs.map((s, i) => (
            <div className="avia-mc-row" key={i}>
              <AirportField value={s.from} onChange={(v) => updateSeg(i, { from: v })} />
              <button className="av-swap" onClick={() => updateSeg(i, { from: s.to, to: s.from })} title="Поменять местами"><Icon name="swap" style={{ width: 18, height: 18 }} /></button>
              <AirportField value={s.to} onChange={(v) => updateSeg(i, { to: v })} />
              <div className="av-field avia-mc-date"><DateField value={s.date} onChange={(d) => updateSeg(i, { date: d })} placeholder="Дата" /></div>
              <button className="avia-mc-del" disabled={segs.length <= 2} title={segs.length <= 2 ? 'Минимум 2 сегмента' : 'Удалить сегмент'} onClick={() => removeSeg(i)}><Icon name="x" style={{ width: 16, height: 16 }} /></button>
            </div>
          ))}
          <div className="avia-mc-foot">
            <Button variant="secondary" icon="plus" disabled={segs.length >= MC_MAX} onClick={addSeg}>
              {segs.length >= MC_MAX ? 'Добавлено максимальное кол-во маршрутов' : 'Добавить маршрут'}
            </Button>
            <div style={{ flex: 1 }} />
            {paxFieldNode}
            <Button icon="search" className="avia-find-btn" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
          </div>
        </div>
      ) : (

        <div className="svcp-search-bar avia-search-bar">
          <AirportField label="Откуда" value={p.from} onChange={(v) => set({ from: v })} />
          <button className="av-swap" onClick={swap} title="Поменять местами"><Icon name="swap" style={{ width: 18, height: 18 }} /></button>
          <AirportField label="Куда" value={p.to} onChange={(v) => set({ to: v })} />
          {p.trip === 'rt' ? (
            <div className="av-field">

              <DateRangeField label="Даты поездки" startVal={p.depDate} endVal={p.retDate} rangeStartLabel="Только туда"
                placeholder="Туда — обратно"
                onChange={(s, e) => { if (e === null || e === undefined) set({ trip: 'ow', depDate: s, retDate: null }); else set({ depDate: s, retDate: e }); }} />
            </div>
          ) : (
            <div className="av-field">
              <DateField label="Дата вылета" value={p.depDate} onChange={(d) => set({ depDate: d })} placeholder="Выбрать" />
            </div>
          )}

          {paxFieldNode}
          <Button icon="search" className="avia-find-btn" style={{ height: 46, marginBottom: 0 }} onClick={runSearch}>Найти</Button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>{loading ? 'Поиск…' : `Найдено ${foundCount}`}</span>

        <div className="avia-view-toggle">
          <button className={view === 'cards' ? 'on' : ''} title="Карточки" onClick={() => setView('cards')}><Icon name="grid" style={{ width: 16, height: 16 }} />Карточки</button>
          <button className={view === 'list' ? 'on' : ''} title="Список" onClick={() => setView('list')}><Icon name="orders" style={{ width: 16, height: 16 }} />Список</button>
        </div>
        {view === 'cards' && <div style={{ minWidth: 190 }}><Select options={[{ value: 'price', label: 'Сортировка: Цена' }]} value="price" onChange={() => {}} /></div>}
      </div>

      <div className="hp-layout">
        <AviaFilters flt={flt} setFlt={setFlt} bounds={aviaBounds} offers={liveOffers} />
        <div style={{ minWidth: 0 }}>
          {loading && <div className="card card-pad"><div className="sk" style={{ height: 44, marginBottom: 12 }} /><div className="sk" style={{ height: 90 }} /></div>}
          {!loading && !pool.length && <EmptyState icon="plane" title="Варианты ещё не загружены" sub="Задайте маршрут и нажмите «Найти»" />}
          {!loading && pool.length > 0 && <>
          {view === 'list' ? (
            <div className="ap-route-section">
              <div className="ap-route-title">Рейсы списком — нажмите строку, чтобы открыть тарифы</div>
              <AviaListTable rows={listRows.slice(0, resultTrip === 'mc' ? listRows.length : visible)} />
              {resultTrip !== 'mc' && visible < listRows.length && (
                <button className="svcf-more" onClick={() => setVisible((v) => v + 10)}>
                  Показать ещё рейсы <Icon name="chevDown" style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>
          ) : (<>
          {resultTrip === 'ow' && (
            <div className="ap-route-section">
              <div className="ap-route-title">{p.trip === 'rt' ? 'Варианты первого сегмента от поставщиков' : 'Рейсы туда — нажмите рейс, чтобы открыть тарифы'}</div>
              {outOpts.slice(0, visible).map((o) => (
                <div key={o.key} className="ap-route-card">
                  <AviaResultRow opt={o} onView={() => openFare({ legs: [o], total: o.price })} />
                </div>
              ))}
            </div>
          )}

          {resultTrip === 'rt' && (
            <div className="ap-route-section">
              <div className="ap-route-title">Туда и обратно — нажмите вариант, чтобы открыть тарифы</div>
              {rtCombos.slice(0, visible).map((c) => {
                const total = c.out.price + c.back.price;
                const dur = fmtDur(durMin(c.out.leg.dur) + durMin(c.back.leg.dur));
                const savings = Math.round(total * 0.045);
                const view = () => openFare({ legs: [c.out, c.back], total });
                return (
                  <div key={c.id} className="ap-route-card avia-rt-card" onClick={view}>
                    <AviaResultRow opt={c.out} embedded />
                    <span className="ap-route-swap"><Icon name="swap" /></span>
                    <AviaResultRow opt={c.back} embedded />
                    <div className="ap-route-totals">
                      <div className="rt-block"><Icon name="route" /><div><div className="l">Общая продолжительность</div><div className="v">{dur}</div></div></div>
                      <div className="rt-price"><div className="l">Итого за маршрут</div><div className="v">{money(total, 'USD')}</div></div>
                      <span className="pill pill-green rt-badge"><Icon name="zap" />Выгоднее на {money(savings, 'USD')}</span>
                      <Button size="sm" iconRight="chevRight" onClick={(e) => { e.stopPropagation(); view(); }}>Тарифы</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {resultTrip === 'mc' && (
            <div className="ap-route-section">
              <div className="ap-route-title">Сложный маршрут — нажмите, чтобы открыть тарифы</div>
              <div className="ap-route-card chain">
                <div className="ap-route-chain">
                  {mcLegs.map((o, i) => (
                    <React.Fragment key={o.key}>
                      <div className="ap-route-chain-row">
                        <div className="ap-route-chain-num"><span>{i + 1}</span>{i < mcLegs.length - 1 && <i />}</div>
                        <div className="ap-route-chain-leg"><AviaResultRow opt={o} embedded /></div>
                      </div>
                      {i < mcLegs.length - 1 && <div style={{ marginLeft: 36 }}><span className="ap-route-chain-layover">Пересадка {fmtDur(60 + i * 40)}</span></div>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="ap-route-totals">
                  <div className="rt-block"><Icon name="route" /><div><div className="l">Итого за маршрут</div><div className="v">{money(mcTotal, 'USD')}</div></div></div>
                  <div style={{ flex: 1 }} />
                  <Button size="sm" iconRight="chevRight" onClick={() => openFare({ legs: mcLegs, total: mcTotal })}>Тарифы</Button>
                </div>
              </div>
            </div>
          )}

          {resultTrip !== 'mc' && visible < (resultTrip === 'rt' ? rtCombos.length : outOpts.length) && (
            <button className="svcf-more" onClick={() => setVisible((v) => v + 10)}>
              Показать ещё рейсы <Icon name="chevDown" style={{ width: 16, height: 16 }} />
            </button>
          )}
          </>)}
          </>}
        </div>
      </div>

      {paxPanel && <AviaPaxPanel params={p} setParams={setParams} participants={participants} groups={groups} onClose={() => setPaxPanel(false)} />}
      {fareRoute && (
        <FlightFarePanel route={fareRoute} paxCount={seats} cabin={p.cabin} pax={participants}
          onClose={() => setFareRoute(null)}
          onAdd={(r) => { setFareRoute(null); onAdd(r); }}
          onPerPax={onAddPerPax ? (r) => { setFareRoute(null); onAddPerPax(r); } : null} />
      )}
    </div>
  );
}

function QuickAddForm({ kind, onAdd }) {
  const toast = useToast();
  const k = SERVICE_KIND[kind] || { icon: 'briefcase', color: 'var(--blue)' };
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(null);
  const [supplier, setSupplier] = useState('');
  const [cost, setCost] = useState('');
  const submit = () => {
    if (!title.trim() || !cost) { toast('Заполните название и стоимость', 'err'); return; }
    onAdd({ title: title.trim(), sub: kind, cost: +cost, fee: 0, supplier: supplier.trim() || '—', info: [{ l: 'Дата', v: date ? fmtDate(date) : '—' }] }, kind);
  };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span className="oc-svc-ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
        <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 16 }}>{kind}</div>
      </div>
      <div className="form-grid">
        <div className="full"><Field label="Название услуги"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Страховка ВЗР" /></Field></div>
        <Field label="Дата"><DateField value={date} onChange={setDate} placeholder="Выбрать дату" /></Field>
        <Field label="Поставщик"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Название поставщика" /></Field>
        <Field label="Стоимость, $"><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></Field>
      </div>
      <Button icon="plus" onClick={submit} style={{ marginTop: 8 }}>Добавить в заказ</Button>
    </div>
  );
}

function AddServicePanel({ kind, setKind, aviaParams, setAviaParams, paxCount, participants, isGroup, onAddAvia, onAddAviaPerPax, onAddOther }) {
  const cat = ADD_SVC_CATS.find((c) => c.kind === kind) || ADD_SVC_CATS[0];
  return (
    <div className="fade-in">
      <div className="svcp-cattabs">
        {ADD_SVC_CATS.map((c) => (
          <button key={c.kind} className={'svcp-cattab' + (kind === c.kind ? ' active' : '')} onClick={() => setKind(c.kind)}>
            {c.img ? <img className="svcp-cattab-img" src={c.img} alt={c.label} /> : <Icon name={c.icon} />}{c.label}
          </button>
        ))}
      </div>
      {kind === 'Авиа' && <AviaSearchPanel params={aviaParams} setParams={setAviaParams} paxCount={paxCount}
        participants={participants || []} isGroup={isGroup} onAdd={onAddAvia} onAddPerPax={onAddAviaPerPax} />}

      {kind === 'Гостиница' && <HotelPicker participants={participants} group={isGroup} onApply={(offer) => onAddOther(offer, 'Гостиница')} onCancel={() => {}} />}
      {kind === 'ЖД' && <RailAddFlow participants={participants} groups={null} onAdd={onAddOther} />}
      {kind === 'Аэроэкспресс' && <AeroAddFlow onAdd={onAddOther} />}
      {kind !== 'Авиа' && kind !== 'Гостиница' && kind !== 'ЖД' && kind !== 'Аэроэкспресс' && cat.routeKey && <ServiceAddFlow routeKey={cat.routeKey} onAdd={onAddOther} />}
      {kind !== 'Авиа' && kind !== 'Гостиница' && kind !== 'ЖД' && kind !== 'Аэроэкспресс' && !cat.routeKey && <QuickAddForm kind={kind} onAdd={onAddOther} />}
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
              <Button variant="secondary" size="sm" icon="eye" onClick={() => window.__toastNav && window.__toastNav('offers')}>Просмотр</Button>
              <Button variant="secondary" size="sm" icon="send" onClick={() => window.__toastNav && window.__toastNav('offers')}>Отправить</Button>
              <ActionMenu trigger={<button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" /></button>}
                items={[{ icon: 'copy', label: 'Дублировать' }, { icon: 'download', label: 'Скачать PDF' }, { sep: true }, { icon: 'trash', label: 'Удалить', danger: true }]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




function OrderFinanceBlock({ orderNo, order, services, summary }) {
  const currency = orderFinanceCurrency(summary, order, services);
  const total = summary
    ? financeRowsTotal(summary.services_total, currency)
    : services.reduce((sum, service) => (
      normalizeCurrency(service.currency, currency) === currency
        ? sum + svcCalc(service).total
        : sum
    ), 0);
  const paid = summary ? financeRowsTotal(summary.paid, currency) : 0;
  const debt = summary ? financeRowsTotal(summary.outstanding, currency) : Math.max(0, Math.round(total) - paid);
  const money = (amount) => ocMoney(amount, currency);
  return (
    <div className="card card-pad fade-in" style={{ marginBottom: 18, border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Icon name="finance" style={{ width: 18, height: 18, color: 'var(--green)' }} />
        <h3 className="card-title" style={{ fontSize: 16 }}>Финансы заказа</h3>
        <div style={{ flex: 1 }} />
        <Pill tone={debt > 0 ? 'amber' : 'green'}>{debt > 0 ? 'Есть задолженность' : 'Полностью оплачен'}</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 16 }}>
        {[['Стоимость заказа', money(total), null], ['Оплачено', money(paid), 'var(--green)'], ['Остаток', money(debt), debt > 0 ? 'var(--amber)' : 'var(--green)']].map(([l, v, c]) => (
          <div key={l} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c || 'var(--ink)' }}>{v}</div>
          </div>
        ))}
      </div>
      {!summary && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Платежи и финансовые условия ещё не получены от backend. Ниже отображается реестр реальных операций.</div>}
    </div>
  );
}

function orderStageIndexForStatus(value) {
  const status = String(value || '').toLowerCase();
  if (['cancelled', 'отменено', 'data_missing', 'нет данных'].includes(status)) return 0;
  if (['paid', 'completed', 'оплачено', 'завершено'].includes(status)) return 4;
  if (['awaiting_payment', 'ожидает оплаты'].includes(status)) return 3;
  if (['awaiting_confirmation', 'ожидает подтверж.', 'ожидает подтверждения', 'needs_review', 'требует проверки'].includes(status)) return 2;
  if (['in_progress', 'в работе'].includes(status)) return 1;
  return 1;
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


      <div className="card card-pad" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon name="alertCircle" style={{ width: 22, height: 22, color: 'var(--amber)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Синхронизация с 1С приостановлена</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Последняя успешная: 14.06 · 12:30</div>
        </div>
        <Button variant="secondary" size="sm" icon="loader" onClick={async () => {
          try { await workspaceActionsApi.execute('integration.accounting.retry', { resourceType: 'finance', payload: { services: services.map((service) => service.serverId || service.id) } }); toast('Повторная синхронизация поставлена в очередь', 'ok'); }
          catch (error) { toast(error.message, 'err'); }
        }}>Повторить</Button>
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

function TabHistory({ liveItems }) {
  const hasLive = Array.isArray(liveItems) && liveItems.length > 0;
  const items = hasLive ? liveItems : (liveItems === undefined ? [
    { t: '14.06.2026 · 15:34', text: 'КП-1042 отправлено клиенту', who: 'Даниель' },
    { t: '14.06.2026 · 15:12', text: 'Авиабилет выписан · PNR KC8H2L', who: 'Даниель' },
    { t: '14.06.2026 · 14:40', text: 'Добавлена услуга: Hilton Istanbul', who: 'Даниель' },
    { t: '14.06.2026 · 14:05', text: 'Назначен оператор (Даниель)', who: 'Система' },
    { t: '14.06.2026 · 14:00', text: 'Заказ создан', who: 'Система' },
  ] : []);

  if (!items.length) {
    return (
      <div className="card card-pad fade-in" style={{ maxWidth: 560 }}>
        <EmptyState icon="clock" title="История изменений пуста" sub="Все изменения статусов, услуг и параметров заказа фиксируются здесь." />
      </div>
    );
  }

  return (
    <div className="card card-pad fade-in" style={{ maxWidth: 560 }}>
      <h3 className="card-title" style={{ fontSize: 18, marginBottom: 14 }}>История заказа</h3>
      <div className="timeline">
        {items.map((h, i) => (
          <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
            <div><div className="tl-time">{h.t} · {h.who}</div><div className="tl-text">{h.text}</div></div></div>
        ))}
      </div>
    </div>
  );
}

function TabTasks({ tasks = [], onAddTask, onToggleTask, onDeleteTask }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!taskTitle.trim()) return;
    try {
      setSubmitting(true);
      await onAddTask({
        title: taskTitle.trim(),
        due_at: taskDue ? formatIsoDateTime(taskDue) : null,
        priority: taskPriority,
      });
      setTaskTitle('');
      setTaskDue('');
      setTaskPriority('normal');
      setCreateOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="card-title" style={{ fontSize: 18, margin: 0 }}>Задачи и дедлайны</h3>
          {onAddTask && <Button icon="plus" size="sm" onClick={() => setCreateOpen(true)}>Добавить задачу</Button>}
        </div>

        {tasks.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {tasks.map((task, index) => {
              const isCompleted = task.status === 'completed' || task.done;
              return (
                <div key={task.id || index} className="oc-task" style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" title={isCompleted ? 'Открыть заново' : 'Отметить выполненной'} onClick={() => onToggleTask && onToggleTask(task)}>
                    <Icon name={isCompleted ? 'checkCircle' : 'circle'} style={{ color: isCompleted ? 'var(--green)' : 'var(--muted)' }} />
                  </button>
                  <span className={'dot' + (task.urgent ? ' urgent' : '')} />
                  <div style={{ flex: 1, textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.65 : 1 }}>
                    <div className="tt" style={{ fontWeight: 600, color: 'var(--ink)' }}>{task.text || task.title || 'Задача'}</div>
                    <div className={'td' + (task.urgent ? ' urgent' : '')} style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{task.due || task.due_at || 'Срок не указан'}</div>
                  </div>
                  {task.priority && ['critical', 'high'].includes(task.priority) && <Pill tone="red">Срочно</Pill>}
                  {task.status && <Pill tone={isCompleted ? 'green' : 'amber'}>{isCompleted ? 'Выполнена' : 'В работе'}</Pill>}
                  {onDeleteTask && (
                    <button type="button" className="icon-btn" title="Удалить задачу" onClick={() => onDeleteTask(task)}>
                      <Icon name="trash" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon="checkCircle" title="Активных задач нет" sub="Новые дедлайны появятся после бронирования, выпуска документов или добавления вручную." />
        )}
      </div>

      {createOpen && (
        <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Новая задача"
          footer={
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button style={{ flex: 1 }} disabled={!taskTitle.trim() || submitting} onClick={handleCreate}>Создать задачу</Button>
            </div>
          }>
          <div className="form-grid">
            <Field label="Название задачи *" className="full">
              <Input placeholder="Например: Проверить паспортные данные" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} autoFocus />
            </Field>
            <Field label="Срок выполнения" className="full">
              <DateField value={taskDue} onChange={setTaskDue} placeholder="Выберите дату" />
            </Field>
            <Field label="Приоритет" className="full">
              <Select options={[
                { value: 'normal', label: 'Обычный' },
                { value: 'high', label: 'Высокий' },
                { value: 'critical', label: 'Критический' },
              ]} value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}




const ORDER_WORKSPACE_NAV = [
  { key: 'main', label: 'Услуги', icon: 'briefcase' },
  { key: 'participants', label: 'Пассажиры', icon: 'users' },
  { key: 'route', label: 'Маршрут', icon: 'route' },
  { key: 'documents', label: 'Документы', icon: 'docs' },
  { key: 'finance', label: 'Финансы', icon: 'finance' },
  { key: 'tasks', label: 'Задачи', icon: 'checkCircle' },
  { key: 'history', label: 'История', icon: 'clock' },
];

// Услуги живут на главном экране карточки, поэтому старый ключ вкладки ведёт туда же.
function orderSection(key) {
  if (!key || key === 'services' || key === 'main') return null;
  return key;
}

function OrderCard({ order, company, clients = [], onBack, initTab, initSvc, initSvcSearch, fresh, onOpenChat }) {
  const toast = useToast();
  const [tab, setTab] = useState(orderSection(initTab) || 'main');
  const [loading, setLoading] = useState(true);
  const [cardOrder, setCardOrder] = useState(order);
  const [status, setStatus] = useState(order.status === 'Нет данных' ? 'Новое' : order.status);
  const [services, setServices] = useState(() => (
    Array.isArray(order.services) ? order.services : []
  ).map(toLegacyOrderService));
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [aftersaleCount, setAftersaleCount] = useState(0);
  const [clientThread, setClientThread] = useState(null);
  const [orderVersion, setOrderVersion] = useState(order.version);
  const [routeVersion, setRouteVersion] = useState(null);
  const [allowedTransitions, setAllowedTransitions] = useState(null);
  const requestType = order.requestType;
  const [editOpen, setEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [participants, setParticipants] = useState(() => (order.participants || []).map(toLegacyParticipant));
  useEffect(() => { if (order.participants?.length) setParticipants(order.participants.map(toLegacyParticipant)); }, [order.no, requestType]);
  const chatUnread = Number(clientThread?.unread_count || 0);
  const initStage = () => {
    return orderStageIndexForStatus(order.status);
  };
  const [stageIdx, setStageIdx] = useState(initStage());


  const [svcView, setSvcView] = useState(null);


  const [bookingDraft, setBookingDraft] = useState(null);

  const removeParticipantFromOrder = (participant) => {
    const participantId = participant.serverId || participant.id;
    if (!participantId) {
      toast('Для участника не найден ID в системе', 'err');
      return;
    }
    setConfirmAction({
      title: 'Удалить участника?',
      confirmLabel: 'Удалить',
      confirmVariant: 'danger',
      message: `Вы действительно хотите удалить пассажира «${participant.name || 'Участник'}» из заказа №${order.no}?`,
      run: async () => {
        try {
          await ordersApi.removeParticipant(orderId, participantId);
          await refreshOrderSnapshot();
          toast('Участник удалён из заказа', 'ok');
        } catch (error) {
          toast(error.message || 'Не удалось удалить участника', 'err');
        }
      },
    });
  };

  const addTask = async (taskPayload) => {
    try {
      await ordersApi.createTask(orderId, taskPayload);
      await refreshOrderSnapshot();
      toast('Задача создана', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось создать задачу', 'err');
    }
  };

  const toggleTask = async (task) => {
    const taskId = task.serverId || task.id;
    if (!taskId) return;
    const nextStatus = (task.status === 'completed' || task.done) ? 'open' : 'completed';
    try {
      await ordersApi.updateTask(orderId, taskId, { status: nextStatus });
      await refreshOrderSnapshot();
      toast(nextStatus === 'completed' ? 'Задача выполнена' : 'Задача открыта заново', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось обновить статус задачи', 'err');
    }
  };

  const deleteTask = async (task) => {
    const taskId = task.serverId || task.id;
    if (!taskId) return;
    try {
      await ordersApi.removeTask(orderId, taskId);
      await refreshOrderSnapshot();
      toast('Задача удалена', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось удалить задачу', 'err');
    }
  };

  const [operator, setOperator] = useState(order.operator);
  const [operatorOptions, setOperatorOptions] = useState([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [addKind, setAddKind] = useState('Авиа');

  const [orderDocs, setOrderDocs] = useState([]);
  const [expandedSvc, setExpandedSvc] = useState(() => new Set());
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState(() => new Set());
  const [confirmAction, setConfirmAction] = useState(null);
  const [aftersalePreset, setAftersalePreset] = useState(null);

  const [pendingAviaRoute, setPendingAviaRoute] = useState(null);
  const [aviaClassByPax, setAviaClassByPax] = useState({});
  const [aviaFareByPax, setAviaFareByPax] = useState({});
  const [aviaIndividualMode, setAviaIndividualMode] = useState(true);
  const [aviaParams, setAviaParams] = useState(() => {
    const points = order.route?.points || [];
    return {
      trip: order.route?.kind === 'round_trip' ? 'rt' : order.route?.kind === 'multi_city' ? 'mc' : 'ow',
      from: points[0]?.location_code || '',
      to: points[points.length - 1]?.location_code || '',
      depDate: points[0]?.local_datetime || null,
      retDate: points.length > 1 ? points[points.length - 1]?.local_datetime || null : null,
      pax: { adt: participants.length, chd: 0, infNoSeat: 0, infSeat: 0, special: {}, subsidized: {} },
      cabin: order.cabin || 'Эконом', baggage: false, flex: false, direct: false, airline: '', ...PAX_DEFAULT_OPTIONS,
    };
  });


  const [passport, setPassport] = useState(null);
  const [paxOpen, setPaxOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [editPax, setEditPax] = useState(null);
  const [docPax, setDocPax] = useState(null);

  const applyOrderSnapshot = (overview, taskPayload, historyPayload) => {
    const liveOrder = overview.order || {};
    const normalizedOrder = toUiOrder(liveOrder);
    setCardOrder((current) => ({ ...current, ...liveOrder, ...normalizedOrder, route: liveOrder.route }));
    setServices((Array.isArray(overview.services) ? overview.services : []).map(toLegacyOrderService));
    setParticipants((liveOrder.participants || []).map(toLegacyParticipant));
    setOrderVersion(liveOrder.version);
    setRouteVersion(liveOrder.route?.version || null);
    setAllowedTransitions(overview.allowed_actions?.transitions || []);
    setFinanceSummary(overview.finance_summary || null);
    setProposalCount(Array.isArray(overview.proposals) ? overview.proposals.length : 0);
    setAftersaleCount(Array.isArray(overview.returns) ? overview.returns.length : 0);
    if (taskPayload) {
      setTasks(resultsOf(taskPayload).map((task) => ({ ...task, text: task.title, done: task.status === 'completed', due: task.due_at ? new Date(task.due_at).toLocaleString('ru-RU') : 'без срока', urgent: ['critical', 'high'].includes(task.priority) })));
    }
    if (historyPayload) {
      setHistory(resultsOf(historyPayload).map((entry) => ({ t: new Date(entry.changed_at).toLocaleString('ru-RU'), text: entry.reason || `Статус: ${ORDER_STATUS_LABEL[entry.to_status] || entry.to_status}`, who: entry.changed_by_name || (entry.changed_by ? 'Пользователь' : 'Система') })));
    }
    setStatus(ORDER_STATUS_LABEL[liveOrder.status] || liveOrder.status_display || status);
    setStageIdx(orderStageIndexForStatus(liveOrder.status || liveOrder.status_display));
    return liveOrder;
  };

  const orderId = order.id || order.serverId || order.orderId || (cardOrder && (cardOrder.id || cardOrder.serverId));

  const refreshDocuments = async (signal) => {
    if (!orderId) return;
    try {
      const payload = await documentsApi.list({ order: orderId }, signal);
      setOrderDocs(resultsOf(payload));
    } catch (error) {
      if (error.name !== 'AbortError') setOrderDocs([]);
    }
  };

  const refreshOrderSnapshot = async () => {
    if (!orderId) return;
    const [overview, taskPayload, historyPayload] = await Promise.all([
      ordersApi.overview(orderId),
      ordersApi.tasks(orderId, {}),
      ordersApi.history(orderId, {}),
    ]);
    await refreshDocuments();
    return applyOrderSnapshot(overview, taskPayload, historyPayload);
  };

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      ordersApi.overview(orderId, controller.signal),
      ordersApi.tasks(orderId, {}, controller.signal),
      ordersApi.history(orderId, {}, controller.signal),
    ])
      .then(([overview, taskPayload, historyPayload]) => {
        applyOrderSnapshot(overview, taskPayload, historyPayload);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить заказ', 'err');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    refreshDocuments(controller.signal);
    return () => controller.abort();
  }, [orderId, order.no]);

  useEffect(() => {
    if (!orderId) return undefined;
    const controller = new AbortController();
    communicationsApi.threads({ order: orderId, type: 'client' }, controller.signal).then((threadPayload) => {
      if (controller.signal.aborted) return;
      setClientThread(resultsOf(threadPayload)[0] || null);
    }).catch(() => {});
    return () => controller.abort();
  }, [orderId, requestType]);

  // В больших заказах лента всегда начинается компактной: нужную услугу или
  // пассажира оператор находит через фильтры и раскрывает только по запросу.
  useEffect(() => { setExpandedSvc(new Set()); setSel(new Set()); setSelMode(false); }, [order.no]);

  useEffect(() => {
    const controller = new AbortController();
    usersApi.list({}, controller.signal).then((payload) => setOperatorOptions(resultsOf(payload))).catch(() => {});
    return () => controller.abort();
  }, []);

  const changeOrderStatus = async (nextStatus) => {
    const target = ORDER_STATUS_CODE[nextStatus];
    if (!target) return;
    if (allowedTransitions && !allowedTransitions.includes(target)) {
      toast('Этот переход статуса сейчас недоступен', 'info');
      return;
    }
    try {
      const updated = await ordersApi.transition(orderId, { target_status: target, version: orderVersion });
      setStatus(ORDER_STATUS_LABEL[updated.status] || nextStatus);
      setOrderVersion(updated.version);
      const refreshed = await ordersApi.overview(orderId);
      setAllowedTransitions(refreshed.allowed_actions?.transitions || []);
      toast('Статус: ' + (ORDER_STATUS_LABEL[updated.status] || nextStatus), 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось изменить статус', 'err');
    }
  };
  const reassignOperator = async (nextOperator) => {
    if (!nextOperator.id) { toast('Для сотрудника не найден backend-профиль', 'err'); return; }
    try {
      const updated = await ordersApi.reassign(orderId, { operator: nextOperator.id, version: orderVersion, reason: 'Переназначено в карточке заказа' });
      setOperator(nextOperator.name); setOrderVersion(updated.version); setReassignOpen(false);
      toast('Ответственный оператор: ' + nextOperator.name, 'ok');
    } catch (error) { toast(error.message || 'Не удалось переназначить оператора', 'err'); }
  };

  const addParticipantToOrder = async (client, person) => {
    await ordersApi.addParticipant(orderId, participantPayloadFromUi({ ...client, ...person }));
    await refreshOrderSnapshot();
  };

  const updateParticipantInOrder = async (participant, person, client) => {
    const participantId = participant.serverId || participant.id;
    if (!participantId) throw new Error('Для пассажира не найден backend ID');
    if (participant.person) {
      await crmApi.updatePerson(participant.person, personPayloadFromUnified(person, client));
    }
    await ordersApi.updateParticipant(orderId, participantId, participantPayloadFromUi({ ...participant, ...client, ...person }));
    await refreshOrderSnapshot();
  };

  const appendParticipantDocumentInOrder = async (participant, document) => {
    const participantId = participant.serverId || participant.id;
    if (!participantId) throw new Error('Для пассажира не найден backend ID');
    if (participant.person) {
      const created = await crmApi.addPersonDocument(participant.person, personDocumentPayloadFromUnified(document));
      await ordersApi.updateParticipant(orderId, participantId, participantPayloadFromUi({ ...participant, bookingDocument: created.id }));
      await refreshOrderSnapshot();
      return;
    }
    const documents = [...(participant.documents || []), document];
    await ordersApi.updateParticipant(orderId, participantId, participantPayloadFromUi({ ...participant, documents }));
    await refreshOrderSnapshot();
  };

  const saveOrderChanges = async (values) => {
    const operations = [];
    const points = (values.points || []).filter(Boolean);
    if (points.length >= 2) {
      operations.push(ordersApi.updateRoute(orderId, routePayloadFromUi({
        trip: values.trip,
        points,
        depDate: values.depDate || null,
        retDate: values.retDate || null,
        version: routeVersion,
      })));
    }
    operations.push(ordersApi.update(orderId, {
      version: orderVersion,
      purpose: values.purpose || '',
      comment: values.comment || '',
      planned_start: orderDateOnly(values.plannedStart),
      planned_end: orderDateOnly(values.plannedEnd),
    }));
    await Promise.all(operations);
    await refreshOrderSnapshot();
    toast('Изменения сохранены', 'ok');
  };

  useEffect(() => { setTab(orderSection(initTab) || 'main'); }, [initTab, order.no]);

  useEffect(() => {
    if (!initSvcSearch) return;
    setTab('main'); setAddKind(initSvcSearch); setSvcView('add-service');
  }, [initSvcSearch, order.no]);


  useEffect(() => {
    if (!initSvc || loading) return;
    const s = services.find((x) => x.id === initSvc);
    if (!s) return;
    setTab('main');
    setSvcView(null);
    setExpandedSvc(new Set([s.id]));
  }, [initSvc, loading, order.no]);

  useEffect(() => { if (fresh) toast('Заказ создан. Добавьте участников и их документы во вкладке «Участники».', 'info'); }, []);

  const orderPurpose = cardOrder.purpose || cardOrder.comment || '';

  const isGroup = requestType === 'Групповая';
  // Разделы, не поместившиеся в правую колонку, открываются из меню шапки заказа.
  const MORE_TABS = [
    { key: 'overview', label: 'Общая информация', icon: 'clipboard' },
    { key: 'clients', label: 'Клиенты', icon: 'contacts' },
    { key: 'responsibles', label: 'Ответственные', icon: 'users', count: operator ? 1 : null },
    { key: 'extras', label: 'Доп. услуги', icon: 'sparkles' },
    { key: 'offers', label: 'КП', icon: 'template', count: proposalCount || null, locked: stageIdx < 2 && proposalCount === 0 },
    { key: 'aftersale', label: 'Постпродажа', icon: 'refund', count: aftersaleCount || null, locked: stageIdx < 2 },
  ];

  const goAddType = (type) => { setAddKind(type || 'Авиа'); setSvcView('add-service'); };


  const addAviaSimple = async (route, fareDeltaSum = 0) => {
    const legs = route.legs;
    const title = legs[0].leg.from + legs.map((l) => ' → ' + l.leg.to).join('');
    const airlineNames = [...new Set(legs.map((l) => AIRLINES[l.airline]?.name || l.airline))].join(' / ');
    const total = route.total * Math.max(1, participants.length) + fareDeltaSum;
    try {
      const backendOfferId = route.backendOfferId || legs[0]?.backendOfferId;
      const participantIds = participants.map((p) => p.serverId || p.id).filter(Boolean);
      const created = await servicesApi.addToOrder(orderId, backendOfferId
        ? { offer_id: backendOfferId, participants: participantIds }
        : { kind: 'avia', title, currency: 'USD', supplier_cost: total, client_total: total, participants: participantIds });
      setServices((cur) => [...cur, toLegacyOrderService(created)]);
      setSvcView(null);
      toast(`Перелёт ${airlineNames} добавлен в заказ`, 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось добавить перелёт в заказ', 'err');
    }
  };

  const startAviaFareStep = (route) => { setAviaClassByPax({}); setAviaFareByPax({}); setAviaIndividualMode(true); setPendingAviaRoute(route); };
  const finalizeAviaFare = () => {
    if (!pendingAviaRoute) return;
    const fareDeltaSum = participants.reduce((s, _, i) => {
      const cls = aviaClassByPax[i] || 'Y';
      const tiers = fareTiersForClass(cls);
      const fid = aviaFareByPax[i] || (tiers.find((f) => f.recommended) || tiers[0]).id;
      const t = tiers.find((f) => f.id === fid) || tiers[0];
      return s + Math.round((t.delta || 0) / RUB_PER_USD);
    }, 0);
    addAviaSimple(pendingAviaRoute, fareDeltaSum);
    setPendingAviaRoute(null);
  };
  const addSvcOffer = async (offer, kind) => {
    const kindCode = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Трансфер': 'transfer', 'Автобус': 'bus', 'Тур': 'tour', 'Аэроэкспресс': 'aeroexpress', 'Бизнес-зал': 'lounge', 'Страховка': 'insurance', 'Виза': 'visa' }[kind] || 'other';
    const amount = Number(offer.cost || 0) + Number(offer.fee || 0);
    try {
      const body = offer._backendOfferId
        ? { offer_id: offer._backendOfferId, participants: participants.map((p) => p.serverId || p.id).filter(Boolean) }
        : { kind: kindCode, title: offer.title || kind, currency: offer.currency || 'USD', supplier_cost: Number(offer.cost || 0), agency_fee: Number(offer.fee || 0), client_total: amount, participants: participants.map((p) => p.serverId || p.id).filter(Boolean) };
      const created = await servicesApi.addToOrder(orderId, body);
      setServices((cur) => [...cur, toLegacyOrderService(created)]);
      setSvcView(null);
      toast(kind + ': услуга добавлена в заказ', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось добавить услугу в заказ', 'err');
    }
  };


  const assembleKPFromCards = async (chosen) => {
    if (!chosen || !chosen.length) { toast('Выберите хотя бы одну карточку', 'err'); return; }
    try {
      const validUntil = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const items = chosen.map((s) => {
        const total = svcCalc(s).total || s.sum || 0;
        return {
          service: s.serverId || s.id,
          title: s.title,
          description: s.sub || '',
          quantity: 1,
          price_amount: String(total),
          price_currency: s.currency || 'USD',
        };
      });
      await proposalsApi.create({
        order: orderId,
        type: 'standard',
        purpose: 'КП из карточек услуг',
        currency: 'USD',
        valid_until: validUntil.toISOString(),
        variants: [{ name: 'Вариант A · из карточек', items }],
      });
      setSvcView(null);
      setStageIdx((i) => Math.max(i, 2));
      setProposalCount((count) => count + 1);
      setTab('offers');
      toast('КП собрано из ' + items.length + ' карточек — открыт раздел «КП»', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось создать КП', 'err');
    }
  };


  const ensureClientThread = async () => {
    if (clientThread?.id) return clientThread;
    const payload = await communicationsApi.threads({ order: orderId, type: 'client' });
    let thread = resultsOf(payload)[0];
    if (!thread) {
      thread = await communicationsApi.createThread({
        type: 'client',
        order: orderId,
        title: `Заказ № ${order.no}`,
      });
    }
    setClientThread(thread);
    return thread;
  };

  const sendServiceCardToClient = async (service, channelList, draft) => {
    const serviceId = service.serverId || service.id;
    if (!orderId || !serviceId) throw new Error('Услуга не связана с backend-заказом');
    const kind = { 'Авиа': 'avia', 'ЖД': 'rail', 'Гостиница': 'hotel', 'Трансфер': 'transfer' }[service.kind] || 'other';
    const card = await serviceCardsApi.create({
      order: orderId,
      service: serviceId,
      kind,
      scenario: draft.scenario || '',
      price_snapshot: { amount: svcCalc(service).total, currency: service.currency || 'RUB' },
      content: draft,
    });
    const channelCodes = String(channelList).split(',').map((value) => value.trim()).filter(Boolean).map((channel) => ({
      'Внутренний чат': 'internal', Telegram: 'telegram', WhatsApp: 'whatsapp', MAX: 'max', Email: 'email',
    })[channel] || channel.toLowerCase());
    await serviceCardsApi.send(card.id, { channels: channelCodes, recipient: cardOrder.email || cardOrder.phone || '' });
  };

  const exportServicesToChat = async (chosen) => {
    if (!chosen || !chosen.length) { toast('Выберите хотя бы одну услугу', 'err'); return; }
    const lines = chosen.map((s) => {
      const total = svcCalc(s).total || s.sum || 0;
      return '• ' + s.title + (s.sub ? ' (' + s.sub + ')' : '') + ' — ' + Math.round(total).toLocaleString('ru-RU') + ' ' + (s.currency || 'USD');
    });
    const text = 'Подобранные услуги по заказу № ' + order.no + ':\n' + lines.join('\n');
    try {
      const thread = await ensureClientThread();
      await communicationsApi.send(thread.id, { body: text, type: 'text', internal_note: false });
      toast(chosen.length + ' услуг отправлено в чат клиенту', 'ok');
      onOpenChat && onOpenChat();
      return true;
    } catch (error) {
      toast(error.message || 'Не удалось отправить услуги в чат', 'err');
      return false;
    }
  };

  const sendOrderToClient = async () => {
    const lines = services.map((service) => `• ${service.title} — ${svcExactMoney(svcCalc(service).total, service.currency)}`);
    const text = [`Заказ № ${order.no}`, orderPurpose, ...lines].filter(Boolean).join('\n');
    try {
      const thread = await ensureClientThread();
      await communicationsApi.send(thread.id, { body: text, type: 'text', internal_note: false });
      setSendOpen(false);
      toast('Заказ отправлен клиенту', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось отправить заказ клиенту', 'err');
    }
  };




  const toggleSvc = (id) => setExpandedSvc((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSel = (id) => setSel((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const assembleSelected = () => { const chosen = services.filter((s) => sel.has(s.id)); assembleKPFromCards(chosen); setSelMode(false); setSel(new Set()); };
  const exportSelectedToChat = async () => {
    const chosen = services.filter((s) => sel.has(s.id));
    if (await exportServicesToChat(chosen)) { setSelMode(false); setSel(new Set()); }
  };

  const openDocument = (doc) => {
    const id = doc?.id || doc?.documentId || doc?.serverId;
    if (!id) return;
    window.open(documentsApi.previewUrl(id), '_blank', 'noopener,noreferrer');
  };

  const uploadServiceDocument = async (svc, file) => {
    try {
      await documentsApi.upload(file, { order: orderId, service: svc.serverId || svc.id, kind: 'other', title: file.name });
      await refreshDocuments();
      toast('Файл добавлен к услуге', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось загрузить файл', 'err');
    }
  };

  const cancelService = async (svc) => {
    try {
      await servicesApi.cancel(svc.serverId || svc.id, { version: svc.version, reason: 'Отменено оператором в карточке заказа' });
      await refreshOrderSnapshot();
      toast('Услуга отменена', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось отменить услугу', 'err');
    }
  };

  const deleteService = async (svc) => {
    try {
      await servicesApi.remove(svc.serverId || svc.id);
      await refreshOrderSnapshot();
      toast('Услуга удалена из заказа', 'ok');
    } catch (error) {
      toast(error.message || 'Не удалось удалить услугу', 'err');
    }
  };

  const askCancelService = (svc) => setConfirmAction({
    title: 'Отменить услугу?',
    message: <>Услуга <b>{svc.title}</b> будет отменена у поставщика. Штрафы и удержания фиксируются в постпродаже.</>,
    confirmLabel: 'Отменить услугу',
    confirmVariant: 'danger',
    run: () => cancelService(svc),
  });

  const askDeleteService = (svc) => setConfirmAction({
    title: 'Удалить услугу из заказа?',
    message: <>Услуга <b>{svc.title}</b> будет удалена из заказа вместе с привязками пассажиров.</>,
    confirmLabel: 'Удалить',
    confirmVariant: 'danger',
    run: () => deleteService(svc),
  });

  // Обмен ведётся штатным постпродажным модулем — карточка лишь открывает его
  // с предзаполненной услугой, чтобы оператор не искал её в списке заново.
  const requestExchange = (svc) => {
    setAftersalePreset({ type: 'Обмен билета', serviceId: String(svc.serverId || svc.id), stamp: Date.now() });
    setTab('aftersale');
  };

  const renderServicesArea = () => {
    if (svcView === 'booking') return <BookingWizard order={order} services={services} draft={bookingDraft}
      onSaveDraft={setBookingDraft} onClose={() => setSvcView(null)}
      onComplete={async () => {
        setBookingDraft(null);
        setSvcView(null);
        try {
          await refreshOrderSnapshot();
          toast('Бронирование завершено. Оплата фиксируется через финансовый модуль.', 'ok');
        } catch (error) {
          toast(error.message || 'Не удалось обновить заказ', 'err');
        }
      }} />;
    if (svcView === 'add-service') return (
      <div className="fade-in">
        <div className="oc-context-head">
          <button type="button" className="oc-context-close" title="Закрыть подбор" aria-label="Закрыть подбор" onClick={() => setSvcView(null)}><Icon name="x" /></button>
          <h3 className="card-title" style={{ fontSize: 18 }}>Добавить услугу / Поиск</h3>
        </div>
        <AddServicePanel kind={addKind} setKind={setAddKind} aviaParams={aviaParams} setAviaParams={setAviaParams}
          paxCount={participants.length} participants={participants} isGroup={requestType === 'Групповая'}
          onAddAvia={(route) => addAviaSimple(route, Math.round(route.fareDeltaUsd || 0) * participants.length)}
          onAddAviaPerPax={startAviaFareStep} onAddOther={addSvcOffer} />
      </div>
    );
    return (
      <>
        {selMode && (
          <div className="osrv-selbar">
            <Icon name="check" style={{ width: 16, height: 16 }} />
            <span>Отметьте услуги — их можно выгрузить в чат клиенту или объединить в КП. Выбрано: {sel.size}</span>
            <span style={{ flex: 1 }} />
            <Button size="sm" variant="secondary" onClick={() => { setSelMode(false); setSel(new Set()); }}>Отмена</Button>
            <Button size="sm" variant="secondary" icon="chat" disabled={sel.size === 0} onClick={exportSelectedToChat}>Выгрузить в чат</Button>
            <Button size="sm" icon="template" disabled={sel.size === 0} onClick={assembleSelected}>Собрать КП</Button>
          </div>
        )}
        <OrderServicesBoard services={services} participants={participants} documents={orderDocs} orderNo={order.no}
          expanded={expandedSvc} onToggle={toggleSvc} onAdd={() => goAddType(addKind)}
          selMode={selMode} sel={sel} onSel={toggleSel}
          renderExtra={null}
          orderId={orderId}
          onSendServiceCard={sendServiceCardToClient}
          onCancel={askCancelService}
          onExchange={requestExchange}
          onOpenChat={onOpenChat}
          onOpenPassenger={(person) => setEditPax(person)}
          onAddPassengerDoc={(person) => setDocPax(person)}
          onUploadDocument={uploadServiceDocument}
          onOpenDocument={openDocument}
          onDeleteService={askDeleteService} />
      </>
    );
  };

  const tabContent = () => {
    if (loading) return <AsyncBlock state="loading" skeletonRows={5} />;
    const client = clients.find((item) => String(item.id) === String(cardOrder.contact_person || cardOrder.client_person));
    switch (tab) {
      case 'overview': return <TabOverview order={cardOrder} company={company} />;
      case 'clients': return <TabClients order={cardOrder} company={company} client={client} onOpenChat={onOpenChat} />;
      case 'participants': {
        return (
          <TabParticipants
            list={participants}
            isGroup={requestType === 'Групповая'}
            groups={null}
            fresh={fresh}
            onPassport={setPassport}
            onAdd={() => setPaxOpen(true)}
            onEdit={(p) => setEditPax(p)}
            onAddDoc={(p) => setDocPax(p)}
            onRemove={removeParticipantFromOrder}
          />
        );
      }
      case 'route': return <TabRoute services={services} route={cardOrder.route} />;
      case 'main': case 'services': return renderServicesArea();
      case 'offers': return (
        <KPModule
          order={order}
          services={services}
          participants={participants}
          onApprove={async () => {
            setStageIdx((i) => Math.max(i, 2));
            await refreshOrderSnapshot();
            toast('Созданы финансовые записи и задачи по выпуску документов', 'ok');
          }}
        />
      );
      case 'responsibles': return <OrderResponsiblesTab order={order} />;
      case 'extras': return <DynamicExtrasPanel order={order} />;
      case 'documents': return <DocCenter scopeOrder={order.no} initialDocuments={orderDocs} participants={participants} services={services} orders={[order]} />;
      case 'finance': return (<><OrderFinanceBlock orderNo={order.no} order={order} services={services} summary={financeSummary} /><FinanceRegistry scopeOrder={order.no} initialOps={[]} /></>);
      case 'tasks': return <TabTasks tasks={tasks} onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask} />;
      case 'aftersale': return <ReturnsModule scopeOrder={order.no} order={order} services={services} participants={participants} initialNew={aftersalePreset} compact />;
      case 'history': return <TabHistory liveItems={history} />;
      default: return null;
    }
  };




  const fullWidthFlow = tab === 'main' && svcView === 'booking';


  const openSection = (key) => { setTab(key); if (svcView !== 'booking') setSvcView(null); };

  const headerMenuItems = [
    { icon: 'edit', label: 'Редактировать заказ', onClick: () => setEditOpen(true) },
    { icon: 'plus', label: 'Добавить услугу', onClick: () => { setTab('main'); goAddType('Авиа'); } },
    { icon: 'zap', label: bookingDraft ? 'Продолжить бронирование' : 'Начать бронирование', onClick: () => { setTab('main'); setSvcView('booking'); } },
    { icon: 'check', label: 'Выбрать услуги для КП или чата', onClick: () => { setTab('main'); setSvcView(null); setSelMode(true); } },
    { icon: 'refund', label: 'Изменение по рейсу', onClick: () => {
      const flight = services.find((service) => service.kind === 'Авиа');
      setAftersalePreset({ type: 'Обмен билета', serviceId: flight ? String(flight.serverId || flight.id) : '', stamp: Date.now() });
      setTab('aftersale');
    } },
    { icon: 'users', label: 'Переназначить оператора', onClick: () => setReassignOpen(true) },
    { icon: 'send', label: 'Отправить клиенту', onClick: () => setSendOpen(true) },
    { sep: true },
    ...MORE_TABS.filter((t) => !t.locked).map((t) => ({
      icon: t.icon, label: t.label + (t.count ? ` (${t.count})` : ''), onClick: () => openSection(t.key),
    })),
  ];
  const workspaceCounts = {
    main: services.length,
    participants: participants.length,
    documents: orderDocs.length,
    tasks: tasks.filter((task) => !task.done).length,
    history: history.length,
  };
  return (
    <div className="fade-in">
      <Topbar title="Карточка заказа">
        <div className="topbar-spacer" />
        <button type="button" className="btn btn-ghost btn-icon" title="Закрыть карточку" aria-label="Закрыть карточку" onClick={onBack}><Icon name="x" /></button>
      </Topbar>

      <div className="content" style={{ paddingTop: 8 }}>

        <div className="oc-grid">
          <div className="oc-main">
            <div className="oc-head">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                <div className="oc-id">
                  <h2>Заказ № {order.no}</h2>
                  <StatusControl status={status} onChange={changeOrderStatus} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--muted)' }}>
                  <span>Создан {order.date} · <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{(participants.find((p) => p.lead) || participants[0] || {}).name || order.client}</b> · {requestType === 'Групповая' ? 'Групповая поездка' : requestType} · {aviaParams.cabin} · оператор <button type="button" className="oc-meta-action" onClick={() => setReassignOpen(true)}>{operator || order.operator || 'не назначен'}</button></span>
                </div>
                <div style={{ flex: 1 }} />
                <Button variant="secondary" size="sm" icon="chat" onClick={onOpenChat}>
                  Чат{chatUnread > 0 && <span className="pill pill-red" style={{ marginLeft: 6 }}>{chatUnread}</span>}
                </Button>
                <ActionMenu trigger={<button className="btn btn-ghost btn-icon"><Icon name="more" /></button>} items={headerMenuItems} />
              </div>

              {orderPurpose && <div className="oc-purpose">{orderPurpose}</div>}

              <div className="oc-workspace-nav" aria-label="Разделы заказа">
                {ORDER_WORKSPACE_NAV.map((item) => (
                  <button type="button" key={item.key} className={tab === item.key ? 'active' : ''}
                    onClick={() => item.key === 'main' ? openSection('main') : openSection(item.key)}>
                    <Icon name={item.icon} /><span>{item.label}</span>
                    {workspaceCounts[item.key] != null && <b>{workspaceCounts[item.key]}</b>}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'main' ? tabContent() : <div className="fade-in">{tabContent()}</div>}
          </div>
        </div>


        {!fullWidthFlow && (
          <ServicesFooterBar services={services} bookingDraft={bookingDraft}
            onStartBooking={() => { setTab('main'); setSvcView('booking'); }} />
        )}
      </div>


      <ReassignOperatorDrawer open={reassignOpen} current={operator} options={operatorOptions} onClose={() => setReassignOpen(false)}
        onPick={reassignOperator} />
      {paxOpen && <PassengerDrawer open={paxOpen} onClose={() => setPaxOpen(false)}
        onAdd={addParticipantToOrder} />}
      {feeOpen && <FeeDrawer open={feeOpen} onClose={() => setFeeOpen(false)} />}
      {passport && <PassportModal passenger={passport} participants={participants} onClose={() => setPassport(null)}
        onAddDoc={(p) => { setPassport(null); setDocPax(p || { name: passport }); }} />}

      <UnifiedPersonDrawer open={!!editPax} kind="person" mode="edit" showRole initial={editPax || undefined}
        title="Карточка пассажира" onClose={() => setEditPax(null)}
        onSave={async (person, client) => {
          try {
            await updateParticipantInOrder(editPax, person, client);
            setEditPax(null);
            toast('Данные участника обновлены', 'ok');
          } catch (error) {
            toast(error.message || 'Не удалось обновить участника', 'err');
          }
        }} />

      <UnifiedDocumentDrawer open={!!docPax} person={{ name: docPax && docPax.name, citizenship: docPax && docPax.citizenship }}
        onClose={() => setDocPax(null)}
        onSave={async (doc) => {
          try {
            await appendParticipantDocumentInOrder(docPax, doc);
            setDocPax(null);
            toast('Документ добавлен участнику', 'ok');
          } catch (error) {
            toast(error.message || 'Не удалось добавить документ участнику', 'err');
          }
        }} />
      <OrderEditDrawer open={editOpen} order={cardOrder} status={status} onStatusChange={changeOrderStatus}
        services={services} participants={participants}
        onClose={() => setEditOpen(false)}
        onSave={saveOrderChanges}
        onAddPassenger={() => { setEditOpen(false); setPaxOpen(true); }} />


      {pendingAviaRoute && (
        <FareSelectPanel pax={participants} groups={undefined}
          classByPax={aviaClassByPax} setClassByPax={setAviaClassByPax}
          fareByPax={aviaFareByPax} setFareByPax={setAviaFareByPax}
          individualMode={aviaIndividualMode} setIndividualMode={setAviaIndividualMode}
          onClose={() => setPendingAviaRoute(null)} onApply={finalizeAviaFare} />
      )}


      <ConfirmDialog open={!!confirmAction} title={confirmAction ? confirmAction.title : ''}
        confirmLabel={confirmAction ? confirmAction.confirmLabel : 'Подтвердить'}
        confirmVariant={confirmAction ? confirmAction.confirmVariant : 'primary'}
        message={confirmAction ? confirmAction.message : null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => { const action = confirmAction; setConfirmAction(null); if (action) action.run(); }} />

      <ConfirmDialog open={sendOpen} title="Отправить заказ клиенту?" confirmLabel="Отправить" confirmVariant="primary"
        onCancel={() => setSendOpen(false)}
        onConfirm={sendOrderToClient}
        message={
          <>
            Клиенту <b>{order.client}</b> по заказу № {order.no} будет отправлено:
            <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
              <li>актуальное коммерческое предложение</li>
              <li>документы по заказу</li>
            </ul>
          </>
        } />

    </div>
  );
}





const EDIT_TABS = [
  { key: 'pax', n: 1, label: 'Пассажиры' },
  { key: 'route', n: 2, label: 'Маршрут' },
  { key: 'extra', n: 3, label: 'Дополнительно' },
];

function OrderEditDrawer({ open, order, status, onStatusChange, services, participants, onClose, onAddPassenger, onSave }) {
  const toast = useToast();
  const [tab, setTab] = useState('pax');
  const secRefs = useRef({});
  const [trip, setTrip] = useState('rt');
  const [pts, setPts] = useState(['FRU', 'IST']);
  const [depDate, setDepDate] = useState(null);
  const [retDate, setRetDate] = useState(null);
  const [cityPick, setCityPick] = useState(null);
  const [eventType, setEventType] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const route = order.route || {};
    const routePoints = route.points || [];
    const kindToTrip = { one_way: 'ow', round_trip: 'rt', multi_city: 'mc' };
    setTrip(kindToTrip[route.kind] || 'rt');
    setPts(routePoints.length ? routePoints.map((point) => point.location_code || '') : ['FRU', 'IST']);
    setDepDate(routePoints[0]?.local_datetime || order.planned_start || null);
    setRetDate(routePoints[routePoints.length - 1]?.local_datetime || order.planned_end || null);
    setEventType(order.purpose || '');
    setNote(order.comment || '');
    setSaving(false);
  }, [open, order.id]);

  if (!open) return null;

  const cityLabel = (code) => { const a = AIRPORTS.find((x) => x.code === code); return a ? `${a.city} (${a.code})` : null; };
  const goTab = (key) => { setTab(key); const el = secRefs.current[key]; if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const fin = financeSnapshot(order.no, services);
  const submit = async () => {
    if (pts.filter(Boolean).length < 2) {
      toast('Маршрут содержит минимум 2 точки', 'err');
      return;
    }
    try {
      setSaving(true);
      if (onSave) {
        await onSave({
          trip,
          points: pts,
          depDate,
          retDate,
          plannedStart: depDate,
          plannedEnd: retDate,
          purpose: eventType,
          comment: note,
        });
      }
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось сохранить изменения', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="scroll" style={{ background: '#fff', width: 'min(980px, 94vw)', height: '100vh',
          overflow: 'auto', boxShadow: 'var(--shadow-modal)', animation: 'slidein .26s cubic-bezier(.2,.9,.3,1)',
          display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '22px 30px 0', position: 'sticky', top: 0, background: '#fff', zIndex: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-.02em' }}>Редактирование заказа №{order.no}</h2>
              <button type="button" className="modal-close" onClick={onClose}><Icon name="x" /></button>
            </div>
            <div className="tabs" style={{ margin: '18px 0 0' }}>
              {EDIT_TABS.map((t) => (
                <button key={t.key} className={'tab' + (tab === t.key ? ' active' : '')} onClick={() => goTab(t.key)}>{t.n}. {t.label}</button>
              ))}
            </div>
            <div style={{ borderBottom: '1px solid var(--line)', marginTop: 18 }} />
          </div>


          <div style={{ display: 'flex', gap: 24, padding: '24px 30px', flex: 1, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>

              <div ref={(el) => (secRefs.current.pax = el)} className="oce-sec">
                <div className="oce-sec-h"><span className="n">1</span><span className="t">Пассажиры</span></div>
                {participants.map((p, i) => (
                  <div key={i} className="oce-client found">
                    <Icon name="checkCircle" style={{ width: 20, height: 20, color: 'var(--green)', flex: '0 0 20px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm">{p.name}{p.lead && <span className="pill pill-blue" style={{ marginLeft: 8 }}>Лид</span>}</div>
                      <div className="mt">{p.phone || p.doc || '—'}</div>
                    </div>
                  </div>
                ))}
                <button className="oce-add" onClick={onAddPassenger}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить пассажира</button>
              </div>


              <div ref={(el) => (secRefs.current.route = el)} className="oce-sec">
                <div className="oce-sec-h"><span className="n">2</span><span className="t">Маршрут</span></div>
                <div className="trip-toggle" style={{ marginBottom: 14 }}>
                  {[['rt', 'Туда-обратно'], ['ow', 'В одну сторону'], ['mc', 'Сложный маршрут']].map(([k, l]) => (
                    <button key={k} className={trip === k ? 'on' : ''} onClick={() => setTrip(k)}>{l}</button>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <DateRangeField label="Даты поездки" startVal={depDate} endVal={retDate}
                    onChange={(s, e) => { setDepDate(s); setRetDate(e); }} placeholder="Туда — обратно" />
                </div>
                {pts.map((code, i) => (
                  <div className="oce-route-row" key={i}>
                    <span className="idx">{i + 1}</span>
                    <div className="oce-city" onClick={() => setCityPick({ idx: i })}>
                      <Icon name="plane" />
                      {cityLabel(code) ? <span>{cityLabel(code)}</span> : <span className="ph">Выберите город</span>}
                    </div>
                    <button className="icon-btn green" title="Изменить город" onClick={() => setCityPick({ idx: i })}><Icon name="edit" /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button className="oce-add" style={{ flex: 1 }} onClick={() => { const idx = pts.length; setPts((p) => [...p, '']); setCityPick({ idx }); }}>
                    <Icon name="plus" style={{ width: 16, height: 16 }} />Добавить город
                  </button>
                  <Button variant="secondary" icon="zap" onClick={() => {
                    setPts((current) => current.length < 3 ? current : [current[0], ...current.slice(1, -1).sort((a, b) => cityLabel(a).localeCompare(cityLabel(b), 'ru')), current[current.length - 1]]);
                    toast('Промежуточные точки маршрута оптимизированы', 'ok');
                  }}>Оптимизировать</Button>
                </div>
              </div>


              <div ref={(el) => (secRefs.current.extra = el)} className="oce-sec" style={{ marginBottom: 0 }}>
                <div className="oce-sec-h"><span className="n">3</span><span className="t">Дополнительно</span></div>
                <div className="form-grid">
                  <Field label="Тип события">
                    <Select placeholder="Выберите тип" options={['Деловая поездка', 'Отпуск', 'Лечение', 'Учёба']} value={eventType} onChange={(e) => setEventType(e.target.value)} />
                  </Field>
                  <div className="full">
                    <Field label="Примечание оператора">
                      <textarea className="input" rows={3} placeholder="Комментарий к заказу" value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: 'vertical' }} />
                    </Field>
                  </div>
                </div>
              </div>
            </div>


            <div style={{ width: 280, flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>Информация о заказе</h3>
                <div className="kv-stack">
                  <div><div className="label2">№ заказа</div><div className="val2">№{order.no}</div></div>
                  <div><div className="label2">Статус</div><div className="val2"><StatusControl status={status} onChange={onStatusChange} /></div></div>
                  <div><div className="label2">Дата создания</div><div className="val2">{order.date}</div></div>
                  <div><div className="label2">Ответственный</div><div className="val2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={order.operator} size={24} />{order.operator}</div></div>
                </div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Итого по заказу</h3>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{ocMoney(fin.total)}</div>
              </div>
              <div className="card card-pad">
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 14 }}>Состав заказа</h3>
                {services.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Услуги не выбраны</div>}
                {services.map((s) => {
                  const k = SERVICE_KIND[s.kind] || { icon: 'briefcase', color: 'var(--blue)' };
                  return (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span className="oc-svc-ic" style={{ background: k.color, width: 34, height: 34, borderRadius: 10, flex: '0 0 34px' }}><Icon name={k.icon} style={{ width: 16, height: 16 }} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13, whiteSpace: 'nowrap' }}>{ocMoney(svcCalc(s).total, s.currency)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>


          <div style={{ padding: '16px 30px', borderTop: '1px solid var(--line)', position: 'sticky', bottom: 0, background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
            <div style={{ flex: 1 }} />
            <Button variant="primary" icon={saving ? 'loader' : 'check'} onClick={submit} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </div>
      </div>

      {cityPick && <CityPickPanel value={pts[cityPick.idx]}
        onClose={() => setCityPick(null)}
        onPick={(code) => { setPts((p) => { const n = [...p]; n[cityPick.idx] = code; return n; }); setCityPick(null); }} />}
    </>
  );
}

Object.assign(window, { OrderCard, AsyncBlock, OrderEditDrawer });



export { ocCurrency, ocMoney, opPayable, opDebt, AsyncBlock, StatusControl, svcCalc, financeSnapshot, OrderAside, ReassignOperatorDrawer, tripFromServices, KvEditDrawer, TabOverview, TabClients, DocCell, PaxGroupCard, TabParticipants, TabRoute, SVC_FILTER_CHIPS, ServiceListRow, serviceTotals, ServicesFooterBar, OrderChangeCase, TabServices, ADD_SVC_CATS, fmtDur, RadioFlightRow, aviaPriceBounds, AviaFilters, AviaCardRow, legSegments, legFlightNos, legRouteSummary, LegTimeline, FlightScaleBar, SupplierTag, AviaResultRow, AviaPaxPanel, FlightFarePanel, FareInfoPanel, aviaDepMin, AviaListTable, AviaSearchPanel, QuickAddForm, AddServicePanel, TabOffers, OrderFinanceBlock, TabFinance, TabHistory, OrderCard, EDIT_TABS, OrderEditDrawer };
