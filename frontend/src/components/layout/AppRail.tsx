import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { NAV_ITEMS } from './navConfig';
import { RAIL_WIDTH } from './AppSidebar';

const MD3Icon: React.FC<{
  name: string;
  size?: number;
  className?: string;
}> = ({ name, size = 24, className = '' }) => (
  <span
    className={`material-symbols-rounded ${className}`}
    style={{ fontSize: size }}
  >
    {name}
  </span>
);

interface AppRailProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  logout: () => void;
}

const AppRail: React.FC<AppRailProps> = ({ darkMode, toggleDarkMode, logout }) => {
  const { uiTheme } = useTheme();
  const isMD3 = uiTheme === 'material3';

  const bgColor = isMD3
    ? 'var(--md-sys-color-surface-container-low)'
    : darkMode ? '#0f172a' : '#ffffff';
  const borderColor = isMD3
    ? 'var(--md-sys-color-outline-variant)'
    : darkMode ? '#1e293b' : '#e2e8f0';

  return (
    <nav
      style={{
        width: RAIL_WIDTH,
        backgroundColor: bgColor,
        borderLeft: `1px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        flexShrink: 0,
        overflowY: 'auto',
        height: '100dvh',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 0', flexShrink: 0 }}>
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div className={`md3-nav-rail-item ${isActive ? 'md3-nav-rail-item-active' : ''}`}>
              <div className="md3-nav-rail-indicator">
                <MD3Icon name={NAV_ITEMS[0].md3Icon} size={24} />
              </div>
            </div>
          )}
        </NavLink>
        <span className="md3-nav-rail-label">{NAV_ITEMS[0].shortLabel}</span>
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
                  <MD3Icon name={item.md3Icon} size={24} />
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
            <MD3Icon name={darkMode ? 'light_mode' : 'dark_mode'} size={24} className={darkMode ? 'text-[var(--md-sys-color-primary)]' : ''} />
          </div>
        </button>
        <button onClick={() => logout()} className="md3-nav-rail-item" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          <div className="md3-nav-rail-indicator">
            <MD3Icon name="logout" size={24} className="text-[var(--md-sys-color-error)]" />
          </div>
        </button>
      </div>
    </nav>
  );
};

export default AppRail;
