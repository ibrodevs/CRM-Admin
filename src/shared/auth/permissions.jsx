import { Icon } from '../icons/index.jsx';
import { Button } from '../ui/Button.jsx';
import { PERMISSIONS, ROLES } from '../constants/permissions.js';
import { Topbar } from '../ui/Topbar.jsx';

const NAV_PERM = {
  orders: 'Просмотр заказов',
  flights: 'Поиск и бронирование услуг', rail: 'Поиск и бронирование услуг', hotels: 'Поиск и бронирование услуг',
  transfers: 'Поиск и бронирование услуг', buses: 'Поиск и бронирование услуг', tours: 'Поиск и бронирование услуг',
  offers: 'Коммерческие предложения',
  finance: 'Просмотр финансов',
  documents: 'Просмотр документов',
  receipts: 'Просмотр документов',
  fulfillment: 'Проведение оплат',
  returns: 'Возвраты и штрафы',
  settings: 'Настройки системы',
};

function roleIdx(role) { return ROLES.indexOf(role); }

function roleHasPerm(role, permKey) {
  const i = roleIdx(role);
  if (i < 0) return true;
  for (const g of PERMISSIONS) for (const it of g.items) if (it.k === permKey) return !!it.r[i];
  return true;
}

function roleCanSee(role, navKey) { const p = NAV_PERM[navKey]; return p ? roleHasPerm(role, p) : true; }

function RoleSwitcher({ role, onRole }) {
  return <span className="chip" style={{ height: 36, cursor: 'default' }} title="Роль получена из защищённой backend-сессии"><Icon name="user" />{role}</span>;
}

function AccessDenied({ onNavigate }) {
  return (
    <>
      <Topbar title="Нет доступа" />
      <div className="content">
        <div className="card card-pad" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: '44px 36px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--red-bg)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon name="lock" style={{ width: 28, height: 28 }} />
          </div>
          <h2 className="card-title" style={{ marginBottom: 8 }}>Раздел недоступен для вашей роли</h2>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: '0 0 22px' }}>Доступ к этому модулю ограничен правами. Обратитесь к администратору организации.</p>
          <Button onClick={() => onNavigate('dashboard')} icon="home">На главную</Button>
        </div>
      </div>
    </>
  );
}

export { NAV_PERM, roleIdx, roleHasPerm, roleCanSee, RoleSwitcher, AccessDenied };
