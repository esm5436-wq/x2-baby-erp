import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MD3DialogAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'tonal' | 'filled' | 'danger';
  icon?: React.ReactNode;
}

interface MD3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  actions?: MD3DialogAction[];
  maxWidth?: 'sm' | 'md' | 'lg';
  noClose?: boolean;
}

const MD3Dialog: React.FC<MD3DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  maxWidth = 'sm',
  noClose = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const maxWidthClass = maxWidth === 'sm' ? 'max-w-sm' : maxWidth === 'md' ? 'max-w-md' : 'max-w-lg';

  // Store the previously focused element and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog after animation
      const timer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleTabTrap);
    return () => dialog.removeEventListener('keydown', handleTabTrap);
  }, [isOpen]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const getActionClasses = (variant?: string) => {
    switch (variant) {
      case 'filled':
        return 'bg-[var(--md3-primary)] text-[var(--md3-on-primary)] px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity';
      case 'tonal':
        return 'bg-[var(--md3-secondary-container)] text-[var(--md3-on-secondary-container)] px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity';
      case 'danger':
        return 'bg-[var(--md3-error)] text-[var(--md3-on-error)] px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity';
      case 'text':
      default:
        return 'text-[var(--md3-primary)] px-4 py-2.5 rounded-full font-bold text-sm hover:bg-[var(--md3-primary-container)] transition-colors';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/32 z-[1000]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="fixed inset-0 z-[1001] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <div
              ref={dialogRef}
              className={`bg-[var(--md3-surface-container-high)] rounded-[28px] w-full ${maxWidthClass} shadow-[var(--md3-elevation-3)] overflow-hidden outline-none`}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              tabIndex={-1}
            >
              {/* Content area */}
              <div className="px-6 pt-6 pb-2 relative">
                {/* Close button */}
                {!noClose && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-[var(--md3-on-surface-variant)] hover:bg-[var(--md3-surface-container-highest)] transition-colors"
                    aria-label="إغلاق"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 24 }}>close</span>
                  </button>
                )}

                {title && (
                  <h2 className="text-xl font-bold text-[var(--md3-on-surface)] mb-1">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-[var(--md3-on-surface-variant)] leading-relaxed">{description}</p>
                )}
              </div>

              {/* Custom children content */}
              {children && (
                <div className="px-6 py-4">
                  {children}
                </div>
              )}

              {/* Actions */}
              {actions && actions.length > 0 && (
                <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2 flex-wrap">
                  {actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => { action.onClick(); onClose(); }}
                      className={getActionClasses(action.variant)}
                    >
                      <span className="flex items-center gap-2">
                        {action.icon}
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MD3Dialog;
