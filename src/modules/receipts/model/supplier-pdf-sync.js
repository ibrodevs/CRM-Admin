// Живое обновление рабочей PDF-копии бланка поставщика.
//
// Рабочая копия пересобирается на сервере: правки стоимости и закрытие тарифа
// на IT переносятся в оригинал поставщика. Клиенту её отдаёт один и тот же
// адрес, поэтому пока адрес не изменится, iframe показывает прежний файл —
// оператор правит цену, а в предпросмотре остаётся старая. В реестре квитанций
// это решено давно; здесь та же логика вынесена, чтобы ею мог пользоваться и
// редактор бланков внутри заказа.
//
// Хук делает три вещи: замечает изменения, влияющие на PDF; пересобирает копию
// на сервере с задержкой (чтобы не дёргать его на каждый символ); подставляет
// новый адрес и номер ревизии, из-за которых iframe перемонтируется.

import { useCallback, useEffect, useRef, useState } from 'react';

import { documentsApi } from '../../documents/api.js';
import { PDF_SYNC_SUCCESS_NOTICE_MS, freshSupplierDocumentUrl, waitForReceiptPdfJob } from '../../documents/model.js';
import { receiptPdfCorrectionProblem, receiptSupplierPdfFingerprint } from '../ui/ReceiptEditorPage.jsx';

const SYNC_DEBOUNCE_MS = 700;

/**
 * @param {(updater: (current: object|null) => object|null) => void} setFile
 *   Сеттер состояния открытого бланка: хук подменяет в нём originalUrl и
 *   supplierPdfRevision, когда серверная копия пересобрана.
 * @param {(message: string, tone?: string) => void} toast
 */
export function useSupplierPdfSync(setFile, toast) {
  const [status, setStatus] = useState('');
  const timer = useRef(null);
  const sequence = useRef(0);
  const noticeTimer = useRef(null);
  const alive = useRef(true);

  useEffect(() => () => {
    alive.current = false;
    if (timer.current) clearTimeout(timer.current);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const refreshPreview = useCallback((fileId) => {
    const revision = Date.now();
    setFile((current) => (current && String(current.id) === String(fileId) ? {
      ...current,
      originalUrl: freshSupplierDocumentUrl(documentsApi.supplierPreviewUrl(fileId)),
      supplierPdfRevision: revision,
    } : current));
  }, [setFile]);

  const showSaved = useCallback(() => {
    setStatus('saved');
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      if (alive.current) setStatus((current) => (current === 'saved' ? '' : current));
    }, PDF_SYNC_SUCCESS_NOTICE_MS);
  }, []);

  const sync = useCallback(async (fileId, parsed, attempt) => {
    try {
      const saved = await documentsApi.updateReceipt(fileId, {
        draft: false,
        verified_data: parsed,
        output_settings: parsed.output || { mode: 'original' },
        audit_log: parsed.auditLog || [],
        preview_sync: true,
      });
      // Пока шёл запрос, оператор мог изменить бланк ещё раз — тогда результат
      // этой попытки уже неактуален и подставлять его нельзя.
      if (!alive.current || sequence.current !== attempt) return;
      let correction = saved?.supplier_pdf_correction || {};
      if (correction.status === 'queued' && correction.job_id) {
        correction = await waitForReceiptPdfJob(correction.job_id);
        if (!alive.current || sequence.current !== attempt) return;
      }
      if (!['corrected', 'source'].includes(correction.status)) {
        setStatus('error');
        toast?.(receiptPdfCorrectionProblem(correction), 'err');
        return;
      }
      refreshPreview(fileId);
      showSaved();
    } catch (error) {
      if (!alive.current || sequence.current !== attempt) return;
      setStatus('error');
      toast?.(error.message || 'Не удалось обновить рабочую PDF-копию', 'err');
    }
  }, [refreshPreview, showSaved, toast]);

  /** Ставит пересборку в очередь, если правка вообще влияет на PDF. */
  const syncIfSupplierPdfChanged = useCallback((file, nextParsed) => {
    const fileId = file?.serverId || file?.id;
    if (!fileId || !nextParsed) return;
    if (receiptSupplierPdfFingerprint(file.parsed) === receiptSupplierPdfFingerprint(nextParsed)) return;

    sequence.current += 1;
    const attempt = sequence.current;
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void sync(fileId, nextParsed, attempt);
    }, SYNC_DEBOUNCE_MS);
  }, [sync]);

  /** Отменяет отложенную пересборку — например, при закрытии редактора. */
  const cancelSync = useCallback(() => {
    sequence.current += 1;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setStatus('');
  }, []);

  return { status, syncIfSupplierPdfChanged, refreshPreview, cancelSync };
}
