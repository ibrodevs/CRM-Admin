import { ordersApi } from '../../orders/api.js';
import { toUiOrder } from '../../orders/model.js';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { documentsApi } from '../../documents/api.js';
import { clientsApi } from '../api/clientsApi.js';
import { useState, useEffect } from 'react';
import { Icon } from '../../../shared/icons/index.jsx';
import { Avatar } from '../../../shared/ui/Avatar.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { EmptyState } from '../../../shared/ui/EmptyState.jsx';
import { FilterChip } from '../../../shared/ui/FilterChip.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { Th, useSort } from '../../../shared/ui/Table.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { CLIENT_STATUS, ORDERS, ORDER_STATUS } from '../../../legacy/data/index.jsx';
import { UnifiedDocumentDrawer, UnifiedPersonDrawer } from './UnifiedForms.jsx';
import { ufDateIso } from '../../../shared/ui/UnifiedDateField.jsx';
import { Topbar } from '../../../shared/ui/Topbar.jsx';
import { communicationsApi } from '../../chats/api.js';
import { toUiClient } from '../model/clients.mapper.js';
import { pUsd, orderDate, sumCurrencies, hasDebt } from '../model/people-helpers.js';
import { currencySymbol } from '../../../shared/lib/money.js';

function ordersForClient(client, orders = ORDERS) {
  return orders.filter((order) => (
    (client?.id != null && order.client_person != null && String(order.client_person) === String(client.id))
    || (client?.name && order.client === client.name)
  ));
}

const citizenshipCode = (value) => ({ 'Туркменистан': 'TM', 'Азербайджан': 'AZ', 'Другое': '', 'Кыргызстан': 'KG', 'Казахстан': 'KZ', 'Россия': 'RU', 'Узбекистан': 'UZ', 'Таджикистан': 'TJ', 'Турция': 'TR', 'Германия': 'DE', 'Китай': 'CN', 'ОАЭ': 'AE' }[value] || value || '');

const personPayloadFromUnified = (person) => ({
  surname: person.lastName || '',
  given_name: person.firstName || '',
  middle_name: person.middleName || '',
  birth_date: ufDateIso(person.dob) || null,
  gender: { 'Мужской': 'male', 'Женский': 'female' }[person.gender] || '',
  citizenship: citizenshipCode(person.citizenship),
  phone: person.phone || '', secondary_phone: person.phone2 || '',
  email: person.email || '',
  city: person.city || '',
  notes: person.comment || '',
  documents: [...(person.documents || []), ...(person.docNo && !(person.documents || []).some((doc) => doc.docNo === person.docNo) ? [{ docNo: person.docNo, docType: person.docType, docExpiry: person.docExpiry }] : [])].map((doc) => doc.id ? { id: doc.id } : ({ type: ({ 'Загранпаспорт': 'foreign_passport', 'Общегражданский паспорт': 'national_passport', 'ID-карта': 'id_card', 'Виза': 'visa', 'Свидетельство о рождении': 'birth_certificate' })[doc.docType] || 'other', number: doc.docNo || '', expires_at: ufDateIso(doc.docExpiry) || null, issuing_country: citizenshipCode(person.citizenship), notes: doc.comment || '' })),
});

function ClientCard({ c: c0, orders: allOrders = ORDERS, onBack, onOpenOrder, onUpdate, onCreateOrder, onOpenChat }) {
  const toast = useToast();
  const [entityOrders, setEntityOrders] = useState(allOrders);
  useEffect(() => { const controller = new AbortController(); ordersApi.all({ client: c0.id }, controller.signal).then((result) => setEntityOrders(result.results.map(toUiOrder))).catch((error) => { if (error.name !== 'AbortError') toast(error.message, 'err'); }); return () => controller.abort(); }, [c0.id]);

  const [c, setC] = useState(c0);
  const [edit, setEdit] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [docs, setDocs] = useState(c0.documents || []);
  useEffect(() => {
    setC(c0);
    setDocs(c0.documents || []);
    const controller = new AbortController();
    clientsApi.personDocuments(c0.id, controller.signal)
      .then((rows) => setDocs((rows || []).map((doc) => ({ ...doc, docType: ({ foreign_passport: 'Загранпаспорт', national_passport: 'Общегражданский паспорт', id_card: 'ID-карта', birth_certificate: 'Свидетельство о рождении', visa: 'Виза', other: 'Другой документ' })[doc.type] || doc.type, docNo: doc.number_masked || '—' }))))
      .catch((error) => { if (error.name !== 'AbortError') toast(error.message || 'Не удалось загрузить документы', 'err'); });
    return () => controller.abort();
  }, [c0.id]);
  const startChat = async () => {
    try { const thread = await communicationsApi.createThread({ type: 'client', client_person: c.id, title: c.name, status: 'active' }); onOpenChat?.(thread); }
    catch (error) { toast(error.message, 'err'); }
  };
  const saveDocument = async (doc) => {
    if (!doc.docNo) { toast('Введите номер документа', 'err'); return; }
    try {
      const file = doc.sourceFile ? await documentsApi.upload(doc.sourceFile, { kind: 'passport', title: doc.sourceFile.name, person: c.id, source: 'upload' }) : null;
      const saved = await clientsApi.addPersonDocument(c.id, {
        ...(file ? { file: file.id } : {}),
        type: { 'Загранпаспорт': 'foreign_passport', 'Общегражданский паспорт': 'national_passport', 'ID-карта': 'id_card', 'Свидетельство о рождении': 'birth_certificate', 'Виза': 'visa' }[doc.docType] || 'other',
        number: doc.docNo || '',
        notes: doc.comment || '',
        person_data: { ...(doc.latLast ? { latin_surname: doc.latLast } : {}), ...(doc.latFirst ? { latin_given_name: doc.latFirst } : {}), ...(doc.latMiddle ? { latin_middle_name: doc.latMiddle } : {}), ...(ufDateIso(doc.dob) ? { birth_date: ufDateIso(doc.dob) } : {}), ...(doc.phone ? { phone: doc.phone } : {}), ...(doc.phone2 ? { secondary_phone: doc.phone2 } : {}) },
        series: doc.series || '',
        expires_at: ufDateIso(doc.docExpiry) || null,
        issuing_country: citizenshipCode(c.citizenship),
        nationality: citizenshipCode(c.citizenship),
      });
      setDocs((cur) => [...cur, { ...saved, docType: doc.docType || saved.type, docNo: saved.number_masked || doc.docNo }]);
      setDocOpen(false);
      toast('Документ добавлен в backend', 'ok');
    } catch (error) { toast(error.message || 'Не удалось добавить документ', 'err'); }
  };
  const orders = ordersForClient(c, entityOrders);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>К реестру</Button>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Клиенты / {c.id}</span>
      </div>

      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <Avatar name={c.name} size={56} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><h2 className="card-title">{c.name}</h2><Pill tone={CLIENT_STATUS[c.status]}>{c.status}</Pill></div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>{c.type} · {c.company !== '—' ? c.company : 'частное лицо'} · клиент с {c.since}</div>
        </div>
        <Button variant="secondary" icon="edit" onClick={() => setEdit(true)}>Изменить</Button>
        <Button variant="secondary" icon="chat" onClick={startChat}>Написать</Button>
        <Button icon="plus" onClick={() => onCreateOrder({ kind: 'person', id: c.id })}>Новый заказ</Button>
      </div>
      <ClientCreateModal open={edit} initial={c} onClose={() => setEdit(false)} onCreated={(u) => { setC(u); onUpdate && onUpdate(u); }} />
      <UnifiedDocumentDrawer open={docOpen} person={{ name: c.name, citizenship: c.citizenship }}
        onClose={() => setDocOpen(false)} onSave={saveDocument} />

      <Drawer open={!!selectedDocument} onClose={() => setSelectedDocument(null)} title="Документ клиента" footer={<Button onClick={() => setSelectedDocument(null)}>Закрыть</Button>}>
        {selectedDocument && <><p>{selectedDocument.docType} · {selectedDocument.docNo}</p><p>Серия: {selectedDocument.series || '—'}</p><p>Действителен до: {selectedDocument.expires_at || '—'}</p><p>Страна выдачи: {selectedDocument.issuing_country || '—'}</p>{selectedDocument.file ? <a className="btn btn-secondary" href={documentsApi.downloadUrl(selectedDocument.file)} target="_blank" rel="noopener noreferrer">Скачать файл</a> : <p>Прикреплённого файла нет</p>}</>}
      </Drawer>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Контактные данные</h3>
          <div className="kv">
            <div className="kv-row"><span className="k">Телефон</span><span className="v">{c.phone}</span></div>
            <div className="kv-row"><span className="k">E-mail</span><span className="v">{c.email}</span></div>
            <div className="kv-row"><span className="k">Город</span><span className="v">{c.city}</span></div>
            <div className="kv-row"><span className="k">Документ</span><span className="v">{docs.map((doc) => `${doc.docType} ${doc.docNo}`).join(' · ') || '—'}</span></div>
            <div className="kv-row"><span className="k">Дата рождения</span><span className="v">{c.dob}</span></div>
            <div className="kv-row"><span className="k">Компания</span><span className="v">{c.company}</span></div>
          </div>
        </div>
        <div className="card card-pad">
          <h3 className="card-title" style={{ fontSize: 17, marginBottom: 14 }}>Сводка</h3>
          <div className="oc-kpi"><span className="l">Заказов всего</span><span className="v">{c.orders}</span></div>
          <div className="oc-kpi"><span className="l">Сумма покупок</span><span className="v">{pUsd(c.spent)}</span></div>
          <div className="oc-kpi"><span className="l">Задолженность</span><span className={'v' + (hasDebt(c.debt) ? ' red' : '')}>{pUsd(c.debt)}</span></div>
          <div className="oc-kpi"><span className="l">Клиент с</span><span className="v">{c.since}</span></div>
        </div>
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Заказы клиента</h3>
      <div className="table-card">
        {orders.length ? (
          <table className="tbl">
            <thead><tr><th>№</th><th>Дата</th><th>Тип</th><th>Статус</th><th>Услуга</th><th style={{ textAlign: 'right' }}>Сумма</th><th></th></tr></thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => onOpenOrder(o)}>
                  <td className="t-strong">{o.no}</td><td>{orderDate(o)}</td><td><Pill tone="blue">{o.requestType}</Pill></td>
                  <td><Pill tone={ORDER_STATUS[o.status]}>{o.status}</Pill></td><td>{o.service}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.sum} {currencySymbol(o.currency)}</td>
                  <td><span className="go-dot"><Icon name="chevRight" /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState icon="orders" title="Заказов пока нет" />}
      </div>

      <h3 className="section-title" style={{ fontSize: 20, margin: '24px 0 14px' }}>Документы</h3>
      <div className="grid-4">
        {docs.map((d, i) => (<button key={'ud' + i} className="doc-chip" onClick={() => setSelectedDocument(d)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="idcard" />{d.docType} · {d.docNo}</span><Icon name="chevRight" /></button>))}
        <button className="doc-chip" style={{ borderStyle: 'dashed', color: 'var(--blue)' }} onClick={() => setDocOpen(true)}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="plus" />Загрузить</span></button>
      </div>
    </div>
  );
}

function ClientCreateModal({ open, initial, onClose, onCreated }) {
  const toast = useToast();
  const mode = initial ? 'edit' : 'create';
  const save = async (person) => {
    const payload = {
      surname: person.lastName, given_name: person.firstName, middle_name: person.middleName,
      birth_date: ufDateIso(person.dob) || null,
      gender: { 'Мужской': 'male', 'Женский': 'female' }[person.gender] || '',
      citizenship: citizenshipCode(person.citizenship),
      phone: person.phone, secondary_phone: person.phone2 || '', email: person.email, city: person.city, notes: person.comment,
      status: { 'Новый': 'new', 'Активный': 'active', VIP: 'vip', 'Неактивный': 'inactive' }[person.status] || 'active',
    };
    const drafts = [...(person.documents || [])];
    if (person.docNo && !drafts.some((doc) => doc.docNo === person.docNo)) drafts.push({ docType: person.docType, docNo: person.docNo, docExpiry: person.docExpiry });
    const documents = drafts.map((doc) => doc.id ? { id: doc.id } : ({ type: { 'Загранпаспорт': 'foreign_passport', 'Общегражданский паспорт': 'national_passport', 'Паспорт РФ': 'national_passport', 'ID-карта': 'id_card', 'Свидетельство о рождении': 'birth_certificate', 'Виза': 'visa' }[doc.docType] || 'other', number: doc.docNo || '', expires_at: ufDateIso(doc.docExpiry) || null, issuing_country: payload.citizenship }));
    try {
      let profile;
      if (initial) {
        const updated = await clientsApi.updateClient(initial.profileId, { person_data: payload, status: payload.status, documents });
        profile = toUiClient(updated);
      } else {
        const created = await clientsApi.createClient({ client_type: 'individual', status: payload.status, person_data: payload, documents });
        profile = toUiClient(created);
      }
      onCreated(profile); toast('Клиент «' + profile.name + '» ' + (mode === 'edit' ? 'обновлён' : 'добавлен'), 'ok'); onClose();
    } catch (error) {
      toast(error.message || 'Не удалось сохранить клиента', 'err');
    }
  };
  return (
    <UnifiedPersonDrawer open={open} kind="person" mode={mode} initial={initial}
      onClose={onClose} onSave={save} />
  );
}

function ClientsPage({ initialClients = [], orders = [], onClientsChange, onOpenOrder, onCreateOrder, onOpenChat, intent, onConsume }) {
  const [view, setView] = useState('list');
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [clients, setClients] = useState(initialClients);
  const [createOpen, setCreateOpen] = useState(false);
  const { sort, onSort, apply } = useSort(null);

  useEffect(() => { setClients(initialClients); }, [initialClients]);

  useEffect(() => { if (intent && intent.type === 'create') { setCreateOpen(true); onConsume && onConsume(); } }, [intent]);
  const commitClients = (updater) => {
    const next = typeof updater === 'function' ? updater(clients) : updater;
    setClients(next); onClientsChange?.(next);
  };
  const addClient = (c) => commitClients((cur) => [c, ...cur]);
  const upsertClient = (c) => commitClients((cur) => cur.some((x) => x.id === c.id) ? cur.map((x) => x.id === c.id ? c : x) : [c, ...cur]);

  if (view === 'card' && active) return (<><Topbar title="Карточка клиента" /><div className="content"><ClientCard c={active} orders={orders} onBack={() => setView('list')} onOpenOrder={onOpenOrder} onCreateOrder={onCreateOrder} onOpenChat={onOpenChat} onUpdate={(u) => { upsertClient(u); setActive(u); }} /></div></>);

  let rows = clients.filter((c) => (!fStatus || c.status === fStatus) && (!q || `${c.id} ${c.name} ${c.company} ${c.phone}`.toLowerCase().includes(q.toLowerCase())));
  rows = apply(rows, { name: (r) => r.name, orders: (r) => r.orders, spent: (r) => pUsd(r.spent), debt: (r) => pUsd(r.debt) });
  const STATS = [['Всего клиентов', clients.length], ['Активные', clients.filter((c) => c.status === 'Активный' || c.status === 'VIP').length], ['VIP', clients.filter((c) => c.status === 'VIP').length], ['С задолженностью', pUsd(sumCurrencies(clients, 'debt'))]];

  return (
    <>
      <Topbar title="Клиенты"><div className="topbar-spacer" /><Button icon="plus" onClick={() => setCreateOpen(true)}>Добавить клиента</Button></Topbar>
      <div className="content fade-in">
        <div className="grid-4" style={{ marginBottom: 22 }}>{STATS.map(([l, v]) => (<div className="stat-card" key={l}><div className="s-label">{l}</div><div className="s-value">{v}</div></div>))}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск: имя, телефон, ID…" style={{ width: 280 }} />
          <FilterChip label="Статус" value={fStatus} onChange={setFStatus} options={Object.keys(CLIENT_STATUS)} />
        </div>
        <div className="table-card">
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th>ID</th><Th label="Клиент" col="name" sort={sort} onSort={onSort} /><th>Тип</th><th>Компания</th><th>Город</th><Th label="Заказов" col="orders" sort={sort} onSort={onSort} /><Th label="Покупки" col="spent" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><Th label="Долг" col="debt" sort={sort} onSort={onSort} style={{ textAlign: 'right' }} /><th>Статус</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setActive(c); setView('card'); }}>
                    <td className="t-strong">{c.id}</td>
                    <td><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={c.name} size={32} /><span style={{ fontWeight: 600 }}>{c.name}</span></span></td>
                    <td>{c.type}</td><td className="t-muted">{c.company}</td><td>{c.city}</td><td>{c.orders}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{pUsd(c.spent)}</td>
                    <td style={{ textAlign: 'right', color: hasDebt(c.debt) ? 'var(--red)' : 'var(--muted-2)', fontWeight: 600 }}>{hasDebt(c.debt) ? pUsd(c.debt) : '—'}</td>
                    <td><Pill tone={CLIENT_STATUS[c.status]}>{c.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState icon="user" title="Клиентов не найдено" />}
        </div>
      </div>
      <ClientCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={addClient} />
    </>
  );
}

export { ordersForClient, citizenshipCode, personPayloadFromUnified, ClientCard, ClientCreateModal, ClientsPage };
