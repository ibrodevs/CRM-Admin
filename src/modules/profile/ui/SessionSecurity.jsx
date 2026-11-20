import { useState } from 'react';
import { authApi } from '../../../shared/auth/auth.api.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';

const intervals = [0, 1, 5, 10, 15, 30, 60, 120, 240].map(value => ({ value: String(value), label: value ? `${value} мин.` : 'Не включать' }));
export function SessionSecurity({ auth }) {
  const current = auth.user?.session_security || {};
  const [form, setForm] = useState({ auto_lock_minutes: current.auto_lock_minutes || 0, auto_logout_minutes: current.auto_logout_minutes || 0, pin: '', confirmation: '', password: '', disable_pin: false });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const toast = useToast();
  const set = (key, value) => setForm(f=>({...f,[key]:value}));
  return <section className="card card-pad session-security-settings">
    <h3 className="card-title">PIN и время бездействия</h3>
    <p>Блокировка сохраняет рабочие формы. Автовыход завершает сессию и требует повторного входа.</p>
    <form onSubmit={async e=>{ e.preventDefault(); setError(''); if (form.pin && form.pin !== form.confirmation) { setError('PIN не совпадает с подтверждением'); return; } setBusy(true); try {
      await authApi.updateSecurity({ password: form.password, auto_lock_minutes: Number(form.auto_lock_minutes), auto_logout_minutes: Number(form.auto_logout_minutes), ...(form.pin ? { pin: form.pin } : {}), disable_pin: form.disable_pin });
      setForm(f=>({...f,pin:'',confirmation:'',password:'',disable_pin:false})); await auth.refreshSession(undefined, true); toast('Настройки безопасности сохранены', 'ok');
    } catch(e){setError(e.message);} finally{setBusy(false);} }}>
      <div className="form-grid">
        <Field label={current.pin_enabled ? 'Новый PIN (6 цифр)' : 'PIN (6 цифр)'}><Input type="password" autoComplete="new-password" inputMode="numeric" maxLength={6} value={form.pin} onChange={e=>set('pin',e.target.value.replace(/\D/g,''))} /></Field>
        <Field label="Повторите PIN"><Input type="password" autoComplete="new-password" inputMode="numeric" maxLength={6} value={form.confirmation} onChange={e=>set('confirmation',e.target.value.replace(/\D/g,''))} /></Field>
        <Field label="Блокировать через"><Select options={intervals} value={String(form.auto_lock_minutes)} onChange={e=>set('auto_lock_minutes',e.target.value)} /></Field>
        <Field label="Завершать сессию через"><Select options={intervals} value={String(form.auto_logout_minutes)} onChange={e=>set('auto_logout_minutes',e.target.value)} /></Field>
        <Field label="Текущий пароль для подтверждения"><Input type="password" autoComplete="current-password" required value={form.password} onChange={e=>set('password',e.target.value)} /></Field>
      </div>
      {current.pin_enabled && <label className="session-security-disable"><input type="checkbox" checked={form.disable_pin} onChange={e=>setForm(f=>({...f,disable_pin:e.target.checked,auto_lock_minutes:e.target.checked ? 0 : f.auto_lock_minutes}))} />Отключить PIN</label>}
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="profile-section-actions"><Button type="submit" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</Button>
        {current.pin_enabled && <Button type="button" variant="secondary" onClick={async()=>{try{await authApi.lock();await auth.refreshSession(undefined, true);}catch(e){setError(e.message);}}}>Заблокировать сейчас</Button>}</div>
    </form>
  </section>;
}
