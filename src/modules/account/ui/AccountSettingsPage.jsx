import { ProfilePage } from '../../profile/ui/ProfilePage';






function AccountSettingsPage({ user, onNavigate }) {
  return <ProfilePage user={user} onNavigate={onNavigate} initialTab="security" />;
}

Object.assign(window, { AccountSettingsPage });



export { AccountSettingsPage };
