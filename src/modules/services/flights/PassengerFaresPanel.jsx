import { useEffect, useRef, useState } from 'react';
import { clientsApi } from '../../clients/api.js';
import { servicesApi } from '../api.js';
import { StackPanel } from '../../locations/index.js';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { SearchBox } from '../../../shared/ui/SearchBox.jsx';
import { InfoNotice } from '../../../shared/ui/InfoNotice.jsx';
import { resultsOf } from '../../../shared/api/client.js';
import { freeFlightDraft, freeFlightFareOptions, freeFlightLocalPassengers, searchFreeFlightOffers } from './free-flight-search.js';
import { liveFlightOffer } from './live-flight-offer.js';
import { formatMoney } from '../../../shared/lib/money.js';

export function PassengerFaresPanel({ offer, params, onClose, onAdd }) {
  const pax = freeFlightLocalPassengers(params.pax);
  const adultsOnly = pax.length > 0 && pax.every(p=>p.id.startsWith('adt-'));
  const [offers,setOffers]=useState([]),[assignments,setAssignments]=useState({}),[people,setPeople]=useState([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const version=useRef(0);
  const individual = {...params,pax:{adt:1,chd:0,infNoSeat:0,infSeat:0,special:{},subsidized:{}}};
  const load = async()=>{
    const request=++version.current;setLoading(true);setError('');
    try { const raw=await searchFreeFlightOffers(individual,servicesApi,undefined,{shouldContinue:()=>version.current===request});
      if(request!==version.current||!raw)return;
      const found=raw.map(item=>({...liveFlightOffer(item,individual),backendOffer:item}));
      // Compare full itinerary/provider, never divide the group fare by headcount.
      const matching=freeFlightFareOptions(offer,found).filter(item=>item.id!==offer.id);
      setOffers(matching);
      if(!matching.length)setError('Поставщик не вернул индивидуальные тарифы на этот перелёт. Измените поиск или оставьте общий тариф.');
    }catch(e){if(request===version.current)setError(e.message);}finally{if(request===version.current)setLoading(false);}
  };
  useEffect(()=>{if(adultsOnly)load();else setLoading(false);return()=>{version.current++;};},[]);
  useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>{
    clientsApi.persons({search:query},controller.signal).then(data=>setPeople(current=>[...new Map([...current.filter(p=>Object.values(assignments).some(a=>a.person===p.id)),...resultsOf(data)].map(p=>[p.id,p])).values()])).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  },250);return()=>{clearTimeout(timer);controller.abort();};},[query]);
  const update=(id,key,value)=>setAssignments(cur=>({...cur,[id]:{...cur[id],[key]:value}}));
  const chosen=pax.map(p=>({p,person:people.find(person=>person.id===assignments[p.id]?.person),offer:offers.find(offer=>offer.id===assignments[p.id]?.offer)}));
  const valid=adultsOnly&&!loading&&chosen.every(row=>row.person&&row.offer)&&new Set(chosen.map(row=>row.person?.id)).size===pax.length;
  const total=chosen.reduce((sum,row)=>sum+(row.offer?row.offer.fare+row.offer.fee:0),0);
  return <StackPanel title="Тарифы по пассажирам" className="free-booking passenger-fares-panel" width="min(900px,96vw)" closeOnBackdrop onClose={onClose}
    footer={<><div className="flight-fare-total"><span>Индивидуальные предложения</span><b>{formatMoney(total,offer.currency)}</b></div><Button disabled={!valid} onClick={()=>onAdd(chosen.map(row=>({...freeFlightDraft(row.offer,individual),flightPersonIds:[row.person.id],passengers:[{person:row.person.id,name:[row.person.surname,row.person.given_name,row.person.middle_name].filter(Boolean).join(' ')}]})))}>Добавить тарифы</Button></>}>
    <InfoNotice>Каждому пассажиру — отдельное предложение и отдельная бронь в одном заказе. Цены рассчитываются поставщиком на одного взрослого и перепроверяются перед добавлением.</InfoNotice>
    {!adultsOnly ? <p>Для детей и младенцев нужен совместный расчёт со взрослым. Используйте общий тариф на семью: самостоятельная детская бронь не создаётся.</p> : <>
      <SearchBox value={query} onChange={setQuery} placeholder="Найти пассажира в картотеке" />
      {loading&&<p role="status">Получаем индивидуальные тарифы поставщика…</p>}
      {error&&<div role="alert"><p>{error}</p><Button variant="secondary" disabled={loading} onClick={load}>Повторить расчёт</Button></div>}
      <div className="passenger-fare-rows">{pax.map(p=><div className="passenger-fare-row" key={p.id}>
        <Field label={p.name}><Select value={assignments[p.id]?.person||''} options={[{value:'',label:'Выберите из картотеки'},...people.map(person=>({value:person.id,label:[person.surname,person.given_name,person.middle_name].filter(Boolean).join(' '),disabled:Object.entries(assignments).some(([id,a])=>id!==p.id&&a.person===person.id)}))]} onChange={e=>update(p.id,'person',e.target.value)} /></Field>
        <Field label="Индивидуальный тариф"><Select disabled={loading} value={assignments[p.id]?.offer||''} options={[{value:'',label:'Выберите тариф'},...offers.map((item,index)=>({value:item.id,label:`${item.fareName} · вариант ${index+1} · ${formatMoney(item.fare+item.fee,item.currency)}`}))]} onChange={e=>update(p.id,'offer',e.target.value)} /></Field>
      </div>)}</div>
    </>}
  </StackPanel>;
}
