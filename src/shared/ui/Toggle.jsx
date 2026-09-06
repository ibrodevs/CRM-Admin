

function Toggle({ on, onChange, style }) {
  return <button type="button" className={'toggle' + (on ? ' on' : '')} style={style} onClick={() => onChange(!on)} />;
}

export { Toggle };
