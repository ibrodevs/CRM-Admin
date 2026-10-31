// Supplementary public contacts verified against official airport websites.
// Keep provenance alongside each record; do not infer contacts for other airports.
export const AIRPORT_PROFILES = {
  SVO: {
    localName: 'Шереметьево', cityRu: 'Москва', website: 'https://www.svo.aero/',
    address: 'Россия, Московская область, Химки, аэропорт Шереметьево',
    contacts: [{ label: 'Справочная служба · круглосуточно', value: '+7 495 578-65-65', href: 'tel:+74955786565', kind: 'phone' }],
    contactsSourceUrl: 'https://www.svo.aero/ru/feedback/Question', verifiedAt: '2026-10-31',
  },
  MCX: {
    localName: 'Махачкала · Уйташ', cityRu: 'Махачкала', website: 'https://mcx.aero/',
    contacts: [
      { label: 'Справочная служба', value: '+7 (8722) 55-55-00', href: 'tel:+78722555500', kind: 'phone' },
      { label: 'Электронная почта', value: 'info@mcxaero.ru', href: 'mailto:info@mcxaero.ru', kind: 'mail' },
    ],
    terminals: [
      { name: 'Терминал А', url: 'https://mcx.aero/scheme/?term=A' },
      { name: 'Терминал Б', url: 'https://mcx.aero/scheme/?term=B' },
    ],
    contactsSourceUrl: 'https://mcx.aero/about/contacts/', verifiedAt: '2026-10-31',
  },
};
