import { useEffect, useRef, useState } from 'react';
import { useDraftState } from '../../../shared/drafts/Drafts.jsx';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { apiPath, apiRequest, resultsOf } from '../../../shared/api/client.js';
import { servicesApi } from '../../services/api.js';
import { KP_KINDS, kpMoney } from '../model/interactive.js';
import { proposalSearchPlan, autoProposalOption } from '../model/auto-search.js';
import { readableServiceTitle } from '../model/presentation.js';
export function ProposalAutoSearch({ proposalId, draft, companyId, onPolicySelect, onAdd, onClose }) {
  const [prefs,setPrefs]=useDraftState(`proposal-auto/${proposalId}`,'preferences',{adults:1,cabin:'economy',direct:false,airlines:'',meal:'BB'});
  const [policies,setPolicies]=useState([]),[policyId,setPolicyId]=useState(draft.policy_id || ''),[policyError,setPolicyError]=useState('');
  const [policiesLoading,setPoliciesLoading]=useState(Boolean(companyId));
  const [rows,setRows]=useState([]),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false),[added,setAdded]=useState([]);
  const request=useRef(null);
  useEffect(()=>{if(!companyId)return;setPoliciesLoading(true);const c=new AbortController();apiRequest(apiPath(`companies/${companyId}/travel-policies/`),{signal:c.signal}).then(value=>{const active=resultsOf(value).filter(p=>p.is_active && (!p.effective_from || p.effective_from<=draft.travel_start) && (!p.effective_to || p.effective_to>=draft.travel_end));setPolicies(active);if(active.length===1){setPolicyId(active[0].id);onPolicySelect?.(active[0].id);}}).catch(e=>{if(!c.signal.aborted)setPolicyError(e.message);}).finally(()=>{if(!c.signal.aborted)setPoliciesLoading(false);});return()=>c.abort();},[companyId]);
  useEffect(()=>()=>request.current?.abort(),[]);
  const policy=policies.find(p=>p.id===policyId);
  const set=(key,value)=>setPrefs(current=>({...current,[key]:value}));
  const run=async()=>{
    if(busy || policiesLoading)return;
    if(policyError || policies.length && !policy){setMessages(['Выберите применимую тревел-политику компании перед запуском']);return;}
    let plan;try{plan=proposalSearchPlan(draft,prefs);}catch(e){setMessages([e.message]);return;}
    const c=new AbortController();request.current=c;setBusy(true);setRows([]);setMessages([]);setAdded([]);
    try {
      for(const part of plan){
        if(c.signal.aborted)break;
        if(part.error){setMessages(current=>[...current,`${KP_KINDS[part.kind]}: ${part.error}`]);continue;}
        setMessages(current=>[...current,`${KP_KINDS[part.kind]}: запрашиваем поставщиков…`]);
        try{
          const created=await servicesApi.search({kind:part.kind,criteria:part.criteria});let offers=[],terminal=false;
          for(let n=0;n<90;n++){
            if(c.signal.aborted)break;
            const [status,payload]=await Promise.all([servicesApi.searchStatus(created.search_id,c.signal),servicesApi.offers(created.search_id,{page_size:100},c.signal)]);
            offers=resultsOf(payload);terminal=['complete','completed','partial','failed','cancelled','error','done','expired'].includes(String(status.status||status.state).toLowerCase());
            if(terminal)break;
            await new Promise(resolve=>{const timer=setTimeout(resolve,1000);c.signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});
          }
          if(c.signal.aborted)break;
          const comparable=offers.filter(o=>o.price?.currency===draft.currency && o.price?.amount!=null).sort((a,b)=>Number(a.price.amount)-Number(b.price.amount)).slice(0,20);
          const checked=await Promise.all(comparable.map(async offer=>{
            if(!policy)return{offer,check:null};
            const seg=offer.itinerary?.segments?.[0]||{},fare=offer.fare||{};
            const nights=Math.max(1,Math.round((new Date(draft.travel_end)-new Date(draft.travel_start))/86400000));
            const policyPrice=offer.kind==='hotel'?{...offer.price,amount:String(Number(offer.price.amount)/nights)}:offer.price;
            const check=await apiRequest(apiPath(`travel-policies/${policy.id}/check/`),{method:'POST',signal:c.signal,body:{offer:{kind:offer.kind,price:policyPrice,cabin:fare.cabin||seg.cabin,airline:seg.airline,hotel_category:offer.itinerary?.stars,meal_plan:fare.meal_plan||offer.itinerary?.meal_plan,advance_days:Math.max(0,Math.floor((new Date(draft.travel_start)-new Date())/86400000))}}});
            return{offer,check};
          }));
          if(!c.signal.aborted){setRows(current=>[...current,...checked]);setMessages(current=>[...current,`${KP_KINDS[part.kind]}: найдено ${offers.length}, для сравнения показано ${checked.length}${terminal?'':'; поиск ещё выполняется, результаты предварительные'}`]);}
        }catch(e){if(!c.signal.aborted)setMessages(current=>[...current,`${KP_KINDS[part.kind]}: ${e.message}`]);}
      }
    }finally{if(request.current===c)setBusy(false);}
  };
  return <Drawer open title="Автоматический подбор для КП" sub="Система ищет варианты по маршруту и датам. Добавление в КП и бронирование остаются под контролем оператора." width="min(980px,98vw)" className="kp-workspace-drawer" onClose={()=>{request.current?.abort();onClose();}} footer={<><Button variant="secondary" onClick={()=>{request.current?.abort();onClose();}}>Закрыть</Button><Button disabled={busy || policiesLoading} icon="search" onClick={run}>{busy?'Ищем предложения…':'Найти варианты'}</Button></>}>
    <div className="kp-workspace"><section className="kp-section"><h2>Предпочтения поездки</h2><div className="kp-form-grid"><Field label="Взрослые"><Input type="number" min="1" max="50" value={prefs.adults} onChange={e=>set('adults',e.target.value)} /></Field><Field label="Класс авиа"><Select value={prefs.cabin} options={[{value:'economy',label:'Эконом'},{value:'business',label:'Бизнес'}]} onChange={e=>set('cabin',e.target.value)} /></Field><Field label="Предпочтительные авиакомпании"><Input locationAutocomplete={false} value={prefs.airlines} onChange={e=>set('airlines',e.target.value)} placeholder="Коды через запятую: TK, SU" /></Field><Field label="Питание в отеле"><Select value={prefs.meal} options={['RO','BB','HB','FB','AI']} onChange={e=>set('meal',e.target.value)} /></Field></div><label className="kp-check"><input type="checkbox" checked={prefs.direct} onChange={e=>set('direct',e.target.checked)} />Только прямые перелёты</label><p className="kp-muted">Для детей, нескольких номеров, точного адреса трансфера и специальных категорий используйте ручной подбор в блоке услуги.</p></section>
    <section className="kp-section"><h2>Тревел-политика</h2>{policiesLoading?<p role="status">Загружаем политики компании…</p>:policyError?<p className="kp-error">{policyError}</p>:policies.length?<><Field label="Применимая политика компании"><Select value={policyId} options={[{value:'',label:'Выберите политику'},...policies.map(p=>({value:p.id,label:`${p.name} · версия ${p.policy_version}`}))]} onChange={e=>{setPolicyId(e.target.value);onPolicySelect?.(e.target.value || null);}} /></Field>{policy&&<p className="kp-muted">Цепочка согласования: {policy.approver_chain?.join(' → ')||'В политике не задана'}. Нарушения показаны отдельно; проверка не считается согласованием.</p>}</>:<p className="kp-muted">{companyId?'Действующая тревел-политика для периода поездки не найдена.':'Получатель не связан с компанией. Тревел-политика не применяется.'}</p>}</section>
    {messages.length>0&&<section className="kp-section" role="status">{messages.map((message,i)=><p key={i}>{message}</p>)}{busy&&<Button variant="secondary" size="sm" onClick={()=>request.current?.abort()}>Остановить поиск</Button>}</section>}
    {rows.map(({offer,check})=><section className="kp-section kp-auto-offer" key={offer.id}><div className="kp-section-title"><div><span className="kp-kind">{KP_KINDS[offer.kind]}</span><h3>{readableServiceTitle(autoProposalOption(offer).title)}</h3></div><strong>{kpMoney(offer.price.amount,offer.price.currency)}</strong></div>{check&&<div className="kp-explanation"><strong>{check.verdict==='allowed'?'Соответствует проверенным условиям политики':'Требуется проверка по политике'}</strong>{(check.violations || []).map((v,i)=><p key={i}>{v.message}</p>)}{check.approver_chain?.length>0&&<p>Согласующие: {check.approver_chain.join(' → ')}</p>}</div>}<Button variant="secondary" disabled={added.includes(offer.id)||check?.verdict==='forbidden'} onClick={()=>{if(onAdd(autoProposalOption(offer))!==false)setAdded(current=>[...current,offer.id]);}}>{added.includes(offer.id)?'Добавлено в КП':'Добавить вариант'}</Button></section>)}
    </div></Drawer>;
}
