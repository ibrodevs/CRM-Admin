import { useEffect, useState } from 'react';
import { usersApi } from '../../users/api.js';
import { resultsOf } from '../../../shared/api/client.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { UFDateField, ufDateFromIso, ufDateIso } from '../../../shared/ui/UnifiedDateField.jsx';

const KINDS = { vacation: 'Отпуск', sick_leave: 'Больничный', day_off: 'Выходной' };
const STATES = { pending: 'На согласовании', approved: 'Согласовано', rejected: 'Отклонено', cancelled: 'Отменено' };
const day = (value) => value ? value.split('-').reverse().join('.') : '—';
export function WorkAbsences({ user, canManage, onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState([]), [people, setPeople] = useState([]);
  const [target, setTarget] = useState(user.id), [kind, setKind] = useState('');
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [comment, setComment] = useState('');
  const [reasons, setReasons] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let loading = false;
    const reload = async () => {
      if (loading || abort.signal.aborted) return;
      loading = true;
      try { const data = await usersApi.absences(abort.signal); if (!abort.signal.aborted) setRows(resultsOf(data)); }
      catch (e) { if (e.name !== 'AbortError') setError(e.message); }
      finally { loading = false; }
    };
    reload();
    const timer = setInterval(reload, 30000);
    window.addEventListener('focus', reload);
    if (canManage) usersApi.all(abort.signal).then((data) => setPeople(resultsOf(data))).catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', reload); };
  }, [tick, canManage, user.id]);
  const perform = async (work, message) => {
    setBusy(true); setError('');
    try { await work(); setTick((value) => value + 1); await onSaved?.(); toast(message, 'ok'); return true; }
    catch (e) { setError(e.message); toast(e.message, 'err'); return false; }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!from || !to || to < from) { setError('Укажите начало и окончание отсутствия. Окончание — не раньше начала.'); return; }
    if (await perform(() => usersApi.createAbsence({ user: target, kind, starts_on: from, ends_on: to, comment }), canManage ? 'Отсутствие сохранено' : 'Заявка отправлена на согласование')) { setKind(''); setFrom(''); setTo(''); setComment(''); }
  };
  return <section className="work-absences" aria-label="Отсутствия и согласования">
    <h3>Статус и отсутствие</h3>
    <p className="hint">Текущий статус: <b>{user.workStatus || 'Работает'}</b>{user.absence_period && ` · ${user.absence_period.active ? 'до' : 'Запланировано:'} ${user.absence_period.active ? day(user.absence_period.ends_on) : `${day(user.absence_period.starts_on)} — ${day(user.absence_period.ends_on)}`}`}</p>
    <div className="form-grid">
      {canManage && <label><span className="label">Сотрудник</span><Select value={target} onChange={(e) => setTarget(e.target.value)} options={[{ value: user.id, label: `${user.name} (мой профиль)` }, ...people.filter((row) => row.id !== user.id && row.status === 'active').map((row) => ({ value: row.id, label: row.full_name || row.email }))]} /></label>}
      <label><span className="label">Вид отсутствия</span><Select value={kind} placeholder="Выберите статус" onChange={(e) => setKind(e.target.value)} options={Object.entries(KINDS).map(([value, label]) => ({ value, label }))} /></label>
      {kind && <>
        <UFDateField label="Первый день отсутствия" value={ufDateFromIso(from)} onChange={(value) => setFrom(ufDateIso(value) || '')} />
        <UFDateField label="Последний день отсутствия (включительно)" value={ufDateFromIso(to)} onChange={(value) => setTo(ufDateIso(value) || '')} />
        <label className="full"><span className="label">Комментарий (необязательно)</span><Input value={comment} maxLength={2000} onChange={(e) => setComment(e.target.value)} locationAutocomplete={false} /></label>
      </>}
    </div>
    {kind && <><p className="hint">{canManage ? 'Период будет согласован сразу. Сотрудник получит уведомление в CRM.' : 'До согласования статус не изменится. Заявку получит руководитель, а если он не назначен — администраторы.'}</p><Button disabled={busy} onClick={submit}>{canManage ? 'Сохранить отсутствие' : 'Отправить на согласование'}</Button></>}
    {error && <p role="alert" className="work-absence-error">{error}</p>}
    <div className="work-absence-history"><h4>Заявки и история отсутствий</h4>
      {!rows.length && !error && <p className="hint">Записей пока нет</p>}
      {rows.map((row) => <article className="work-absence-row" key={row.id}>
        <div><strong>{row.user_name || user.name} · {KINDS[row.kind]}</strong><span>{day(row.starts_on)} — {day(row.ends_on)} · {STATES[row.status]}</span>{row.comment && <span>{row.comment}</span>}{row.decision_comment && <span>Решение: {row.decision_comment}</span>}</div>
        {row.can_review && <><Input aria-label={`Причина решения по заявке ${row.id}`} placeholder="Причина отклонения / комментарий" value={reasons[row.id] || ''} maxLength={2000} locationAutocomplete={false} onChange={(e) => setReasons((old) => ({ ...old, [row.id]: e.target.value }))} /><div className="work-absence-actions"><Button size="sm" disabled={busy} onClick={() => perform(() => usersApi.decideAbsence(row.id, 'approve', reasons[row.id]), 'Заявка согласована')}>Согласовать</Button><Button size="sm" variant="secondary" disabled={busy || !reasons[row.id]?.trim()} onClick={() => perform(() => usersApi.decideAbsence(row.id, 'reject', reasons[row.id]), 'Заявка отклонена')}>Отклонить</Button></div></>}
        {(canManage && ['approved', 'pending'].includes(row.status) || row.user === user.id && row.status === 'pending') && <Button size="sm" variant="secondary" disabled={busy} onClick={() => perform(() => usersApi.decideAbsence(row.id, 'cancel'), 'Запись отменена')}>{row.status === 'pending' ? 'Отозвать заявку' : 'Отменить отсутствие'}</Button>}
      </article>)}
    </div>
  </section>;
}
