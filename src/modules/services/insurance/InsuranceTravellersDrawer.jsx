import { useEffect, useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { DateField } from '../../../shared/ui/DateFields.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { clientsApi } from '../../clients/api.js';
import { resultsOf } from '../../../shared/api/client.js';
import { addInsurancePerson, insurancePerson } from './insurance-search.js';

const PAGE_SIZE = 8;
export function InsuranceTravellersDrawer({ open, onClose, travellers, onChange, participants = [] }) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (!open || !catalogOpen) return undefined;
    const controller = new AbortController(); setLoading(true); setError('');
    clientsApi.persons({}, controller.signal).then((payload) => { if (!controller.signal.aborted) setPeople(resultsOf(payload)); })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message || 'Не удалось загрузить картотеку'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, catalogOpen, retry]);
  const openCatalog = (index = null) => { setTarget(index); setQuery(''); setPage(0); setCatalogOpen(true); };
  const pick = (person) => { onChange(addInsurancePerson(travellers, person, target)); if (target != null) setCatalogOpen(false); setTarget(null); };
  const update = (index, patch) => onChange(travellers.map((row, i) => i === index ? { ...row, ...patch } : row));
  const selected = (id) => !!id && travellers.some((row, i) => i !== target && String(row.person_id) === String(id));
  const normalize = (value) => String(value || '').toLocaleLowerCase('ru').replaceAll('ё', 'е');
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const filtered = people.filter((person) => terms.every((term) => normalize([insurancePerson(person).name, person.phone, person.email].join(' ')).includes(term)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), activePage = Math.min(page, pages - 1);
  const orderPeople = participants.map((person) => insurancePerson(person, true)).filter((person) => person.person_id);
  return <Drawer open={open} title="Застрахованные" width="min(680px,96vw)" className="insurance-travellers-drawer" showDraftNotice={false} onClose={onClose} footer={<Button onClick={onClose}>Готово · {travellers.length} чел.</Button>}>
    <p className="insurance-people-hint">Выберите человека из картотеки или заполните данные вручную. Для расчёта нужна дата рождения каждого застрахованного.</p>
    <div className="insurance-people-actions"><Button variant="secondary" icon="users" onClick={() => openCatalog()}>Из картотеки</Button><Button variant="secondary" icon="plus" onClick={() => { setCatalogOpen(false); onChange([...travellers, { name: '', birth_date: null }]); }}>Ввести вручную</Button></div>
    {catalogOpen && <section className="insurance-person-catalog" aria-label="Картотека застрахованных">
      <div className="flight-fare-section-head"><h4>{target == null ? 'Выбор из картотеки' : `Заменить застрахованного № ${target + 1}`}</h4><button type="button" className="insurance-catalog-close" onClick={() => setCatalogOpen(false)} aria-label="Скрыть картотеку"><Icon name="x" /></button></div>
      <SearchBox autoFocus value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="ФИО, телефон или e-mail" />
      {!query && orderPeople.length > 0 && <div className="insurance-order-people"><span>Участники заказа</span>{orderPeople.map((person) => <Button key={person.person_id} size="sm" variant="secondary" disabled={selected(person.person_id)} onClick={() => pick(person)}>{person.name}{selected(person.person_id) ? ' · добавлен' : ''}</Button>)}</div>}
      {loading && <p role="status">Загрузка картотеки…</p>}
      {error && <div role="alert" className="insurance-search-error">{error}<Button variant="secondary" size="sm" onClick={() => setRetry((value) => value + 1)}>Повторить</Button></div>}
      {!loading && !error && <><div className="insurance-person-results">{filtered.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE).map((person) => { const entry = insurancePerson(person); const added = selected(entry.person_id); return <button type="button" className="insurance-person-option" key={person.id} disabled={added} onClick={() => pick(person)}><span className="insurance-person-icon"><Icon name={added ? 'check' : 'user'} /></span><span><strong>{entry.name || 'Без имени'}</strong><small>{entry.birth_date ? `Дата рождения: ${new Date(`${entry.birth_date}T00:00:00`).toLocaleDateString('ru-RU')}` : 'Дата рождения не указана — заполните после выбора'}</small></span><span>{added ? 'Добавлен' : 'Выбрать'}</span></button>; })}</div>{!filtered.length && <p className="insurance-people-hint">{query ? 'Никого не найдено. Измените запрос или введите данные вручную.' : 'В картотеке пока нет физических лиц.'}</p>}{pages > 1 && <nav className="flight-fare-pagination" aria-label="Страницы картотеки"><span>Найдено: {filtered.length}</span><div><Button size="sm" variant="secondary" icon="chevLeft" aria-label="Предыдущая страница" disabled={activePage === 0} onClick={() => setPage(activePage - 1)} /><span>{activePage + 1} / {pages}</span><Button size="sm" variant="secondary" icon="chevRight" aria-label="Следующая страница" disabled={activePage === pages - 1} onClick={() => setPage(activePage + 1)} /></div></nav>}</>}
    </section>}
    <div className="flight-fare-section-head"><h4>Застрахованные</h4><span>{travellers.length} чел.</span></div>
    <div className="insurance-selected-people">{travellers.map((person, index) => <section className="insurance-insured-card" key={`${index}:${person.person_id || 'manual'}`} aria-label={`Застрахованный № ${index + 1}`}>
      <header><span>Застрахованный № {index + 1}{person.person_id ? ' · из картотеки' : ''}</span><button type="button" className="insurance-catalog-close" aria-label={`Убрать застрахованного № ${index + 1}`} onClick={() => onChange(travellers.length > 1 ? travellers.filter((_, i) => i !== index) : [{ name: '', birth_date: null }])}><Icon name="x" /></button></header>
      {person.person_id ? <div className="insurance-insured-name"><strong>{person.name || 'Без имени'}</strong><button type="button" className="flight-fare-rules-link" onClick={() => openCatalog(index)}>Заменить</button></div> : <Field label="ФИО"><Input value={person.name || ''} onChange={(event) => update(index, { name: event.target.value })} placeholder="Фамилия Имя Отчество" /></Field>}
      <DateField label="Дата рождения" value={person.birth_date} onChange={(birth_date) => update(index, { birth_date })} minDate={new Date(1900, 0, 1)} maxDate={new Date()} />
      {!person.birth_date && <span className="insurance-birth-missing">Укажите дату рождения для расчёта.</span>}
    </section>)}</div>
    <p className="insurance-people-hint">Уточнения в этой форме сохраняются в запросе на страховку. Карточка человека в картотеке не изменяется.</p>
  </Drawer>;
}
