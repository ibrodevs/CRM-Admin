import test from 'node:test';
import assert from 'node:assert/strict';
import { receiptRequest } from '../src/modules/documents/api/receipt-request.js';
test('a stalled receipt request aborts with an explicit recoverable message',async()=>{
 await assert.rejects(receiptRequest(signal=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')))),5),e=>e.code==='RECEIPT_TIMEOUT'&&e.status===408);
});
test('completed requests return their result and clear the deadline',async()=>{
 assert.deepEqual(await receiptRequest(async()=>({id:'saved'}),5),{id:'saved'});
});
