import React, { useRef, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import MD3BottomSheet from '../MD3BottomSheet';

interface MD3DialogAction {
  label: string;
  onClick: () => void;
  variant?: 'filled' | 'tonal' | 'text' | 'danger' | 'outlined';
  icon?: React.ReactNode;
  disabled?: boolean;
  /** When false, clicking the action does not auto-close the dialog */
  closeOnAction?: boolean;
}

interface MD3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: MD3DialogAction[];
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '3xl' | 'full';
  closeButton?: boolean;
  /** When true, clicking scrim does not close */
  persistent?: boolean;
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-[calc(100vw-32px)]',
};

const MD3Dialog: React.FC<MD3DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  actions,
  maxWidth = 'lg',
  closeButton = true,
  persistent = false,
}) => {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'compact';

  // Store and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape, isMobile]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  // Body scroll lock
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen, isMobile]);

  // Android back button
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose, isMobile]);

  const handleScrimClick = () => {
    if (!persistent) onClose();
  };

  const getActionClasses = (variant?: string) => {
    switch (variant) {
      case 'filled':
        return 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] px-6 py-2.5 rounded-[20px] font-medium text-sm hover:shadow-md transition-all';
      case 'tonal':
        return 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] px-6 py-2.5 rounded-[20px] font-medium text-sm hover:shadow-sm transition-all';
      case 'danger':
        return 'bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] px-6 py-2.5 rounded-[20px] font-medium text-sm hover:shadow-md transition-all';
      case 'outlined':
        return 'border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary-readable,var(--md-sys-color-primary))] bg-transparent px-6 py-2.5 rounded-[20px] font-medium text-sm hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)] transition-all';
      case 'text':
      default:
        return 'text-[var(--md-sys-color-primary-readable,var(--md-sys-color-primary))] px-4 py-2.5 rounded-[20px] font-medium text-sm hover:bg-[rgba(var(--md-sys-color-on-surface-rgb,27,27,31),0.08)] transition-colors';
    }
  };

  // --- MOBILE: Render as Bottom Sheet ---
  if (isMobile) {
    return (
      <MD3BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        description={description}
        icon={icon}
        persistent={persistent}
        sheetRef={dialogRef}
        actions={
          actions && actions.length > 0 ? (
            <div className="px-5 py-4 flex flex-wrap items-stretch gap-2">
              {actions.map((action, i) => (
                <button
                  key={i}
                  disabled={action.disabled}
                  onClick={() => { if (action.disabled) return; action.onClick(); if (action.closeOnAction !== false) onClose(); }}
                  className={`${getActionClasses(action.variant)} flex-1 min-w-[110px] inline-flex items-center justify-center disabled:opacity-38 disabled:pointer-events-none`}
                >
                  <span className="flex items-center gap-2">
                    {action.icon}
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          ) : undefined
        }
      >
        {children}
      </MD3BottomSheet>
    );
  }

  // --- DESKTOP: Render as centered Dialog ---
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          {/* Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/32"
            onClick={handleScrimClick}
            aria-hidden="true"
          />

          {/* Dialog panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full ${maxWidthMap[maxWidth]} flex flex-col max-h-[calc(100vh-64px)] bg-[var(--md-sys-color-surface-container-high)] rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden outline-none`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              className="outline-none flex flex-col flex-1 min-h-0"
            >
              {/* Header area */}
              {(title || icon || closeButton) && (
                <div className="px-6 pt-6 pb-2 relative shrink-0">
                  {closeButton && (
                    <button
                      onClick={onClose}
                      className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors"
                      aria-label="إغلاق"
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: 24 }}>close</span>
                    </button>
                  )}

                  {icon && (
                    <div className="flex justify-start mb-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--md-sys-color-secondary-container)] flex items-center justify-center text-[var(--md-sys-color-on-secondary-container)]">
                        {icon}
                      </div>
                    </div>
                  )}

                  {title && (
                    <h2 id={titleId} className="text-xl font-bold text-[var(--md-sys-color-on-surface)] pr-8">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-1 leading-relaxed pr-8">
                      {description}
                    </p>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto overscroll-behavior-contain custom-scrollbar">
                {children}
              </div>

              {/* Actions */}
              {actions && actions.length > 0 && (
                <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2 flex-wrap shrink-0 border-t border-[var(--md-sys-color-outline-variant)]/30">
                  {actions.map((action, i) => (
                    <button
                      key={i}
                      disabled={action.disabled}
                      onClick={() => { if (action.disabled) return; action.onClick(); if (action.closeOnAction !== false) onClose(); }}
                      className={`${getActionClasses(action.variant)} disabled:opacity-38 disabled:pointer-events-none`}
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
        </div>
      )}
    </AnimatePresence>
  );
};

export { MD3Dialog };
export type { MD3DialogAction, MD3DialogProps };
