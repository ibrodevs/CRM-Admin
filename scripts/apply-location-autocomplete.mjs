import { readFile, writeFile } from 'node:fs/promises';

const uiUrl = new URL('../js/ui.jsx', import.meta.url);
let source = await readFile(uiUrl, 'utf8');

const marker = 'function LocationAutocomplete(props)';

if (!source.includes(marker)) {
  const inputStart = source.indexOf('function Input(props) {');
  const selectStart = source.indexOf('function Select(props) {', inputStart);
  if (inputStart < 0 || selectStart < 0) {
    throw new Error('Не удалось подключить автокомплит локаций: компонент Input не найден.');
  }

  const replacement = String.raw`const LOCATION_CONTEXT_HINTS = [
  'город', 'аэропорт', 'локац', 'адрес', 'отел', 'место отправления', 'место назначения',
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
  if (kind === 'Аэропорт') return 'plane';
  if (kind === 'Отель') return 'hotel';
  if (kind === 'Вокзал') return 'train';
  if (kind === 'Достопримечательность') return 'star';
  if (kind === 'Адрес') return 'building';
  return 'mapPin';
}

function LocationAutocomplete(props) {
  const {
    error, leadIcon, trailIcon, onTrail, locationAutocomplete, locationScope, onLocationSelect,
    className, value = '', onChange, onFocus, onBlur, onKeyDown, ...rest
  } = props;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState(null);
  const rootRef = useRef(null);
  const requestRef = useRef(null);
  const text = String(value == null ? '' : value);
  const normalizedText = text.toLowerCase().replace(/ё/g, 'е').trim();
  const selectedIsCurrent = chosen && String(chosen.value || '').toLowerCase().replace(/ё/g, 'е').trim() === normalizedText;

  useEffect(() => {
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const query = text.trim();
    if (query.length < 2 || selectedIsCurrent) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (locationScope) params.set('scope', locationScope);
        const response = await fetch('/api/locations?' + params.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Location lookup failed');
        const payload = await response.json();
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
  }, [text, locationScope, selectedIsCurrent]);

  const emit = (nextValue, option) => {
    const target = { value: nextValue, name: rest.name, id: rest.id, location: option || null };
    onChange && onChange({ target, currentTarget: target });
  };

  const choose = (option) => {
    if (!option) return;
    setChosen(option);
    setOptions([]);
    setOpen(false);
    emit(option.value || option.title || option.label, option);
    onLocationSelect && onLocationSelect(option);
  };

  const handleChange = (event) => {
    setChosen(null);
    emit(event.target.value, null);
    if (event.target.value.trim().length >= 2) setOpen(true);
  };

  const handleKeyDown = (event) => {
    if (open && options.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((current) => (current + 1) % options.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((current) => (current - 1 + options.length) % options.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(options[active] || options[0]);
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
        if (text.trim().length >= 2 && !selectedIsCurrent) setOpen(true);
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

      {open && text.trim().length >= 2 && (
        <div className="location-autocomplete-menu" role="listbox">
          {loading && (
            <div className="location-autocomplete-status"><Icon name="loader" />Подбираем города и локации…</div>
          )}
          {!loading && options.map((option, index) => (
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
              <span className="location-autocomplete-option-icon"><Icon name={locationOptionIcon(option.kind)} /></span>
              <span className="location-autocomplete-option-main">
                <b>{option.title || option.value || option.label}</b>
                <span>{option.subtitle || option.label || 'Выберите подходящий вариант'}</span>
              </span>
              <span className="location-autocomplete-kind">{option.kind || 'Локация'}</span>
            </button>
          ))}
          {!loading && !options.length && (
            <div className="location-autocomplete-empty">Ничего не найдено. Проверьте написание или уточните страну.</div>
          )}
          {!selectedIsCurrent && (
            <div className="location-autocomplete-help"><Icon name="alertCircle" />Выберите вариант из списка, чтобы поиск получил корректную локацию.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Input(props) {
  if (shouldUseLocationAutocomplete(props)) return <LocationAutocomplete {...props} />;
  const { error, leadIcon, trailIcon, onTrail, locationAutocomplete, locationScope, onLocationSelect, className } = props;
  const rest = {};
  for (const k in props) {
    if (!['error', 'leadIcon', 'trailIcon', 'onTrail', 'locationAutocomplete', 'locationScope', 'onLocationSelect', 'className'].includes(k)) rest[k] = props[k];
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
`;

  source = source.slice(0, inputStart) + replacement + '\n' + source.slice(selectStart);
}

source = source.replace(
  'Field, Input, Select, SearchBox, Combobox, Avatar, Modal, ModalHeader, Drawer,',
  'Field, Input, LocationAutocomplete, Select, SearchBox, Combobox, Avatar, Modal, ModalHeader, Drawer,',
);
source = source.replace(
  'Field, Input, Select, SearchBox, Combobox, ClockTimePicker,',
  'Field, Input, LocationAutocomplete, Select, SearchBox, Combobox, ClockTimePicker,',
);

await writeFile(uiUrl, source, 'utf8');
console.log(source.includes(marker)
  ? 'Единый автокомплит городов и локаций подключён ко всем подходящим полям.'
  : 'Не удалось подтвердить подключение автокомплита локаций.');
