import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MD3MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface MD3MenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MD3MenuItem[];
  /** Anchor element or its bounding rect for positioning */
  anchorRef?: React.RefObject<HTMLElement>;
  /** Manual position override */
  position?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Minimum width */
  minWidth?: number;
}

const MD3Menu: React.FC<MD3MenuProps> = ({
  isOpen,
  onClose,
  items,
  anchorRef,
  position,
  minWidth = 200,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Position relative to anchor
  const getMenuStyle = (): React.CSSProperties => {
    if (position) {
      return {
        position: 'fixed',
        top: position.top,
        bottom: position.bottom,
        left: position.left,
        right: position.right,
        minWidth,
      };
    }
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      return {
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        minWidth,
      };
    }
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', minWidth };
  };

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorRef?.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const enabledItems = items.filter(i => !i.disabled && !i.divider);
    const currentIndex = enabledItems.findIndex(i => i.label === (document.activeElement as HTMLElement)?.textContent?.trim());

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const next = currentIndex < enabledItems.length - 1 ? currentIndex + 1 : 0;
        const el = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[next];
        el?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : enabledItems.length - 1;
        const el = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')[prev];
        el?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        const el = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        el?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const els = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        els?.[els.length - 1]?.focus();
        break;
      }
    }
  }, [items]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop to capture outside clicks */}
          <div className="fixed inset-0 z-[499]" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            style={getMenuStyle()}
            className="bg-[var(--md-sys-color-surface-container)] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] py-1.5 z-[500] overflow-hidden outline-none"
            role="menu"
            aria-orientation="vertical"
            onKeyDown={handleKeyDown}
          >
            {items.map((item, i) => {
              if (item.divider) {
                return <div key={i} className="my-1.5 h-px bg-[var(--md-sys-color-outline-variant)]" role="separator" />;
              }
              return (
                <button
                  key={i}
                  role="menuitem"
                  disabled={item.disabled}
                  tabIndex={0}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick();
                      onClose();
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-right transition-colors
                    ${item.danger
                      ? 'text-[var(--md-sys-color-error)] hover:bg-[var(--md-sys-color-error-container)]'
                      : 'text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-highest)]'
                    }
                    ${item.disabled ? 'opacity-38 pointer-events-none' : ''}
                  `}
                >
                  {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { MD3Menu };
