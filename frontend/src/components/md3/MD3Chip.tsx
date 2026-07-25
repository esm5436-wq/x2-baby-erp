import React, { ReactNode } from 'react';

type ChipVariant = 'assist' | 'filter' | 'input' | 'suggestion';

interface MD3ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  icon?: ReactNode;
  avatar?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const MD3Chip: React.FC<MD3ChipProps> = ({
  children,
  variant = 'assist',
  selected = false,
  onClick,
  onRemove,
  icon,
  avatar,
  disabled = false,
  className = '',
}) => {
  const base = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap';

  const variantStyle: Record<ChipVariant, string> = {
    assist: `border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)] ${onClick ? 'hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)] cursor-pointer' : ''}`,
    filter: selected
      ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
      : 'border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)]',
    input: 'border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface)]',
    suggestion: 'bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container)] cursor-pointer',
  };

  return (
    <span
      onClick={onClick}
      role={variant === 'filter' ? 'checkbox' : variant === 'assist' && onClick ? 'button' : undefined}
      aria-checked={variant === 'filter' ? selected : undefined}
      aria-disabled={disabled}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={onClick && !disabled ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); } } : undefined}
      className={`
        ${base}
        ${variantStyle[variant]}
        ${onClick && !disabled ? 'cursor-pointer active:scale-95' : ''}
        ${disabled ? 'opacity-38 pointer-events-none' : ''}
        ${className}
      `}
    >
      {avatar && <span className="shrink-0">{avatar}</span>}
      {icon && !avatar && <span className="shrink-0">{icon}</span>}
      {variant === 'filter' && selected && (
        <span className="material-symbols-rounded shrink-0" style={{ fontSize: 16 }}>check</span>
      )}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="shrink-0 ml-0.5 hover:opacity-60 transition-opacity"
          aria-label="إزالة"
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
        </button>
      )}
    </span>
  );
};
