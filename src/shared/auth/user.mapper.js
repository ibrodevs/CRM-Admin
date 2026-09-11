import { RU_DATE_TIME } from '../lib/datetime.js';


import { proxiedMediaUrl } from '../lib/media-url.js';

const TIMEZONE_LABEL = {
  'Asia/Bishkek': '(GMT+6) Бишкек',
  'Europe/Moscow': '(GMT+3) Москва',
  'Asia/Tashkent': '(GMT+5) Ташкент',
};

function toUiUser(user) {
  const roleCode = user?.roles?.[0] || 'operator';
  const role = { admin: 'Админ', operator: 'Оператор', accountant: 'Бухгалтер', manager: 'Руководитель' }[roleCode] || roleCode;
  return {
    ...user,
    name: user?.full_name || [user?.last_name, user?.first_name, user?.middle_name].filter(Boolean).join(' '),
    role,
    avatar: proxiedMediaUrl(user?.avatar),
    position: user?.position || role,
    dept: user?.department || '',
    workEmail: user?.email || '',
    workPhone: user?.work_phone || user?.phone || '',
    internalPhone: user?.internal_phone || '',
    hired: user?.hired_at || '',
    workStatus: { working: 'Работает', vacation: 'Отпуск', sick_leave: 'Больничный', day_off: 'Выходной' }[user?.work_status] || user?.work_status || '',
    presence: { online: 'Онлайн', away: 'Отошёл', busy: 'Занят', offline: 'Не в сети' }[user?.presence] || user?.presence || '',
    tz: TIMEZONE_LABEL[user?.timezone] || user?.timezone || '(GMT+6) Бишкек',
    lang: { ru: 'Русский', ky: 'Кыргызча', en: 'English' }[user?.language] || user?.language || 'Русский',
    lastLogin: user?.last_login ? new Date(user.last_login).toLocaleString('ru-RU', RU_DATE_TIME) : '—',
    slaResponseMin: user?.sla_response_minutes || 15,
  };
}

export { TIMEZONE_LABEL, toUiUser };
