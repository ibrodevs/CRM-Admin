import { useRef, useState } from 'react';
import { Input } from './Input.jsx';
import { Icon } from '../icons/index.jsx';
import { useToast } from './Toast.jsx';

export function PasswordInput({ onChange, onInput, secretLabel = 'пароль', allowCopy = true, ...props }) {
  const inputRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const toast = useToast();
  const sync = () => {
    const input = inputRef.current;
    if (input && input.value !== props.value) onChange?.({ target: input, currentTarget: input });
  };
  return <div className="input-wrap password-input">
    <Input {...props} inputRef={inputRef} type={visible ? 'text' : 'password'} onChange={onChange}
      onInput={event => { onChange?.(event); onInput?.(event); }} />
    <div className="password-input-actions">
      {allowCopy && <button type="button" className="icon-btn" aria-label="Скопировать пароль" title="Скопировать пароль" onMouseDown={event => event.preventDefault()} onClick={async () => {
        const value = inputRef.current?.value;
        if (!value) { toast('Сначала введите пароль', 'err'); return; }
        try { await navigator.clipboard.writeText(value); toast('Пароль скопирован', 'ok'); }
        catch { toast('Не удалось скопировать пароль. Покажите его и скопируйте вручную.', 'err'); }
      }}><Icon name="copy" /></button>}
      <button type="button" className="icon-btn" aria-label={`${visible ? 'Скрыть' : 'Показать'} ${secretLabel}`} title={`${visible ? 'Скрыть' : 'Показать'} ${secretLabel}`} aria-pressed={visible} onMouseDown={event => event.preventDefault()} onClick={() => { sync(); setVisible(value => !value); }}><Icon name={visible ? 'eyeOff' : 'eye'} /></button>
    </div>
  </div>;
}
