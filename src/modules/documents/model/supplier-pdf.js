import { jobsApi } from '../../integrations/api.js';

function inlineSupplierDocumentUrl(url) {
  const value = String(url || '');
  if (!value || value.startsWith('blob:') || !value.includes('/documents/')
    || !value.includes('/download/') || value.includes('disposition=')) return value;
  return `${value}${value.includes('?') ? '&' : '?'}disposition=inline`;
}

function freshSupplierDocumentUrl(url) {
  const value = inlineSupplierDocumentUrl(url);
  if (!value || value.startsWith('blob:')) return value;
  return `${value}${value.includes('?') ? '&' : '?'}_pdf=${Date.now()}`;
}

async function waitForReceiptPdfJob(jobId, timeoutMs = 5 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await jobsApi.detail(jobId);
    if (job.status === 'succeeded') return job.result || {};
    if (['failed', 'dead', 'cancelled'].includes(job.status)) {
      throw new Error(job.error_message || 'Фоновое обновление PDF завершилось с ошибкой');
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('PDF продолжает обновляться в фоне. Откройте документ немного позже.');
}

const PDF_SYNC_SUCCESS_NOTICE_MS = 3500;

function supplierDocumentPageUrl(url, pageNumber) {
  const value = inlineSupplierDocumentUrl(url);
  const page = Number(pageNumber);
  if (!value || !Number.isFinite(page) || page < 1) return value;
  const base = value.split('#')[0];
  const normalizedPage = Math.floor(page);
  const separator = base.includes('?') ? '&' : '?';
  // Chromium's PDF viewer can keep the previous page when only the hash
  // changes. A deterministic query key makes every ticket page a distinct
  // document URL; #page then positions the freshly mounted viewer.
  return `${base}${separator}_receipt_page=${normalizedPage}#page=${normalizedPage}`;
}

export { inlineSupplierDocumentUrl, freshSupplierDocumentUrl, waitForReceiptPdfJob, PDF_SYNC_SUCCESS_NOTICE_MS, supplierDocumentPageUrl };
