import { PhoneInput } from './PhoneInput.jsx';
import { isPhoneInput } from '../lib/phone.js';
import { useRecentLocations } from '../drafts/Drafts.jsx';
import { FloatingPanel, containsFloatingTarget } from './FloatingPanel.jsx';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '../icons/index.jsx';
import { countryFlag } from '../lib/country-flag.js';

const LOCATION_CONTEXT_HINTS = [
  'город', 'страна', 'аэропорт', 'локац', 'адрес', 'отел', 'место отправления', 'место назначения',
  'пункт отправления', 'пункт назначения', 'точка отправления', 'точка назначения', 'место подачи',
];

function locationContextText(props) {
  return [props.placeholder, props['aria-label'], props.name, props.id, props['data-field-label']]
    .filter(Boolean).join(' ').toLowerCase().replace(/ё/g, 'е').trim();
}

function shouldUseLocationAutocomplete(props) {
  if (props.locationAutocomplete === false || props.disabled || props.readOnly) return false;
  if (props.locationAutocomplete === true) return true;
  const type = String(props.type || 'text').toLowerCase();
  if (type !== 'text' && type !== 'search') return false;
  const context = locationContextText(props);
  if (!context) return false;
  if (LOCATION_CONTEXT_HINTS.some((hint) => context.includes(hint))) return true;
  return ['откуда', 'куда', 'направление'].includes(context);
}

function locationOptionIcon(kind) {
  return ({ страна: 'flag', country: 'flag', город: 'mapPin', city: 'mapPin',
    аэропорт: 'plane', airport: 'plane', отель: 'hotel', hotel: 'hotel',
    вокзал: 'train', station: 'train', достопримечательность: 'star',
    attraction: 'star', адрес: 'building', address: 'building',
  })[String(kind || '').trim().toLowerCase()] || 'mapPin';
}

function LocationOptionSymbol({ option }) {
  const icon = locationOptionIcon(option.kind);
  const flag = icon === 'flag' ? countryFlag(option.countryCode || option.country_code || option.code) : '';
  // Keep the three geographic symbols self-contained: a missing registry entry
  // must never leave a logo-sized empty tile in a search suggestion.
  const paths = icon === 'hotel' ? <>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-5h4v5M3 21h18" />
  </> : icon === 'mapPin' ? <>
    <path d="M12 21s7-5.3 7-11a7 7 0 0 0-14 0c0 5.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </> : icon === 'flag' ? <path d="M5 21V3m0 1c5-3 9 3 14 0v10c-5 3-9-3-14 0" /> : null;
  return <span className="location-autocomplete-option-icon" data-location-symbol={icon} aria-hidden="true">
    {flag ? <span className="location-autocomplete-country-flag">{flag}</span>
      : paths ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
        : <Icon name={icon} />}
  </span>;
}

function LocationAutocomplete(props) {
  const {
    error, leadIcon, trailIcon, onTrail, locationAutocomplete, locationScope, onLocationSelect,
    className, value = '', onChange, onFocus, onBlur, onKeyDown, ...rest
  } = props;
  const [recent, remember] = useRecentLocations(locationScope || 'general');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [hasTyped, setHasTyped] = useState(false);
  const rootRef = useRef(null);
  const requestRef = useRef(null);
  const text = String(value == null ? '' : value);
  const normalizedText = text.toLowerCase().replace(/ё/g, 'е').trim();
  const selectedIsCurrent = chosen && String(chosen.value || '').toLowerCase().replace(/ё/g, 'е').trim() === normalizedText;

  useEffect(() => {
    const close = (event) => {
      if (rootRef.current && !containsFloatingTarget(rootRef.current, event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const query = text.trim();
    if (!hasTyped || query.length < 2 || selectedIsCurrent) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (locationScope) params.set('scope', locationScope);
        let response = await fetch((locationScope === 'hotel' ? '/api/backend/service-searches/hotel-locations/?' : '/api/locations?') + params.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Location lookup failed');
        let payload = await response.json();
        if (locationScope === 'hotel' && !payload.provider_specific) {
          response = await fetch('/api/locations?' + params.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error('Location lookup failed');
          payload = await response.json();
        }
        if (!controller.signal.aborted) {
          setOptions(Array.isArray(payload.results) ? payload.results : []);
          setActive(0);
          setOpen(true);
        }
      } catch (lookupError) {
        if (lookupError && lookupError.name !== 'AbortError' && !controller.signal.aborted) {
          setOptions([]);
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, locationScope, selectedIsCurrent, hasTyped]);

  const emit = (nextValue, option) => {
    const target = { value: nextValue, name: rest.name, id: rest.id, location: option || null };
    onChange && onChange({ target, currentTarget: target });
  };

  const choose = (option) => {
    if (!option) return;
    remember(option);
    setChosen(option);
    setHasTyped(false);
    setOptions([]);
    setOpen(false);
    emit(option.value || option.title || option.label, option);
    onLocationSelect && onLocationSelect(option);
  };

  const handleChange = (event) => {
    setChosen(null);
    setHasTyped(true);
    emit(event.target.value, null);
    if (event.target.value.trim().length >= 2) setOpen(true);
  };

  const handleKeyDown = (event) => {
    const choices = !hasTyped ? recent : options;
    if (open && choices.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((current) => (current + 1) % choices.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((current) => (current - 1 + choices.length) % choices.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(choices[active] || choices[0]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    }
    onKeyDown && onKeyDown(event);
  };

  const inputClass = ['input', trailIcon ? 'has-trail' : '', error ? 'err' : '', 'location-autocomplete-input', open ? 'is-open' : '', className || '']
    .filter(Boolean).join(' ');
  const inputElement = (
    <input
      {...rest}
      value={text}
      className={inputClass}
      autoComplete="off"
      aria-autocomplete="list"
      aria-expanded={open}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={(event) => {
        setHasTyped(false); setActive(0); setOpen(true);
        onFocus && onFocus(event);
      }}
      onBlur={(event) => {
        onBlur && onBlur(event);
      }}
    />
  );

  return (
    <div className="location-autocomplete" ref={rootRef}>
      {leadIcon || trailIcon ? (
        <div className="input-wrap">
          {leadIcon && <Icon name={leadIcon} className="lead" />}
          {inputElement}
          {trailIcon && <Icon name={trailIcon} className="trail" onClick={onTrail} />}
        </div>
      ) : inputElement}

      {open && ((!hasTyped && recent.length > 0) || (hasTyped && text.trim().length >= 2)) && (
        <FloatingPanel anchorRef={rootRef} placement="bottom" minWidth={360} onClose={() => setOpen(false)} className="location-autocomplete-menu" role="listbox">
          {!hasTyped && <div className="location-history-title">Последние выбранные места</div>}
          {!hasTyped && recent.map((option, index) => <button type="button" role="option" aria-selected={index === active} key={option.value || option.id || index} className="location-autocomplete-option" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
            <Icon name="clock" className="location-history-icon" />
            <span className="location-autocomplete-option-main"><b>{option.title || option.value || option.label}</b><span>{option.subtitle || option.label || option.kind || 'Локация'}</span></span>
          </button>)}
          {hasTyped && loading && (
            <div className="location-autocomplete-status"><Icon name="loader" />{locationScope === 'hotel' ? 'Подбираем отели…' : 'Подбираем города и локации…'}</div>
          )}
          {hasTyped && !loading && options.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={index === active}
              key={option.id || option.label || index}
              className={'location-autocomplete-option' + (index === active ? ' is-active' : '')}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <LocationOptionSymbol option={option} />
              <span className="location-autocomplete-option-main">
                <b>{option.title || option.value || option.label}</b>
                <span>{option.subtitle || option.label || 'Выберите подходящий вариант'}</span>
              </span>
              <span className="location-autocomplete-kind">{option.kind || 'Локация'}</span>
            </button>
          ))}
          {hasTyped && !loading && !options.length && (
            <div className="location-autocomplete-empty">Ничего не найдено. Проверьте написание или уточните страну.</div>
          )}
          {hasTyped && !selectedIsCurrent && (
            <div className="location-autocomplete-help"><Icon name="alertCircle" />Выберите вариант из списка, чтобы поиск получил корректную локацию.</div>
          )}
        </FloatingPanel>
      )}
    </div>
  );
}

function Input(props) {
  if (isPhoneInput(props)) return <PhoneInput {...props} />;
  if (shouldUseLocationAutocomplete(props)) return <LocationAutocomplete {...props} />;
  const { error, leadIcon, trailIcon, onTrail, locationAutocomplete, locationScope, onLocationSelect, className } = props;
  const rest = {};
  for (const k in props) {
    if (!['error', 'leadIcon', 'trailIcon', 'onTrail', 'locationAutocomplete', 'locationScope', 'onLocationSelect', 'className', 'phoneInput', 'defaultCountry'].includes(k)) rest[k] = props[k];
  }
  const inputClass = ['input', trailIcon ? 'has-trail' : '', error ? 'err' : '', className || ''].filter(Boolean).join(' ');
  if (leadIcon || trailIcon) {
    return (
      <div className="input-wrap">
        {leadIcon && <Icon name={leadIcon} className="lead" />}
        <input className={inputClass} {...rest} />
        {trailIcon && <Icon name={trailIcon} className="trail" onClick={onTrail} />}
      </div>
    );
  }
  return <input className={inputClass} {...rest} />;
}

export { LOCATION_CONTEXT_HINTS, locationContextText, shouldUseLocationAutocomplete, locationOptionIcon, LocationOptionSymbol, LocationAutocomplete, Input };
