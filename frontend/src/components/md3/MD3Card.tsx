import React, { ReactNode } from 'react';

type CardVariant = 'elevated' | 'filled' | 'outlined';

interface MD3CardProps {
  children: ReactNode;
  variant?: CardVariant;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  padding?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  elevated: 'bg-[var(--md-sys-color-surface-container-low)] shadow-[var(--md-sys-elevation-1)]',
  filled: 'bg-[var(--md-sys-color-surface-container-highest)]',
  outlined: 'border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)]',
};

export const MD3Card: React.FC<MD3CardProps> = ({
  children,
  variant = 'elevated',
  onClick,
  className = '',
  selected = false,
  padding = true,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`
        rounded-xl overflow-hidden relative
        transition-all duration-200 ease-out
        ${variantClasses[variant]}
        ${onClick ? 'cursor-pointer hover:shadow-[var(--md-sys-elevation-2)] active:shadow-[var(--md-sys-elevation-1)]' : ''}
        ${selected ? 'ring-2 ring-[var(--md-sys-color-primary)] ring-offset-2 ring-offset-[var(--md-sys-color-surface)]' : ''}
        ${padding ? 'p-4' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
