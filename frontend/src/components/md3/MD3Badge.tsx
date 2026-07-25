import React from 'react';

type BadgeVariant = 'filled' | 'tinted' | 'outlined';

interface MD3BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: string;
  className?: string;
}

const presetColors: Record<string, { bg: string; text: string; tintBg: string }> = {
  primary: { bg: 'var(--md-sys-color-primary)', text: 'var(--md-sys-color-on-primary)', tintBg: 'var(--md-sys-color-primary-container)' },
  secondary: { bg: 'var(--md-sys-color-secondary)', text: 'var(--md-sys-color-on-secondary)', tintBg: 'var(--md-sys-color-secondary-container)' },
  success: { bg: 'var(--md-sys-color-success)', text: 'var(--md-sys-color-on-success)', tintBg: 'var(--md-sys-color-success-container)' },
  warning: { bg: 'var(--md-sys-color-warning)', text: 'var(--md-sys-color-on-warning)', tintBg: 'var(--md-sys-color-warning-container)' },
  error: { bg: 'var(--md-sys-color-error)', text: 'var(--md-sys-color-on-error)', tintBg: 'var(--md-sys-color-error-container)' },
  info: { bg: 'var(--md-sys-color-info)', text: 'var(--md-sys-color-on-info)', tintBg: 'var(--md-sys-color-info-container)' },
};

export const MD3Badge: React.FC<MD3BadgeProps> = ({
  children,
  variant = 'tinted',
  color = 'primary',
  className = '',
}) => {
  const colors = presetColors[color] || presetColors.primary;

  const style: Record<BadgeVariant, string> = {
    filled: 'text-[10px] font-bold px-2.5 py-1 rounded-lg',
    tinted: 'text-[10px] font-bold px-2.5 py-1 rounded-lg',
    outlined: 'text-[10px] font-bold px-2.5 py-1 rounded-lg border',
  };

  const getStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'filled':
        return { backgroundColor: colors.bg, color: colors.text };
      case 'tinted':
        return { backgroundColor: colors.tintBg, color: colors.bg };
      case 'outlined':
        return { borderColor: colors.bg, color: colors.bg };
      default:
        return {};
    }
  };

  return (
    <span className={`inline-flex items-center whitespace-nowrap ${style[variant]} ${className}`} style={getStyle()}>
      {children}
    </span>
  );
};
