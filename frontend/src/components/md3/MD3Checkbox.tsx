import React from 'react';

interface MD3CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  error?: boolean;
  name?: string;
  id?: string;
}

const MD3Checkbox: React.FC<MD3CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  error = false,
  name,
  id,
}) => {
  const checkboxId = id || name || `checkbox-${Math.random().toString(36).slice(2)}`;

  return (
    <label
      htmlFor={checkboxId}
      className={`
        inline-flex items-center gap-3 cursor-pointer select-none
        ${disabled ? 'opacity-38 pointer-events-none' : ''}
      `}
    >
      <button
        id={checkboxId}
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={`
          relative w-5 h-5 rounded-sm transition-all duration-150 ease-out flex items-center justify-center
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--md-sys-color-primary)]
          ${checked
            ? error
              ? 'bg-[var(--md-sys-color-error)] border-none'
              : 'bg-[var(--md-sys-color-primary)] border-none'
            : error
              ? 'border-2 border-[var(--md-sys-color-error)] bg-transparent'
              : 'border-2 border-[var(--md-sys-color-on-surface-variant)] bg-transparent'
          }
        `}
      >
        {checked && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={error ? 'var(--md-sys-color-on-error)' : 'var(--md-sys-color-on-primary)'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>
      {label && (
        <span className="text-sm font-medium text-[var(--md-sys-color-on-surface)]">
          {label}
        </span>
      )}
    </label>
  );
};

export { MD3Checkbox };
