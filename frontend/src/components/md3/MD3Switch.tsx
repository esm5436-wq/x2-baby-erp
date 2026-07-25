import React from 'react';

interface MD3SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  name?: string;
  id?: string;
}

const MD3Switch: React.FC<MD3SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  name,
  id,
}) => {
  const switchId = id || name || `switch-${Math.random().toString(36).slice(2)}`;

  return (
    <label
      htmlFor={switchId}
      className={`
        inline-flex items-center gap-3 cursor-pointer select-none
        ${disabled ? 'opacity-38 pointer-events-none' : ''}
      `}
    >
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`
          relative w-[52px] h-[32px] rounded-full transition-all duration-200 ease-out
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]
          ${checked
            ? 'bg-[var(--md-sys-color-primary)]'
            : 'bg-[var(--md-sys-color-surface-container-highest)] border-2 border-[var(--md-sys-color-outline)]'
          }
        `}
      >
        {/* Thumb */}
        <span
          className={`
            absolute top-1/2 -translate-y-1/2 block rounded-full transition-all duration-200 ease-out shadow-sm
            ${checked
              ? 'w-5 h-5 bg-[var(--md-sys-color-on-primary)] right-[calc(50%-10px)]'
              : 'w-7 h-7 bg-[var(--md-sys-color-outline)] right-[calc(100%-28px)]'
            }
            ${!checked ? 'border-2 border-[var(--md-sys-color-outline)]' : ''}
          `}
          style={checked ? { right: 'calc(50% - 10px)' } : { right: '6px' }}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-[var(--md-sys-color-on-surface)]">
          {label}
        </span>
      )}
    </label>
  );
};

export { MD3Switch };
