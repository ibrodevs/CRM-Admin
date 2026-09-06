

function Radio({ on, onChange, interactive = true }) {
  if (!interactive) return <span className={'radio' + (on ? ' on' : '')} aria-hidden="true" />;
  return <button type="button" className={'radio' + (on ? ' on' : '')} onClick={() => onChange(true)} />;
}

export { Radio };
