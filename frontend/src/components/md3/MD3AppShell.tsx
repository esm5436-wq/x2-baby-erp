import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBreakpoint, Breakpoint } from '../../hooks/useBreakpoint';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Package, ShoppingBag, BarChart3, Settings as SettingsIcon,
  Users, UserCheck, Activity, ArrowRightLeft, Sun, Moon, LogOut,
  Menu,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Package, label: 'المخزون', shortLabel: 'المخزون' },
  { to: '/orders', icon: ShoppingBag, label: 'الطلبات', shortLabel: 'الطلبات' },
  { to: '/purchases', icon: ShoppingBag, label: 'المشتريات', shortLabel: 'مشتريات' },
  { to: '/accounts', icon: BarChart3, label: 'الحسابات والمالية', shortLabel: 'الحسابات' },
  { to: '/contacts', icon: Users, label: 'جهات الاتصال', shortLabel: 'جهات' },
  { to: '/customers', icon: UserCheck, label: 'العملاء', shortLabel: 'عملاء' },
  { to: '/activity-logs', icon: Activity, label: 'سجل النشاطات', shortLabel: 'نشاطات' },
  { to: '/easy-orders', icon: ArrowRightLeft, label: 'Easy Orders', shortLabel: 'Easy Orders' },
  { to: '/settings', icon: SettingsIcon, label: 'إدارة البيانات', shortLabel: 'البيانات' },
];

interface MD3AppShellProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
  logout: () => void;
  brandLogo?: string;
  brandName?: string;
  brandSlogan?: string;
  brandSloganDesign?: string;
}

/* ═══════════════════════════════════════════════════════════════
   NavigationDrawer — Expanded (≥840px)
   Full sidebar with labels, brand, and controls
   ═══════════════════════════════════════════════════════════════ */
const MD3NavigationDrawer: React.FC<{
  brandLogo?: string;
  brandName?: string;
  brandSlogan?: string;
  brandSloganDesign?: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  logout: () => void;
}> = ({ brandLogo, brandName, brandSlogan, brandSloganDesign, darkMode, toggleDarkMode, logout }) => {
  return (
    <nav className="md3-nav-drawer" style={{ flexShrink: 0 }}>
      <div className="md3-nav-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 12px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--md-sys-shape-medium)',
              backgroundColor: 'var(--md-sys-color-primary-container)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {brandLogo ? (
              <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Package size={24} style={{ color: 'var(--md-sys-color-on-primary-container)' }} />
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 500,
              color: 'var(--md-sys-color-on-surface)',
              lineHeight: 'var(--md-sys-typescale-title-medium-height)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{brandName || 'X2 BABY'}</div>
            {brandSlogan && (
              <div style={{
                fontSize: 'var(--md-sys-typescale-body-small-size)',
                color: 'var(--md-sys-color-on-surface-variant)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{brandSlogan}</div>
            )}
          </div>
        </div>
      </div>

      <div className="md3-nav-drawer-divider" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `md3-nav-drawer-item ${isActive ? 'md3-nav-drawer-item-active' : ''}`
            }
          >
            <item.icon size={24} style={{ flexShrink: 0 }} />
            <span className="md3-nav-drawer-item-label">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="md3-nav-drawer-divider" />

      <div style={{ padding: '0 12px 8px' }}>
        {brandSloganDesign && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 'var(--md-sys-shape-medium)',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            marginBottom: 8,
          }}>
            <img src={brandSloganDesign} alt="Slogan" style={{ width: '100%', maxHeight: 60, objectFit: 'contain' }} />
          </div>
        )}
        <button
          onClick={toggleDarkMode}
          className="md3-nav-drawer-item"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {darkMode ? (
            <Sun size={24} style={{ color: 'var(--md-sys-color-primary)' }} />
          ) : (
            <Moon size={24} style={{ color: 'var(--md-sys-color-primary)' }} />
          )}
          <span className="md3-nav-drawer-item-label">
            {darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          </span>
        </button>
        <button
          onClick={() => logout()}
          className="md3-nav-drawer-item"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <LogOut size={24} style={{ color: 'var(--md-sys-color-error)' }} />
          <span className="md3-nav-drawer-item-label" style={{ color: 'var(--md-sys-color-error)' }}>
            تسجيل الخروج
          </span>
        </button>
      </div>
    </nav>
  );
};

/* ═══════════════════════════════════════════════════════════════
   NavigationRail — Medium (600-839px)
   Vertical rail with icons + labels, collapsible
   ═══════════════════════════════════════════════════════════════ */
const MD3NavigationRail: React.FC<{
  darkMode: boolean;
  toggleDarkMode: () => void;
  logout: () => void;
}> = ({ darkMode, toggleDarkMode, logout }) => {
  return (
    <nav className="md3-nav-rail">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 0', flexShrink: 0 }}>
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div className={`md3-nav-rail-item ${isActive ? 'md3-nav-rail-item-active' : ''}`}>
              <div className="md3-nav-rail-indicator">
                <Package size={24} />
              </div>
            </div>
          )}
        </NavLink>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 12px' }}>
        {NAV_ITEMS.slice(1).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={{ textDecoration: 'none' }}
          >
            {({ isActive }) => (
              <div className={`md3-nav-rail-item ${isActive ? 'md3-nav-rail-item-active' : ''}`}>
                <div className="md3-nav-rail-indicator">
                  <item.icon size={24} />
                </div>
                <span className="md3-nav-rail-label">{item.shortLabel}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 0', flexShrink: 0 }}>
        <button onClick={toggleDarkMode} className="md3-nav-rail-item" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          <div className="md3-nav-rail-indicator">
            {darkMode ? <Sun size={24} style={{ color: 'var(--md-sys-color-primary)' }} /> : <Moon size={24} />}
          </div>
        </button>
        <button onClick={() => logout()} className="md3-nav-rail-item" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          <div className="md3-nav-rail-indicator">
            <LogOut size={24} style={{ color: 'var(--md-sys-color-error)' }} />
          </div>
        </button>
      </div>
    </nav>
  );
};

/* ═══════════════════════════════════════════════════════════════
   BottomNavigationBar — Compact (<600px)
   Primary 5 destinations, rest in overflow
   ═══════════════════════════════════════════════════════════════ */
const MD3BottomNav: React.FC = () => {
  const primaryItems = NAV_ITEMS.slice(0, 5);
  const overflowItems = NAV_ITEMS.slice(5);

  return (
    <>
      <nav className="md3-bottom-nav">
        {primaryItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `md3-bottom-nav-item ${isActive ? 'md3-bottom-nav-item-active' : ''}`}>
            {({ isActive }) => (
              <>
                <span className="md3-nav-indicator">
                  <item.icon size={24} />
                </span>
                <span className="md3-nav-label">{item.shortLabel}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════
   Main AppShell — Routes to correct navigation mode
   ═══════════════════════════════════════════════════════════════ */
export const MD3AppShell: React.FC<MD3AppShellProps> = ({
  children,
  darkMode,
  toggleDarkMode,
  logout,
  brandLogo,
  brandName,
  brandSlogan,
  brandSloganDesign,
}) => {
  const breakpoint = useBreakpoint();

  if (breakpoint === 'compact') {
    return (
      <div className="md3-app-shell md3-app-shell-compact" style={{
        minHeight: '100vh',
        backgroundColor: 'var(--md-sys-color-surface)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <main style={{ flex: 1, paddingBottom: '80px' }}>
          {children}
        </main>
        <MD3BottomNav />
      </div>
    );
  }

  if (breakpoint === 'medium') {
    return (
      <div className="md3-app-shell md3-app-shell-medium" style={{
        minHeight: '100vh',
        backgroundColor: 'var(--md-sys-color-surface)',
        display: 'flex',
      }}>
        <MD3NavigationRail darkMode={darkMode} toggleDarkMode={toggleDarkMode} logout={logout} />
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="md3-app-shell md3-app-shell-expanded" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--md-sys-color-surface)',
      display: 'flex',
    }}>
      <MD3NavigationDrawer
        brandLogo={brandLogo}
        brandName={brandName}
        brandSlogan={brandSlogan}
        brandSloganDesign={brandSloganDesign}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        logout={logout}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
};

export default MD3AppShell;
