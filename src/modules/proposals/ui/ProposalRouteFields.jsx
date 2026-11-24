import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { splitProposalRoute, setProposalRoutePoint } from '../model/presentation.js';

// Reuse the same location search, recent choices and floating list as service masks.
export function ProposalRouteFields({ value = '', onChange }) {
  const points = splitProposalRoute(value);
  return <div className="kp-route-fields">{[['from', 'Откуда', 'Город отправления'], ['to', 'Куда', 'Город назначения']].map(([key, label, placeholder]) => <Field key={key} label={label}><Input locationAutocomplete locationScope="general" leadIcon="mapPin" value={points[key]} placeholder={placeholder} maxLength={240} onChange={event => onChange(setProposalRoutePoint(value, key, event.target.value))} /></Field>)}</div>;
}
