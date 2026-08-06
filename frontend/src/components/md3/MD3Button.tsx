import React, { ReactNode } from 'react';

type ButtonVariant = 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
type ButtonSize = 'small' | 'medium' | 'large';

interface MD3ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const variantClasses: Record<ButtonVariant, string> = {
  filled: 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-sm hover:shadow-md',
  outlined: 'border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary-readable,var(--md-sys-color-primary))] bg-transparent hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)]',
  text: 'text-[var(--md-sys-color-primary-readable,var(--md-sys-color-primary))] bg-transparent hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)]',
  tonal: 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:shadow-sm',
  elevated: 'bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-primary-readable,var(--md-sys-color-primary))] shadow-sm hover:shadow-md',
};

const sizeClasses: Record<ButtonSize, string> = {
  small: 'h-9 px-4 text-xs gap-1.5 rounded-lg',
  medium: 'h-10 px-6 text-sm gap-2 rounded-xl',
  large: 'h-12 px-8 text-base gap-2.5 rounded-xl',
};

export const MD3Button: React.FC<MD3ButtonProps> = ({
  children,
  variant = 'filled',
  size = 'medium',
  icon,
  iconPosition = 'start',
  onClick,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center font-bold
        transition-all duration-200 ease-out
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]
        disabled:opacity-38 disabled:shadow-none disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === 'end' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};

interface MD3IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  size?: number;
  title?: string;
  className?: string;
  badge?: number | string;
}

export const MD3IconButton: React.FC<MD3IconButtonProps> = ({
  icon,
  onClick,
  disabled = false,
  variant = 'standard',
  size = 40,
  title,
  className = '',
  badge,
}) => {
  const variantStyle: Record<string, string> = {
    standard: 'bg-transparent hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)]',
    filled: 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:shadow-sm',
    tonal: 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:shadow-sm',
    outlined: 'border border-[var(--md-sys-color-outline-variant)] bg-transparent hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)]',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        relative inline-flex items-center justify-center rounded-full
        transition-all duration-200
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]
        disabled:opacity-38 disabled:pointer-events-none
        ${variantStyle[variant]}
        ${className}
      `}
      style={{ width: size, height: size }}
    >
      <span className="text-[var(--md-sys-color-on-surface)]">{icon}</span>
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
};
