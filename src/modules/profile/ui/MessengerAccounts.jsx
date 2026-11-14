import { useEffect, useState } from 'react';
import { accountApi } from '../../account/api.js';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Field } from '../../../shared/ui/Field.jsx';

const NAMES = { telegram: 'Telegram', max: 'MAX', whatsapp: 'WhatsApp' };
export function MessengerAccounts({ onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState([]), [selected, setSelected] = useState(null), [address, setAddress] = useState(''), [code, setCode] = useState(''), [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [tick, setTick] = useState(0), [unlink, setUnlink] = useState(false), [botUrl, setBotUrl] = useState('');
  useEffect(() => { const abort = new AbortController(); accountApi.messengerBindings(abort.signal).then((data) => setRows(data.results || [])).catch((e) => { if (e.name !== 'AbortError') setError(e.message); }); return () => abort.abort(); }, [tick]);
  useEffect(() => {
    if (!selected || !botUrl) return undefined;
    const abort = new AbortController();
    let fetching = false;
    const check = async () => {
      if (fetching || abort.signal.aborted) return;
      fetching = true;
      try { const data = await accountApi.messengerBindings(abort.signal); const row = data.results?.find((r) => r.channel === selected.channel); if (row?.verified && !row.pending && row.verified_at !== selected.verified_at) { setRows(data.results); setSelected(null); await onSaved?.(); toast('Аккаунт Telegram привязан', 'ok'); } else if (row && !row.pending) { setError('Ссылка истекла или отменена. Получите новую ссылку.'); setBotUrl(''); setSent(false); } }
      catch (e) { if (e.name !== 'AbortError') setError(e.message); }
      finally { fetching = false; }
    };
    const timer = setInterval(check, 3000); window.addEventListener('focus', check);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', check); };
  }, [selected?.channel, botUrl]);
  const action = async (type) => {
    setBusy(true); setError('');
    try {
      const result = await accountApi.messengerAction(selected.channel, type, { address, code });
      if (type === 'start' && result.url) { setBotUrl(result.url); setSent(true); }
      else if (type === 'start') { setSent(true); setCode(''); toast('Код отправлен в выбранный мессенджер', 'ok'); }
      else { setRows(result.results || []); setSelected(null); await onSaved?.(); toast(type === 'unlink' ? 'Аккаунт отвязан' : 'Аккаунт подтверждён и привязан', 'ok'); }
    } catch (e) { setError(e.message); toast(e.message, 'err'); }
    finally { setBusy(false); }
  };
  return <section className="card card-pad"><h3>Мессенджеры и подтверждённые аккаунты</h3><p className="hint">Контакт считается привязанным после подтверждения в боте или одноразовым кодом из мессенджера. Новый аккаунт заменяет прежний только после успешного подтверждения.</p>
    {!rows.length && <Button variant="secondary" size="sm" onClick={() => setTick((n) => n + 1)}>Загрузить состояние каналов</Button>}
    <div className="messenger-account-grid">{rows.map((row) => <article className="messenger-account" key={row.channel}><strong>{NAMES[row.channel]}</strong><span>{row.verified ? 'Аккаунт подтверждён' : row.address ? 'Контакт указан, но не подтверждён' : 'Аккаунт не привязан'}</span>{row.address && <b>{row.address}</b>}
      {!row.configured && <p className="hint">Канал организации пока не подключён. Для привязки администратору нужно настроить интеграцию.</p>}
      <div className="work-absence-actions"><Button size="sm" variant="secondary" disabled={!row.configured} onClick={() => { setSelected(row); setAddress(row.address || ''); setSent(false); setCode(''); setError(''); setUnlink(false); setBotUrl(''); }}>{row.verified ? 'Сменить аккаунт' : 'Привязать аккаунт'}</Button>{row.address && <Button size="sm" variant="secondary" onClick={() => { setSelected(row); setUnlink(true); setError(''); setBotUrl(''); }}>Отвязать</Button>}</div>
    </article>)}</div>
    {error && !selected && <p role="alert" className="work-absence-error">{error}</p>}
    <Drawer open={Boolean(selected)} title={`${unlink ? 'Отвязать' : 'Привязать'} ${NAMES[selected?.channel] || 'аккаунт'}`} onClose={() => setSelected(null)} width="min(480px,100vw)" footer={<Button disabled={busy || Boolean(botUrl) || (!unlink && selected?.mode !== 'bot' && (!address || sent && code.length !== 6))} onClick={() => action(unlink ? 'unlink' : sent ? 'confirm' : 'start')}>{busy ? 'Подождите…' : unlink ? 'Подтвердить отвязку' : botUrl ? 'Ожидаем подтверждение в Telegram' : selected?.mode === 'bot' ? 'Получить ссылку для привязки' : sent ? 'Подтвердить аккаунт' : 'Получить код в мессенджере'}</Button>}>
      {botUrl && <div className="profile-sections"><a className="btn btn-primary" href={botUrl} target="_blank" rel="noopener noreferrer">Открыть Telegram-бота</a><p className="hint">Нажмите Start в боте. После подтверждения аккаунт привяжется автоматически; ID чата вводить не нужно. Ссылка действует 10 минут.</p></div>}
      {unlink ? <p>Контакт будет удалён из профиля, уведомления в этот аккаунт перестанут отправляться.</p> : <div className="profile-sections">
        {selected?.mode !== 'bot' && !botUrl && <Field label={selected?.channel === 'whatsapp' ? 'Телефон WhatsApp' : selected?.channel === 'telegram' ? 'ID личного чата с ботом организации' : 'ID аккаунта MAX'}><Input value={address} readOnly={sent} phoneInput={selected?.channel === 'whatsapp'} locationAutocomplete={false} onChange={(e) => setAddress(e.target.value)} placeholder={selected?.channel === 'telegram' ? 'Числовой ID чата' : ''} /></Field>}
        {selected?.channel === 'telegram' && selected?.mode !== 'bot' && <p className="hint">Сначала откройте Telegram-бота вашей организации и отправьте /start. ID личного чата можно получить у бота или администратора. Имя @username не используется для отправки кода ботом.</p>}
        {selected?.mode === 'bot' && !botUrl && <p className="hint">Для привязки откройте персональную ссылку на бота организации и нажмите Start.</p>}
        {sent && !botUrl && <><Field label="Код из мессенджера"><Input inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field><p className="hint">Код действует 10 минут. Не более пяти попыток ввода.</p><Button size="sm" variant="secondary" onClick={() => { setSent(false); setCode(''); }}>Изменить адрес / запросить новый код</Button></>}
      </div>}
      {error && <p role="alert" className="work-absence-error">{error}</p>}
    </Drawer>
  </section>;
}
