import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import AppSidebar from './AppSidebar';
import AppTopBar from './AppTopBar';
import AppBottomNav from './AppBottomNav';
import AppRail from './AppRail';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  topBarActions?: React.ReactNode;
  brandLogo?: string;
  brandName?: string;
  brandSlogan?: string;
  brandSloganDesign?: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  logout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  subtitle,
  topBarActions,
  brandLogo,
  brandName,
  brandSlogan,
  brandSloganDesign,
  darkMode,
  toggleDarkMode,
  logout,
}) => {
  const { uiTheme } = useTheme();
  const isMD3 = uiTheme === 'material3';
  const breakpoint = useBreakpoint();

  const bgColor = isMD3
    ? 'var(--md-sys-color-surface)'
    : darkMode ? '#020617' : '#f8fafc';

  if (breakpoint === 'compact') {
    return (
      <div
        className="md3-app-shell md3-app-shell-compact"
        style={{
          height: '100dvh',
          backgroundColor: bgColor,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {isMD3 && (
          <header
            style={{
              height: 'var(--md-sys-top-bar-mobile-height)',
              backgroundColor: isMD3 ? 'var(--md-sys-color-surface)' : darkMode ? '#0f172a' : '#ffffff',
              borderBottom: `1px solid ${isMD3 ? 'var(--md-sys-color-outline-variant)' : darkMode ? '#1e293b' : '#e2e8f0'}`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--md-sys-shape-small)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {brandLogo ? (
                <img src={brandLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="material-symbols-rounded text-[var(--md-sys-color-on-primary-container)]" style={{ fontSize: 18 }}>store</span>
              )}
            </div>
            <span style={{
              fontSize: 'var(--md-sys-typescale-title-medium-size)',
              fontWeight: 500,
              color: 'var(--md-sys-color-on-surface)',
            }}>{brandName || 'X2 BABY'}</span>
          </header>
        )}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: isMD3
            ? 'calc(var(--md-sys-bottom-nav-height) + var(--md-sys-bottom-nav-floating-margin) * 2)'
            : '72px',
        }}>
          {children}
        </main>
        <AppBottomNav />
      </div>
    );
  }

  if (breakpoint === 'medium') {
    return (
      <div
        className="md3-app-shell md3-app-shell-medium"
        style={{
          height: '100dvh',
          backgroundColor: bgColor,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        <AppRail
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          logout={logout}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    );
  }

  // Expanded (>=840px)
  return (
    <div
      className="md3-app-shell md3-app-shell-expanded"
      style={{
        height: '100dvh',
        backgroundColor: bgColor,
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      <AppSidebar
        brandLogo={brandLogo}
        brandName={brandName}
        brandSlogan={brandSlogan}
        brandSloganDesign={brandSloganDesign}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        logout={logout}
      />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
