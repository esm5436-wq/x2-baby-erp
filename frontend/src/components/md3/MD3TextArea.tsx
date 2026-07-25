import React from 'react';

interface MD3TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  autoResize?: boolean;
  required?: boolean;
  maxLength?: number;
  name?: string;
  id?: string;
}

const MD3TextArea: React.FC<MD3TextAreaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  helperText,
  fullWidth = false,
  className = '',
  rows = 3,
  minRows,
  maxRows,
  autoResize = false,
  required,
  maxLength,
  name,
  id,
}) => {
  const [focused, setFocused] = React.useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const isLabelFloating = focused || hasValue;
  const errorId = error ? `${id || name || 'field'}-error` : undefined;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (autoResize) {
      e.target.style.height = 'auto';
      const minHeight = minRows ? minRows * 24 : rows * 24;
      const maxHeight = maxRows ? maxRows * 24 : undefined;
      e.target.style.height = `${Math.max(minHeight, Math.min(e.target.scrollHeight, maxHeight || Infinity))}px`;
    }
  };

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      <div className={`
        border rounded-xl transition-colors duration-200
        ${error
          ? 'border-[var(--md-sys-color-error)]'
          : focused
            ? 'border-[var(--md-sys-color-primary)]'
            : 'border-[var(--md-sys-color-outline)]'
        }
      `}>
        <div className="px-4 pt-3 pb-1 relative">
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
          <textarea
            id={id || name}
            name={name}
            value={value}
            onChange={handleInput}
            placeholder={focused ? placeholder : ''}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            rows={rows}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={`
              w-full bg-transparent outline-none text-[14px] font-medium resize-none
              text-[var(--md-sys-color-on-surface)]
              placeholder:text-[var(--md-sys-color-on-surface-variant)] placeholder:font-normal
              disabled:opacity-38
              pt-2
            `}
            style={autoResize ? { overflow: 'hidden' } : undefined}
          />
        </div>
      </div>
      {(error || helperText || maxLength !== undefined) && (
        <div className="flex items-center justify-between mt-1 px-4">
          <span
            id={errorId}
            className={`text-[12px] font-medium ${
              error ? 'text-[var(--md-sys-color-error)]' : 'text-[var(--md-sys-color-on-surface-variant)]'
            }`}
            role={error ? 'alert' : undefined}
          >
            {error || helperText}
          </span>
          {maxLength !== undefined && (
            <span className="text-[12px] font-medium text-[var(--md-sys-color-on-surface-variant)]">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export { MD3TextArea };
