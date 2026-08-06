import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface PopupSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Desktop: container classes for the anchored dropdown */
  className?: string;
  /** Mobile: sheet header title */
  title?: string;
  children: React.ReactNode;
}

const PopupSheet: React.FC<PopupSheetProps> = ({ isOpen, onClose, className = '', title, children }) => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'compact';

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMobile, isOpen, onClose]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, isOpen, onClose]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobile, isOpen]);

  if (!isMobile) {
    return <>{isOpen ? <div className={className}>{children}</div> : null}</>;
  }

  if (!isOpen) return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 z-[599]"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[600]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onMouseDownCapture={(e) => e.stopPropagation()}
        onTouchStartCapture={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bg-[var(--md-sys-color-surface-container-low)] rounded-t-[28px] flex flex-col max-h-[80vh] overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[var(--md-sys-color-outline-variant)]" />
          </div>
          {title && (
            <div className="px-5 pt-1 pb-2 shrink-0">
              <h2 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">{title}</h2>
            </div>
          )}
          <div className="overflow-y-auto overscroll-behavior-contain custom-scrollbar">{children}</div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};

export default PopupSheet;
