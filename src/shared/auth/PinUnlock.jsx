import { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Field } from '../ui/Field.jsx';

export function PinUnlock({ auth }) {
  const [pin, setPin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [password, setPassword] = useState(false), [twoFactor,setTwoFactor]=useState(false);
  return <section className="pin-unlock card card-pad">
    <h2>Рабочее место заблокировано</h2><p>Введённые данные сохранены. {password ? 'Войдите по паролю.' : 'Введите PIN, чтобы продолжить.'}</p>
    <form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(''); try { if(twoFactor) await auth.verifyTwoFactor(pin); else if (password) { const result=await auth.login(auth.user.email, pin); if(result.twoFactorRequired){setTwoFactor(true);setPin('');} } else await auth.unlock(pin); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>
      <Field label={twoFactor ? 'Код двухфакторной проверки' : password ? 'Пароль' : 'PIN из 6 цифр'} error={error}><Input type="password" autoComplete={password ? 'current-password' : 'off'} inputMode={password ? undefined : 'numeric'} maxLength={password ? undefined : 6} value={pin} onChange={e=>setPin(password ? e.target.value : e.target.value.replace(/\D/g,''))} autoFocus /></Field>
      <Button type="submit" disabled={busy || (!password && pin.length !== 6)}>{busy ? 'Проверка…' : 'Разблокировать'}</Button>
    </form><Button variant="ghost" onClick={()=>{setPassword(v=>!v);setTwoFactor(false);setPin('');setError('');}}>{password ? 'Войти по PIN' : 'Войти по паролю'}</Button>
  </section>;
}
