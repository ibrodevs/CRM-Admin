

function Toggle({ on, onChange, style, disabled = false, ...props }) {
  return <button {...props} role="switch" aria-checked={!!on} disabled={disabled} type="button" className={'toggle' + (on ? ' on' : '')} style={style} onClick={() => onChange(!on)} />;
}

export { Toggle };
