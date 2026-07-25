import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

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

interface AppTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const AppTopBar: React.FC<AppTopBarProps> = ({ title, subtitle, actions }) => {
  const { uiTheme, darkMode } = useTheme();
  const isMD3 = uiTheme === 'material3';

  const bgColor = isMD3
    ? 'var(--md-sys-color-surface)'
    : darkMode ? '#0f172a' : '#ffffff';
  const borderColor = isMD3
    ? 'var(--md-sys-color-outline-variant)'
    : darkMode ? '#1e293b' : '#e2e8f0';
  const textColor = isMD3
    ? 'var(--md-sys-color-on-surface)'
    : darkMode ? '#f1f5f9' : '#0f172a';
  const textSecondary = isMD3
    ? 'var(--md-sys-color-on-surface-variant)'
    : darkMode ? '#94a3b8' : '#64748b';

  return (
    <div
      style={{
        height: isMD3 ? 'var(--md-sys-top-bar-height)' : 64,
        backgroundColor: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isMD3 ? 'var(--md-sys-typescale-title-large-size)' : '20px',
          fontWeight: isMD3 ? 500 : 700,
          color: textColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontSize: isMD3 ? 'var(--md-sys-typescale-body-small-size)' : '12px',
            color: textSecondary,
          }}>{subtitle}</div>
        )}
      </div>

      {actions && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          {actions}
        </div>
      )}
    </div>
  );
};

export default AppTopBar;
