import { DateTimeField } from '../../../shared/ui/DateTimeField.jsx';
import { useEffect, useId, useState } from 'react';
import { servicesApi } from '../api/servicesApi.js';
import { REMARK_GROUPS, REMARK_LIMIT, remarkGroup, remarkPage } from './remarks.js';

export function HotelRemarks({ offerId, value, onChange, operatorRequest = '', onOperatorRequestChange }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(0);
  const id = useId();
  useEffect(() => {
    const controller = new AbortController();
    setRows(null); setError(''); setQuery(''); setGroup('all'); setPage(0);
    servicesApi.hotelRemarks(offerId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRows(data.results || []);
    }).catch((err) => { if (!controller.signal.aborted) setError(err.message || 'Не удалось загрузить пожелания'); });
    return () => controller.abort();
  }, [offerId, retry]);
  const catalog = rows || [];
  const result = remarkPage(catalog, query, group, page);
  const remove = (key) => onChange(value.filter((item) => item.remarkId !== key));
  return <fieldset className="hotel-remarks">
    <legend className="hp-col-subtitle">Пожелания в отель <span className="hp-opt">(необязательно)</span></legend>
    <p className="hint">Выберите пожелания поставщика. Выполнение зависит от возможностей отеля.</p>
    <section className="hotel-remarks-selected" aria-label="Выбранные пожелания">
      <div className="hotel-remarks-heading"><b>Выбрано {value.length} из {REMARK_LIMIT}</b>{value.length > 0 && <button type="button" className="hotel-remarks-link" onClick={() => onChange([])}>Снять все</button>}</div>
      {!value.length && <p className="hint">Выбранные пожелания и уточнения появятся здесь.</p>}
      <div className="hotel-remarks-selection">
        {value.map((item) => {
          const row = catalog.find((entry) => entry.id === item.remarkId);
          const title = row?.title.replaceAll('{value}', '…') || `Пожелание №${item.remarkId}`;
          return <div className="hotel-remarks-chosen" key={item.remarkId}>
            <div><span>{title}</span><button type="button" className="hotel-remarks-remove" aria-label={`Убрать: ${title}`} onClick={() => remove(item.remarkId)}>×</button></div>
            {row && row.dataType !== 'NONE' && <div className="hotel-remarks-value">Уточнение к пожеланию
              {row.dataType === 'DATETIME'
                ? <DateTimeField value={item.data || ''} onChange={(data) => onChange(value.map((entry) => entry.remarkId === item.remarkId ? { ...entry, data } : entry))} />
                : <input className="input" type="text" aria-label="Уточнение к пожеланию" maxLength={2000} required value={item.data || ''}
                  onChange={(event) => onChange(value.map((entry) => entry.remarkId === item.remarkId ? { ...entry, data: event.target.value } : entry))} />}
            </div>}
          </div>;
        })}
      </div>
    </section>
    <label className="hotel-remarks-search" htmlFor={`${id}-search`}>Поиск пожеланий
      <input id={`${id}-search`} className="input" type="search" placeholder="Кровать, этаж, время заезда…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
    </label>
    <div className="hotel-remarks-groups" role="group" aria-label="Группы пожеланий">
      {[['all', 'Все'], ...REMARK_GROUPS].map(([key, label]) => {
        const count = key === 'all' ? catalog.length : catalog.filter((row) => remarkGroup(row) === key).length;
        return (count > 0 || key === 'all') && <button key={key} type="button" aria-pressed={group === key} onClick={() => { setGroup(key); setPage(0); }}>{label} <span>{count}</span></button>;
      })}
    </div>
    {error && <p role="alert">{error} <button type="button" className="hotel-remarks-link" onClick={() => setRetry((n) => n + 1)}>Повторить</button></p>}
    {!rows && !error && <p role="status">Загружаем пожелания…</p>}
    {rows && <>
      <div className="hotel-remarks-results" aria-label="Доступные пожелания">
        {result.rows.map((row) => {
          const chosen = value.some((item) => item.remarkId === row.id);
          return <label className="hotel-remarks-option" key={row.id}>
            <input type="checkbox" checked={chosen} disabled={!chosen && value.length >= REMARK_LIMIT} onChange={(event) => event.target.checked ? onChange([...value, { remarkId: row.id, data: row.dataType === 'NONE' ? null : '' }]) : remove(row.id)} />
            <span>{row.title.replaceAll('{value}', '…')}{row.dataType !== 'NONE' && <small>Потребуется уточнение</small>}</span>
          </label>;
        })}
        {!result.total && <p className="hint">{catalog.length ? 'Ничего не найдено. Измените запрос или группу.' : 'Доступных пожеланий нет.'}</p>}
      </div>
      <div className="hotel-remarks-pagination"><span role="status">Найдено: {result.total} · {result.index + 1} / {result.pages}</span>
        <div><button type="button" aria-label="Предыдущая страница пожеланий" disabled={!result.index} onClick={() => setPage(result.index - 1)}>←</button><button type="button" aria-label="Следующая страница пожеланий" disabled={result.index + 1 >= result.pages} onClick={() => setPage(result.index + 1)}>→</button></div>
      </div>
      {value.length >= REMARK_LIMIT && <p className="hint" role="status">Можно выбрать до {REMARK_LIMIT} пожеланий. Остальное укажите в запросе оператору.</p>}
    </>}
    <div className="hotel-remarks-request">
      <label htmlFor={`${id}-request`}>Произвольный запрос оператору</label>
      <textarea id={`${id}-request`} className="hp-textarea" rows={3} maxLength={2000} value={operatorRequest} onChange={(event) => onOperatorRequestChange?.(event.target.value)} aria-describedby={`${id}-note`} placeholder="Опишите пожелания, которых нет в списке…" />
      <p id={`${id}-note`} className="hint">Сохраним в CRM для отдельного согласования оператором. HBPRO не принимает свободный текст через API. Запрос не отправляется в отель автоматически.</p>
      <small>{operatorRequest.length} / 2000</small>
    </div>
  </fieldset>;
}
