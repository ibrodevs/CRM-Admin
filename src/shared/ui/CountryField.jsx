import { useRef, useState } from 'react';
import { Drawer } from './Overlays.jsx';
import { SearchBox } from './SearchBox.jsx';
import { Button } from './Button.jsx';
import { Icon } from '../icons/index.jsx';
import { countryFlag } from '../lib/country-flag.js';
import { countryCode, countryName, countrySelection, searchCountries } from '../lib/countries.js';

// One country/citizenship selector for booking, people, documents and receipts.
// Legacy name-valued forms use valueFormat="name"; API-valued forms use codes.
export function CountryField({ value = '', onChange, multiple = false, valueFormat = 'code', placeholder = 'Выберите страну', title = 'Выбор страны', allowEmpty = false, emptyLabel = 'Не выбрано', disabled = false, error = false, id, className = '', 'aria-label': ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState([]);
  const trigger = useRef(null);
  const codes = multiple ? countrySelection(value) : [countryCode(value)].filter(Boolean);
  const display = codes.map(countryName).join(', ') || (value ? String(value) : '');
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const show = () => { setDraft(codes); setQuery(''); setOpen(true); };
  const formatted = (items) => valueFormat === 'name' ? items.map(countryName).join(', ') : items.join(', ');
  const commit = (items) => { onChange(formatted(items)); close(); };
  const rows = searchCountries(query);
  return <>
    <button type="button" ref={trigger} id={id} disabled={disabled} className={`input country-field${error ? ' err' : ''}${className ? ` ${className}` : ''}`} aria-label={ariaLabel || title} aria-haspopup="dialog" aria-expanded={open} aria-invalid={Boolean(error) || undefined} onClick={show}>
      <span className="country-field-flag" aria-hidden="true">{codes.length === 1 ? countryFlag(codes[0]) : <Icon name="globe" />}</span><span className={!display ? 'country-field-placeholder' : ''} title={display || placeholder}>{display || placeholder}</span><Icon name="chevRight" />
    </button>
    {value && !codes.length && !allowEmpty && <span className="country-picker-hint">Сохранённое значение не найдено в справочнике. Уточните страну перед сохранением.</span>}
    <Drawer open={open} title={title} onClose={close} width="min(480px,96vw)" className="country-picker-drawer" showDraftNotice={false} footer={<>{allowEmpty && <Button variant="secondary" onClick={() => commit([])}>{emptyLabel}</Button>}{multiple ? <Button onClick={() => commit(draft)} disabled={!draft.length && !allowEmpty}>Применить{draft.length ? ` · ${draft.length}` : ''}</Button> : <Button variant="secondary" onClick={close}>Закрыть</Button>}</>}>
      <SearchBox autoFocus value={query} onChange={setQuery} placeholder="Название страны или код" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }} />
      {multiple ? <><p className="country-picker-hint">Выбрано стран: {draft.length}. Можно выбрать несколько.</p>{draft.length > 0 && <div className="country-picker-selected">{draft.map((code) => <button type="button" key={code} aria-label={`Убрать ${countryName(code)}`} onClick={() => setDraft((current) => current.filter((value) => value !== code))}>{countryFlag(code)} {countryName(code)}<Icon name="x" /></button>)}</div>}</> : codes.length > 0 && <p className="country-picker-hint">Выбрано: {countryName(codes[0])}</p>}
      <div className="country-picker-options" role="group" aria-label={multiple ? 'Страны страхования' : 'Страны'}>{rows.map((country) => {
        const selected = (multiple ? draft : codes).includes(country.code);
        return <button type="button" key={country.code} className={`country-picker-option${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={() => multiple ? setDraft((current) => current.includes(country.code) ? current.filter((code) => code !== country.code) : [...current, country.code]) : commit([country.code])}>
          <span className="country-field-flag" aria-hidden="true">{countryFlag(country.code)}</span><span>{country.label}</span><small>{country.code}</small>{selected && <Icon name="check" />}
        </button>;
      })}</div>
      {!rows.length && <p className="country-picker-hint">Страна не найдена. Измените название или введите код страны.</p>}
    </Drawer>
  </>;
}
