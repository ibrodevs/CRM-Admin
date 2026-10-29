import { useEffect, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { resultsOf } from '../../../shared/api/client.js';
import { clientsApi } from '../../clients/api.js';
import { UfPersonRow } from '../../clients/index.js';
import { ordersApi } from '../api/ordersApi.js';
import { orderContact } from '../model/order-contact.js';

export function OrderContactField({ order, onSaved }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const contact = orderContact(order);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    clientsApi.persons({}, controller.signal).then((payload) => {
      if (!controller.signal.aborted) setPeople(resultsOf(payload));
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Не удалось загрузить людей CRM'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open]);
  const choose = async (person) => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const saved = await ordersApi.update(order.id, { contact_person: person.id, version: order.version });
      await onSaved(saved);
      setOpen(false); toast('Контактное лицо заказа сохранено', 'ok');
    } catch (err) { setError(err.message || 'Не удалось сохранить контактное лицо'); }
    finally { setSaving(false); }
  };
  return <>
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}><div className="label">Контактное лицо заказа</div><b>{contact.name || (contact.selected ? 'Имя не заполнено' : 'Не выбрано')}</b></div>
        <Button variant="secondary" size="sm" icon="user" disabled={!order?.id} onClick={() => setOpen(true)}>{contact.selected ? 'Изменить' : 'Выбрать контактное лицо'}</Button>
      </div>
      {contact.required && !contact.valid && <div className="err-text" role="status">{contact.message}</div>}
    </div>
    <Drawer open={open} title="Контактное лицо заказа" sub="Выберите существующего человека CRM" onClose={saving ? undefined : () => setOpen(false)}>
      <SearchBox value={q} onChange={setQ} placeholder="Фамилия или имя" style={{ width: '100%', marginBottom: 12 }} />
      {loading && <div role="status">Загружаем людей CRM…</div>}
      {error && <div className="err-text" role="alert">{error}</div>}
      {!loading && <div style={{ display: 'grid', gap: 8 }}>
        {people.filter((person) => `${person.surname} ${person.given_name} ${person.full_name}`.toLowerCase().includes(q.toLowerCase())).map((person) => <UfPersonRow key={person.id} name={person.full_name || [person.surname, person.given_name].filter(Boolean).join(' ')} hint={person.id === contact.person ? 'Текущее контактное лицо' : ''} onClick={() => !saving && choose(person)} />)}
        {!people.length && !error && <div>Людей в CRM пока нет.</div>}
      </div>}
    </Drawer>
  </>;
}
