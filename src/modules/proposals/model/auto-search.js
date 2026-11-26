import { searchAirportOptions, airportOption } from '../../locations/model.js';
import { flightFareConditions } from '../../services/api.js';
import { splitProposalRoute } from './presentation.js';
export function proposalSearchPlan(draft, preferences = {}) {
  const {from,to} = splitProposalRoute(draft.route || '');
  if (!from.trim() || !to.trim() || !draft.travel_start || !draft.travel_end) throw new Error('Укажите маршрут и полный период поездки в КП');
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!validDate(draft.travel_start) || !validDate(draft.travel_end) || draft.travel_end < draft.travel_start) throw new Error('Проверьте даты поездки: окончание не может быть раньше начала');
  const airport = text => {
    const code = /\b([A-Z]{3})\b/.exec(text)?.[1];
    return airportOption(code || text) || searchAirportOptions(text).find(item => item.kind === 'city') || searchAirportOptions(text)[0];
  };
  const origin = airport(from), destination = airport(to);
  const adults = Number(preferences.adults ?? 1);
  if (!Number.isInteger(adults) || adults < 1 || adults > 50) throw new Error('Укажите от 1 до 50 взрослых');
  const common = { currency: draft.currency, date: draft.travel_start, passengers: adults };
  const kinds = [...new Set((draft.groups || []).map(group => group.kind || group.options?.[0]?.kind).filter(Boolean))];
  if (!kinds.length) throw new Error('Сначала выберите виды услуг в конструкторе КП');
  return kinds.map(kind => {
    if (kind === 'avia' && (!origin || !destination)) return {kind,error:'Для авиа выберите распознаваемые города или коды аэропортов в маршруте КП'};
    if (kind === 'avia') return {kind,criteria:{...common,origin:origin.code,destination:destination.code,return_date:draft.travel_end,adults,children:0,infants:0,cabin:preferences.cabin || 'economy',direct_only:preferences.direct === true,preferred_airlines:preferences.airlines ? preferences.airlines.split(/[,;\s]+/).filter(Boolean) : []}};
    if (kind === 'hotel') return {kind,criteria:{currency:draft.currency,location:to,check_in:draft.travel_start,check_out:draft.travel_end,guests:adults,rooms:1,meal_plan:preferences.meal || 'BB'}};
    if (kind === 'rail') return {kind,error:'Для ЖД выберите станции и категории пассажиров в ручном подборе блока'};
    if (kind === 'transfer') return {kind,error:'Для трансфера укажите точные адреса, время подачи и детские кресла в ручном подборе блока'};
    return {kind,error:'Для этого вида услуги используйте ручной подбор: нужны дополнительные параметры или ручное предложение поставщика'};
  });
}
export function autoProposalOption(offer) {
  const i=offer.itinerary || {}, segments=i.segments || [];
  const conditions = offer.kind === 'avia' ? flightFareConditions(offer) : [];
  return { kind:offer.kind, offer:offer.id, currency:offer.price.currency, cost:Number(offer.price.amount), fee:0,
    title:i.property_name || i.description || segments.map(s=>`${s.origin} → ${s.destination}`).join(' · ') || i.name || 'Предложение поставщика',
    sub:[...conditions.map(rule => `${rule.k}: ${rule.segments ? rule.segments.map(s => `${s.route} — ${s.v}`).join('; ') : rule.v}`),i.check_in,i.check_out,i.room,i.meal_plan,...segments.map(s=>[[s.airline,s.flight_number].filter(Boolean).join(' '),[s.departure,s.arrival].filter(Boolean).join(' → ')].filter(Boolean).join(' · '))].filter(Boolean).join(' · ') };
}
