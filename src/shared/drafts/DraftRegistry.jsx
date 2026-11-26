import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {useDraftStore,useDraftState} from './Drafts.jsx';
import {draftRegistryApi,draftMeta,DRAFT_TYPES} from './registry.js';
import {Button} from '../ui/Button.jsx';
import {Select} from '../ui/Select.jsx';
import {Field} from '../ui/Field.jsx';
import {Drawer} from '../ui/Overlays.jsx';
import {UFDateField,ufDateIso} from '../ui/UnifiedDateField.jsx';
import {TimeField} from '../ui/DateFields.jsx';
import {apiPath,apiRequest,resultsOf} from '../api/client.js';
const RegistryContext=createContext(null);
const fmt=value=>value?new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Не задано';
export function DraftRegistryProvider({user,children,receiptStorage}) {
 const store=useDraftStore(),[rows,setRows]=useState([]),[error,setError]=useState('');
 const running=useRef(false),known=useRef(new Map()),last=useRef(new Map()),mounted=useRef(true);
 const reload=async()=>{try{const data=await draftRegistryApi.list();if(mounted.current){setRows(data);setError('');}return data;}catch(e){if(mounted.current)setError(e.message);return [];}};
 useEffect(()=>{mounted.current=true;if(!user||!store)return;let timer;
 const sync=async()=>{if(running.current)return;running.current=true;try{
   const entries=store.workspaces().map(e=>e.id.startsWith('kp/')?{...e,category:'proposals',title:`Несохранённая форма / подбор КП · ${e.title}`}:e);
   const imports=receiptStorage?.read() || [];
   for(const draft of imports)entries.push({id:`import/${draft.id}`,scope:'__receipt_import__',category:'receipts',title:draft.files[0]?.name || 'Импорт документов',services:['Импорт документов'],stage:'form',createdAt:new Date(draft.createdAt || draft.savedAt).getTime(),savedAt:new Date(draft.savedAt).getTime(),type:'receipt-draft',route:'receipts',importDraft:draft});
   const active=new Set(entries.map(e=>e.id));
   for(const entry of entries){if(last.current.get(entry.id)===entry.savedAt)continue;const records=entry.importDraft?[{scope:'__receipt_import__',fields:entry.importDraft,savedAt:entry.savedAt,createdAt:entry.createdAt}]:(entry.proposalId?[...store.exportRecords(`proposal-workspace/${entry.proposalId}`),...store.exportRecords(`kp-service-picker/${entry.proposalId}`)]:store.exportRecords(entry.scope));if(!records.length)continue;
     const meta=draftMeta(entry);if(entry.importDraft)meta.navigation={type:'receipt-draft',route:'receipts',importId:entry.importDraft.id};
     const saved=await draftRegistryApi.sync({key:entry.id.startsWith('kp/')?`form/${entry.id}`:entry.id,meta,records,created_at:new Date(entry.createdAt || entry.savedAt).toISOString(),updated_at:new Date(entry.savedAt).toISOString()});known.current.set(entry.id,saved.id);last.current.set(entry.id,entry.savedAt);
   }
   for(const [key,id] of known.current){if(!active.has(key)){await draftRegistryApi.remove(id);known.current.delete(key);last.current.delete(key);}}
   await reload();
 }catch(e){if(mounted.current)setError(e.message);}finally{running.current=false;}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(sync,1800);};
 const unsubscribe=store.subscribe(schedule);window.addEventListener('receipt-drafts-changed',schedule);sync();const interval=setInterval(sync,30000);
 return()=>{mounted.current=false;unsubscribe();window.removeEventListener('receipt-drafts-changed',schedule);clearTimeout(timer);clearInterval(interval);};
 },[user?.id,store]);
 return <RegistryContext.Provider value={{rows,error,reload,store,user,receiptStorage}}>{children}</RegistryContext.Provider>;
}
function ReminderEditor({row,onClose,onSaved,user}) {
 const dt=row.remind_at?new Date(row.remind_at):null;
 const [day,setDay]=useState(dt),[time,setTime]=useState(dt?`${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`:''),[responsible,setResponsible]=useState(row.responsible_id),[users,setUsers]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canManage=user.permissions?.includes('users.manage');
 useEffect(()=>{if(!canManage)return;const c=new AbortController();apiRequest(apiPath('users/'),{signal:c.signal}).then(r=>setUsers(resultsOf(r))).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 const save=async clear=>{if(!clear&&(!day||!time)){setError('Укажите дату и время напоминания');return;}setBusy(true);setError('');try{const remind_at=clear?null:new Date(`${ufDateIso(day)}T${time}:00`).toISOString();await draftRegistryApi.update(row.id,{version:row.version,remind_at,...(canManage?{responsible_id:responsible}:{})});await onSaved();onClose();}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <Drawer open title="Напоминание по черновику" sub={row.title} width="min(520px,100vw)" onClose={onClose} showDraftNotice={false} footer={<><Button variant="secondary" disabled={busy} onClick={()=>save(true)}>Убрать напоминание</Button><Button disabled={busy} onClick={()=>save(false)}>Сохранить</Button></>}><p className="hint">Напомним ответственному в CRM. Отправка клиенту остаётся ручной.</p>{error&&<p role="alert" className="kp-error">{error}</p>}<div className="draft-reminder-fields"><Field label="Дата"><UFDateField value={day} onChange={setDay} /></Field><Field label="Время"><TimeField value={time} onChange={setTime} /></Field>{canManage&&<Field label="Ответственный"><Select value={responsible} options={users.map(u=>({value:u.id,label:u.full_name || u.email}))} onChange={e=>setResponsible(e.target.value)} /></Field>}</div></Drawer>;
}
export function UnifiedDraftRegistry({onOpen}) {
 const registry=useContext(RegistryContext),[category,setCategory]=useState(''),[state,setState]=useState(''),[editing,setEditing]=useState(null),[opening,setOpening]=useState(''),[openError,setOpenError]=useState('');
 const [collapsed,setCollapsed]=useDraftState('workspace-display','draftRegistryCollapsed',true);
 if(!registry)return null;const {rows,error,reload,store,user,receiptStorage}=registry;
 const visible=rows.filter(r=>(!category||r.category===category)&&(!state || (state==='overdue'?r.overdue:r.stage===state)));
 const open=async row=>{setOpening(row.id);setOpenError('');try{const full=await draftRegistryApi.get(row.id);if(full.records?.length){const receipt=full.records.find(r=>r.scope==='__receipt_import__');if(receipt){receiptStorage?.restore(receipt.fields);}else store.importRecords(full.records);}onOpen(full.navigation,row);}catch(e){setOpenError(e.message);}finally{setOpening('');}};
 return <section className="card draft-workspace unified-draft-registry" aria-label="Все черновики CRM"><header className="draft-workspace-head"><button className="draft-workspace-toggle" type="button" aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}><span className="draft-workspace-title">Черновики <span>{rows.length}</span></span><span className="draft-workspace-toggle-action">{collapsed?'Показать':'Свернуть'}</span></button></header>{!collapsed&&<div className="draft-workspace-list">{(error||openError)&&<div role="alert"><p>{error||openError}</p><Button variant="secondary" size="sm" onClick={reload}>Обновить</Button></div>}<div className="draft-workspace-filters"><Select aria-label="Тип черновика" value={category} options={[{value:'',label:'Все типы'},...Object.entries(DRAFT_TYPES).map(([value,label])=>({value,label}))]} onChange={e=>setCategory(e.target.value)} /><Select aria-label="Статус черновика" value={state} options={[{value:'',label:'Все неотправленные'},{value:'overdue',label:'Просроченные'},{value:'draft',label:'Черновик'},{value:'form',label:'Заполнение формы'},{value:'results',label:'Результаты поиска'},{value:'selection',label:'Выбраны услуги'}]} onChange={e=>setState(e.target.value)} /><span>Найдено: {visible.length}</span></div><div className="draft-registry-table-wrap"><table className="tbl draft-registry-table"><thead><tr><th>Тип / черновик</th><th>Клиент / заказ</th><th>Создан / изменён</th><th>Ответственный</th><th>Напоминание</th><th>Статус</th><th>Действия</th></tr></thead><tbody>{visible.map(row=><tr key={row.id} className={row.overdue?'draft-is-overdue':''}><td><span className="pill">{DRAFT_TYPES[row.category]||'Черновик'}</span><strong>{row.title}</strong></td><td>{row.client || 'Клиент не выбран'}<small>{row.order_number || 'Без заказа'}</small></td><td><small>Создан: {fmt(row.created_at)}</small><small>Изменён: {fmt(row.updated_at)}</small></td><td>{row.responsible_name}</td><td>{fmt(row.remind_at)}</td><td>{row.overdue?'Просрочен':({review:'Выбор клиента',awaiting_approval:'Ожидает клиента',draft:'Черновик',results:'Результаты поиска',selection:'Выбраны услуги',checkout:'Оформление'}[row.stage]||'Не отправлен')}</td><td><div className="draft-registry-actions"><Button variant="secondary" size="sm" disabled={opening===row.id} onClick={()=>open(row)}>Открыть</Button><Button variant="secondary" size="sm" onClick={()=>setEditing(row)}>Напомнить</Button>{row.source==='local'&&!row.navigation?.proposalId&&<Button variant="ghost" size="sm" onClick={async()=>{try{await draftRegistryApi.update(row.id,{version:row.version,status:'sent'});store.clear(row.navigation.scope);await reload();}catch(e){setOpenError(e.message);}}}>Отметить отправленным</Button>}</div></td></tr>)}</tbody></table></div>{!visible.length&&<p className="draft-workspace-empty">Неотправленных черновиков по выбранному фильтру нет.</p>}<p className="hint">Время напоминания необязательно. Никакие предложения не отправляются автоматически.</p></div>}{editing&&<ReminderEditor row={editing} user={user} onClose={()=>setEditing(null)} onSaved={reload} />}</section>;
}
