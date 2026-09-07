import { ROUTE_LABELS } from '../../application/routing/labels.js';
import { NAV_PERM, roleHasPerm, roleCanSee, RoleSwitcher, AccessDenied } from '../../shared/auth/permissions.jsx';
import { Breadcrumbs, QuickCreate, GlobalTopbar } from '../../application/shell/Topbar.jsx';
import { NotificationDrawer } from '../../application/shell/NotificationDrawer.jsx';
import { GlobalChatDrawer } from '../../application/shell/ChatDrawer.jsx';
import { GlobalSearch } from '../../application/shell/GlobalSearch.jsx';

Object.assign(window, {
  ROUTE_LABELS, Breadcrumbs, GlobalSearch, QuickCreate,
  GlobalTopbar, NotificationDrawer, GlobalChatDrawer,
  NAV_PERM, roleHasPerm, roleCanSee, RoleSwitcher, AccessDenied,
});
