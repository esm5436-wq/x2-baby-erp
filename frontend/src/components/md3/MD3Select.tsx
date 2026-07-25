import React, { useState } from 'react';

interface MD3SelectOption {
  label: string;
  value: string;
}

interface MD3SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: MD3SelectOption[];
  variant?: 'filled' | 'outlined';
  disabled?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

const MD3Select: React.FC<MD3SelectProps> = ({
  label,
  value,
  onChange,
  options,
  variant = 'outlined',
  disabled = false,
  fullWidth = false,
  placeholder,
  className = '',
  id,
  name,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value.length > 0;
  const isLabelFloating = focused || hasValue;

  const containerBase = variant === 'outlined'
    ? `border rounded-xl transition-colors duration-200 ${
        focused
          ? 'border-[var(--md-sys-color-primary)] border-b-2'
          : 'border-[var(--md-sys-color-outline)]'
      }`
    : `border-b-2 rounded-t-xl transition-colors duration-200 ${
        focused
          ? 'border-[var(--md-sys-color-primary)]'
          : 'border-[var(--md-sys-color-on-surface-variant)]'
      } bg-[var(--md-sys-color-surface-container-highest)]`;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className={`${containerBase} px-4 py-3 flex items-center gap-2`}>
        <div className="flex-1 relative">
          {variant === 'outlined' ? (
            <label
              htmlFor={id || name}
              className={`
                absolute transition-all duration-200 pointer-events-none font-medium
                ${isLabelFloating
                  ? '-top-2.5 right-2 text-[12px] px-1 bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]'
                  : 'top-3 right-0 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}
            </label>
          ) : (
            <label
              htmlFor={id || name}
              className={`
                absolute transition-all duration-200 pointer-events-none font-medium
                ${isLabelFloating
                  ? '-top-5 right-0 text-[12px] text-[var(--md-sys-color-on-surface-variant)]'
                  : 'top-2.5 right-0 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}
            </label>
          )}
          <select
            id={id || name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`
              w-full bg-transparent outline-none text-[14px] font-medium appearance-none cursor-pointer
              text-[var(--md-sys-color-on-surface)]
              disabled:opacity-38 disabled:cursor-not-allowed
              ${isLabelFloating ? 'pt-1' : ''}
            `}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <span className="material-symbols-rounded text-[var(--md-sys-color-on-surface-variant)] shrink-0" style={{ fontSize: 20 }}>
          expand_more
        </span>
      </div>
    </div>
  );
};

export { MD3Select };
