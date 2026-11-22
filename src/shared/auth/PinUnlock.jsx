import { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Field } from '../ui/Field.jsx';

export function PinUnlock({ auth }) {
  const [pin, setPin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [password, setPassword] = useState(false), [twoFactor,setTwoFactor]=useState(false);
  const security = auth.user?.session_security || {};
  const pinLength = security.pin_length === 6 || (security.pin_enabled && security.pin_length == null) ? 6 : 4;
  const codeLength = twoFactor ? 6 : pinLength;
  const enteringPassword = password && !twoFactor;
  return <section className="pin-unlock card card-pad">
    <h2>Рабочее место заблокировано</h2><p>Введённые данные сохранены. {password ? 'Войдите по паролю.' : 'Введите PIN, чтобы продолжить.'}</p>
    <form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); try { if(twoFactor) await auth.verifyTwoFactor(pin); else if (password) { const result=await auth.login(auth.user.email, pin); if(result.twoFactorRequired){setTwoFactor(true);setPin('');} } else await auth.unlock(pin); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>
      <Field label={twoFactor ? 'Код двухфакторной проверки' : password ? 'Пароль' : `PIN из ${pinLength} цифр`} error={error}><Input type="password" name={enteringPassword ? 'password' : twoFactor ? 'two-factor-code' : 'session-pin'} autoComplete={enteringPassword ? 'current-password' : twoFactor ? 'one-time-code' : 'off'} inputMode={enteringPassword ? undefined : 'numeric'} maxLength={enteringPassword ? undefined : codeLength} value={pin} onChange={e=>setPin(enteringPassword ? e.target.value : e.target.value.replace(/\D/g,'').slice(0,codeLength))} autoFocus /></Field>
      <Button type="submit" disabled={busy || (!enteringPassword && pin.length !== codeLength)}>{busy ? 'Проверка…' : 'Разблокировать'}</Button>
    </form><Button variant="ghost" onClick={()=>{setPassword(v=>!v);setTwoFactor(false);setPin('');setError('');}}>{password ? 'Войти по PIN' : 'Войти по паролю'}</Button>
  </section>;
}
