import { ORDER_OPS_SECTIONS, SERVICE_KEYS } from '../../shared/constants/navigation.js';
import { NAV_ITEMS } from '../routing/navigation.js';
import { NavGroup, Sidebar, ProfileCard } from './Sidebar.jsx';
import { Topbar } from '../../shared/ui/Topbar.jsx';
import { ModulePlaceholder } from '../../shared/ui/ModulePlaceholder.jsx';

function AppShell({ route, onNavigate, onLogout, role, user, topbar, overlays, children, sidebarCollapsed, onToggleSidebar }) {
  return (
    <div className="app">
      <Sidebar route={route} onNavigate={onNavigate} onLogout={onLogout} role={role} user={user} collapsed={sidebarCollapsed} onToggleCollapse={onToggleSidebar} />
      <main className="main scroll">
        {topbar}
        {children}
      </main>
      {overlays}
    </div>
  );
}

Object.assign(window, { NAV_ITEMS, SERVICE_KEYS, ORDER_OPS_SECTIONS, NavGroup, Sidebar, ProfileCard, AppShell, Topbar, ModulePlaceholder });

export { AppShell };
export { NAV_ITEMS } from '../routing/navigation.js';
export { ORDER_OPS_SECTIONS } from '../../shared/constants/navigation.js';
export { SERVICE_KEYS } from '../../shared/constants/navigation.js';
export { NavGroup } from './Sidebar.jsx';
export { Sidebar } from './Sidebar.jsx';
export { ProfileCard } from './Sidebar.jsx';
export { Topbar } from '../../shared/ui/Topbar.jsx';
export { ModulePlaceholder } from '../../shared/ui/ModulePlaceholder.jsx';
