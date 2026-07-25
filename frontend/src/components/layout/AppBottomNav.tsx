import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { NAV_ITEMS, BOTTOM_NAV_PRIMARY_INDICES, BOTTOM_NAV_MORE_INDICES } from './navConfig';
import MD3BottomSheet from '../MD3BottomSheet';

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

const AppBottomNav: React.FC = () => {
  const { uiTheme, darkMode } = useTheme();
  const isMD3 = uiTheme === 'material3';
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const navigate = useNavigate();

  if (isMD3) {
    return (
      <>
        <nav
          style={{
            position: 'fixed',
            bottom: 'var(--md-sys-bottom-nav-floating-margin)',
            left: 'var(--md-sys-bottom-nav-floating-margin)',
            right: 'var(--md-sys-bottom-nav-floating-margin)',
            height: 'var(--md-sys-bottom-nav-height)',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderRadius: 'var(--md-sys-bottom-nav-radius)',
            boxShadow: 'var(--md-sys-elevation-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            zIndex: 100,
          }}
        >
          {BOTTOM_NAV_PRIMARY_INDICES.map((idx) => {
            const item = NAV_ITEMS[idx];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '12px 0',
                  minWidth: 'var(--md-sys-bottom-nav-item-size)',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  position: 'relative',
                }}
              >
                {({ isActive }) => (
                  <>
                    <div style={{
                      padding: '4px 16px',
                      borderRadius: 16,
                      backgroundColor: isActive ? 'var(--md-sys-color-secondary-container)' : 'transparent',
                      color: isActive ? 'var(--md-sys-color-on-secondary-container)' : 'inherit',
                      transition: 'background-color 0.2s, color 0.2s',
                    }}>
                      <MD3Icon name={item.md3Icon} size={24} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}
          <button
            onClick={() => setShowMoreSheet(true)}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '12px 0',
              minWidth: 'var(--md-sys-bottom-nav-item-size)',
              color: 'var(--md-sys-color-on-surface-variant)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ padding: '4px 16px', borderRadius: 16 }}>
              <MD3Icon name="more_horiz" size={24} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 500 }}>المزيد</span>
          </button>
        </nav>

        <MD3BottomSheet isOpen={showMoreSheet} onClose={() => setShowMoreSheet(false)}>
          <div style={{ padding: '16px' }}>
            {BOTTOM_NAV_MORE_INDICES.map((idx) => {
              const item = NAV_ITEMS[idx];
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMoreSheet(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 12px',
                    borderRadius: 'var(--md-sys-shape-full)',
                    textDecoration: 'none',
                    color: 'var(--md-sys-color-on-surface)',
                    fontSize: 'var(--md-sys-typescale-label-large-size)',
                    fontWeight: 500,
                    transition: 'background-color 0.15s',
                  }}
                  className={({ isActive }) => isActive ? 'md3-sidebar-item-active' : ''}
                >
                  <MD3Icon name={item.md3Icon} size={24} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </MD3BottomSheet>
      </>
    );
  }

  // Classic mode bottom nav
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
        borderTop: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 8px',
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={{
            textDecoration: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 4px',
            minWidth: 56,
            color: darkMode ? '#64748b' : '#94a3b8',
          }}
          className={({ isActive }) => `transition-all ${isActive ? 'text-accent font-bold !text-[var(--color-accent)]' : ''}`}
        >
          {item.icon}
          <span style={{ fontSize: 10 }}>{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default AppBottomNav;
