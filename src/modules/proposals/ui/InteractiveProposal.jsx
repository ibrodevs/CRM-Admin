import { useDraftState, useDraftControls } from '../../../shared/drafts/Drafts.jsx';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer, ConfirmDialog } from '../../../shared/ui/Overlays.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { UFDateField, ufDateIso } from '../../../shared/ui/UnifiedDateField.jsx';
import { interactiveApi, publicQuote } from '../api/interactiveApi.js';
import { KP_ACTIONS, KP_KINDS, chosenTotal, kpMoney, kpTime, optionsOf } from '../model/interactive.js';
import { ProposalRouteFields } from './ProposalRouteFields.jsx';
import { proposalContext, readableServiceTitle } from '../model/presentation.js';
import { ProposalChoices } from './ProposalChoices.jsx';
import { servicesApi } from '../../services/api.js';
import { resultsOf } from '../../../shared/api/client.js';

const uid = prefix => `${prefix}-${crypto.randomUUID()}`;
const clone = value => JSON.parse(JSON.stringify(value));
const MODE_OPTIONS = [{ value: 'both', label: 'Комплекты и отдельные услуги' }, { value: 'flexible', label: 'Отдельные услуги' }, { value: 'packages', label: 'Только готовые комплекты' }];
const AVAILABLE = [{ value: 'unknown', label: 'Нужно проверить' }, { value: 'available', label: 'Доступно' }, { value: 'unavailable', label: 'Недоступно' }];
function newOption(kind = 'avia') {
  return { id: uid('o'), kind, title: '', description: '', price: '', availability: 'unknown', requires: [], excludes: [] };
}

export function InteractiveProposal({ proposalId, onClose, onChanged, orders = [], OrderPicker, ServicePicker }) {
  const [backup, setBackup] = useDraftState(`proposal-workspace/${proposalId}`, 'form', null);
  const backupControl = useDraftControls(`proposal-workspace/${proposalId}`);
  const backupRef = useRef(backup);
  backupRef.current = backup;
  const [workspace, setWorkspace] = useState(null);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState('builder');
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [openOptions, setOpenOptions] = useState({});
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewIds, setPreviewIds] = useState([]);
  const [previewPackage, setPreviewPackage] = useState(null);
  const [revision, setRevision] = useState('');
  const [closePrompt, setClosePrompt] = useState(false);
  const [publishPrompt, setPublishPrompt] = useState(null);
  const [orderServices, setOrderServices] = useState([]);
  const [pickedService, setPickedService] = useState('');
  const [serviceError, setServiceError] = useState('');
  const latest = useRef(null);
  const dirty = Boolean(draft && workspace && JSON.stringify(draft) !== JSON.stringify(workspace.draft));
  const accept = value => { latest.current = value; setWorkspace(value); setDraft(clone(value.draft)); };
  useEffect(() => {
    const controller = new AbortController();
    interactiveApi.get(proposalId, controller.signal).then(value => {
      const saved = backupRef.current;
      accept(value);
      if (saved?.draft && JSON.stringify(saved.baseDraft) === JSON.stringify(value.draft)) {
        setDraft(saved.draft); setNotice('Восстановлены несохранённые изменения КП в этом браузере');
      } else if (saved?.draft) {
        setError('Серверный черновик изменился. Локальная копия сохранена отдельно; проверьте версии перед продолжением.');
      }
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [proposalId]);
  useEffect(() => {
    if (!workspace?.order) return;
    const controller = new AbortController();
    servicesApi.list({ order: workspace.order }, controller.signal).then(value => setOrderServices(resultsOf(value))).catch(e => { if (e.name !== 'AbortError') setServiceError(e.message); });
    return () => controller.abort();
  }, [workspace?.order]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  useEffect(() => {
    if (!workspace || !draft) return;
    if (dirty) setBackup({ title: draft.title || 'Предложение', baseDraft: workspace.draft, draft });
  }, [draft, workspace, dirty]);
  const update = values => setDraft(current => ({ ...current, ...values }));
  const updateGroup = (id, fn) => setDraft(current => ({ ...current, groups: current.groups.map(group => group.id === id ? fn(group) : group) }));
  const updateOption = (gid, oid, values) => updateGroup(gid, group => ({ ...group, options: group.options.map(option => option.id === oid ? { ...option, ...values, checked_at: null, mark_checked: false } : option) }));
  const removeOptions = ids => setDraft(current => ({ ...current,
    groups: current.groups.map(group => ({ ...group, options: group.options.filter(row => !ids.includes(row.id)).map(row => ({ ...row, requires: row.requires.filter(id => !ids.includes(id)), excludes: row.excludes.filter(id => !ids.includes(id)) })) })),
    packages: current.packages.map(pack => ({ ...pack, option_ids: pack.option_ids.filter(id => !ids.includes(id)) })).filter(pack => pack.option_ids.length),
  }));
  async function execute(fn) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { return await fn(); } catch (e) { setError(e.message); return null; } finally { setBusy(false); }
  }
  async function save() {
    const saved = await interactiveApi.save(proposalId, workspace.version, draft);
    backupControl.clear(); accept(saved); onChanged?.(); return saved;
  }
  async function publish(final) {
    await execute(async () => {
      const current = dirty ? await save() : workspace;
      const value = await interactiveApi.publish(proposalId, current.version, final);
      accept(value); setNotice(final ? 'Итоговая версия доступна по той же ссылке. Клиент должен её согласовать.' : 'Ссылка готова. Скопируйте её и отправьте клиенту. Автоматической отправки нет.');
      onChanged?.();
    });
  }
  async function reload() {
    await execute(async () => { const value = await interactiveApi.get(proposalId); if (dirty) { setWorkspace({ ...value, draft: workspace.draft }); latest.current = value; } else accept(value); setNotice('Данные клиента обновлены'); });
  }
  async function checkPrices() {
    await execute(async () => {
      if (!workspace.revision) throw new Error('Сначала опубликуйте предложение');
      if (dirty) throw new Error('Сохраните изменения перед перепроверкой опубликованной версии');
      let value = await publicQuote(workspace.public_token);
      for (const row of optionsOf(value.payload).filter(option => option.auto_check)) {
        value = await publicQuote(workspace.public_token, 'refresh', { version: value.version, revision: value.revision, option_id: row.id });
      }
      const server = await interactiveApi.get(proposalId);
      // Bring checked client prices into the editable revision for final approval.
      const effective = new Map(optionsOf(server.payload).map(row => [row.id, row]));
      const next = clone(server.draft);
      next.groups.forEach(group => group.options.forEach(option => {
        const checked = effective.get(option.id);
        if (checked && !checked.check_error) Object.assign(option, { price: checked.price, availability: checked.availability, checked_at: checked.checked_at, check_source: checked.check_source });
      }));
      accept(server); setDraft(next);
      setNotice('Проверка завершена. Для ручных услуг подтвердите цену и наличие в конструкторе. Изменения условий проверьте перед итоговой публикацией.');
    });
  }
  const close = () => { if (busy) return; if (dirty) setClosePrompt(true); else onClose(); };
  const options = optionsOf(draft);
  const context = proposalContext(draft || {});
  const order = orders.find(item => String(item.id) === String(workspace?.order));
  const publicLink = workspace?.revision ? `${window.location.origin}/offer/${workspace.public_token}` : '';
  const renderedPayload = revision ? workspace?.publications.find(item => String(item.revision) === revision)?.payload : draft;
  function addService() {
    const service = orderServices.find(row => row.id === pickedService);
    if (!service) return;
    if (service.currency !== draft.currency) { setError('Валюты КП и услуги должны совпадать'); return; }
    const kind = KP_KINDS[service.kind] ? service.kind : 'other';
    const option = { ...newOption(kind), service: service.id, title: service.title, price: String(service.client_total), currency: draft.currency };
    const group = draft.groups.find(row => row.options[0]?.kind === kind);
    if (group) updateGroup(group.id, row => ({ ...row, options: [...row.options, option] }));
    else update({ groups: [...draft.groups, { id: uid('g'), title: KP_KINDS[kind], required: false, options: [option] }] });
    setPickedService('');
  }
  return <Drawer open onClose={close} title={workspace ? `Конструктор КП · ${workspace.number}` : 'Конструктор КП'} sub={workspace ? `${order?.no ? `Заказ ${order.no}` : workspace.order ? 'Связано с заказом' : 'Без привязки к заказу'} · ${workspace.stage_label}` : ''} width="min(1180px,98vw)" className="kp-workspace-drawer" footer={workspace && <>
    <span className="kp-muted">{dirty ? 'Есть несохранённые изменения' : 'Черновик сохранён'} · опубликовано версий: {workspace.revision}</span>
    <div className="kp-inline-actions"><Button variant="secondary" disabled={busy || !dirty} onClick={() => execute(async () => { await save(); setNotice('Черновик сохранён'); })}>Сохранить</Button><Button disabled={busy} onClick={() => setPublishPrompt(false)}>{workspace.revision ? 'Обновить по ссылке' : 'Создать ссылку для клиента'}</Button></div>
  </>}>
    {!workspace && !error && <p role="status">Загружаем КП…</p>}
    {error && <div className="kp-error" role="alert">{error} <Button variant="secondary" size="sm" disabled={busy} onClick={reload}>Обновить данные</Button></div>}
    {notice && <p className="kp-explanation" role="status">{notice}</p>}
    {workspace && <div className="kp-workspace">
      <section className="kp-context-card" aria-label="Клиент и поездка"><div><span>Для кого</span><strong>{context.recipient}</strong></div><div><span>Направление</span><strong>{context.route}</strong></div><div><span>Даты поездки</span><strong>{context.dates}</strong></div></section>
      <section className="kp-publication-state" aria-label="Состояние предложения"><strong>{workspace.revision ? `Клиентская ссылка · версия ${workspace.revision}` : 'Черновик · виден только сотрудникам CRM'}</strong><span>{workspace.revision ? (dirty ? 'Изменения пока в черновике. Чтобы клиент увидел их, обновите версию по той же ссылке.' : 'По ссылке клиент выбирает услуги и отправляет выбор оператору. После проверки условий потребуется отдельное согласование.') : 'Добавьте услуги, проверьте вид клиента и создайте ссылку. Пока клиент ничего не видит.'}</span></section>
      <nav className="tabs" aria-label="Разделы КП">{[['builder', 'Конструктор'], ['client', 'Вид клиента'], ['review', 'Выбор и согласование'], ['history', 'История и версии']].map(([value, label]) => <button type="button" key={value} className={`tab ${tab === value ? 'active' : ''}`} onClick={() => setTab(value)}>{label}</button>)}</nav>
      {publicLink && <div className="kp-link-bar"><div><strong>Ссылка клиента</strong><span>Доступно всем, у кого есть ссылка. Отправьте её клиенту вручную.</span><a href={publicLink} target="_blank" rel="noopener noreferrer">{publicLink}</a></div><Button variant="secondary" size="sm" onClick={() => execute(async () => { await navigator.clipboard.writeText(publicLink); setNotice('Ссылка скопирована. Отправьте её клиенту.'); })}>Копировать ссылку</Button><a className="btn btn-secondary btn-sm" href={publicLink} target="_blank" rel="noopener noreferrer">Открыть</a></div>}
      {tab === 'builder' && <>
        <section className="kp-section">{OrderPicker && <div className="kp-section-title"><span>{order?.no ? `Связанный заказ: ${order.no}` : workspace.order ? 'КП связано с заказом' : 'КП пока без заказа'}</span><Button variant="secondary" size="sm" disabled={busy || Boolean(workspace.order && workspace.revision)} onClick={() => setOrderPickerOpen(true)}>Связать с заказом</Button></div>}<div className="kp-form-grid"><Field label="Для кого предложение"><Input locationAutocomplete={false} value={draft.recipient || ''} maxLength={255} onChange={e => update({ recipient: e.target.value })} placeholder="Имя клиента или компания" /></Field><ProposalRouteFields value={draft.route || ''} onChange={route => update({ route })} /><UFDateField label="Начало поездки" value={draft.travel_start || ''} onChange={value => update({ travel_start: ufDateIso(value) })} /><UFDateField label="Окончание поездки" value={draft.travel_end || ''} minDate={draft.travel_start || null} onChange={value => update({ travel_end: ufDateIso(value) })} /><Field label="Название предложения"><Input locationAutocomplete={false} value={draft.title} onChange={e => update({ title: e.target.value })} maxLength={255} /></Field><Field label="Способ выбора"><Select value={draft.mode} options={MODE_OPTIONS} onChange={e => update({ mode: e.target.value })} /></Field><Field label="Валюта"><Select disabled={options.some(row => row.offer || row.service)} value={draft.currency} onChange={e => update({ currency: e.target.value })} options={['RUB', 'USD', 'EUR', 'KGS']} /></Field><UFDateField label="Действует до" value={draft.valid_until ? new Date(draft.valid_until).toLocaleDateString('ru-RU') : null} onChange={value => { const parts = String(value || '').split('.'); update({ valid_until: parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}T23:59:59+06:00` : null }); }} /></div><Field label="Вступление для клиента"><textarea className="input" rows={2} maxLength={4000} value={draft.intro} onChange={e => update({ intro: e.target.value })} /></Field></section>
        {workspace.order && <section className="kp-section"><h3>Добавить из услуг заказа</h3><div className="kp-import-row"><Select aria-label="Услуга заказа" value={pickedService} onChange={e => setPickedService(e.target.value)} options={[{ value: '', label: 'Выберите услугу' }, ...orderServices.filter(row => !options.some(option => option.service === row.id)).map(row => ({ value: row.id, label: `${row.title} · ${kpMoney(row.client_total, row.currency)}` }))]} /><Button variant="secondary" disabled={!pickedService} onClick={addService}>Добавить</Button></div>{serviceError && <p className="kp-error">{serviceError}</p>}<p className="kp-muted">Цены в конструкторе — итоговые для клиента. Закупка и маржинальность по ссылке не передаются.</p></section>}
        {ServicePicker && <Button variant="secondary" iconRight="chevRight" onClick={() => setServicePickerOpen(true)}>Подобрать услугу через поиск</Button>}
        {draft.groups.map(group => <section className="kp-section" key={group.id}>
          <div className="kp-section-title"><Field label="Раздел услуг"><Input locationAutocomplete={false} value={group.title} maxLength={255} onChange={e => updateGroup(group.id, row => ({ ...row, title: e.target.value }))} /></Field><label className="kp-check"><input type="checkbox" checked={group.required} onChange={e => updateGroup(group.id, row => ({ ...row, required: e.target.checked }))} />Обязательный выбор</label><Button variant="secondary" size="sm" onClick={() => { removeOptions(group.options.map(row => row.id)); setDraft(current => ({ ...current, groups: current.groups.filter(row => row.id !== group.id) })); }}>Удалить раздел</Button></div>
          {group.options.map(option => <details className="kp-edit-option" key={option.id} open={Boolean(openOptions[option.id])} onToggle={event => { const open = event.currentTarget.open; setOpenOptions(current => current[option.id] === open ? current : { ...current, [option.id]: open }); }}><summary className="kp-edit-option-summary"><span><strong>{readableServiceTitle(option.title) || 'Новый вариант услуги'}</strong><small>{KP_KINDS[option.kind]} · {option.availability === 'available' ? 'Доступно' : 'Требует проверки'}</small></span><b>{option.price === '' ? 'Цена не указана' : kpMoney(option.price, draft.currency)}</b></summary><div className="kp-edit-option-body"><div className="kp-form-grid"><Field label="Вид услуги"><Select value={option.kind} options={Object.entries(KP_KINDS).map(([value, label]) => ({ value, label }))} onChange={e => updateOption(group.id, option.id, { kind: e.target.value })} /></Field><Field label="Название"><Input locationAutocomplete={false} value={option.title} maxLength={255} onChange={e => updateOption(group.id, option.id, { title: e.target.value })} /></Field><Field label={`Цена для клиента, ${draft.currency}`}><Input type="number" min="0" step="0.01" value={option.price} onChange={e => updateOption(group.id, option.id, { price: e.target.value })} /></Field><Field label="Наличие"><Select value={option.availability} options={AVAILABLE} onChange={e => updateOption(group.id, option.id, { availability: e.target.value })} /></Field></div>
            <Field label="Характеристики и условия для клиента"><textarea className="input" rows={2} maxLength={4000} value={option.description} onChange={e => updateOption(group.id, option.id, { description: e.target.value })} /></Field>
            <div className="kp-section-title"><label className="kp-check"><input type="checkbox" checked={Boolean(option.mark_checked || option.checked_at)} onChange={e => updateGroup(group.id, row => ({ ...row, options: row.options.map(o => o.id === option.id ? { ...o, mark_checked: e.target.checked, clear_check: !e.target.checked, checked_at: null } : o) }))} />Цена, наличие и условия проверены оператором</label><Button variant="secondary" size="sm" onClick={() => removeOptions([option.id])}>Удалить вариант</Button></div>
            <details className="kp-constraints"><summary>Связанные услуги и ограничения · {option.requires.length + option.excludes.length}</summary><div className="kp-form-grid">{['requires', 'excludes'].map(relation => <fieldset key={relation}><legend>{relation === 'requires' ? 'Только вместе с' : 'Нельзя сочетать с'}</legend>{options.filter(row => row.id !== option.id).map(other => <label className="kp-check" key={other.id}><input type="checkbox" checked={option[relation].includes(other.id)} onChange={e => updateOption(group.id, option.id, { [relation]: e.target.checked ? [...option[relation], other.id] : option[relation].filter(id => id !== other.id) })} />{readableServiceTitle(other.title) || 'Без названия'}</label>)}</fieldset>)}</div></details>
          </div></details>)}<Button variant="secondary" size="sm" onClick={() => { const option = newOption(group.options[0]?.kind); updateGroup(group.id, row => ({ ...row, options: [...row.options, option] })); setOpenOptions(current => ({ ...current, [option.id]: true })); }}>Добавить вариант услуги</Button>
        </section>)}
        <Button variant="secondary" onClick={() => { const option = newOption(); update({ groups: [...draft.groups, { id: uid('g'), title: 'Новый раздел', required: false, options: [option] }] }); setOpenOptions(current => ({ ...current, [option.id]: true })); }}>Добавить раздел услуг</Button>
        {draft.mode !== 'flexible' && <section className="kp-section kp-package-editor"><h2>Готовые комплекты</h2><p className="kp-muted">Оператор задаёт допустимый состав. В свободном выборе клиент выбирает по одному варианту из раздела.</p>{draft.packages.map(pack => <details className="kp-edit-option" key={pack.id}><summary className="kp-edit-option-summary"><span><strong>{pack.title || 'Новый комплект'}</strong><small>{pack.option_ids.length} услуг · изменить состав</small></span><b>{kpMoney(chosenTotal(draft, pack.option_ids), draft.currency)}</b></summary><div className="kp-edit-option-body"><Field label="Название комплекта"><Input locationAutocomplete={false} value={pack.title} onChange={e => update({ packages: draft.packages.map(row => row.id === pack.id ? { ...row, title: e.target.value } : row) })} /></Field><div className="kp-package-options">{options.map(option => <label className="kp-check" key={option.id}><input type="checkbox" checked={pack.option_ids.includes(option.id)} onChange={e => update({ packages: draft.packages.map(row => row.id === pack.id ? { ...row, option_ids: e.target.checked ? [...row.option_ids, option.id] : row.option_ids.filter(id => id !== option.id) } : row) })} />{readableServiceTitle(option.title) || 'Без названия'}</label>)}</div><div className="kp-section-title"><label className="kp-check"><input type="checkbox" checked={pack.total_only} onChange={e => update({ packages: draft.packages.map(row => row.id === pack.id ? { ...row, total_only: e.target.checked } : row) })} />Клиенту только итоговую сумму пакета</label><strong>{kpMoney(chosenTotal(draft, pack.option_ids), draft.currency)}</strong><Button variant="secondary" size="sm" onClick={() => update({ packages: draft.packages.filter(row => row.id !== pack.id) })}>Удалить комплект</Button></div></div></details>)}<Button variant="secondary" onClick={() => update({ packages: [...draft.packages, { id: uid('p'), title: `Комплект ${draft.packages.length + 1}`, option_ids: [], total_only: false }] })}>Добавить комплект</Button></section>}
      </>}
      {tab === 'client' && <><p className="kp-explanation">Предпросмотр текущего черновика. Действия здесь не отправляют выбор и не запускают бронирование.</p><ProposalChoices payload={draft} ids={previewIds} packageId={previewPackage} onChange={(ids, pack) => { setPreviewIds(ids); setPreviewPackage(pack); }} /><div className="kp-total"><span>Итого выбрано</span><strong>{kpMoney(chosenTotal(draft, previewIds), draft.currency)}</strong></div></>}
      {tab === 'review' && <section className="kp-section"><div className="kp-section-title"><h2>{workspace.stage_label}</h2><Button variant="secondary" disabled={busy} onClick={reload}>Обновить выбор клиента</Button></div>{workspace.selection.option_ids?.length ? <><p>Выбор клиента · версия {workspace.selection.revision}</p>{optionsOf(workspace.payload).filter(row => workspace.selection.option_ids.includes(row.id)).map(row => <div className="kp-summary-row" key={row.id}><span>{readableServiceTitle(row.title)}</span><strong>{kpMoney(row.price, workspace.payload.currency)}</strong></div>)}<p className="kp-description">{workspace.selection.comment}</p><div className="kp-total"><span>Итого</span><strong>{kpMoney(chosenTotal(workspace.payload, workspace.selection.option_ids), workspace.payload.currency)}</strong></div><p className="kp-muted">Перепроверьте стоимость и условия. Для ручных позиций отметьте проверку в конструкторе. После отправки итоговой версии клиент должен отдельно согласовать её.</p><div className="kp-inline-actions"><Button variant="secondary" disabled={busy} onClick={checkPrices}>Проверить цены через API</Button><Button disabled={busy || workspace.stage === 'approved'} onClick={() => setPublishPrompt(true)}>Отправить итог на согласование</Button></div>{workspace.stage === 'approved' && <Button variant="secondary" disabled={busy || !workspace.order} onClick={() => execute(async () => { const result = await interactiveApi.prepareServices(proposalId, workspace.version); accept(result); setNotice('Выбранные услуги подготовлены в заказе без повторного добавления. Бронирование запускается оператором отдельно.'); onChanged?.(); })}>Подготовить услуги в заказе</Button>}{workspace.stage === 'approved' && <p className="kp-explanation">Клиент согласовал условия. Перейдите в связанный заказ и запустите бронирование вручную. Этот конструктор не создаёт повторных услуг и не выполняет оплату.</p>}</> : <p className="kp-muted">Клиент ещё не отправил выбор. Опубликуйте КП и передайте ссылку.</p>}</section>}
      {tab === 'history' && <section className="kp-section"><h2>Версии и история</h2><Select aria-label="Версия предложения" value={revision} onChange={e => setRevision(e.target.value)} options={[{ value: '', label: 'Текущий черновик' }, ...workspace.publications.map(row => ({ value: String(row.revision), label: `Версия ${row.revision} · ${kpTime(row.at)}${row.final ? ' · итоговые условия' : ''}` }))]} />{revision && <details className="kp-constraints"><summary>Просмотреть сохранённую версию</summary><ProposalChoices payload={renderedPayload} ids={[]} packageId={null} disabled onChange={() => {}} /></details>}<ol className="kp-event-list">{workspace.events.map((event, index) => <li key={index}><div><strong>{KP_ACTIONS[event.action] || event.action}</strong><span>{event.actor} · {kpTime(event.at)} · версия {event.revision}</span></div>{event.data.comment && <p>{event.data.comment}</p>}{event.data.option_ids?.length > 0 && <p>Выбрано услуг: {event.data.option_ids.length} · {kpMoney(event.data.total, event.data.currency)}</p>}</li>)}</ol></section>}
    </div>}
    {servicePickerOpen && ServicePicker && <ServicePicker onClose={() => setServicePickerOpen(false)} onAdd={item => {
      if (item.currency !== draft.currency) { setError('Валюта выбранного предложения отличается от валюты КП'); return false; }
      const kind = KP_KINDS[item.kind] ? item.kind : 'other';
      const option = { ...newOption(kind), title: item.title, description: item.sub || '', price: String(item.cost + item.fee), currency: item.currency, offer: item.offer || null };
      const group = draft.groups.find(row => row.options[0]?.kind === kind);
      if (group) updateGroup(group.id, row => ({ ...row, options: [...row.options, option] }));
      else update({ groups: [...draft.groups, { id: uid('g'), title: KP_KINDS[kind], required: false, options: [option] }] });
      return true;
    }} />}
    {orderPickerOpen && OrderPicker && <OrderPicker orders={orders} onClose={() => setOrderPickerOpen(false)} onPick={order => execute(async () => { const result = await interactiveApi.save(proposalId, workspace.version, draft, order.id); backupControl.clear(); accept(result); onChanged?.(); })} />}
    <ConfirmDialog open={publishPrompt !== null} title={publishPrompt ? 'Передать итог на согласование?' : workspace?.revision ? 'Обновить клиентскую ссылку?' : 'Создать клиентскую ссылку?'} message={<div className="kp-publish-summary"><strong>{context.recipient}</strong><span>{context.route}</span><span>{context.dates}</span><p>{publishPrompt ? 'Клиент увидит проверенные итоговые условия и должен подтвердить их отдельно.' : 'Текущая версия станет доступна всем, у кого есть ссылка. Скопируйте и отправьте её клиенту после публикации.'}</p><span>Письмо не отправляется автоматически. Бронирование и оплата не выполняются.</span></div>} confirmLabel={publishPrompt ? 'Передать итог' : workspace?.revision ? 'Обновить ссылку' : 'Создать ссылку'} confirmVariant="primary" onCancel={() => !busy && setPublishPrompt(null)} onConfirm={async () => { const final = publishPrompt; setPublishPrompt(null); await publish(final); }} />
    <ConfirmDialog open={closePrompt} title="Сохранить изменения КП?" message="Опубликованная версия останется доступна клиенту. Изменения можно сохранить отдельно в черновике." confirmLabel="Сохранить и закрыть" confirmVariant="primary" onCancel={() => setClosePrompt(false)} onConfirm={() => execute(async () => { await save(); setClosePrompt(false); onClose(); })} />
  </Drawer>;
}
