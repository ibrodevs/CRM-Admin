const LABELS = {
  ticket: 'Билет', itinerary_receipt: 'Маршрутная квитанция', voucher: 'Ваучер',
  certificate: 'Справка', insurance_policy: 'Страховой полис', invoice: 'Счёт',
  act: 'Акт', contract: 'Договор', passport: 'Паспорт', application: 'Заявление',
  supplier_confirmation: 'Подтверждение',
};

export function passengerAttachments(documents, participant) {
  const person = participant?.person;
  const participantId = participant?.serverId || participant?.id;
  return documents.filter((doc) => doc.status !== 'void' && (
    (person != null && doc.person != null && String(doc.person) === String(person))
    || (participantId != null && doc.metadata?.participant_id != null && String(doc.metadata.participant_id) === String(participantId))
  ));
}

export function passengerAttachmentLabel(document) {
  const type = LABELS[document.kind];
  const number = document.document_number;
  if (type && number) return `${type} ${number}`;
  return document.title || type || 'Файл';
}
