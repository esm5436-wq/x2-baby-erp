import React, { useRef, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface MD3DialogAction {
  label: string;
  onClick: () => void;
  variant?: 'filled' | 'tonal' | 'text' | 'danger';
  icon?: React.ReactNode;
}

interface MD3DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  actions?: MD3DialogAction[];
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeButton?: boolean;
  /** When true, clicking scrim does not close */
  persistent?: boolean;
}

const maxWidthMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
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
    if (!isOpen) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

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
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Android back button
  useEffect(() => {
    if (!isOpen) return;
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

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
      case 'text':
      default:
        return 'text-[var(--md-sys-color-primary)] px-4 py-2.5 rounded-[20px] font-medium text-sm hover:bg-[rgba(var(--md-sys-color-primary-rgb,103,80,164),0.08)] transition-colors';
    }
  };

  // --- MOBILE: Render as Bottom Sheet ---
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/32 z-[400]"
              onClick={handleScrimClick}
              aria-hidden="true"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[401] max-h-[92vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descId : undefined}
            >
              <div
                ref={dialogRef}
                tabIndex={-1}
                className="bg-[var(--md-sys-color-surface-container-low)] rounded-t-[28px] flex flex-col overflow-hidden outline-none"
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[var(--md-sys-color-outline-variant)]" />
                </div>

                {/* Header */}
                {(title || icon || closeButton) && (
                  <div className="px-5 pt-2 pb-3 flex items-start gap-3 shrink-0">
                    {icon && (
                      <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-secondary-container)] flex items-center justify-center text-[var(--md-sys-color-on-secondary-container)] shrink-0 mt-0.5">
                        {icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {title && (
                        <h2 id={titleId} className="text-lg font-bold text-[var(--md-sys-color-on-surface)]">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p id={descId} className="text-sm text-[var(--md-sys-color-on-surface-variant)] mt-0.5 leading-relaxed">
                          {description}
                        </p>
                      )}
                    </div>
                    {closeButton && (
                      <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-highest)] transition-colors shrink-0"
                        aria-label="إغلاق"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 24 }}>close</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="px-5 overflow-y-auto flex-1 overscroll-behavior-contain">
                  {children}
                </div>

                {/* Actions */}
                {actions && actions.length > 0 && (
                  <div className="px-5 pb-5 pt-3 flex items-center justify-end gap-2 flex-wrap shrink-0 border-t border-[var(--md-sys-color-outline-variant)]/30 mt-2">
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
            className={`relative w-full ${maxWidthMap[maxWidth]} bg-[var(--md-sys-color-surface-container-high)] rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden outline-none`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              className="outline-none"
            >
              {/* Header area */}
              {(title || icon || closeButton) && (
                <div className="px-6 pt-6 pb-2 relative">
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
              <div className="px-6 py-4">
                {children}
              </div>

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
        </div>
      )}
    </AnimatePresence>
  );
};

export { MD3Dialog };
export type { MD3DialogAction, MD3DialogProps };
