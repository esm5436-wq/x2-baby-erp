import React from 'react';

interface MD3TopBarProps {
  title: string;
  subtitle?: string;
  leadingIcon?: React.ReactNode;
  actions?: React.ReactNode;
}

export const MD3TopBar: React.FC<MD3TopBarProps> = ({ title, subtitle, leadingIcon, actions }) => {
  return (
    <div className="md3-top-app-bar">
      <div className="md3-top-app-bar-row">
        {leadingIcon && (
          <div className="md3-top-app-bar-icon">{leadingIcon}</div>
        )}
        <div className="md3-top-app-bar-title-group">
          <div className="md3-top-app-bar-title">{title}</div>
          {subtitle && <div className="md3-top-app-bar-subtitle">{subtitle}</div>}
        </div>
        {actions && <div className="md3-top-app-bar-actions">{actions}</div>}
      </div>
    </div>
  );
};

interface MD3FABProps {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  size?: 'regular' | 'small' | 'extended';
  className?: string;
}

export const MD3FAB: React.FC<MD3FABProps> = ({ icon, label, onClick, size = 'regular', className = '' }) => {
  const sizeClass = size === 'small' ? 'md3-fab-small' : size === 'extended' ? 'md3-fab-extended' : '';
  return (
    <button
      onClick={onClick}
      className={`md3-fab ${sizeClass} ${className}`}
      aria-label={label}
    >
      {icon}
      {label && size === 'extended' && <span className="md3-fab-label">{label}</span>}
    </button>
  );
};
