import { useEffect, useRef, useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { UnifiedPersonFields, ufBlankPerson, ufFromClient, ufValidatePerson, personPayloadFromUnified } from '../../clients/index.js';
import { clientsApi } from '../../clients/api.js';
import { resultsOf } from '../../../shared/api/client.js';
import { ordersApi } from '../../orders/api.js';
import { hotelGuestErrors, hotelGuestApiErrors, persistHotelGuest, hotelGuestDocumentErrors, suitableHotelDocument } from './guest-create.js';

export function HotelGuestCreateDrawer({ orderId, onClose, onCreated, documentRequired = false, checkout, personId }) {
  const [form, setForm] = useState(() => ({ ...ufBlankPerson('person'), latFirst: '', latLast: '', citizenship: '', city: '' }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedPerson, setSavedPerson] = useState(null);
  const [editPersonId, setEditPersonId] = useState(personId || null);
  const busy = useRef(false);
  const save = async (reusePerson) => {
    if (busy.current) return;
    const payload = personPayloadFromUnified(form);
    if (!reusePerson && !savedPerson) {
      const invalid = { ...ufValidatePerson(form), ...hotelGuestErrors(payload, { dob: form.dob }), ...hotelGuestDocumentErrors(payload, { required: documentRequired, checkout }) };
      setErrors(invalid);
      if (Object.keys(invalid).length) { setError('Проверьте обязательные данные гостя'); return; }
    }
    busy.current = true; setSaving(true); setError('');
    try {
      const guest = await persistHotelGuest({ payload, api: clientsApi, orderId, orderApi: ordersApi, documentRequired, checkout, savedPerson: reusePerson || savedPerson, editPersonId, onPersonSaved: setSavedPerson });
      await onCreated(guest);
      onClose();
    } catch (err) {
      setError(err.message || 'Не удалось сохранить гостя');
      setErrors(hotelGuestApiErrors(err));
      if (err.code === 'POSSIBLE_DUPLICATE') setCandidates(err.details?.candidates || []);
    } finally { busy.current = false; setSaving(false); }
  };
  const reuse = async (candidate, edit = false) => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const person = await clientsApi.person(candidate.id);
      const documents = documentRequired ? resultsOf(await clientsApi.personDocuments(person.id)) : [];
      const document = suitableHotelDocument(documents, checkout);
      const missing = { ...hotelGuestErrors(person), ...(documentRequired && !document ? { docNo: 'Добавьте действующий документ' } : {}) };
      if (edit || Object.keys(missing).length) {
        setForm((current) => ({ ...current, lastName: person.surname || '', firstName: person.given_name || '', middleName: person.middle_name || '', latLast: person.latin_surname || '', latFirst: person.latin_given_name || '', dob: person.birth_date?.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1') || '', gender: { male: 'Мужской', female: 'Женский' }[person.gender] || '', citizenship: ufFromClient({ citizenship: person.citizenship }).citizenship, phone: person.phone || '', phone2: person.secondary_phone || '', email: person.email || '', city: person.city || '', comment: person.notes || '', documents: document ? [{ id: document.id }] : [], docNo: '' }));
        setEditPersonId(person.id); setCandidates([]); setErrors(missing);
        if (Object.keys(missing).length) setError('Человек уже есть в CRM. Дополните его данные для гостиничного бронирования.');
      } else {
        setSavedPerson(person);
        busy.current = false;
        await save(person);
      }
    } catch (err) { setError(err.message || 'Не удалось загрузить данные человека'); }
    finally { busy.current = false; setSaving(false); }
  };
  useEffect(() => { if (personId) reuse({ id: personId }, true); }, [personId]);
  return <Drawer open title={editPersonId ? 'Данные гостя' : 'Новый гость'} sub="Единая карточка человека в CRM" width="min(640px,96vw)" onClose={saving ? undefined : onClose}
    footer={<><Button variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button><div style={{ flex: 1 }} /><Button icon="check" disabled={saving} onClick={() => save()}>{saving ? 'Сохранение…' : savedPerson ? 'Повторить добавление' : editPersonId ? 'Сохранить и выбрать' : 'Создать и выбрать'}</Button></>}>
    {error && <div className="hp-placement-alert" role="alert">{error}</div>}
    {candidates.length > 0 && <div className="card card-pad">
      <p>Возможно, этот человек уже есть в CRM. Выберите его, чтобы не создавать дубль.</p>
      {candidates.map((person) => <div key={person.id} className="hp-room-line"><span>{person.full_name || [person.surname, person.given_name].join(' ')} · {person.birth_date || 'Дата рождения не указана'}</span><Button size="sm" variant="secondary" disabled={saving} onClick={() => reuse(person)}>Использовать гостя</Button></div>)}
    </div>}
    {form.documents.some((doc) => doc.id) && <div className="hp-hint">Действующий документ уже сохранён в CRM.</div>}
    <fieldset disabled={saving || !!savedPerson} style={{ border: 0, padding: 0, margin: 0 }}>
      <UnifiedPersonFields value={form} onChange={(next) => { setForm(next); setErrors({}); setError(''); }} errors={errors} compact showLatin bookingDocumentRequired={documentRequired && !form.documents.some((doc) => doc.id)} showStatus={false} />
    </fieldset>
  </Drawer>;
}
