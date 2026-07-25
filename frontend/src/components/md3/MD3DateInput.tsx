import React, { useState } from 'react';

interface MD3DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  min?: string;
  max?: string;
  required?: boolean;
  name?: string;
  id?: string;
}

const MD3DateInput: React.FC<MD3DateInputProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  error,
  helperText,
  fullWidth = false,
  className = '',
  min,
  max,
  required,
  name,
  id,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value.length > 0;
  const isLabelFloating = focused || hasValue;
  const errorId = error ? `${id || name || 'date'}-error` : undefined;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className={`
        border rounded-xl transition-colors duration-200
        ${error
          ? 'border-[var(--md-sys-color-error)]'
          : focused
            ? 'border-[var(--md-sys-color-primary)] border-b-2'
            : 'border-[var(--md-sys-color-outline)]'
        }
      `}>
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-rounded text-[var(--md-sys-color-on-surface-variant)] shrink-0" style={{ fontSize: 20 }}>
            calendar_today
          </span>
          <div className="flex-1 relative">
            <label
              htmlFor={id || name}
              className={`
                absolute transition-all duration-200 pointer-events-none font-medium
                ${isLabelFloating
                  ? `-top-2.5 right-0 text-[12px] px-1 bg-[var(--md-sys-color-surface-container-high)] ${
                      error ? 'text-[var(--md-sys-color-error)]' : focused ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                    }`
                  : 'top-3 right-8 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}{required && ' *'}
            </label>
            <input
              id={id || name}
              name={name}
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              required={required}
              min={min}
              max={max}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              aria-invalid={!!error}
              aria-describedby={errorId}
              className={`
                w-full bg-transparent outline-none text-[14px] font-medium
                text-[var(--md-sys-color-on-surface)]
                disabled:opacity-38
                ${isLabelFloating ? 'pt-1' : ''}
                [color-scheme:light] dark:[color-scheme:dark]
              `}
            />
          </div>
        </div>
      </div>
      {(error || helperText) && (
        <span
          id={errorId}
          className={`text-[12px] mt-1 px-4 block font-medium ${
            error ? 'text-[var(--md-sys-color-error)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
          }`}
          role={error ? 'alert' : undefined}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
};

export { MD3DateInput };
