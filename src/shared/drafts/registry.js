import { apiPath,apiRequest,resultsOf } from '../api/client.js';
export const draftRegistryApi={
 list:signal=>apiRequest(apiPath('work-drafts/'),{signal}).then(resultsOf),
 sync:body=>apiRequest(apiPath('work-drafts/'),{method:'PUT',body}),
 get:(id,signal)=>apiRequest(apiPath(`work-drafts/${id}/`),{signal}),
 update:(id,body)=>apiRequest(apiPath(`work-drafts/${id}/`),{method:'PATCH',body}),
 remove:id=>apiRequest(apiPath(`work-drafts/${id}/`),{method:'DELETE'}),
};
export const DRAFT_TYPES={proposals:'КП',orders:'Заказ',services:'Подбор услуг',receipts:'Квитанция / импорт'};
export function draftMeta(entry) {return {title:entry.title,category:entry.category || (entry.type==='new-proposal'?'proposals':entry.type==='order'||entry.type==='new-order'?'orders':'services'),client:entry.client || '',order_id:entry.orderId || '',order_number:entry.orderNumber || '',stage:entry.stage || 'form',services:entry.services || [],navigation:{type:entry.type,route:entry.route,orderId:entry.orderId,proposalId:entry.proposalId,scope:entry.scope}};}
