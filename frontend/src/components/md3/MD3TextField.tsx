import React, { ReactNode, useState, useRef, useEffect } from 'react';

type TextFieldVariant = 'filled' | 'outlined';

interface MD3TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variant?: TextFieldVariant;
  type?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  required?: boolean;
  maxLength?: number;
  readOnly?: boolean;
  name?: string;
  id?: string;
  autoFocus?: boolean;
}

const MD3TextField: React.FC<MD3TextFieldProps> = ({
  label,
  value,
  onChange,
  variant = 'outlined',
  type = 'text',
  icon,
  suffix,
  placeholder,
  disabled = false,
  error,
  helperText,
  fullWidth = false,
  className = '',
  onKeyDown,
  onFocus,
  onBlur,
  inputRef,
  required,
  maxLength,
  readOnly,
  name,
  id,
  autoFocus,
}) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const isLabelFloating = focused || hasValue;

  const errorId = error ? `${id || name || 'field'}-error` : undefined;

  const containerBase = variant === 'outlined'
    ? `border rounded-xl transition-colors duration-200 ${
        error
          ? 'border-[var(--md-sys-color-error)]'
          : focused
            ? 'border-[var(--md-sys-color-primary)] border-b-2'
            : 'border-[var(--md-sys-color-outline)]'
      }`
    : `border-b-2 rounded-t-xl transition-colors duration-200 ${
        error
          ? 'border-[var(--md-sys-color-error)]'
          : focused
            ? 'border-[var(--md-sys-color-primary)]'
            : 'border-[var(--md-sys-color-on-surface-variant)]'
      } bg-[var(--md-sys-color-surface-container-highest)]`;

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className={`${containerBase} px-4 py-3 flex items-center gap-2`}>
        {icon && <span className="text-[var(--md-sys-color-on-surface-variant)] shrink-0">{icon}</span>}
        <div className="flex-1 relative">
          {/* Floating label - above border for outlined, inside for filled */}
          {variant === 'outlined' ? (
            <label
              htmlFor={id || name}
              className={`
                absolute transition-all duration-200 pointer-events-none font-medium
                ${isLabelFloating
                  ? `-top-2.5 right-2 text-[12px] px-1 bg-[var(--md-sys-color-surface-container-high)] ${
                      error ? 'text-[var(--md-sys-color-error)]' : focused ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                    }`
                  : 'top-3 right-0 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}{required && ' *'}
            </label>
          ) : (
            <label
              htmlFor={id || name}
              className={`
                absolute transition-all duration-200 pointer-events-none font-medium
                ${isLabelFloating
                  ? `-top-5 right-0 text-[12px] ${
                      error ? 'text-[var(--md-sys-color-error)]' : focused ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                    }`
                  : 'top-2.5 right-0 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}{required && ' *'}
            </label>
          )}
          <input
            ref={inputRef}
            id={id || name}
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={focused ? placeholder : ''}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            maxLength={maxLength}
            autoFocus={autoFocus}
            onKeyDown={onKeyDown}
            onFocus={() => { setFocused(true); onFocus?.(); }}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={`
              w-full bg-transparent outline-none text-[14px] font-medium
              text-[var(--md-sys-color-on-surface)]
              placeholder:text-[var(--md-sys-color-on-surface-variant)] placeholder:font-normal
              disabled:opacity-38
              ${isLabelFloating ? 'pt-1' : ''}
            `}
          />
        </div>
        {suffix && <span className="text-[var(--md-sys-color-on-surface-variant)] shrink-0">{suffix}</span>}
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

export { MD3TextField };

// --- MD3Select ---

interface MD3SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface MD3SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: MD3SelectOption[];
  variant?: 'filled' | 'outlined';
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  required?: boolean;
  name?: string;
  id?: string;
}

const MD3Select: React.FC<MD3SelectProps> = ({
  label,
  value,
  onChange,
  options,
  variant = 'outlined',
  disabled = false,
  fullWidth = false,
  className = '',
  required,
  name,
  id,
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
                  ? `-top-2.5 right-2 text-[12px] px-1 bg-[var(--md-sys-color-surface-container-high)] ${
                      focused ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                    }`
                  : 'top-3 right-0 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}{required && ' *'}
            </label>
          ) : (
            <label
              htmlFor={id || name}
              className={`
                absolute transition-all duration-200 pointer-events-none font-medium
                ${isLabelFloating
                  ? `-top-5 right-0 text-[12px] ${
                      focused ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
                    }`
                  : 'top-2.5 right-0 text-[14px] text-[var(--md-sys-color-on-surface-variant)]'
                }
              `}
            >
              {label}{required && ' *'}
            </label>
          )}
          <select
            id={id || name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent outline-none text-[14px] font-medium text-[var(--md-sys-color-on-surface)] appearance-none cursor-pointer disabled:opacity-38"
          >
            <option value="">{label}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <svg className="w-4 h-4 text-[var(--md-sys-color-on-surface-variant)] shrink-0 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </div>
  );
};

export { MD3Select };
