import { ProfilePage } from './page_profile';






function AccountSettingsPage({ onNavigate }) {
  return <ProfilePage onNavigate={onNavigate} initialTab="security" />;
}

Object.assign(window, { AccountSettingsPage });



export { AccountSettingsPage };
