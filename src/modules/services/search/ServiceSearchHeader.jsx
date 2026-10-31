import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { cloneSearchValues } from './search-header.js';

export function ServiceSearchHeader({ title, subtitle, supplier, icon = 'search', values, fields, onSearch, busy = false, onEditingChange, children }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const pending = busy || submitting;
  const changeEditing = (next) => { setEditing(next); onEditingChange?.(next); };
  const edit = () => { setDraft(cloneSearchValues(values)); setError(''); changeEditing(true); };
  const cancel = () => { setError(''); changeEditing(false); };
  const apply = async () => {
    if (pending) return;
    setSubmitting(true); setError('');
    try {
      const result = await onSearch(cloneSearchValues(draft));
      if (!mounted.current) return;
      if (result === false || result == null) setError('Не удалось обновить результаты. Проверьте параметры и повторите поиск.');
      else changeEditing(false);
    } catch (failure) { if (mounted.current) setError(failure.message || 'Не удалось выполнить поиск'); }
    finally { if (mounted.current) setSubmitting(false); }
  };
  const activeFields = typeof fields === 'function' ? fields(editing ? draft : values) : fields;
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  return <>
    <section className="service-search-header" aria-label={`Параметры поиска: ${title}`}>
      <div className="ssh-identity"><span className="ssh-icon"><Icon name={icon} /></span><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}{supplier && <span className="ssh-supplier"><Icon name="api" />{supplier}</span>}</div></div>
      <div className="ssh-controls">
        <fieldset disabled={pending} className="ssh-fields" style={{ '--ssh-columns': Math.min(activeFields.length, 3) }} aria-busy={pending}>
          <div className="ssh-inputs">{activeFields.map((field) => <div className="ssh-field" key={field.key}>
            {editing ? field.render(draft, update) : <><span className="label">{field.label}</span><div className="ssh-value" title={String(field.value ?? '')}>{field.icon && <Icon name={field.icon} />}<span>{field.value || 'Не указано'}</span></div></>}
          </div>)}</div>
          <Button className="ssh-action" variant={editing ? 'primary' : 'secondary'} icon={editing ? 'search' : undefined} disabled={pending || !onSearch} onClick={editing ? apply : edit}>{pending ? 'Поиск…' : editing ? 'Найти' : 'Изменить'}</Button>
        </fieldset>
        <div className="ssh-meta"><button type="button" style={{ visibility: editing ? 'visible' : 'hidden' }} aria-hidden={!editing} tabIndex={editing ? 0 : -1} disabled={pending || !editing} onClick={cancel}>Отменить изменения</button></div>
        {error && <div className="ssh-error" role="alert">{error}</div>}
      </div>
    </section>
    <div className="service-search-body" ref={(node) => { if (node) node.inert = editing || pending; }} aria-busy={pending}>{children}</div>
  </>;
}
