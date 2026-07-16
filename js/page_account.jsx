import { ProfilePage } from './page_profile';

// ===== Настройки аккаунта — тонкая обёртка над расширенным профилем (см. page_profile.jsx) =====
// Полный профиль с вкладками (Профиль / Безопасность / Уведомления / Предпочтения / Доступы /
// Мотивация / Статистика / Рабочее время) реализован в ProfilePage. Маршрут «account» открывает
// тот же профиль на вкладке «Безопасность».

function AccountSettingsPage({ onNavigate }) {
  return <ProfilePage onNavigate={onNavigate} initialTab="security" />;
}

Object.assign(window, { AccountSettingsPage });



export { AccountSettingsPage };
