import { ApiError } from '../../../shared/api/client.js';

export async function receiptRequest(run, timeoutMs = 45000) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try { return await run(controller.signal); }
  catch (error) {
    if (timedOut) throw new ApiError('Сервер не ответил вовремя. Проверьте рабочий список перед повторной загрузкой: файл мог сохраниться.', { status: 408, code: 'RECEIPT_TIMEOUT' });
    throw error;
  } finally { clearTimeout(timer); }
}
