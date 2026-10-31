import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
export function ProviderSetupFields({ providers, selected, environment, values, error, onSelect, onEnvironment, onChange }) {
  const provider = providers.find((item) => item.key === selected);
  return <>
    <div className="full"><Field label="API-поставщик" required><Select value={selected} placeholder="Выберите интеграцию" options={providers.map((item) => ({ value: item.key, label: item.name }))} onChange={(event) => onSelect(event.target.value)} /></Field></div>
    {error && <p className="err-text full" role="alert">{error}</p>}
    {provider && <>
      <div className="full"><Field label="Окружение доступа"><Select value={environment} options={[{value:'sandbox',label:'Sandbox / тестовое'},{value:'production',label:'Production / боевое'}]} onChange={(event) => onEnvironment(event.target.value)} /></Field></div>
      <p className="hint full">{provider.notes}</p>
      {environment !== provider.environment && <p className="hint full">Backend сейчас работает в окружении {provider.environment}. Эти реквизиты можно сохранить, но проверка и поиск станут доступны после переключения окружения backend.</p>}
      {provider.fields.map((field) => <div key={field.key} className={field.kind === 'json' || field.key === 'url' ? 'full' : ''}><Field label={field.label} required={field.required}>
        {field.kind === 'json' ? <textarea className="input" rows={3} value={values[field.key] || ''} onChange={(event) => onChange(field.key,event.target.value)} /> : <Input type={field.secret ? 'password' : 'text'} autoComplete="off" value={values[field.key] || ''} onChange={(event) => onChange(field.key,event.target.value)} />}
      </Field></div>)}
    </>}
  </>;
}
