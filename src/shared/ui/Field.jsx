import { Icon } from '../icons/index.jsx';

function Field({ label, required, hint, error, children }) {
  return (
    <div className="field">
      {label && <label className="label">{label}{required && <span className="req"> *</span>}</label>}
      {hint && <div className="hint">{hint}</div>}
      {children}
      {error && <div className="err-text"><Icon name="alertCircle" style={{ width: 14, height: 14 }} />{error}</div>}
    </div>
  );
}

export { Field };
