// Как рассказать оператору о результате отправки наружу.
//
// Раньше любая отправка сопровождалась тостом «Отправлено», хотя backend лишь
// отвечал `{"status": "queued"}` и ничего не отправлял. Теперь ответ содержит
// признак `channel_configured` и адрес получателя — и интерфейс обязан это
// показывать: оператор не должен считать, что клиент получил документ, если
// канал не настроен или адрес не найден.

export const CHANNEL_LABELS = {
  email: 'E-mail',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  max: 'MAX',
  sms: 'SMS',
  push: 'Push',
  desktop: 'Уведомления в CRM',
  internal: 'Внутренний чат',
};

export const DELIVERY_STATE_LABELS = {
  queued: 'В очереди',
  sent: 'Отправлено',
  failed: 'Ошибка отправки',
  skipped: 'Канал не настроен',
};

export const channelLabel = (channel) => CHANNEL_LABELS[channel] || channel || '';

/**
 * Сводка по одному или нескольким ответам эндпоинтов отправки.
 * @returns {{ tone: 'ok'|'info'|'err', message: string }}
 */
export function deliverySummary(responses, { subject = 'Документы' } = {}) {
  const items = (Array.isArray(responses) ? responses : [responses]).filter(Boolean);
  if (!items.length) return { tone: 'info', message: 'Отправлять нечего' };

  const channel = channelLabel(items[0].channel);
  const notConfigured = items.filter((item) => item.channel_configured === false);
  const noRecipient = items.filter((item) => item.channel_configured !== false && !item.recipient);

  if (notConfigured.length === items.length) {
    return {
      tone: 'err',
      message: `${subject}: канал «${channel}» не настроен — клиенту ничего не ушло. Обратитесь к администратору.`,
    };
  }
  if (noRecipient.length === items.length) {
    return {
      tone: 'err',
      message: `${subject}: не найден адрес клиента для канала «${channel}» — отправка не выполнена.`,
    };
  }
  if (notConfigured.length || noRecipient.length) {
    return {
      tone: 'err',
      message: `${subject}: часть отправок не выполнена (${notConfigured.length + noRecipient.length} из ${items.length}). Проверьте настройку канала и контакты клиента.`,
    };
  }
  return {
    tone: 'ok',
    message: `${subject} поставлены в очередь отправки (${channel}). Статус доставки виден в карточке документа.`,
  };
}

// ——— Финансовые документы и выгрузки ————————————————————————————————————
// `accounting_export` теперь отдаёт настоящий XLSX, а не ответ-заглушку, —
// значит и сохранять его надо под своим расширением, а не под .txt.
const FINANCE_DOCUMENT_FILE = {
  reconciliation: { label: 'Акт-сверки', ext: 'txt' },
  invoice: { label: 'Счёт', ext: 'txt' },
  upd: { label: 'УПД', ext: 'txt' },
  accounting_export: { label: 'Выгрузка-в-бухгалтерию', ext: 'xlsx' },
};

export function financeDocumentFilename(kind, counterpart) {
  const file = FINANCE_DOCUMENT_FILE[kind] || { label: 'Документ', ext: 'txt' };
  const name = String(counterpart || '').replace(/[\\/:*?"<>|]/g, '').trim() || 'контрагент';
  return `${file.label}-${name}.${file.ext}`;
}

/** Скачивает полученный файл под корректным именем. */
export function saveDocumentBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
