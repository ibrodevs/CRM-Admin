import { useEffect, useState } from 'react';
import { authApi } from '../../../shared/auth/auth.api.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { PasswordInput } from '../../../shared/ui/PasswordInput.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Pill } from '../../../shared/ui/Pill.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';

const intervals = [0, 1, 5, 10, 15, 30, 60, 120, 240].map(value => ({ value: String(value), label: value ? `${value} мин.` : 'Не включать' }));
export function SessionSecurity({ auth }) {
  const current = auth.user?.session_security || {};
  const [saved, setSaved] = useState(current);
  const [form, setForm] = useState({ auto_lock_minutes: current.auto_lock_minutes || 0, auto_logout_minutes: current.auto_logout_minutes || 0, pin: '', confirmation: '', password: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [editingPin, setEditingPin] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false), [disablePassword, setDisablePassword] = useState(''), [disableError, setDisableError] = useState('');
  const toast = useToast();
  const enabled = Boolean(saved.pin_enabled);
  const showPinFields = !enabled || editingPin;
  useEffect(() => { setSaved(current); }, [current.pin_enabled, current.pin_length, current.auto_lock_minutes, current.auto_logout_minutes]);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const cancelPinChange = () => { setEditingPin(false); setForm(f => ({ ...f, pin: '', confirmation: '' })); setError(''); };
  const closeDisable = () => { if (!busy) { setDisableOpen(false); setDisablePassword(''); setDisableError(''); } };
  const refresh = async () => { try { await auth.refreshSession(undefined, true); } catch { /* The update response already contains the confirmed security state. */ } };

  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if ((form.pin || editingPin) && !/^[0-9]{4}$/.test(form.pin)) { setError('PIN должен состоять из 4 цифр'); return; }
    if (form.pin !== form.confirmation) { setError('PIN не совпадает с подтверждением'); return; }
    const password = new FormData(event.currentTarget).get('current_password');
    setBusy(true);
    try {
      const result = await authApi.updateSecurity({ password, auto_lock_minutes: Number(form.auto_lock_minutes), auto_logout_minutes: Number(form.auto_logout_minutes), ...(form.pin ? { pin: form.pin } : {}) });
      setSaved(result);
      setForm(f => ({ ...f, pin: '', confirmation: '', password: '' }));
      setEditingPin(false);
      await refresh();
      toast('Настройки безопасности сохранены', 'ok');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const disable = async event => {
    event.preventDefault();
    if (busy) return;
    const password = new FormData(event.currentTarget).get('disable_password');
    if (!password) { setDisableError('Введите текущий пароль'); return; }
    setBusy(true); setDisableError('');
    try {
      const result = await authApi.updateSecurity({ password, disable_pin: true });
      setSaved(result);
      setForm(f => ({ ...f, auto_lock_minutes: 0, pin: '', confirmation: '', password: '' }));
      setEditingPin(false); setDisableOpen(false); setDisablePassword(''); setError('');
      await refresh();
      toast('PIN отключён', 'ok');
    } catch (e) { setDisableError(e.message); } finally { setBusy(false); }
  };

  return <section className="card card-pad session-security-settings">
    <h3 className="card-title">PIN и время бездействия</h3>
    <p>Блокировка сохраняет рабочие формы. Автовыход завершает сессию и требует повторного входа.</p>
    <div className={`session-security-status${enabled ? ' enabled' : ''}`} role="status" aria-live="polite">
      <span className="session-security-status-icon"><Icon name={enabled ? 'lock' : 'alertCircle'} /></span>
      <div><Pill tone={enabled ? 'green' : 'gray'}>{enabled ? 'PIN включён' : 'PIN не установлен'}</Pill>
        <p>{enabled ? saved.auto_lock_minutes ? `Автоблокировка через ${saved.auto_lock_minutes} мин. бездействия` : 'Можно заблокировать рабочее место вручную. Автоблокировка выключена.' : 'Установите PIN из 4 цифр для блокировки рабочего места.'}</p>
      </div>
      {enabled && !editingPin && <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => setEditingPin(true)}>Изменить PIN</Button>}
    </div>
    <form autoComplete="off" onSubmit={save}>
      <input type="hidden" name="username" autoComplete="username" value={auth.user?.email || ''} />
      <fieldset disabled={busy} className="session-security-fields">
        {showPinFields && <div className="session-security-pin-edit">
          <div className="form-grid">
            <Field label={enabled ? 'Новый PIN (4 цифры)' : 'PIN (4 цифры)'}><PasswordInput secretLabel="PIN" allowCopy={false} name="session-pin" autoComplete="off" data-1p-ignore="true" data-lpignore="true" inputMode="numeric" maxLength={4} minLength={4} pattern="[0-9]{4}" required={editingPin} value={form.pin} onChange={e => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))} /></Field>
            <Field label="Повторите PIN"><PasswordInput secretLabel="PIN" allowCopy={false} name="session-pin-confirmation" autoComplete="off" data-1p-ignore="true" data-lpignore="true" inputMode="numeric" maxLength={4} minLength={4} pattern="[0-9]{4}" required={editingPin} value={form.confirmation} onChange={e => set('confirmation', e.target.value.replace(/\D/g, '').slice(0, 4))} /></Field>
          </div>
          {enabled && <Button type="button" variant="ghost" size="sm" onClick={cancelPinChange}>Отменить изменение PIN</Button>}
        </div>}
        <div className="form-grid">
          <Field label="Блокировать через"><Select options={intervals} value={String(form.auto_lock_minutes)} onChange={e => set('auto_lock_minutes', e.target.value)} /></Field>
          <Field label="Завершать сессию через"><Select options={intervals} value={String(form.auto_logout_minutes)} onChange={e => set('auto_logout_minutes', e.target.value)} /></Field>
          <div className="session-security-password"><Field label="Текущий пароль для подтверждения"><PasswordInput name="current_password" autoComplete="current-password" required value={form.password} onChange={e => set('password', e.target.value)} /></Field></div>
        </div>
      </fieldset>
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="profile-section-actions"><Button type="submit" disabled={busy}>{busy ? 'Сохранение…' : editingPin ? 'Сохранить новый PIN' : 'Сохранить'}</Button>
        {enabled && <Button type="button" variant="secondary" disabled={busy} onClick={async () => { setBusy(true); try { await authApi.lock(); await auth.refreshSession(undefined, true); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>Заблокировать сейчас</Button>}</div>
    </form>
    {enabled && <div className="session-security-disable-action"><div><strong>Отключение PIN</strong><p>Отключит блокировку по PIN и автоблокировку.</p></div><Button type="button" variant="secondary" disabled={busy} onClick={() => { setDisableOpen(true); setDisablePassword(''); setDisableError(''); }}>Отключить PIN<Icon name="chevRight" /></Button></div>}
    <Drawer open={disableOpen} onClose={closeDisable} title="Отключить PIN?" width="min(440px,92vw)"
      footer={<><Button type="button" variant="secondary" disabled={busy} onClick={closeDisable}>Отмена</Button><Button type="submit" form="disable-session-pin" variant="danger" disabled={busy}>{busy ? 'Отключение…' : 'Подтвердить отключение'}</Button></>}>
      <p>Блокировка по PIN и автоматическая блокировка будут отключены. Для включения потребуется установить PIN заново.</p>
      <form id="disable-session-pin" onSubmit={disable}>
        <input type="hidden" name="username" autoComplete="username" value={auth.user?.email || ''} />
        <Field label="Текущий пароль" error={disableError}><PasswordInput name="disable_password" autoComplete="current-password" required autoFocus disabled={busy} value={disablePassword} onChange={e => setDisablePassword(e.target.value)} /></Field>
      </form>
    </Drawer>
  </section>;
}
