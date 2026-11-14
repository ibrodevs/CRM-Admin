import { useRef, useState, useLayoutEffect } from 'react';
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js';
import { Drawer } from './Overlays.jsx';
import { Icon } from '../icons/index.jsx';
import { countryFlag } from '../lib/country-flag.js';
import { PHONE_COUNTRIES, phoneCountry, phoneValue, phoneDisplay, changePhoneCountry } from '../lib/phone.js';

export function PhoneInput(props) {
  const { value = '', onChange, onBlur, error, className = '', leadIcon, trailIcon, onTrail, locationAutocomplete, locationScope, onLocationSelect, phoneInput, defaultCountry = phoneCountry(props.placeholder || '', 'RU'), ...rest } = props;
  const [manualCountry, setManualCountry] = useState(false);
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [preferred, setPreferred] = useState(defaultCountry), [touched, setTouched] = useState(false);
  const country = manualCountry && (!value || String(value).startsWith(`+${getCountryCallingCode(preferred)}`)) ? preferred : phoneCountry(value, preferred);
  const ref = useRef(null), caret = useRef(null);
  const display = phoneDisplay(value, country);
  const parsed = parsePhoneNumberFromString(String(value), country);
  const invalid = touched && Boolean(value) && (!parsed?.isPossible() || Boolean(manualCountry && parsed.country && parsed.country !== country));
  useLayoutEffect(() => {
    if (caret.current == null || !ref.current || document.activeElement !== ref.current) return;
    let digits = 0, index = 0;
    while (index < display.length && digits < caret.current) { if (/\d/.test(display[index])) digits++; index++; }
    ref.current.setSelectionRange(index, index); caret.current = null;
  }, [display]);
  const emit = (next) => { const target = { name: rest.name, id: rest.id, value: next }; onChange?.({ target, currentTarget: target }); };
  return <div className={'phone-field' + (invalid || error ? ' has-error' : '')}>
    <div className="phone-control">
      <button type="button" className="phone-country-trigger" aria-label={`Выбрать страну и код: ${rest['aria-label'] || 'телефон'}`} aria-haspopup="dialog" aria-expanded={open} disabled={rest.disabled || rest.readOnly} onClick={() => { setQuery(''); setOpen(true); }}><span>{parsed?.isNonGeographic() ? '🌐' : countryFlag(country)}</span><Icon name="panelRight" /></button>
      <input {...rest} ref={ref} type="tel" inputMode="tel" autoComplete={rest.autoComplete || 'tel'} className={`input ${className}`} placeholder={`+${getCountryCallingCode(country)} …`} value={display} aria-invalid={invalid || !!error || undefined} onChange={(e) => {
        const before = e.target.value.slice(0, e.target.selectionStart).replace(/\D/g, '').length;
        const next = phoneValue(e.target.value, country);
        caret.current = before + (e.target.value.startsWith('+') || !next ? 0 : getCountryCallingCode(country).length);
        emit(next);
      }} onBlur={(e) => { setTouched(true); onBlur?.(e); }} />
    </div>
    <Drawer open={open} title="Страна и телефонный код" onClose={() => { setOpen(false); ref.current?.focus(); }} width="min(420px,100vw)">
      <input className="input" aria-label="Поиск страны или кода" placeholder="Страна или код, например +7" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="phone-country-list">{PHONE_COUNTRIES.filter((row) => `${row.name} ${row.country} +${row.code}`.toLowerCase().includes(query.trim().toLowerCase())).map((row) => <button type="button" key={row.country} className={'phone-country-option' + (country === row.country ? ' active' : '')} onClick={() => { setPreferred(row.country); setManualCountry(true); emit(changePhoneCountry(value, country, row.country)); setOpen(false); ref.current?.focus(); }}><span>{countryFlag(row.country)}</span><span>{row.name}</span><strong>+{row.code}</strong></button>)}</div>
    </Drawer>
    {invalid && <small className="phone-error">Проверьте длину номера и выбранную страну</small>}
  </div>;
}
