import { useEffect, useState } from 'react';
import { suppliersApi } from '../api/suppliersApi.js';
import { TTBOOKING_DEFAULTS, ttbookingCredential } from '../model/ttbooking.js';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Button } from '../../../shared/ui/Button.jsx';

export function TTBookingFields({ value, onChange }) {
  return <div className="form-grid">
    {[['url', 'API URL'], ['agency', 'Agency'], ['user', 'User'], ['password_key', 'Password Key']].map(([key, label]) =>
      <Field key={key} label={label} required={key !== 'password_key'}>
        <Input type={key === 'password_key' ? 'password' : 'text'} autoComplete={key === 'password_key' ? 'new-password' : 'off'}
          value={value[key] || ''} onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
      </Field>)}
    <Field label="Locale"><Select options={['ru']} value={value.locale} onChange={(event) => onChange({ ...value, locale: event.target.value })} /></Field>
    <Field label="Environment"><Select options={['sandbox', 'production']} value={value.environment} onChange={(event) => onChange({ ...value, environment: event.target.value })} /></Field>
  </div>;
}

export function TTBookingCredentials({ supplierId, toast, onCredentialState, verificationStatus, preferredEnvironment }) {
  const [config, setConfig] = useState({ ...TTBOOKING_DEFAULTS });
  const [credential, setCredential] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    suppliersApi.credentials(supplierId, controller.signal).then((rows) => {
      const current = rows.find((row) => row.provider_adapter === 'ttbooking' && row.environment === preferredEnvironment) || rows.find((row) => row.provider_adapter === 'ttbooking' && row.status === 'active') || rows.find((row) => row.provider_adapter === 'ttbooking');
      setCredential(current || null);
      if (current && verificationStatus !== 'checking') onCredentialState?.(current);
      if (current) setConfig({ ...TTBOOKING_DEFAULTS, ...current.public_config, environment: current.environment, password_key: '' });
      setReady(true);
    }).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); });
    return () => controller.abort();
  }, [supplierId, verificationStatus, preferredEnvironment]);
  const save = async () => {
    setBusy(true); setError('');
    try {
      if (!config.agency || !config.user || (!credential?.has_secrets && !config.password_key)) throw new Error('Заполните Agency, User и Password Key');
      const saved = await suppliersApi.saveCredential(supplierId, ttbookingCredential(config));
      setCredential(saved); onCredentialState?.(saved); setConfig((current) => ({ ...current, password_key: '' }));
      toast('Реквизиты TT Booking сохранены. Проверьте подключение.', 'ok');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className="card card-pad" style={{ marginTop: 16 }}>
    <div style={{ fontWeight: 700, marginBottom: 12 }}>Настройка TT Booking · API · Авиа</div>
    <TTBookingFields value={config} onChange={setConfig} />
    {credential?.has_secrets && <p>Ключ сохранён. Оставьте Password Key пустым, чтобы сохранить текущий ключ.</p>}
    <p>Статус: {credential?.connection_verified ? 'Подключено' : credential?.status === 'failed' ? 'Требует настройки' : credential ? 'Требует проверки' : 'Не настроено'}</p>
    {error && <p role="alert">{error}</p>}
    <Button onClick={save} disabled={busy || !ready}>{busy ? 'Сохранение…' : 'Сохранить TT Booking'}</Button>
  </div>;
}
