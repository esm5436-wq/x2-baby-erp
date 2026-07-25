import React, { useState } from 'react';

interface MD3DividerProps {
  className?: string;
  inset?: boolean;
  vertical?: boolean;
}

export const MD3Divider: React.FC<MD3DividerProps> = ({ className = '', inset = false, vertical = false }) => {
  if (vertical) {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`w-px h-6 bg-[var(--md-sys-color-outline-variant)] ${inset ? 'mx-4' : ''} ${className}`}
      />
    );
  }
  return (
    <hr
      role="separator"
      className={`border-0 h-px bg-[var(--md-sys-color-outline-variant)] ${inset ? 'mx-4' : ''} ${className}`}
    />
  );
};

interface MD3EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const MD3EmptyState: React.FC<MD3EmptyStateProps> = ({ icon, title, description, action, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-[var(--md-sys-color-surface-container-high)] flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[var(--md-sys-color-on-surface)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

interface MD3StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  tooltip?: string;
  iconBg?: string;
  className?: string;
}

export const MD3StatCard: React.FC<MD3StatCardProps> = ({ icon, label, value, unit, subtitle, tooltip, iconBg, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipId = `stat-tooltip-${label?.replace(/\s/g, '-')}`;

  return (
    <div className={`bg-[var(--md-sys-color-surface-container-low)] rounded-xl p-4 flex flex-col justify-between group hover:shadow-[var(--md-sys-elevation-1)] transition-all relative ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl ${iconBg || 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'} flex items-center justify-center`}>
          {icon}
        </div>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="text-[var(--md-sys-color-outline)] hover:text-[var(--md-sys-color-primary)] transition-colors p-1"
              aria-describedby={showTooltip ? tooltipId : undefined}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>info</span>
            </button>
            {showTooltip && (
              <div
                id={tooltipId}
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] text-xs font-medium p-3 rounded-xl shadow-xl z-50 pointer-events-none"
              >
                <div className="relative">{tooltip}</div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--md-sys-color-inverse-surface)] rotate-45 -mt-1.5" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wide mb-1">{label}</div>
      <span className="font-bold text-2xl text-[var(--md-sys-color-on-surface)] leading-tight">
        {value} {unit && <span className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)]">{unit}</span>}
      </span>
      {subtitle && (
        <div className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mt-1 flex items-center gap-1 opacity-80">
          <div className="w-1 h-1 rounded-full bg-[var(--md-sys-color-outline)]" />
          {subtitle}
        </div>
      )}
    </div>
  );
};
