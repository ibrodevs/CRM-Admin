import { useRef, useState, useLayoutEffect } from 'react';
import { parsePhoneNumberFromString, getCountryCallingCode } from 'libphonenumber-js';
import { countryFlag } from '../lib/country-flag.js';
import { phoneCountry, phoneValue, phoneInputValue, phoneDisplay } from '../lib/phone.js';

export function PhoneInput(props) {
  const { value = '', onChange, onBlur, error, className = '', leadIcon, trailIcon, onTrail, locationAutocomplete, locationScope, onLocationSelect, phoneInput, defaultCountry = phoneCountry(props.placeholder || '', 'RU'), ...rest } = props;
  const [touched, setTouched] = useState(false);
  const canonical = value ? phoneValue(value, defaultCountry) : '';
  const country = phoneCountry(canonical, defaultCountry);
  const ref = useRef(null), caret = useRef(null);
  const display = phoneDisplay(canonical, country);
  const parsed = parsePhoneNumberFromString(String(value), country);
  const invalid = touched && Boolean(value) && (!parsed?.isPossible() || phoneInputValue(value, defaultCountry) !== String(value).replace(/[^+\d]/g, ''));
  useLayoutEffect(() => {
    if (caret.current == null || !ref.current || document.activeElement !== ref.current) return;
    let digits = 0, index = 0;
    while (index < display.length && digits < caret.current) { if (/\d/.test(display[index])) digits++; index++; }
    ref.current.setSelectionRange(index, index); caret.current = null;
  }, [display]);
  const emit = (next) => { const target = { name: rest.name, id: rest.id, value: next }; onChange?.({ target, currentTarget: target }); };
  return <div className={'phone-field' + (invalid || error ? ' has-error' : '')}>
    <div className="phone-control">
      <span className="phone-country-indicator" role="img" aria-label={parsed?.isNonGeographic() ? 'Международный номер' : `Страна номера: ${new Intl.DisplayNames(['ru'], { type: 'region' }).of(country)}`} title="Страна определяется по номеру">{!value || parsed?.isNonGeographic() ? '🌐' : country === 'RU' ? <svg viewBox="0 0 30 20" width="30" height="20" aria-hidden="true"><path fill="#fff" d="M0 0h30v20H0z" /><path fill="#0039a6" d="M0 6.67h30v6.67H0z" /><path fill="#d52b1e" d="M0 13.33h30V20H0z" /></svg> : countryFlag(country)}</span>
      <input {...rest} ref={ref} type="tel" inputMode="tel" autoComplete={rest.autoComplete || 'tel'} className={`input ${className}`} placeholder={`+${getCountryCallingCode(country)} …`} value={display} aria-invalid={invalid || !!error || undefined} onChange={(e) => {
        const before = e.target.value.slice(0, e.target.selectionStart).replace(/\D/g, '').length;
        const next = phoneInputValue(e.target.value, country);
        caret.current = before + (e.target.value.startsWith('+') || !next ? 0 : getCountryCallingCode(country).length);
        emit(next);
      }} onBlur={(e) => { setTouched(true); onBlur?.(e); }} />
    </div>
    {invalid && <small className="phone-error">Введите полный номер телефона с кодом страны</small>}
  </div>;
}
